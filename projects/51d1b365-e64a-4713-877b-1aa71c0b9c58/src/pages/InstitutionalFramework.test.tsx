import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import InstitutionalFramework from './InstitutionalFramework';

describe('InstitutionalFramework', () => {
  it('renders without crashing', () => {
    const { container } = render(<InstitutionalFramework />);
    expect(container).toBeTruthy();
  });
});