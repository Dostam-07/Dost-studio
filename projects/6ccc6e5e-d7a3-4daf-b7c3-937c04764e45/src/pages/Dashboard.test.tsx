import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

describe('Dashboard', () => {
  it('renders without crashing', () => {
    const { container } = render(<Dashboard />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<Dashboard />);
    expect(screen.getByText(/Main/i)).toBeTruthy();
  });
});