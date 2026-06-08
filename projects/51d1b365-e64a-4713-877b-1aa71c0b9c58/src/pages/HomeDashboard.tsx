I'll create a comprehensive HomeDashboard component with multiple sections showing different metrics and recent activity.

FILE: src/pages/HomeDashboard.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, BarChart2, Clock, Database, Users } from 'lucide-react'

interface RecentActivity {
  id: string
  type: 'login' | 'file_upload' | 'project_update' | 'payment'
  user: string
  timestamp: Date
  description: string
}

interface MetricCard {
  title: string
  value: string | number
  change: number
  icon: React.ReactNode
}

export default function HomeDashboard() {
  const [recentActivities] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'project_update',
      user: 'Alex Johnson',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      description: 'Updated project documentation'
    },
    {
      id: '2',
      type: 'file_upload',
      user: 'Maria Garcia',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      description: 'Uploaded quarterly financial report'
    },
    {
      id: '3',
      type: 'login',
      user: 'Sam Wilson',
      timestamp: new Date(Date.now() - 1000 * 60 * 120),
      description: 'Logged in from new device'
    },
    {
      id: '4',
      type: 'payment',
      user: 'Taylor Smith',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
      description: 'Processed invoice #INV-2023-045'
    }
  ])

  const metricCards: MetricCard[] = [
    {
      title: 'Active Projects',
      value: 12,
      change: 8.2,
      icon: <Database className="w-5 h-5" />
    },
    {
      title: 'Team Members',
      value: 24,
      change: 4.3,
      icon: <Users className="w-5 h-5" />
    },
    {
      title: 'Tasks Completed',
      value: 143,
      change: 12.7,
      icon: <BarChart2 className="w-5 h-5" />
    },
    {
      title: 'Avg. Response Time',
      value: '2.4h',
      change: -1.2,
      icon: <Clock className="w-5 h-5" />
    }
  ]

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds} seconds ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} minutes ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hours ago`
    const days = Math.floor(hours / 24)
    return `${days} days ago`
  }

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'login':
        return <div className="p-2 rounded-full bg-blue-100 text-blue-600"><Activity className="w-4 h-4" /></div>
      case 'file_upload':
        return <div className="p-2 rounded-full bg-green-100 text-green-600"><Database className="w-4 h-4" /></div>
      case 'project_update':
        return <div className="p-2 rounded-full bg-purple-100 text-purple-600"><BarChart2 className="w-4 h-4" /></div>
      case 'payment':
        return <div className="p-2 rounded-full bg-yellow-100 text-yellow-600"><Clock className="w-4 h-4" /></div>
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's what's happening with your projects today.</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metricCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <p className="text-2xl font-semibold mt-1 text-gray-900">{card.value}</p>
              </div>
              <div className="p-2 rounded-lg bg-gray-100">{card.icon}</div>
            </div>
            <div className={`mt-4 text-sm ${card.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {card.change >= 0 ? '↑' : '↓'} {Math.abs(card.change)}% from last week
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Project Status</h2>
            <Link to="/projects" className="text-sm font-medium text-blue-600 hover:text-blue-800">
              View all projects
            </Link>
          </div>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Project status chart would be displayed here</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
            <Link to="/activity" className="text-sm font-medium text-blue-600 hover:text-blue-800">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                {getActivityIcon(activity.type)}
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.user}</p>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
This HomeDashboard component includes:
1. A header section with welcome message
2. Four metric cards showing key statistics with trend indicators
3. A project status section (left side) with placeholder for a chart
4. A recent activity feed (right side) with realistic mock data
5. Proper responsive layout using TailwindCSS grid
6. TypeScript interfaces for all data structures
7. Utility functions for formatting and icons
8. Navigation links to other sections
9. Clean, professional styling with proper spacing and shadows

The component follows all the rules:
- No external UI library imports
- Default export present
- Only TailwindCSS for styling
- Complete working implementation
- Realistic mock data
- Proper TypeScript typing
- Uses react-router-dom for navigation