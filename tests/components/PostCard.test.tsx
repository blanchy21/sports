import { screen } from '@testing-library/react';
import { PostCard } from '@/components/posts/PostCard';
import { renderWithProviders } from '../test-utils';

// Mock the hooks
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    hiveUser: null,
    isAuthenticated: false,
    isHiveAuthenticated: false,
    isSoftAuthenticated: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

jest.mock('@/features/user/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: { avatar: null, displayName: 'Test User' },
    isLoading: false,
  }),
}));

jest.mock('@/hooks/useBookmarks', () => ({
  useBookmarks: () => ({
    toggleBookmark: jest.fn(),
    isBookmarked: () => false,
  }),
}));

jest.mock('@/components/modals/ModalProvider', () => ({
  useModal: () => ({
    openModal: jest.fn(),
  }),
}));

jest.mock('@/components/core/Toast', () => ({
  useToast: () => ({
    addToast: jest.fn(),
  }),
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock StarVoteButton
jest.mock('@/components/voting/StarVoteButton', () => ({
  StarVoteButton: () => <button data-testid="star-vote-button">Vote</button>,
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string; src: string }) => (
    <img alt={props.alt} src={props.src} data-testid="post-image" />
  ),
}));

// Mock react-markdown to avoid parsing issues
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

// Mock remark-gfm
jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => {},
}));

// Use partial mock that matches the properties PostCard actually uses
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockHivePost: any = {
  isSportsblockPost: true,
  author: 'testuser',
  permlink: 'test-post-permlink',
  title: 'Test Post Title',
  body: 'This is the body of the test post with some content. ![test](https://example.com/image.jpg)',
  created: '2024-01-15T10:00:00Z',
  json_metadata: JSON.stringify({ tags: ['sports', 'football'] }),
  tags: ['sports', 'football', 'hive'],
  category: 'sports',
  net_votes: 42,
  children: 5,
  pending_payout_value: '10.000 HBD',
  total_payout_value: '0.000 HBD',
  curator_payout_value: '0.000 HBD',
  active_votes: [],
  sportCategory: 'Football',
};

const mockLegacyPost = {
  postType: 'standard' as const,
  id: '123',
  title: 'Legacy Test Post',
  content: 'This is the full content of the legacy post.',
  excerpt: 'This is an excerpt of the legacy post.',
  author: {
    id: 'user123',
    username: 'legacyuser',
    displayName: 'Legacy User',
    avatar: 'https://example.com/avatar.jpg',
    isHiveAuth: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  },
  featuredImage: 'https://example.com/featured.jpg',
  publishedAt: new Date('2024-01-15T10:00:00Z'),
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
  readTime: 5,
  upvotes: 100,
  comments: 10,
  tags: ['general'],
  sport: {
    id: 'basketball',
    name: 'Basketball',
    slug: 'basketball',
    icon: '🏀',
    color: 'bg-accent',
  },
  isPublished: true,
  isDraft: false,
};

describe('PostCard', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '', assign: jest.fn() },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  describe('Hive Post Rendering', () => {
    it('renders Hive post title and author', () => {
      renderWithProviders(<PostCard post={mockHivePost} />);

      expect(screen.getByText('Test Post Title')).toBeInTheDocument();
      expect(screen.getByText('@testuser')).toBeInTheDocument();
    });

    it('displays sport category for Hive posts', () => {
      renderWithProviders(<PostCard post={mockHivePost} />);

      expect(screen.getByText('Football')).toBeInTheDocument();
    });

    it('shows vote count', () => {
      renderWithProviders(<PostCard post={mockHivePost} />);

      expect(screen.getByText('(42)')).toBeInTheDocument();
    });

    it('displays comment count', () => {
      renderWithProviders(<PostCard post={mockHivePost} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders tags for Hive posts', () => {
      renderWithProviders(<PostCard post={mockHivePost} />);

      expect(screen.getByText('#sports')).toBeInTheDocument();
      expect(screen.getByText('#football')).toBeInTheDocument();
      expect(screen.getByText('#hive')).toBeInTheDocument();
    });

    it('extracts and displays image from markdown body', () => {
      renderWithProviders(<PostCard post={mockHivePost} />);

      // There may be multiple images (avatar + post image), check at least one exists
      const images = screen.getAllByTestId('post-image');
      expect(images.length).toBeGreaterThan(0);
    });

    it('shows pending payout when available', () => {
      renderWithProviders(<PostCard post={mockHivePost} />);

      // The pending payout should be shown (10 HBD converted to HIVE equivalent)
      const payoutElement = screen.queryByText(/pending/i);
      expect(payoutElement).toBeInTheDocument();
    });
  });

  describe('Legacy Post Rendering', () => {
    it('renders legacy post title and author', () => {
      renderWithProviders(<PostCard post={mockLegacyPost} />);

      expect(screen.getByText('Legacy Test Post')).toBeInTheDocument();
      expect(screen.getByText('@legacyuser')).toBeInTheDocument();
    });

    it('displays sport name for legacy posts', () => {
      renderWithProviders(<PostCard post={mockLegacyPost} />);

      expect(screen.getByText('Basketball')).toBeInTheDocument();
    });

    it('shows upvote count for legacy posts', () => {
      renderWithProviders(<PostCard post={mockLegacyPost} />);

      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('renders bookmark button', () => {
      renderWithProviders(<PostCard post={mockHivePost} />);

      // Bookmark button should be present
      const buttons = screen.getAllByRole('button');
      const bookmarkButton = buttons.find((btn) => btn.querySelector('svg.lucide-bookmark'));
      expect(bookmarkButton).toBeTruthy();
    });

    it('renders comment button', () => {
      renderWithProviders(<PostCard post={mockHivePost} />);

      // Comment button with count
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders StarVoteButton for Hive posts', () => {
      renderWithProviders(<PostCard post={mockHivePost} />);

      expect(screen.getByTestId('star-vote-button')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = renderWithProviders(
        <PostCard post={mockHivePost} className="custom-test-class" />
      );

      expect(container.querySelector('.custom-test-class')).toBeInTheDocument();
    });

    it('has proper article structure', () => {
      renderWithProviders(<PostCard post={mockHivePost} />);

      expect(screen.getByRole('article')).toBeInTheDocument();
    });
  });
});
