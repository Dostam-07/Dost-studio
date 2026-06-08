Here's a complete, production-ready SystemLeaderImpactAnalysis component with realistic data visualization and metrics:

FILE: src/pages/SystemLeaderImpactAnalysis.tsx
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart2, Users, Clock, TrendingUp } from 'lucide-react';

interface ImpactMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  icon: React.ReactNode;
}

interface PerformanceData {
  month: string;
  productivity: number;
  engagement: number;
  retention: number;
}

const SystemLeaderImpactAnalysis: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '12m'>('6m');

  // Realistic performance data
  const performanceData: PerformanceData[] = [
    { month: 'Jan', productivity: 78, engagement: 82, retention: 91 },
    { month: 'Feb', productivity: 82, engagement: 85, retention: 93 },
    { month: 'Mar', productivity: 85, engagement: 88, retention: 94 },
    { month: 'Apr', productivity: 88, engagement: 90, retention: 95 },
    { month: 'May', productivity: 90, engagement: 92, retention: 96 },
    { month: 'Jun', productivity: 92, engagement: 94, retention: 97 },
  ];

  // Impact metrics with realistic values
  const impactMetrics: ImpactMetric[] = [
    {
      id: 'productivity',
      name: 'Team Productivity',
      value: 92,
      change: 14,
      icon: <TrendingUp className="w-5 h-5 text-green-500" />,
    },
    {
      id: 'engagement',
      name: 'Employee Engagement',
      value: 94,
      change: 12,
      icon: <Users className="w-5 h-5 text-blue-500" />,
    },
    {
      id: 'retention',
      name: 'Retention Rate',
      value: 97,
      change: 6,
      icon: <Clock className="w-5 h-5 text-purple-500" />,
    },
  ];

  const filteredData = performanceData.slice(
    0,
    timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link 
              to="/" 
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="mr-2" size={18} />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">System Leader Impact Analysis</h1>
            <p className="text-gray-600 mt-1">
              Measure and visualize the impact of system leadership on team performance
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setTimeRange('3m')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                timeRange === '3m'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              3 Months
            </button>
            <button
              onClick={() => setTimeRange('6m')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                timeRange === '6m'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              6 Months
            </button>
            <button
              onClick={() => setTimeRange('12m')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                timeRange === '12m'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              12 Months
            </button>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {impactMetrics.map((metric) => (
            <div
              key={metric.id}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{metric.name}</p>
                  <p className="text-3xl font-bold mt-1 text-gray-900">
                    {metric.value}%
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gray-50">{metric.icon}</div>
              </div>
              <div className="mt-4 flex items-center">
                <span
                  className={`text-sm font-medium ${
                    metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {metric.change >= 0 ? '+' : ''}
                  {metric.change}%
                </span>
                <span className="text-sm text-gray-500 ml-1">vs previous period</span>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Team Performance Trends
            </h2>
            <div className="flex items-center text-gray-500">
              <BarChart2 className="w-5 h-5 mr-2" />
              <span className="text-sm">Monthly Overview</span>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" domain={[70, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="productivity"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                  name="Productivity"
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Engagement"
                />
                <Line
                  type="monotone"
                  dataKey="retention"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Retention"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Insights */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Insights</h2>
          <ul className="space-y-4">
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5">
                <TrendingUp className="w-full h-full" />
              </div>
              <p className="ml-3 text-gray-700">
                <span className="font-medium">Productivity growth:</span> Consistent
                upward trend with 14% improvement over the last 6 months.
              </p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 text-blue-500 mt-0.5">
                <Users className="w-full h-full" />
              </div>
              <p className="ml-3 text-gray-700">
                <span className="font-medium">Engagement correlation:</span> Higher
                engagement scores correlate with productivity gains, suggesting
                effective leadership practices.
              </p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 text-purple-500 mt-0.5">
                <Clock className="w-full h-full" />
              </div>
              <p className="ml-3 text-gray-700">
                <span className="font-medium">Retention stability:</span> Retention
                rates remain consistently high, indicating strong team cohesion under
                current leadership.
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SystemLeaderImpactAnalysis;
This component includes:
1. A responsive line chart showing performance trends
2. Three key metric cards with icons and change indicators
3. Time range filtering functionality
4. Key insights section with icon bullets
5. Proper TypeScript typing for all data structures
6. Complete TailwindCSS styling without any external UI libraries
7. Realistic mock data for productivity, engagement, and retention metrics
8. Responsive layout that works on all screen sizes
9. Semantic HTML structure
10. Proper navigation back link

The component is fully self-contained with all necessary types and interfaces defined inline.