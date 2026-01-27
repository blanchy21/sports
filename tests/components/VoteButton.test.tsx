import { screen, fireEvent, waitFor } from '@testing-library/react';
import { VoteButton, SimpleVoteButton } from '@/components/voting/VoteButton';
import { renderWithProviders } from '../test-utils';

// Mock the useVoting hook
const mockUpvote = jest.fn();
const mockDownvote = jest.fn();
const mockRemoveVote = jest.fn();
const mockCheckVoteStatus = jest.fn();

jest.mock('@/features/hive/hooks/useVoting', () => ({
  useVoting: () => ({
    voteState: {
      isVoting: false,
      hasVoted: false,
      userVote: null,
      canVote: true,
      votingPower: 100,
      error: null,
    },
    upvote: mockUpvote,
    downvote: mockDownvote,
    removeVoteAction: mockRemoveVote,
    checkVoteStatus: mockCheckVoteStatus,
  }),
}));

describe('VoteButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpvote.mockResolvedValue({ success: true });
    mockDownvote.mockResolvedValue({ success: true });
    mockRemoveVote.mockResolvedValue({ success: true });
  });

  it('renders with vote count', () => {
    renderWithProviders(<VoteButton author="testuser" permlink="test-post" voteCount={42} />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders upvote and downvote buttons', () => {
    renderWithProviders(<VoteButton author="testuser" permlink="test-post" voteCount={10} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('shows voting power indicator when user can vote', () => {
    renderWithProviders(<VoteButton author="testuser" permlink="test-post" voteCount={10} />);

    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('calls upvote when upvote button is clicked', async () => {
    const onVoteSuccess = jest.fn();

    renderWithProviders(
      <VoteButton
        author="testuser"
        permlink="test-post"
        voteCount={10}
        onVoteSuccess={onVoteSuccess}
      />
    );

    const buttons = screen.getAllByRole('button');
    const upvoteButton = buttons[0]; // First button is upvote

    fireEvent.click(upvoteButton);

    await waitFor(() => {
      expect(mockUpvote).toHaveBeenCalledWith('testuser', 'test-post');
    });
  });

  it('calls downvote when downvote button is clicked', async () => {
    const onVoteSuccess = jest.fn();

    renderWithProviders(
      <VoteButton
        author="testuser"
        permlink="test-post"
        voteCount={10}
        onVoteSuccess={onVoteSuccess}
      />
    );

    const buttons = screen.getAllByRole('button');
    const downvoteButton = buttons[1]; // Second button is downvote

    fireEvent.click(downvoteButton);

    await waitFor(() => {
      expect(mockDownvote).toHaveBeenCalledWith('testuser', 'test-post');
    });
  });

  it('calls onVoteSuccess callback on successful vote', async () => {
    const onVoteSuccess = jest.fn();

    renderWithProviders(
      <VoteButton
        author="testuser"
        permlink="test-post"
        voteCount={10}
        onVoteSuccess={onVoteSuccess}
      />
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(onVoteSuccess).toHaveBeenCalled();
    });
  });

  it('calls onVoteError callback on failed vote', async () => {
    mockUpvote.mockResolvedValue({ success: false, error: 'Vote failed' });
    const onVoteError = jest.fn();

    renderWithProviders(
      <VoteButton author="testuser" permlink="test-post" voteCount={10} onVoteError={onVoteError} />
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(onVoteError).toHaveBeenCalledWith('Vote failed');
    });
  });

  it('checks vote status on mount', () => {
    renderWithProviders(<VoteButton author="testuser" permlink="test-post" voteCount={10} />);

    expect(mockCheckVoteStatus).toHaveBeenCalledWith('testuser', 'test-post');
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <VoteButton author="testuser" permlink="test-post" voteCount={10} className="custom-class" />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});

describe('SimpleVoteButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpvote.mockResolvedValue({ success: true });
  });

  it('renders with vote count', () => {
    renderWithProviders(<SimpleVoteButton author="testuser" permlink="test-post" voteCount={25} />);

    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('renders a single button', () => {
    renderWithProviders(<SimpleVoteButton author="testuser" permlink="test-post" voteCount={10} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('calls upvote when clicked', async () => {
    renderWithProviders(<SimpleVoteButton author="testuser" permlink="test-post" voteCount={10} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockUpvote).toHaveBeenCalledWith('testuser', 'test-post');
    });
  });
});
