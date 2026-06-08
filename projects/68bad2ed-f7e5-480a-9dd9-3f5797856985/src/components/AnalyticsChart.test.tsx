import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnalyticsChart from './AnalyticsChart';

describe('AnalyticsChart', () => {
  it('renders without crashing', () => {
    const { container } = render(<AnalyticsChart />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<AnalyticsChart />);
    expect(screen.getByText(/Analytics/i)).toBeTruthy();
  });
});