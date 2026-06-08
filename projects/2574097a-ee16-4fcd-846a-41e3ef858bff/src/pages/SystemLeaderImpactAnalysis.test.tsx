import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SystemLeaderImpactAnalysis from './SystemLeaderImpactAnalysis';

describe('SystemLeaderImpactAnalysis', () => {
  it('renders without crashing', () => {
    const { container } = render(<SystemLeaderImpactAnalysis />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<SystemLeaderImpactAnalysis />);
    expect(screen.getByText(/System/i)).toBeTruthy();
  });
});