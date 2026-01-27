import { screen } from '@testing-library/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/core/Card';
import { renderWithProviders } from '../../test-utils';

describe('Card', () => {
  it('renders with header and content', () => {
    renderWithProviders(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Body content</CardContent>
      </Card>
    );

    expect(screen.getByText(/title/i)).toBeInTheDocument();
    expect(screen.getByText(/body content/i)).toBeInTheDocument();
  });
});
