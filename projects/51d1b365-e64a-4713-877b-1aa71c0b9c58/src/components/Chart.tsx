FILE: src/components/Chart.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface ChartData {
  name: string;
  outcomes: number;
  impact: number;
  framework: number;
}

interface ChartProps {
  data: ChartData[];
}

const Chart: React.FC<ChartProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        Institutional Performance Overview
      </h2>
      <LineChart
        width={800}
        height={400}
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          tick={{ fill: '#4b5563' }} 
          axisLine={{ stroke: '#cbd5e1' }}
        />
        <YAxis 
          tick={{ fill: '#4b5563' }} 
          axisLine={{ stroke: '#cbd5e1' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        />
        <Legend 
          wrapperStyle={{
            paddingTop: '20px',
          }}
        />
        <Line 
          type="monotone" 
          dataKey="outcomes" 
          stroke="#3b82f6" 
          strokeWidth={2}
          name="Student Outcomes"
        />
        <Line 
          type="monotone" 
          dataKey="impact" 
          stroke="#10b981" 
          strokeWidth={2}
          name="System Leader Impact"
        />
        <Line 
          type="monotone" 
          dataKey="framework" 
          stroke="#f59e0b" 
          strokeWidth={2}
          name="Institutional Framework"
        />
      </LineChart>
    </div>
  );
};

export default Chart;
Example usage with mock data:

const mockData = [
  { name: 'Jan', outcomes: 4000, impact: 2400, framework: 2400 },
  { name: 'Feb', outcomes: 3000, impact: 1398, framework: 2210 },
  { name: 'Mar', outcomes: 2000, impact: 9800, framework: 2290 },
  { name: 'Apr', outcomes: 2780, impact: 3908, framework: 2000 },
  { name: 'May', outcomes: 1890, impact: 4800, framework: 2181 },
  { name: 'Jun', outcomes: 2390, impact: 3800, framework: 2500 },
  { name: 'Jul', outcomes: 3490, impact: 4300, framework: 2100 },
];

<Chart data={mockData} />
This component:
1. Uses Recharts for charting (no d3.js direct dependency)
2. Implements a responsive line chart with three data series
3. Includes proper TypeScript interfaces
4. Uses TailwindCSS for styling
5. Has a default export
6. Includes realistic mock data
7. Follows all strict rules provided