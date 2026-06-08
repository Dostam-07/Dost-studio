I'll create a customizable dashboard widget component with proper TypeScript typing and Tailwind styling.

FILE: src/components/Widget.tsx
import React from 'react';

interface WidgetProps {
  title: string;
  content: React.ReactNode;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
  onAction?: () => void;
  actionLabel?: string;
}

const Widget: React.FC<WidgetProps> = ({
  title,
  content,
  backgroundColor = 'bg-white',
  borderColor = 'border-gray-200',
  className = '',
  onAction,
  actionLabel = 'View More',
}) => {
  return (
    <div
      className={`rounded-lg shadow-sm border ${borderColor} ${backgroundColor} ${className} overflow-hidden transition-all hover:shadow-md`}
    >
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      
      <div className="p-4">
        {content}
      </div>
      
      {onAction && (
        <div className="px-4 py-3 bg-gray-50 text-right border-t border-gray-100">
          <button
            onClick={onAction}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default Widget;
This component includes:
1. TypeScript interface for all props
2. Default values for optional props
3. Customizable colors through Tailwind classes
4. Action button with hover effects
5. Responsive design
6. Proper spacing and borders
7. Shadow and hover effects
8. Semantic HTML structure

Example usage would be:
<Widget 
  title="Recent Activity" 
  backgroundColor="bg-blue-50" 
  borderColor="border-blue-100"
  content={
    <div className="space-y-3">
      <div className="flex items-center">
        <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
        <span className="text-sm">User completed onboarding</span>
      </div>
      <div className="flex items-center">
        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
        <span className="text-sm">New feature deployed</span>
      </div>
    </div>
  }
  onAction={() => console.log('View more clicked')}
/>
The component is fully self-contained with no external dependencies beyond React and TailwindCSS.