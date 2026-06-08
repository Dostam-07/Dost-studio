import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Navbar from './Navbar';

describe('Navbar', () => {
  it('renders without crashing', () => {
    const { container } = render(<Navbar />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<Navbar />);
    expect(screen.getByText(/Navigation/i)).toBeTruthy();
  });
});