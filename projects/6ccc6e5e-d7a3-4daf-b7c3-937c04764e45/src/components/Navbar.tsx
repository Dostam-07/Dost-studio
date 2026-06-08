FILE: src/components/Navbar.tsx
import { Link } from 'react-router-dom';
import { Home, Users, Settings, Bell } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm fixed w-full z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              to="/"
              className="text-xl font-semibold text-gray-800 hover:text-gray-600 flex items-center"
            >
              <Home className="h-6 w-6 mr-2" />
              MyApp
            </Link>
          </div>
          
          <div className="flex items-center space-x-8">
            <Link
              to="/team"
              className="text-gray-500 hover:text-gray-700 flex items-center"
            >
              <Users className="h-5 w-5 mr-2" />
              Team
            </Link>
            
            <Link
              to="/notifications"
              className="text-gray-500 hover:text-gray-700 relative"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                3
              </span>
            </Link>
            
            <Link
              to="/settings"
              className="text-gray-500 hover:text-gray-700 flex items-center"
            >
              <Settings className="h-5 w-5 mr-2" />
              Settings
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}