FILE: src/pages/StudentOutcomesOverview.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BookOpen, GraduationCap, TrendingUp, ChevronRight } from 'lucide-react';

interface OutcomeData {
  id: string;
  year: number;
  graduationRate: number;
  employmentRate: number;
  furtherEducationRate: number;
  averageSalary: number;
}

interface StudentMetric {
  id: string;
  name: string;
  value: string;
  change: number;
  icon: JSX.Element;
}

const StudentOutcomesOverview = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');
  const [selectedYear, setSelectedYear] = useState<number>(2023);

  // Mock data - in a real app this would come from an API
  const outcomeData: OutcomeData[] = [
    { id: '1', year: 2020, graduationRate: 78, employmentRate: 65, furtherEducationRate: 20, averageSalary: 42000 },
    { id: '2', year: 2021, graduationRate: 82, employmentRate: 68, furtherEducationRate: 22, averageSalary: 45000 },
    { id: '3', year: 2022, graduationRate: 85, employmentRate: 72, furtherEducationRate: 25, averageSalary: 48000 },
    { id: '4', year: 2023, graduationRate: 88, employmentRate: 75, furtherEducationRate: 28, averageSalary: 52000 },
  ];

  const currentYearData = outcomeData.find(data => data.year === selectedYear) || outcomeData[outcomeData.length - 1];

  const metrics: StudentMetric[] = [
    {
      id: '1',
      name: 'Graduation Rate',
      value: `${currentYearData.graduationRate}%`,
      change: currentYearData.graduationRate - (outcomeData.find(d => d.year === selectedYear - 1)?.graduationRate || 0),
      icon: <GraduationCap className="w-5 h-5" />,
    },
    {
      id: '2',
      name: 'Employment Rate',
      value: `${currentYearData.employmentRate}%`,
      change: currentYearData.employmentRate - (outcomeData.find(d => d.year === selectedYear - 1)?.employmentRate || 0),
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      id: '3',
      name: 'Further Education',
      value: `${currentYearData.furtherEducationRate}%`,
      change: currentYearData.furtherEducationRate - (outcomeData.find(d => d.year === selectedYear - 1)?.furtherEducationRate || 0),
      icon: <BookOpen className="w-5 h-5" />,
    },
  ];

  const renderChangeIndicator = (change: number) => {
    const isPositive = change >= 0;
    return (
      <span className={`inline-flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}{change}%
        {isPositive ? (
          <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </span>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Student Outcomes</h1>
          <div className="flex space-x-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {outcomeData.map((data) => (
                <option key={data.id} value={data.year}>
                  {data.year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === 'details' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Detailed Reports
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {metrics.map((metric) => (
                    <div key={metric.id} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                            {metric.icon}
                          </div>
                          <h3 className="text-lg font-medium text-gray-900">{metric.name}</h3>
                        </div>
                        {renderChangeIndicator(metric.change)}
                      </div>
                      <p className="mt-4 text-3xl font-bold text-gray-900">{metric.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Outcomes Over Time</h2>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={outcomeData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="graduationRate" fill="#3b82f6" name="Graduation Rate (%)" />
                        <Bar dataKey="employmentRate" fill="#10b981" name="Employment Rate (%)" />
                        <Bar dataKey="furtherEducationRate" fill="#8b5cf6" name="Further Education (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Average Starting Salary</h2>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={outcomeData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Average Salary']} />
                        <Legend />
                        <Bar dataKey="averageSalary" fill="#f59e0b" name="Average Salary ($)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Year
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Graduation Rate
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employment Rate
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Further Education
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg. Salary
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">View</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {outcomeData.map((data) => (
                        <tr key={data.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {data.year}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {data.graduationRate}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {data.employmentRate}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {data.furtherEducationRate}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${data.averageSalary.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              to={`/student-outcomes/${data.year}`}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                            >
                              Details <ChevronRight className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentOutcomesOverview;