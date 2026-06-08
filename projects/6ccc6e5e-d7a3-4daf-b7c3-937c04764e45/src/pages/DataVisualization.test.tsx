import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DataVisualization from './DataVisualization';

describe('DataVisualization', () => {
  it('renders without crashing', () => {
    const { container } = render(<DataVisualization />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<DataVisualization />);
    expect(screen.getByText(/Interactive/i)).toBeTruthy();
  });
});