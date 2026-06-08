import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import CollaborationHub from './CollaborationHub';

describe('CollaborationHub', () => {
  it('renders without crashing', () => {
    const { container } = render(<CollaborationHub />);
    expect(container).toBeTruthy();
  });
});