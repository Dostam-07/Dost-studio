import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Analytics from './Analytics';

describe('Analytics', () => {
  it('renders without crashing', () => {
    const { container } = render(<Analytics />);
    expect(container).toBeTruthy();
  });
});