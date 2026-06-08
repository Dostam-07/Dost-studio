FILE: src/pages/InstitutionalEffectivenessReport.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChevronRight, FileText, BarChart2, Award, Users, BookOpen } from 'lucide-react';

interface ReportMetric {
  id: string;
  title: string;
  value: number;
  target: number;
  trend: 'up' | 'down' | 'neutral';
  description: string;
}

interface SurveyResult {
  name: string;
  value: number;
  color: string;
}

const InstitutionalEffectivenessReport = () => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'surveys' | 'assessments'>('metrics');

  // Mock data for institutional metrics
  const metrics: ReportMetric[] = [
    {
      id: 'retention',
      title: 'Student Retention Rate',
      value: 78.5,
      target: 80,
      trend: 'up',
      description: '1.2% increase from previous year'
    },
    {
      id: 'graduation',
      title: 'Graduation Rate',
      value: 65.3,
      target: 68,
      trend: 'neutral',
      description: 'On track to meet target'
    },
    {
      id: 'employment',
      title: 'Graduate Employment Rate',
      value: 92.1,
      target: 90,
      trend: 'up',
      description: 'Exceeds target by 2.1%'
    },
    {
      id: 'satisfaction',
      title: 'Student Satisfaction',
      value: 88.7,
      target: 85,
      trend: 'up',
      description: '3.7% above target'
    }
  ];

  // Mock data for survey results
  const surveyData: SurveyResult[] = [
    { name: 'Very Satisfied', value: 45, color: '#4ade80' },
    { name: 'Satisfied', value: 35, color: '#86efac' },
    { name: 'Neutral', value: 12, color: '#d1fae5' },
    { name: 'Dissatisfied', value: 5, color: '#fca5a5' },
    { name: 'Very Dissatisfied', value: 3, color: '#f87171' }
  ];

  const renderMetricTrend = (trend: ReportMetric['trend']) => {
    switch (trend) {
      case 'up':
        return <span className="text-green-500">↑</span>;
      case 'down':
        return <span className="text-red-500">↓</span>;
      default:
        return <span className="text-gray-500">→</span>;
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'metrics':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {metrics.map((metric) => (
              <div key={metric.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-800">{metric.title}</h3>
                    <p className="text-sm text-gray-500">{metric.description}</p>
                  </div>
                  <div className="flex items-center">
                    {renderMetricTrend(metric.trend)}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">{metric.value}%</span>
                    <span className="ml-2 text-sm text-gray-500">Target: {metric.target}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div
                      className={`h-2.5 rounded-full ${
                        metric.value >= metric.target ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, (metric.value / metric.target) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'surveys':
        return (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Student Satisfaction Survey Results</h3>
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={surveyData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {surveyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-2/3">
                <div className="space-y-4">
                  {surveyData.map((item) => (
                    <div key={item.name} className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-2"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-700 w-32">{item.name}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full"
                          style={{ width: `${item.value}%`, backgroundColor: item.color }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm font-medium text-gray-900">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'assessments':
        return (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Program Learning Outcomes Assessment</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outcome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assessment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proficiency Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[
                    {
                      program: 'Computer Science',
                      outcome: 'Algorithm Design',
                      method: 'Capstone Project',
                      proficiency: '85%',
                      status: 'Met'
                    },
                    {
                      program: 'Business Admin',
                      outcome: 'Financial Analysis',
                      method: 'Case Study',
                      proficiency: '78%',
                      status: 'Progressing'
                    },
                    {
                      program: 'Nursing',
                      outcome: 'Clinical Skills',
                      method: 'Clinical Evaluation',
                      proficiency: '92%',
                      status: 'Exceeded'
                    },
                    {
                      program: 'Education',
                      outcome: 'Lesson Planning',
                      method: 'Teaching Demo',
                      proficiency: '81%',
                      status: 'Met'
                    }
                  ].map((row, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.program}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.outcome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.proficiency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            row.status === 'Met'
                              ? 'bg-green-100 text-green-800'
                              : row.status === 'Exceeded'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Institutional Effectiveness Report</h1>
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Back to Dashboard
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <p className="text-gray-600 mb-4 md:mb-0">
              Comprehensive view of institutional performance metrics, survey results, and assessment outcomes.
            </p>
            <div className="flex space-x-2">
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <FileText className="mr-2 h-4 w-4" />
                Export Report
              </button>
            </div>
          </div>

          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('metrics')}
                className={`${
                  activeTab === 'metrics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <BarChart2 className="mr-2 h-4 w-4" />
                Key Metrics
              </button>
              <button
                onClick={() => setActiveTab('surveys')}
                className={`${
                  activeTab === 'surveys'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Users className="mr-2 h-4 w-4" />
                Survey Results
              </button>
              <button
                onClick={() => setActiveTab('assessments')}
                className={`${
                  activeTab === 'assessments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Assessments
              </button>
            </nav>
          </div>

          {renderActiveTab()}

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Award className="h-6 w-6" />
                </div>
                <h3 className="ml-4 text-lg font-medium text-gray-800">Accreditation Status</h3>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600">Next review: June 2025</p>
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Fully Accredited
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="ml-4 text-lg font-medium text-gray-800">Recent Reports</h3>
              </div>
              <div className="mt-4 space-y-2">
                <a href="#" className="flex items-center text-sm text-blue-600 hover:text-blue-800">
                  <ChevronRight className="mr-1 h-4 w-4" />
                  Annual Institutional Report 2023
                </a>
                <a href="#" className="flex items-center text-sm text-blue-600 hover:text-blue-800">
                  <ChevronRight className="mr-1 h-4 w-4" />
                  Program Review Summary
                </a>
                <a href="#" className="flex items-center text-sm text-blue-600 hover:text-blue-800">
                  <ChevronRight className="mr-1 h-4 w-4" />
                  Student Satisfaction Analysis
                </a>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <BarChart2 className="h-6 w-6" />
                </div>
                <h3 className="ml-4 text-lg font-medium text-gray-800">Improvement Plans</h3>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600">Active improvement initiatives:</p>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 mr-2"></span>
                    First-year retention program
                  </li>
                  <li className="flex items-start">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5 mr-2"></span>
                    Career services enhancement
                  </li>
                  <li className="flex items-start">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-1.5 mr-2"></span>
                    Faculty development program
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InstitutionalEffectivenessReport;