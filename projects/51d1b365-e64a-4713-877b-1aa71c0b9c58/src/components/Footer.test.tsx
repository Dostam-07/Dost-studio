import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from './Footer';

describe('Footer', () => {
  it('renders without crashing', () => {
    const { container } = render(<Footer />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<Footer />);
    expect(screen.getByText(/Footer/i)).toBeTruthy();
  });
});