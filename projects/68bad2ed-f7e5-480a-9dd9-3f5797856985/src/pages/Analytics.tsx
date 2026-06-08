import React from 'react';

// TypeScript type for analytics data
interface AnalyticsData {
  metric: string;
  value: number;
  changePercentage?: number;
}

// Mock data for analytics
const mockAnalyticsData: AnalyticsData[] = [
  { metric: 'Total Visitors', value: 24500, changePercentage: 12 },
  { metric: 'Page Views', value: 89000, changePercentage: -5 },
  { metric: 'Bounce Rate', value: 32, changePercentage: -8 },
  { metric: 'Average Session Duration', value: 5.2 },
];

const Analytics: React.FC = () => {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockAnalyticsData.map((item, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-700">{item.metric}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{item.value}</p>
            {item.changePercentage && (
              <p className={`text-sm mt-2 ${
                item.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {item.changePercentage}% {item.changePercentage >= 0 ? '↑' : '↓'}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Visitors Over Time</h2>
        <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center">
          <span className="text-gray-500">Chart Placeholder</span>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
### Explanation:
1. **Analytics Component**: The `Analytics` page component is a React functional component that displays an analytics dashboard.
2. **TypeScript Interface**: `AnalyticsData` interface defines the structure of the analytics data.
3. **Mock Data**: `mockAnalyticsData` provides sample data to populate the analytics cards.
4. **TailwindCSS Styling**: The component uses TailwindCSS classes for styling, ensuring a clean and responsive design.
5. **Default Export**: The component is exported as the default export of the module.

This component is complete and ready to be used as a page in a React application.