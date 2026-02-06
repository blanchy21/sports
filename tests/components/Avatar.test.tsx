import { screen, fireEvent } from '@testing-library/react';
import { Avatar } from '@/components/core/Avatar';
import { renderWithProviders } from '../test-utils';

describe('Avatar', () => {
  it('renders image when src is provided', () => {
    renderWithProviders(
      <Avatar src="https://example.com/avatar.jpg" alt="User avatar" fallback="JD" />
    );

    const image = screen.getByAltText('User avatar');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders Hive avatar when no src provided but fallback exists', () => {
    renderWithProviders(<Avatar fallback="John Doe" alt="User avatar" />);

    const image = screen.getByAltText('User avatar');
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toBe('https://images.hive.blog/u/John Doe/avatar');
  });

  it('falls back to DiceBear when Hive avatar fails (no src)', () => {
    renderWithProviders(<Avatar fallback="John Doe" alt="User avatar" />);

    const image = screen.getByAltText('User avatar');
    expect(image.getAttribute('src')).toBe('https://images.hive.blog/u/John Doe/avatar');

    // Simulate Hive avatar failing → should fall back to DiceBear
    fireEvent.error(image);
    expect(image.getAttribute('src')).toContain('dicebear.com');
  });

  it('renders Hive avatar for single word fallback', () => {
    renderWithProviders(<Avatar fallback="John" alt="User avatar" />);

    const image = screen.getByAltText('User avatar');
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toBe('https://images.hive.blog/u/John/avatar');
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

    const image = screen.getByAltText('Profile picture');
    expect(image).toHaveAttribute('alt', 'Profile picture');
  });

  it('handles empty src string by trying Hive avatar first', () => {
    renderWithProviders(<Avatar src="" fallback="Test User" alt="Test" />);

    const image = screen.getByAltText('Test');
    expect(image).toBeInTheDocument();
    // Empty string is falsy, so the cascade starts with Hive avatar
    expect(image.getAttribute('src')).toBe('https://images.hive.blog/u/Test User/avatar');

    // Simulate Hive avatar failing → should fall back to DiceBear
    fireEvent.error(image);
    expect(image.getAttribute('src')).toContain('dicebear.com');
  });

  it('falls back to Hive avatar when custom src fails, then DiceBear if that also fails', () => {
    renderWithProviders(
      <Avatar src="https://broken-cdn.example/avatar.jpg" fallback="testuser" alt="Test" />
    );

    const image = screen.getByAltText('Test');
    expect(image).toHaveAttribute('src', 'https://broken-cdn.example/avatar.jpg');

    // Simulate image load error → should try Hive avatar
    fireEvent.error(image);
    expect(image.getAttribute('src')).toBe('https://images.hive.blog/u/testuser/avatar');

    // Simulate Hive avatar also failing → should fall back to DiceBear
    fireEvent.error(image);
    expect(image.getAttribute('src')).toContain('dicebear.com');
  });

  it('skips Hive fallback when src is already a Hive avatar URL', () => {
    renderWithProviders(
      <Avatar src="https://images.hive.blog/u/testuser/avatar" fallback="testuser" alt="Test" />
    );

    const image = screen.getByAltText('Test');
    expect(image).toHaveAttribute('src', 'https://images.hive.blog/u/testuser/avatar');

    // Simulate error → should go straight to DiceBear (not retry same URL)
    fireEvent.error(image);
    expect(image.getAttribute('src')).toContain('dicebear.com');
  });
});
