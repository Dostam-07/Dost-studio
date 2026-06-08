import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReportExport from './ReportExport';

describe('ReportExport', () => {
  it('renders without crashing', () => {
    const { container } = render(<ReportExport />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<ReportExport />);
    expect(screen.getByText(/Export/i)).toBeTruthy();
  });
});