FILE: src/pages/HomeDashboard.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Users, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import ChartComponent from './ChartComponent';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
}

const MetricCard = ({ title, value, change, icon }: MetricCardProps) => {
  const isPositive = change >= 0;
  
  return (
    <div className="bg-white rounded-lg shadow p-6 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <div className="p-2 rounded-md bg-gray-50">{icon}</div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <span className="text-sm font-medium">
              {isPositive ? '+' : ''}{change}%
            </span>
            <TrendingUp className={`w-4 h-4 ml-1 ${isPositive ? '' : 'rotate-180'}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

const HomeDashboard = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'reports'>('overview');

  // Mock data
  const metrics = [
    {
      title: 'Active Users',
      value: '2,456',
      change: 12.3,
      icon: <Users className="w-5 h-5 text-blue-500" />,
    },
    {
      title: 'Sessions',
      value: '5,342',
      change: 8.1,
      icon: <Activity className="w-5 h-5 text-purple-500" />,
    },
    {
      title: 'Avg. Session',
      value: '2m 45s',
      change: -3.2,
      icon: <Clock className="w-5 h-5 text-amber-500" />,
    },
    {
      title: 'Bounce Rate',
      value: '34.5%',
      change: -5.7,
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${timeRange === '7d' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${timeRange === '30d' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeRange('90d')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${timeRange === '90d' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              90 Days
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'analytics' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'reports' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Reports
            </button>
          </nav>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              change={metric.change}
              icon={metric.icon}
            />
          ))}
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">User Activity</h2>
            <Link
              to="/analytics"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View details
            </Link>
          </div>
          <ChartComponent timeRange={timeRange} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {[
                { id: 1, user: 'Alex Johnson', action: 'created a new project', time: '2 hours ago' },
                { id: 2, user: 'Maria Garcia', action: 'updated dashboard settings', time: '4 hours ago' },
                { id: 3, user: 'Sam Wilson', action: 'completed onboarding', time: '1 day ago' },
                { id: 4, user: 'Taylor Smith', action: 'invited 3 team members', time: '2 days ago' },
              ].map((activity) => (
                <div key={activity.id} className="flex items-start">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {activity.user.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.user} <span className="text-gray-500 font-normal">{activity.action}</span>
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/projects/new"
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-blue-100 mb-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">New Project</span>
                </div>
              </Link>
              <Link
                to="/team/invite"
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-green-100 mb-2">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Invite Team</span>
                </div>
              </Link>
              <Link
                to="/settings"
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-purple-100 mb-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Settings</span>
                </div>
              </Link>
              <Link
                to="/analytics"
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-amber-100 mb-2">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">View Analytics</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomeDashboard;