I'll create a comprehensive data visualization page with interactive charts using Recharts. Here's the complete implementation:

FILE: src/pages/DataVisualization.tsx
import { useState } from 'react';
import { LineChart, BarChart, PieChart, Line, Bar, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Download, RefreshCw, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DataPoint {
  date: string;
  value: number;
  category: string;
}

interface ChartData {
  id: string;
  name: string;
  data: DataPoint[];
  color: string;
}

const DataVisualization = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [activeChart, setActiveChart] = useState<'line' | 'bar' | 'pie'>('line');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data generation
  const generateData = (): ChartData[] => {
    const categories = ['Sales', 'Expenses', 'Profit', 'Users', 'Revenue'];
    const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
    
    return categories.map((category, index) => ({
      id: `chart-${index}`,
      name: category,
      color: colors[index],
      data: Array.from({ length: timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 12 }, (_, i) => ({
        date: timeRange === 'year' 
          ? new Date(2023, i, 1).toLocaleDateString('en-US', { month: 'short' })
          : new Date(2023, 0, i + 1).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        value: Math.floor(Math.random() * 1000) + 500,
        category: category
      }))
    }));
  };

  const [chartData, setChartData] = useState<ChartData[]>(generateData());

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setChartData(generateData());
      setIsLoading(false);
    }, 800);
  };

  const handleDownload = () => {
    // In a real app, this would export the data
    console.log('Exporting data:', chartData);
  };

  const flattenedData = chartData.flatMap(chart => 
    chart.data.map(item => ({ ...item, name: chart.name }))
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Data Visualization Dashboard</h1>
        <p className="text-gray-600 mt-2">Interactive charts for analyzing business metrics</p>
      </header>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveChart('line')}
              className={`px-4 py-2 rounded-md ${activeChart === 'line' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              Line Chart
            </button>
            <button
              onClick={() => setActiveChart('bar')}
              className={`px-4 py-2 rounded-md ${activeChart === 'bar' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              Bar Chart
            </button>
            <button
              onClick={() => setActiveChart('pie')}
              className={`px-4 py-2 rounded-md ${activeChart === 'pie' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              Pie Chart
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'year')}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>

            <button
              onClick={refreshData}
              disabled={isLoading}
              className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {activeChart === 'line' ? (
              <LineChart data={flattenedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {chartData.map((chart) => (
                  <Line
                    key={chart.id}
                    type="monotone"
                    dataKey="value"
                    name={chart.name}
                    data={chart.data}
                    stroke={chart.color}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            ) : activeChart === 'bar' ? (
              <BarChart data={flattenedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {chartData.map((chart) => (
                  <Bar
                    key={chart.id}
                    dataKey="value"
                    name={chart.name}
                    data={chart.data}
                    fill={chart.color}
                  />
                ))}
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={chartData.map(chart => ({
                    name: chart.name,
                    value: chart.data.reduce((sum, item) => sum + item.value, 0)
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((chart, index) => (
                    <Cell key={`cell-${index}`} fill={chart.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {chartData.map((chart) => (
          <div key={chart.id} className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-800">{chart.name}</h3>
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: chart.color }} />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {chart.data.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {timeRange === 'week' ? 'Last 7 days' : timeRange === 'month' ? 'Last 30 days' : 'Last 12 months'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataVisualization;
This implementation includes:

1. Three types of interactive charts (Line, Bar, Pie) using Recharts
2. Time range filtering (week/month/year)
3. Data refresh functionality
4. Export button (mock implementation)
5. Responsive design with TailwindCSS
6. Summary cards showing totals for each metric
7. Loading states and proper TypeScript typing
8. Realistic mock data generation based on selected time range
9. Clean, organized UI with proper spacing and visual hierarchy

The component is fully self-contained with no external UI library dependencies, using only TailwindCSS for styling and Recharts for visualization.