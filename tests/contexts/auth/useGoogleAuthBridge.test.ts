import { renderHook, waitFor } from '@testing-library/react';
import { useGoogleAuthBridge } from '@/contexts/auth/useGoogleAuthBridge';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetSession = jest.fn();
jest.mock('next-auth/react', () => ({
  getSession: () => mockGetSession(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fullSession = {
  user: {
    id: 'u1',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: 'https://img.com/a.jpg',
    hiveUsername: 'sb-test',
    keysDownloaded: false,
  },
};

function defaultProps(overrides?: { isAuthenticated?: boolean; hasMounted?: boolean }) {
  return {
    login: jest.fn() as jest.Mock,
    isAuthenticated: overrides?.isAuthenticated ?? false,
    hasMounted: overrides?.hasMounted ?? true,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useGoogleAuthBridge', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it('calls getSession and login with soft authType when session exists', async () => {
    mockGetSession.mockResolvedValue(fullSession);
    const props = defaultProps();

    renderHook(() => useGoogleAuthBridge(props));

    await waitFor(() => {
      expect(props.login).toHaveBeenCalledTimes(1);
    });

    const [user, authType] = props.login.mock.calls[0];
    expect(authType).toBe('soft');
    expect(user).toMatchObject({
      id: 'u1',
      username: 'sb-test',
      displayName: 'Test User',
      avatar: 'https://img.com/a.jpg',
      isHiveAuth: false,
      hiveUsername: 'sb-test',
      keysDownloaded: false,
    });
  });

  it('builds User with correct field mapping from session', async () => {
    mockGetSession.mockResolvedValue(fullSession);
    const props = defaultProps();

    renderHook(() => useGoogleAuthBridge(props));

    await waitFor(() => {
      expect(props.login).toHaveBeenCalled();
    });

    const [user] = props.login.mock.calls[0];
    // username prefers hiveUsername over email
    expect(user.username).toBe('sb-test');
    // avatar maps from avatarUrl
    expect(user.avatar).toBe('https://img.com/a.jpg');
    expect(user.isHiveAuth).toBe(false);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('skips when already authenticated', async () => {
    mockGetSession.mockResolvedValue(fullSession);
    const props = defaultProps({ isAuthenticated: true });

    renderHook(() => useGoogleAuthBridge(props));

    // Give time for any async call to settle
    await new Promise((r) => setTimeout(r, 50));
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(props.login).not.toHaveBeenCalled();
  });

  it('skips when hasMounted is false', async () => {
    mockGetSession.mockResolvedValue(fullSession);
    const props = defaultProps({ hasMounted: false });

    renderHook(() => useGoogleAuthBridge(props));

    await new Promise((r) => setTimeout(r, 50));
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(props.login).not.toHaveBeenCalled();
  });

  it('does not call login when session is null', async () => {
    mockGetSession.mockResolvedValue(null);
    const props = defaultProps();

    renderHook(() => useGoogleAuthBridge(props));

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });
    // Give extra time for any erroneous login call
    await new Promise((r) => setTimeout(r, 50));
    expect(props.login).not.toHaveBeenCalled();
  });

  it('does not call login when session.user.id is missing', async () => {
    mockGetSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    const props = defaultProps();

    renderHook(() => useGoogleAuthBridge(props));

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(props.login).not.toHaveBeenCalled();
  });

  it('skips login if isAuthenticated becomes true while getSession is in-flight', async () => {
    // Slow getSession that resolves after a delay
    mockGetSession.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(fullSession), 100))
    );
    const props = defaultProps();

    const { rerender } = renderHook(
      (p: Parameters<typeof useGoogleAuthBridge>[0]) => useGoogleAuthBridge(p),
      { initialProps: props }
    );

    // Simulate becoming authenticated before getSession resolves
    rerender({ ...props, isAuthenticated: true });

    // Wait for getSession to resolve
    await new Promise((r) => setTimeout(r, 200));
    expect(props.login).not.toHaveBeenCalled();
  });

  it('resets attempted flag on getSession error to allow retry', async () => {
    mockGetSession.mockRejectedValueOnce(new Error('Network error'));
    const props = defaultProps();

    const { rerender } = renderHook(
      (p: Parameters<typeof useGoogleAuthBridge>[0]) => useGoogleAuthBridge(p),
      { initialProps: props }
    );

    // Wait for the error to be caught
    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalledTimes(1);
    });
    await new Promise((r) => setTimeout(r, 50));

    // Now make getSession succeed and trigger re-render
    mockGetSession.mockResolvedValue(fullSession);
    // Force effect to re-run by toggling hasMounted
    rerender({ ...props, hasMounted: false });
    rerender({ ...props, hasMounted: true });

    await waitFor(() => {
      expect(props.login).toHaveBeenCalledTimes(1);
    });
  });

  it('uses id as fallback for username when email is missing', async () => {
    mockGetSession.mockResolvedValue({
      user: {
        id: 'u2',
        displayName: 'No Email',
        avatarUrl: null,
      },
    });
    const props = defaultProps();

    renderHook(() => useGoogleAuthBridge(props));

    await waitFor(() => {
      expect(props.login).toHaveBeenCalled();
    });

    const [user] = props.login.mock.calls[0];
    expect(user.username).toBe('u2');
    expect(user.displayName).toBe('No Email');
  });

  it('passes hiveUsername and keysDownloaded from session to User', async () => {
    mockGetSession.mockResolvedValue({
      user: {
        id: 'u3',
        email: 'hive@example.com',
        hiveUsername: 'sb-hiver',
        keysDownloaded: true,
      },
    });
    const props = defaultProps();

    renderHook(() => useGoogleAuthBridge(props));

    await waitFor(() => {
      expect(props.login).toHaveBeenCalled();
    });

    const [user] = props.login.mock.calls[0];
    expect(user.hiveUsername).toBe('sb-hiver');
    expect(user.keysDownloaded).toBe(true);
  });
});
