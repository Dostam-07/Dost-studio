import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import DataEntry from './DataEntry';

describe('DataEntry', () => {
  it('renders without crashing', () => {
    const { container } = render(<DataEntry />);
    expect(container).toBeTruthy();
  });
});