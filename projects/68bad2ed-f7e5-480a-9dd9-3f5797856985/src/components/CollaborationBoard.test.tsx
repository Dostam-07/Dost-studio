import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CollaborationBoard from './CollaborationBoard';

describe('CollaborationBoard', () => {
  it('renders without crashing', () => {
    const { container } = render(<CollaborationBoard />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<CollaborationBoard />);
    expect(screen.getByText(/Collaboration/i)).toBeTruthy();
  });
});