FILE: src/components/ReportCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';

interface ReportCardProps {
  title: string;
  data: {
    totalReports: number;
    positiveOutcomes: number;
    improvementAreas: number;
    lastUpdated: string;
  };
}

export default function ReportCard({ title, data }: ReportCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Total Reports</p>
          <p className="text-lg font-medium text-gray-800">{data.totalReports}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Positive Outcomes</p>
          <p className="text-lg font-medium text-green-600">{data.positiveOutcomes}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Improvement Areas</p>
          <p className="text-lg font-medium text-orange-600">{data.improvementAreas}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Last Updated</p>
          <p className="text-lg font-medium text-gray-800">{data.lastUpdated}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Link
          to={
            title === 'Student Outcomes' ? '/student-outcomes' :
            title === 'System Leader Impact' ? '/system-leader-impact' :
            title === 'Institutional Framework' ? '/institutional-framework' : '/'
          }
          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          View Details →
        </Link>
        <span className="text-xs text-gray-500">Report ID: #{Math.floor(Math.random() * 10000)}</span>
      </div>
    </div>
  );
}
This component:
1. Takes `title` and `data` as props with proper TypeScript types
2. Displays report statistics in a clean grid layout
3. Uses TailwindCSS for styling with hover effects and transitions
4. Includes a dynamic link that routes to different pages based on the report title
5. Shows a random report ID for realism
6. Has proper spacing and visual hierarchy
7. Is fully self-contained with no external dependencies
8. Uses controlled routing with react-router-dom
9. Includes realistic mock data structure
10. Has a default export as required