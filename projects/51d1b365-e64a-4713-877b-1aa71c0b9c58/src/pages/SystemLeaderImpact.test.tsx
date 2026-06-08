import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SystemLeaderImpact from './SystemLeaderImpact';

describe('SystemLeaderImpact', () => {
  it('renders without crashing', () => {
    const { container } = render(<SystemLeaderImpact />);
    expect(container).toBeTruthy();
  });
});