FILE: src/pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  Calendar, 
  Bell, 
  Settings, 
  User 
} from 'lucide-react';

interface Widget {
  id: string;
  title: string;
  type: 'stats' | 'chart' | 'calendar' | 'list';
  size: 'small' | 'medium' | 'large';
  data: any;
}

interface DashboardData {
  widgets: Widget[];
  recentActivity: {
    id: string;
    action: string;
    timestamp: string;
    user: string;
  }[];
  stats: {
    totalUsers: number;
    activeProjects: number;
    revenue: number;
    completionRate: number;
  };
}

const useDashboardStore = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch
    const fetchData = async () => {
      try {
        // Mock data - in a real app this would come from an API
        const mockData: DashboardData = {
          widgets: [
            {
              id: '1',
              title: 'Monthly Revenue',
              type: 'chart',
              size: 'medium',
              data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                values: [12500, 19000, 14200, 21000, 18500, 23000]
              }
            },
            {
              id: '2',
              title: 'Project Status',
              type: 'stats',
              size: 'small',
              data: {
                completed: 12,
                inProgress: 8,
                pending: 5
              }
            },
            {
              id: '3',
              title: 'Team Calendar',
              type: 'calendar',
              size: 'large',
              data: {
                upcomingEvents: [
                  { title: 'Sprint Review', date: '2023-06-15' },
                  { title: 'Client Meeting', date: '2023-06-18' }
                ]
              }
            },
            {
              id: '4',
              title: 'User Distribution',
              type: 'chart',
              size: 'small',
              data: {
                labels: ['Admin', 'Developers', 'Designers', 'Managers'],
                values: [5, 15, 8, 7]
              }
            }
          ],
          recentActivity: [
            {
              id: '1',
              action: 'Created new project',
              timestamp: '2023-06-10T09:30:00Z',
              user: 'Alex Johnson'
            },
            {
              id: '2',
              action: 'Updated project timeline',
              timestamp: '2023-06-09T14:15:00Z',
              user: 'Sarah Miller'
            },
            {
              id: '3',
              action: 'Completed task #245',
              timestamp: '2023-06-08T16:45:00Z',
              user: 'Michael Chen'
            }
          ],
          stats: {
            totalUsers: 35,
            activeProjects: 25,
            revenue: 125000,
            completionRate: 78
          }
        };

        setTimeout(() => {
          setDashboardData(mockData);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { dashboardData, loading };
};

const WidgetRenderer = ({ widget }: { widget: Widget }) => {
  switch (widget.type) {
    case 'stats':
      return (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium text-gray-700 mb-3">{widget.title}</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 p-2 rounded text-center">
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-xl font-bold text-blue-600">{widget.data.completed}</p>
            </div>
            <div className="bg-yellow-50 p-2 rounded text-center">
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-xl font-bold text-yellow-600">{widget.data.inProgress}</p>
            </div>
            <div className="bg-red-50 p-2 rounded text-center">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-bold text-red-600">{widget.data.pending}</p>
            </div>
          </div>
        </div>
      );
    case 'chart':
      return (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium text-gray-700 mb-3">{widget.title}</h3>
          <div className="h-40 flex items-center justify-center bg-gray-50 rounded">
            <div className="text-center text-gray-400">
              {widget.title.includes('Revenue') ? (
                <LineChart className="w-12 h-12 mx-auto text-blue-400" />
              ) : (
                <PieChart className="w-12 h-12 mx-auto text-green-400" />
              )}
              <p>Chart visualization</p>
            </div>
          </div>
        </div>
      );
    case 'calendar':
      return (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium text-gray-700 mb-3">{widget.title}</h3>
          <div className="space-y-2">
            {widget.data.upcomingEvents.map((event: any) => (
              <div key={event.title} className="flex items-center p-2 border-b">
                <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(event.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return <div className="bg-white rounded-lg shadow p-4">Unknown widget type</div>;
  }
};

const Dashboard = () => {
  const { dashboardData, loading } = useDashboardStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full hover:bg-gray-100">
              <Bell className="w-5 h-5 text-gray-500" />
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100">
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <span className="ml-2 text-sm font-medium">Admin</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-semibold text-gray-800">
                  {dashboardData.stats.totalUsers}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Projects</p>
                <p className="text-2xl font-semibold text-gray-800">
                  {dashboardData.stats.activeProjects}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <LineChart className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Revenue</p>
                <p className="text-2xl font-semibold text-gray-800">
                  ${dashboardData.stats.revenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <PieChart className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                <p className="text-2xl font-semibold text-gray-800">
                  {dashboardData.stats.completionRate}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {dashboardData.widgets.map((widget) => (
            <div
              key={widget.id}
              className={widget.size === 'large' ? 'md:col-span-2' : ''}
            >
              <WidgetRenderer widget={widget} />
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-700">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {dashboardData.recentActivity.map((activity) => (
              <div key={activity.id} className="px-6 py-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-800">
                      {activity.user}{' '}
                      <span className="text-gray-500 font-normal">
                        {activity.action}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 bg-gray-50 text-right">
            <Link
              to="/activity"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View all activity →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;