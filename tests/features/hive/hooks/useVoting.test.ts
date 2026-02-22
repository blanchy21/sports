import { renderHook, waitFor, act } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVoting } from '@/features/hive/hooks/useVoting';

// Mock dependencies - order matters to prevent Wax WASM import chain
jest.mock('@/contexts/AuthContext');
jest.mock('@/lib/hive-workerbee/voting');
jest.mock('@/hooks/useBroadcast', () => ({
  useBroadcast: () => ({ broadcast: jest.fn() }),
}));
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));

// Prevent Wax/WorkerBee WASM resolution (server-only modules)
jest.mock('@/lib/hive-workerbee/client', () => ({
  SPORTS_ARENA_CONFIG: {
    APP_NAME: 'sportsblock',
    COMMUNITY_ID: 'hive-115814',
    COMMUNITY_NAME: 'sportsblock',
    TAGS: ['sportsblock'],
    DEFAULT_BENEFICIARIES: [],
  },
}));
jest.mock('@/lib/hive-workerbee/wax-helpers', () => ({}));
jest.mock('@/lib/hive-workerbee/api', () => ({}));

import { useAuth } from '@/contexts/AuthContext';
import {
  castVote,
  removeVote,
  checkUserVote,
  canUserVote,
  calculateOptimalVoteWeight,
} from '@/lib/hive-workerbee/voting';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockCastVote = castVote as jest.MockedFunction<typeof castVote>;
const mockRemoveVote = removeVote as jest.MockedFunction<typeof removeVote>;
const mockCheckUserVote = checkUserVote as jest.MockedFunction<typeof checkUserVote>;
const mockCanUserVote = canUserVote as jest.MockedFunction<typeof canUserVote>;
const mockCalculateOptimalVoteWeight = calculateOptimalVoteWeight as jest.MockedFunction<
  typeof calculateOptimalVoteWeight
>;

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    username: 'voter',
    displayName: 'Voter',
    isHiveAuth: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function setAuthState(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  mockUseAuth.mockReturnValue({
    user: null,
    authType: 'guest',
    isAuthenticated: false,
    isLoading: false,
    hiveUser: null,
    isClient: true,
    hasMounted: true,
    profileLoadFailed: false,
    login: jest.fn(),
    loginWithHiveUser: jest.fn(),
    loginWithWallet: jest.fn(),
    loginWithGoogle: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
    upgradeToHive: jest.fn(),
    setHiveUser: jest.fn(),
    refreshHiveAccount: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useAuth>);
}

describe('useVoting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckUserVote.mockResolvedValue(null);
    mockCanUserVote.mockResolvedValue({ canVote: true, votingPower: 100 });
    mockCalculateOptimalVoteWeight.mockResolvedValue(100);
    mockCastVote.mockResolvedValue({ success: true, transactionId: 'tx123' });
    mockRemoveVote.mockResolvedValue({ success: true, transactionId: 'tx456' });
  });

  // ===========================================================================
  // Auth gating
  // ===========================================================================

  describe('auth gating', () => {
    it('returns auth error when no user is logged in', async () => {
      setAuthState({ hiveUser: null, authType: 'guest' });

      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      const upvoteResult = await act(() => result.current.upvote('author1', 'post1'));
      expect(upvoteResult).toEqual({
        success: false,
        error: 'Authentication required for voting',
      });
      expect(mockCastVote).not.toHaveBeenCalled();
    });

    it('allows voting for soft/custodial auth (via signing relay)', async () => {
      setAuthState({
        hiveUser: { username: 'testuser', isAuthenticated: true },
        authType: 'soft',
        isAuthenticated: true,
        user: createUser({ username: 'testuser', displayName: 'Test' }),
      });

      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      const upvoteResult = await act(() => result.current.upvote('author1', 'post1'));
      expect(upvoteResult.success).toBe(true);
      expect(mockCastVote).toHaveBeenCalled();
    });

    it('allows voting for hive auth users', async () => {
      setAuthState({
        hiveUser: { username: 'hiveuser', isAuthenticated: true },
        authType: 'hive',
        isAuthenticated: true,
        user: createUser({ username: 'hiveuser', displayName: 'Hive' }),
      });

      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      const upvoteResult = await act(() => result.current.upvote('author1', 'post1'));
      expect(upvoteResult.success).toBe(true);
      expect(mockCastVote).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Vote state derivation
  // ===========================================================================

  describe('vote state derivation', () => {
    it('derives hasVoted=false when no vote exists', async () => {
      setAuthState({
        hiveUser: { username: 'voter', isAuthenticated: true },
        authType: 'hive',
        isAuthenticated: true,
        user: createUser(),
      });
      mockCheckUserVote.mockResolvedValue(null);

      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.voteState.hasVoted).toBe(false);
        expect(result.current.voteState.userVote).toBeNull();
      });
    });

    it('derives canVote and votingPower from eligibility', async () => {
      setAuthState({
        hiveUser: { username: 'voter', isAuthenticated: true },
        authType: 'hive',
        isAuthenticated: true,
        user: createUser(),
      });
      mockCanUserVote.mockResolvedValue({ canVote: true, votingPower: 85 });

      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.voteState.canVote).toBe(true);
        expect(result.current.voteState.votingPower).toBe(85);
      });
    });

    it('derives voteWeight from existing vote', async () => {
      setAuthState({
        hiveUser: { username: 'voter', isAuthenticated: true },
        authType: 'hive',
        isAuthenticated: true,
        user: createUser(),
      });
      mockCheckUserVote.mockResolvedValue({
        voter: 'voter',
        weight: 5000,
        rshares: '1000000',
        percent: 5000,
        reputation: '50',
        time: new Date().toISOString(),
      });

      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.voteState.hasVoted).toBe(true);
        expect(result.current.voteState.voteWeight).toBe(50);
      });
    });

    it('does not fetch vote status when user is not authenticated', () => {
      setAuthState({ hiveUser: null, authType: 'guest' });

      renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      expect(mockCheckUserVote).not.toHaveBeenCalled();
      expect(mockCanUserVote).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Upvote / downvote
  // ===========================================================================

  describe('upvote and downvote', () => {
    beforeEach(() => {
      setAuthState({
        hiveUser: { username: 'voter', isAuthenticated: true },
        authType: 'hive',
        isAuthenticated: true,
        user: createUser(),
      });
    });

    it('upvote calls calculateOptimalVoteWeight and castVote with positive weight', async () => {
      mockCalculateOptimalVoteWeight.mockResolvedValue(80);

      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      await act(() => result.current.upvote('author1', 'post1'));

      expect(mockCalculateOptimalVoteWeight).toHaveBeenCalledWith('voter');
      expect(mockCastVote).toHaveBeenCalledWith(
        expect.objectContaining({
          voter: 'voter',
          author: 'author1',
          permlink: 'post1',
          weight: 80,
        }),
        expect.any(Function)
      );
    });

    it('downvote uses negative weight', async () => {
      mockCalculateOptimalVoteWeight.mockResolvedValue(80);

      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      await act(() => result.current.downvote('author1', 'post1'));

      expect(mockCastVote).toHaveBeenCalledWith(
        expect.objectContaining({
          weight: -80,
        }),
        expect.any(Function)
      );
    });

    it('returns error message on castVote failure', async () => {
      mockCastVote.mockRejectedValue(new Error('Network timeout'));

      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      const upvoteResult = await act(() => result.current.upvote('author1', 'post1'));
      expect(upvoteResult).toEqual({
        success: false,
        error: 'Network timeout',
      });
    });
  });

  // ===========================================================================
  // Star vote
  // ===========================================================================

  describe('star vote', () => {
    beforeEach(() => {
      setAuthState({
        hiveUser: { username: 'voter', isAuthenticated: true },
        authType: 'hive',
        isAuthenticated: true,
        user: createUser(),
      });
    });

    it('maps 3 stars to 60% weight', async () => {
      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      await act(() => result.current.starVote('author1', 'post1', 3));

      expect(mockCastVote).toHaveBeenCalledWith(
        expect.objectContaining({ weight: 60 }),
        expect.any(Function)
      );
    });

    it('maps 5 stars to 100% weight', async () => {
      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      await act(() => result.current.starVote('author1', 'post1', 5));

      expect(mockCastVote).toHaveBeenCalledWith(
        expect.objectContaining({ weight: 100 }),
        expect.any(Function)
      );
    });

    it('rejects stars out of range', async () => {
      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      const voteResult = await act(() => result.current.starVote('author1', 'post1', 6));
      expect(voteResult).toEqual({
        success: false,
        error: 'Stars must be between 0 and 5',
      });
      expect(mockCastVote).not.toHaveBeenCalled();
    });

    it('rejects negative stars', async () => {
      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      const voteResult = await act(() => result.current.starVote('author1', 'post1', -1));
      expect(voteResult).toEqual({
        success: false,
        error: 'Stars must be between 0 and 5',
      });
    });
  });

  // ===========================================================================
  // Comment vote
  // ===========================================================================

  describe('comment vote', () => {
    beforeEach(() => {
      setAuthState({
        hiveUser: { username: 'voter', isAuthenticated: true },
        authType: 'hive',
        isAuthenticated: true,
        user: createUser(),
      });
    });

    it('passes exact weight to castVote', async () => {
      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      await act(() => result.current.commentVote('author1', 'comment1', 75));

      expect(mockCastVote).toHaveBeenCalledWith(
        expect.objectContaining({
          author: 'author1',
          permlink: 'comment1',
          weight: 75,
        }),
        expect.any(Function)
      );
    });

    it('rejects weight out of range', async () => {
      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      const voteResult = await act(() => result.current.commentVote('author1', 'comment1', 150));
      expect(voteResult).toEqual({
        success: false,
        error: 'Vote weight must be between 0 and 100',
      });
      expect(mockCastVote).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Remove vote
  // ===========================================================================

  describe('remove vote', () => {
    beforeEach(() => {
      setAuthState({
        hiveUser: { username: 'voter', isAuthenticated: true },
        authType: 'hive',
        isAuthenticated: true,
        user: createUser(),
      });
    });

    it('calls removeVote with correct params', async () => {
      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      await act(() => result.current.removeVoteAction('author1', 'post1'));

      expect(mockRemoveVote).toHaveBeenCalledWith(
        expect.objectContaining({
          voter: 'voter',
          author: 'author1',
          permlink: 'post1',
        }),
        expect.any(Function)
      );
    });

    it('returns error on failure', async () => {
      mockRemoveVote.mockRejectedValue(new Error('Remove failed'));

      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      const removeResult = await act(() => result.current.removeVoteAction('author1', 'post1'));
      expect(removeResult).toEqual({
        success: false,
        error: 'Remove failed',
      });
    });

    it('returns auth error when not authenticated', async () => {
      setAuthState({ hiveUser: null, authType: 'guest' });

      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      const removeResult = await act(() => result.current.removeVoteAction('author1', 'post1'));
      expect(removeResult).toEqual({
        success: false,
        error: 'Authentication required for voting',
      });
    });
  });

  // ===========================================================================
  // Cache invalidation
  // ===========================================================================

  describe('cache invalidation', () => {
    it('refreshVoteState triggers query invalidation', async () => {
      setAuthState({
        hiveUser: { username: 'voter', isAuthenticated: true },
        authType: 'hive',
        isAuthenticated: true,
        user: createUser(),
      });

      const { result } = renderHook(() => useVoting('author1', 'post1'), {
        wrapper: createWrapper(),
      });

      // Wait for initial query to settle
      await waitFor(() => {
        expect(mockCheckUserVote).toHaveBeenCalled();
      });

      // Clear call history to isolate refresh behavior
      mockCheckUserVote.mockClear();
      mockCanUserVote.mockClear();

      await act(() => result.current.refreshVoteState());

      // After invalidation, queries should be refetched
      await waitFor(() => {
        expect(mockCheckUserVote).toHaveBeenCalled();
      });
    });
  });
});
