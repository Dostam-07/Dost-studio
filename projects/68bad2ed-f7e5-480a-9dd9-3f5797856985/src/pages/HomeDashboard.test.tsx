import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import HomeDashboard from './HomeDashboard';

describe('HomeDashboard', () => {
  it('renders without crashing', () => {
    const { container } = render(<HomeDashboard />);
    expect(container).toBeTruthy();
  });
});