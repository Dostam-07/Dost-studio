import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DataForm from './DataForm';

describe('DataForm', () => {
  it('renders without crashing', () => {
    const { container } = render(<DataForm />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<DataForm />);
    expect(screen.getByText(/Data/i)).toBeTruthy();
  });
});