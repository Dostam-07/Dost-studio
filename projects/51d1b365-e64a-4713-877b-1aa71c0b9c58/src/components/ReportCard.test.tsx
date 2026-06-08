import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReportCard from './ReportCard';

describe('ReportCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<ReportCard />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<ReportCard />);
    expect(screen.getByText(/Card/i)).toBeTruthy();
  });
});