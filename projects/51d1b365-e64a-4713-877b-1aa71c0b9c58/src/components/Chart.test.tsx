import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Chart from './Chart';

describe('Chart', () => {
  it('renders without crashing', () => {
    const { container } = render(<Chart />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<Chart />);
    expect(screen.getByText(/Chart/i)).toBeTruthy();
  });
});