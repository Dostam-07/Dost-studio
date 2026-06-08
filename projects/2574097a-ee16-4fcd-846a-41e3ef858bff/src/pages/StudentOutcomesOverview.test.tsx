import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StudentOutcomesOverview from './StudentOutcomesOverview';

describe('StudentOutcomesOverview', () => {
  it('renders without crashing', () => {
    const { container } = render(<StudentOutcomesOverview />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<StudentOutcomesOverview />);
    expect(screen.getByText(/Student/i)).toBeTruthy();
  });
});