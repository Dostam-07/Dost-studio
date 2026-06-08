import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserManagement from './UserManagement';

describe('UserManagement', () => {
  it('renders without crashing', () => {
    const { container } = render(<UserManagement />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<UserManagement />);
    expect(screen.getByText(/Manage/i)).toBeTruthy();
  });
});