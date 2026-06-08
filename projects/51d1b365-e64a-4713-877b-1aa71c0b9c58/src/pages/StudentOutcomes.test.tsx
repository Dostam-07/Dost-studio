import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import StudentOutcomes from './StudentOutcomes';

describe('StudentOutcomes', () => {
  it('renders without crashing', () => {
    const { container } = render(<StudentOutcomes />);
    expect(container).toBeTruthy();
  });
});