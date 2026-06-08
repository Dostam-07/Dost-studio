import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', name: 'Home Dashboard' },
  { path: '/student-outcomes', name: 'Student Outcomes Overview' },
  { path: '/system-leader-impact', name: 'System Leader Impact Analysis' },
  { path: '/institutional-effectiveness', name: 'Institutional Effectiveness Report' }
];

export default function Layout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <span className="text-xl font-bold text-gray-900">App</span>
              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={location.pathname === item.path
                      ? 'px-3 py-2 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-700'
                      : 'px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-200 px-4 py-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={location.pathname === item.path
                  ? 'block px-3 py-2 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-700'
                  : 'block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100'
                }
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
