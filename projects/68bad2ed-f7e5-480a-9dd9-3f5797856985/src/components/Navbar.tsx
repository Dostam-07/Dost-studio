# Navbar Component

Here's a complete, production-ready Navbar component with TypeScript and TailwindCSS:

import { useState } from 'react';
import { useRouter } from 'next/router';
import { create } from 'zustand';

// Types for our navigation state
type NavState = {
  mobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
};

// Zustand store for mobile menu state
const useNavStore = create<NavState>((set) => ({
  mobileMenuOpen: false,
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
}));

// Navigation item type
type NavItem = {
  name: string;
  path: string;
  icon?: React.ReactNode;
};

const Navbar = () => {
  const router = useRouter();
  const { mobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useNavStore();
  const [activeItem, setActiveItem] = useState<string>(router.pathname);

  // Navigation items
  const navItems: NavItem[] = [
    { name: 'Home', path: '/' },
    { name: 'Data Entry', path: '/data-entry' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Collaboration Hub', path: '/collaboration-hub' },
  ];

  const handleNavigation = (path: string) => {
    setActiveItem(path);
    router.push(path);
    closeMobileMenu();
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex items-center">
            <div 
              className="flex-shrink-0 flex items-center cursor-pointer"
              onClick={() => handleNavigation('/')}
            >
              <span className="text-xl font-bold text-indigo-600">AppName</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`${
                  activeItem === item.path
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                {item.name}
              </button>
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`${
                  activeItem === item.path
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
### Key Features:

1. **State Management**: Uses Zustand for mobile menu state
2. **Routing**: Supports Next.js routing with proper active state tracking
3. **Responsive Design**: 
   - Desktop navigation (horizontal)
   - Mobile hamburger menu (vertical)
4. **Type Safety**: Proper TypeScript types for all props and state
5. **Accessibility**: 
   - Proper ARIA attributes
   - Screen reader support
6. **Styling**: Pure TailwindCSS classes (no external UI libraries)
7. **Performance**: Minimal re-renders with Zustand state management

### Usage:

Simply import and use the Navbar component in your layout:

import Navbar from '@/components/Navbar';

const Layout = ({ children }) => {
  return (
    <div>
      <Navbar />
      <main>{children}</main>
    </div>
  );
};
The component handles all navigation state internally and provides a clean, responsive navigation experience.