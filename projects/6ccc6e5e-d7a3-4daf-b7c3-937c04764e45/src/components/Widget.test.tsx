import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Widget from './Widget';

describe('Widget', () => {
  it('renders without crashing', () => {
    const { container } = render(<Widget />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<Widget />);
    expect(screen.getByText(/Customizable/i)).toBeTruthy();
  });
});