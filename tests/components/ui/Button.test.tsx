import { fireEvent, screen } from '@testing-library/react';
import { Button } from '@/components/ui/Button';
import { renderWithProviders } from '../../test-utils';

describe('Button', () => {
  it('renders with default variant and responds to click', () => {
    const handleClick = jest.fn();

    renderWithProviders(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    renderWithProviders(<Button className="custom-class">Styled</Button>);

    const button = screen.getByRole('button', { name: /styled/i });
    expect(button).toHaveClass('custom-class');
  });
});
