import { screen } from '@testing-library/react';
import { Avatar } from '@/components/ui/Avatar';
import { renderWithProviders } from '../test-utils';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string; src: string; className?: string }) => (
    <img alt={props.alt} src={props.src} className={props.className} data-testid="avatar-image" />
  ),
}));

describe('Avatar', () => {
  it('renders image when src is provided', () => {
    renderWithProviders(
      <Avatar src="https://example.com/avatar.jpg" alt="User avatar" fallback="JD" />
    );

    const image = screen.getByTestId('avatar-image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders DiceBear avatar when no src provided but fallback exists', () => {
    renderWithProviders(<Avatar fallback="John Doe" alt="User avatar" />);

    // Component generates a DiceBear avatar from the fallback name
    const image = screen.getByTestId('avatar-image');
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toContain('dicebear.com');
  });

  it('renders DiceBear avatar for single word fallback', () => {
    renderWithProviders(<Avatar fallback="John" alt="User avatar" />);

    const image = screen.getByTestId('avatar-image');
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toContain('dicebear.com');
  });

  it('applies size classes correctly', () => {
    const { container, rerender } = renderWithProviders(
      <Avatar fallback="Test" alt="Test" size="sm" />
    );

    // sm = h-6
    expect(container.querySelector('.h-6')).toBeInTheDocument();

    rerender(<Avatar fallback="Test" alt="Test" size="md" />);
    // md = h-8
    expect(container.querySelector('.h-8')).toBeInTheDocument();

    rerender(<Avatar fallback="Test" alt="Test" size="lg" />);
    // lg = h-12
    expect(container.querySelector('.h-12')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <Avatar fallback="Test" alt="Test" className="custom-avatar-class" />
    );

    expect(container.querySelector('.custom-avatar-class')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    renderWithProviders(
      <Avatar src="https://example.com/avatar.jpg" alt="Profile picture" fallback="PP" />
    );

    const image = screen.getByTestId('avatar-image');
    expect(image).toHaveAttribute('alt', 'Profile picture');
  });

  it('handles empty src string by using DiceBear fallback', () => {
    renderWithProviders(<Avatar src="" fallback="Test User" alt="Test" />);

    // Component generates a DiceBear avatar from the fallback name when src is empty
    const image = screen.getByTestId('avatar-image');
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toContain('dicebear.com');
  });
});
