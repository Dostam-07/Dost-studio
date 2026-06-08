import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomeDashboard from './HomeDashboard';

describe('HomeDashboard', () => {
  it('renders without crashing', () => {
    const { container } = render(<HomeDashboard />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<HomeDashboard />);
    expect(screen.getByText(/Main/i)).toBeTruthy();
  });
});