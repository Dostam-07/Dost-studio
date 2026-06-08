import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import InstitutionalEffectivenessReport from './InstitutionalEffectivenessReport';

describe('InstitutionalEffectivenessReport', () => {
  it('renders without crashing', () => {
    const { container } = render(<InstitutionalEffectivenessReport />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<InstitutionalEffectivenessReport />);
    expect(screen.getByText(/Institutional/i)).toBeTruthy();
  });
});