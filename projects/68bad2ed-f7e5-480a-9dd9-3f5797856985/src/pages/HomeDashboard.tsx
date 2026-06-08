Here's a complete `HomeDashboard` page component for the root route ("/") using React, TypeScript, and TailwindCSS:

import React from 'react';

type StatsCardProps = {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
};

const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, icon }) => {
  const isPositive = change >= 0;

  return (
    <div className="bg-white rounded-lg shadow p-6 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <div className="p-2 rounded-lg bg-gray-100">{icon}</div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'} flex items-center`}>
            {isPositive ? (
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            {Math.abs(change)}% {isPositive ? 'increase' : 'decrease'} from last month
          </p>
        </div>
      </div>
    </div>
  );
};

const RecentActivityItem: React.FC<{ title: string; time: string; user: string }> = ({ title, time, user }) => {
  return (
    <div className="flex items-start py-3">
      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
        <span className="text-blue-600 font-medium">{user.charAt(0).toUpperCase()}</span>
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">
          {user} • {time}
        </p>
      </div>
    </div>
  );
};

const HomeDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's what's happening with your business today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Revenue"
          value="$24,780"
          change={12.5}
          icon={
            <svg
              className="w-6 h-6 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatsCard
          title="New Customers"
          value="1,254"
          change={8.1}
          icon={
            <svg
              className="w-6 h-6 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          }
        />
        <StatsCard
          title="Active Projects"
          value="42"
          change={-2.3}
          icon={
            <svg
              className="w-6 h-6 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
        />
        <StatsCard
          title="Tasks Completed"
          value="87%"
          change={4.7}
          icon={
            <svg
              className="w-6 h-6 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Revenue Overview</h2>
            <select className="bg-gray-100 border border-gray-300 text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 3 months</option>
            </select>
          </div>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Revenue chart would be displayed here</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            <RecentActivityItem
              title="Project 'Phoenix' completed"
              time="2 hours ago"
              user="alex"
            />
            <RecentActivityItem
              title="New customer onboarded"
              time="4 hours ago"
              user="jamie"
            />
            <RecentActivityItem
              title="Invoice #1042 paid"
              time="1 day ago"
              user="taylor"
            />
            <RecentActivityItem
              title="New feature deployed"
              time="2 days ago"
              user="casey"
            />
          </div>
          <button className="mt-6 w-full py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
            View all activity
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeDashboard;
This `HomeDashboard` component includes:

1. A header section with welcome message
2. Four stat cards showing key metrics with trend indicators
3. A revenue overview section with a placeholder chart
4. A recent activity feed showing user actions
5. Responsive grid layouts that adapt to different screen sizes
6. Custom SVG icons built with TailwindCSS
7. Proper TypeScript typing for all props
8. Composed smaller components (StatsCard, RecentActivityItem)

The component follows best practices for:
- Type safety with TypeScript
- Responsive design with TailwindCSS
- Component composition
- Accessibility (proper heading hierarchy, focus states)
- Clean, maintainable code structure

All styling is done with TailwindCSS classes - no external UI libraries are used.