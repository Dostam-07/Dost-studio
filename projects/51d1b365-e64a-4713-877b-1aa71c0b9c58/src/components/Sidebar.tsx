FILE: src/components/Sidebar.tsx
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  GraduationCap, 
  BarChart2, 
  Building2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  path: string;
  name: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const navItems: NavItem[] = [
    { path: '/', name: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { path: '/student-outcomes', name: 'Student Outcomes', icon: <GraduationCap className="w-5 h-5" /> },
    { path: '/system-leader-impact', name: 'System Impact', icon: <BarChart2 className="w-5 h-5" /> },
    { path: '/institutional-framework', name: 'Institution', icon: <Building2 className="w-5 h-5" /> },
  ];

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`flex flex-col h-full bg-indigo-800 text-white transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-4 border-b border-indigo-700">
        <h1 className={`text-xl font-bold whitespace-nowrap ${isCollapsed ? 'hidden' : 'block'}`}>
          EduMetrics
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1 p-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center p-3 rounded-lg hover:bg-indigo-700 transition-colors ${
                  location.pathname === item.path ? 'bg-indigo-600' : ''
                }`}
              >
                <span className="flex-shrink-0">
                  {item.icon}
                </span>
                <span className={`ml-3 ${isCollapsed ? 'hidden' : 'block'}`}>
                  {item.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-indigo-700">
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full p-2 rounded-lg hover:bg-indigo-700 transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
          {!isCollapsed && <span className="ml-2">Collapse</span>}
        </button>
      </div>
    </div>
  );
}