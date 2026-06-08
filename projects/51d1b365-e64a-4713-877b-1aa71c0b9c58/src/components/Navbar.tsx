FILE: src/components/Navbar.tsx
import { Link } from 'react-router-dom';
import { Home, GraduationCap, BarChart2, Layers } from 'lucide-react';

interface NavItem {
  path: string;
  name: string;
  icon: React.ReactNode;
}

export default function Navbar() {
  const navItems: NavItem[] = [
    { path: '/', name: 'Home', icon: <Home className="w-5 h-5" /> },
    { path: '/student-outcomes', name: 'Student Outcomes', icon: <GraduationCap className="w-5 h-5" /> },
    { path: '/system-leader-impact', name: 'System Impact', icon: <BarChart2 className="w-5 h-5" /> },
    { path: '/institutional-framework', name: 'Institutional Framework', icon: <Layers className="w-5 h-5" /> },
  ];

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-indigo-600">EduMetrics</span>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors duration-200"
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
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
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden hidden" id="mobile-menu">
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300 transition-colors duration-200"
            >
              <div className="flex items-center">
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}