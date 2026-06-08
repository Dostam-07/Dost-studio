Here's a complete CollaborationHub page component with TypeScript and TailwindCSS:

import { useState } from 'react';

interface Project {
  id: string;
  title: string;
  description: string;
  members: number;
  lastUpdated: string;
  status: 'active' | 'archived' | 'completed';
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isCurrentUser: boolean;
}

const CollaborationHub = () => {
  const [activeTab, setActiveTab] = useState<'projects' | 'messages' | 'resources'>('projects');
  const [searchQuery, setSearchQuery] = useState('');

  // Sample data
  const projects: Project[] = [
    {
      id: '1',
      title: 'Website Redesign',
      description: 'Complete overhaul of company website with new branding',
      members: 5,
      lastUpdated: '2 hours ago',
      status: 'active',
    },
    {
      id: '2',
      title: 'Mobile App Development',
      description: 'Building cross-platform mobile application for iOS and Android',
      members: 8,
      lastUpdated: '1 day ago',
      status: 'active',
    },
    {
      id: '3',
      title: 'Marketing Campaign Q4',
      description: 'End of year promotional materials and social media strategy',
      members: 4,
      lastUpdated: '3 days ago',
      status: 'completed',
    },
  ];

  const messages: Message[] = [
    {
      id: '1',
      sender: 'Alex Johnson',
      content: 'Has anyone reviewed the latest design mockups?',
      timestamp: '10:30 AM',
      isCurrentUser: false,
    },
    {
      id: '2',
      sender: 'You',
      content: 'Yes, I left some comments on Figma',
      timestamp: '10:45 AM',
      isCurrentUser: true,
    },
    {
      id: '3',
      sender: 'Sam Wilson',
      content: 'The API endpoints are ready for integration',
      timestamp: '11:20 AM',
      isCurrentUser: false,
    },
  ];

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Collaboration Hub</h1>
          <p className="text-gray-600 mt-2">
            Connect with your team, share resources, and track project progress
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('projects')}
                className={`px-6 py-3 font-medium text-sm ${activeTab === 'projects' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Projects
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`px-6 py-3 font-medium text-sm ${activeTab === 'messages' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Messages
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`px-6 py-3 font-medium text-sm ${activeTab === 'resources' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Resources
              </button>
            </nav>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {activeTab === 'projects' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Active Projects</h2>
                <div className="space-y-4">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{project.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            project.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : project.status === 'completed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {project.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center text-sm text-gray-500">
                        <span>{project.members} members</span>
                        <span className="mx-2">•</span>
                        <span>Last updated {project.lastUpdated}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'messages' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Messages</h2>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-lg ${
                        message.isCurrentUser
                          ? 'bg-blue-50 ml-8'
                          : 'bg-gray-50 mr-8'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-gray-900">
                          {message.isCurrentUser ? 'You' : message.sender}
                        </span>
                        <span className="text-xs text-gray-500">{message.timestamp}</span>
                      </div>
                      <p className="text-gray-700">{message.content}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Type your message here..."
                  />
                  <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    Send Message
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'resources' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Shared Resources</h2>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No resources shared yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Upload files or share links with your team
                  </p>
                  <div className="mt-6">
                    <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      <svg
                        className="-ml-1 mr-2 h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Upload File
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationHub;
This component includes:
1. A tabbed interface for Projects, Messages, and Resources
2. A search functionality for projects
3. Sample project data with status indicators
4. A messaging interface with different styling for current user messages
5. A resources section with an empty state
6. Proper TypeScript typing for all data structures
7. Responsive design using TailwindCSS
8. Interactive elements with hover and focus states

The component is self-contained with no external dependencies beyond React and TypeScript, and uses only TailwindCSS for styling.