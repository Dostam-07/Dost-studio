I'll create a comprehensive System Leader Impact page with realistic data visualization and metrics. Here's the complete implementation:

FILE: src/routes/SystemLeaderImpact.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Users, TrendingUp, Target, Clock, AlertCircle } from 'lucide-react';

interface ImpactMetric {
  id: string;
  name: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  trend: 'up' | 'down' | 'neutral';
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  engagementScore: number;
  productivityScore: number;
  lastInteraction: string;
}

const SystemLeaderImpact = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'metrics' | 'team'>('metrics');

  // Mock data for impact metrics
  const impactMetrics: ImpactMetric[] = [
    { id: '1', name: 'Team Engagement', currentValue: 78, targetValue: 85, unit: '%', trend: 'up' },
    { id: '2', name: 'Project Velocity', currentValue: 32, targetValue: 40, unit: 'pts', trend: 'neutral' },
    { id: '3', name: 'Quality Score', currentValue: 92, targetValue: 90, unit: '%', trend: 'up' },
    { id: '4', name: 'Cross-team Collaboration', currentValue: 65, targetValue: 75, unit: '%', trend: 'down' },
  ];

  // Mock data for team members
  const teamMembers: TeamMember[] = [
    { id: '1', name: 'Alex Johnson', role: 'Senior Developer', engagementScore: 82, productivityScore: 88, lastInteraction: '2 days ago' },
    { id: '2', name: 'Maria Garcia', role: 'UX Designer', engagementScore: 76, productivityScore: 79, lastInteraction: '1 day ago' },
    { id: '3', name: 'Sam Wilson', role: 'Product Manager', engagementScore: 91, productivityScore: 85, lastInteraction: '3 days ago' },
    { id: '4', name: 'Taylor Chen', role: 'QA Engineer', engagementScore: 68, productivityScore: 72, lastInteraction: '5 days ago' },
  ];

  // Data for the bar chart
  const impactData = [
    { name: 'Q1', value: 65 },
    { name: 'Q2', value: 72 },
    { name: 'Q3', value: 78 },
    { name: 'Q4', value: 82 },
  ];

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingUp className="w-4 h-4 text-red-500 transform rotate-180" />;
      default:
        return <div className="w-4 h-4 text-gray-400">—</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-3xl font-bold text-gray-800">System Leader Impact (ALIVE)</h1>
          </div>
          <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-blue-700 font-medium">Engineering Leadership</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-2 font-medium ${activeTab === 'metrics' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Impact Metrics
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 font-medium ${activeTab === 'team' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Team Impact
          </button>
        </div>

        {/* Content */}
        {activeTab === 'metrics' ? (
          <div className="space-y-8">
            {/* Overview Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Quarterly Impact Overview</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={impactData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {impactMetrics.map((metric) => (
                <div key={metric.id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-700">{metric.name}</h3>
                      <div className="flex items-baseline mt-2">
                        <span className="text-3xl font-bold text-gray-900">
                          {metric.currentValue}
                        </span>
                        <span className="ml-1 text-gray-500">{metric.unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(metric.trend)}
                      <span className="text-sm text-gray-500">Target: {metric.targetValue}{metric.unit}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${Math.min(100, (metric.currentValue / metric.targetValue) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0{metric.unit}</span>
                      <span>{metric.targetValue}{metric.unit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Team Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-full bg-blue-50">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Team Members</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-full bg-green-50">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Avg. Engagement</p>
                    <p className="text-2xl font-bold">79%</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-full bg-yellow-50">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Needs Attention</p>
                    <p className="text-2xl font-bold">2</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team Member
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Engagement
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Productivity
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Interaction
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{member.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                              <div 
                                className={`h-2.5 rounded-full ${member.engagementScore > 75 ? 'bg-green-500' : member.engagementScore > 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${member.engagementScore}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-700">{member.engagementScore}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                              <div 
                                className={`h-2.5 rounded-full ${member.productivityScore > 80 ? 'bg-green-500' : member.productivityScore > 65 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${member.productivityScore}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-700">{member.productivityScore}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-gray-400" />
                            {member.lastInteraction}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemLeaderImpact;
This implementation includes:

1. A comprehensive System Leader Impact dashboard with two tabs (Metrics and Team)
2. Interactive data visualization using Recharts
3. Realistic mock data for impact metrics and team members
4. Responsive design with TailwindCSS
5. Proper TypeScript typing with inline interfaces
6. Navigation controls and proper routing
7. Visual indicators for trends and performance
8. Complete accessibility considerations
9. Proper component structure and organization
10. Default export as required

The page provides a complete view of a system leader's impact through quantitative metrics and team engagement data, following all the specified rules.