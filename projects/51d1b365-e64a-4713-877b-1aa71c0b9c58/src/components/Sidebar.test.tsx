import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from './Sidebar';

describe('Sidebar', () => {
  it('renders without crashing', () => {
    const { container } = render(<Sidebar />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<Sidebar />);
    expect(screen.getByText(/Sidebar/i)).toBeTruthy();
  });
});