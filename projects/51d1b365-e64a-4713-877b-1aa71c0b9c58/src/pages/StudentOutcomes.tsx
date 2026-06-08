FILE: src/routes/StudentOutcomes.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BookOpen, GraduationCap, Users, ArrowRight } from 'lucide-react';

interface OutcomeData {
  year: string;
  graduationRate: number;
  employmentRate: number;
  furtherEducationRate: number;
}

interface ProgramData {
  id: string;
  name: string;
  outcomes: OutcomeData[];
}

const StudentOutcomes = () => {
  const [activeProgram, setActiveProgram] = useState<string>('computer-science');

  // Mock data for student outcomes
  const programs: ProgramData[] = [
    {
      id: 'computer-science',
      name: 'Computer Science',
      outcomes: [
        { year: '2020', graduationRate: 85, employmentRate: 78, furtherEducationRate: 15 },
        { year: '2021', graduationRate: 88, employmentRate: 82, furtherEducationRate: 12 },
        { year: '2022', graduationRate: 90, employmentRate: 85, furtherEducationRate: 10 },
        { year: '2023', graduationRate: 92, employmentRate: 88, furtherEducationRate: 8 },
      ],
    },
    {
      id: 'business',
      name: 'Business Administration',
      outcomes: [
        { year: '2020', graduationRate: 82, employmentRate: 75, furtherEducationRate: 18 },
        { year: '2021', graduationRate: 84, employmentRate: 78, furtherEducationRate: 16 },
        { year: '2022', graduationRate: 86, employmentRate: 80, furtherEducationRate: 14 },
        { year: '2023', graduationRate: 88, employmentRate: 83, furtherEducationRate: 12 },
      ],
    },
    {
      id: 'engineering',
      name: 'Engineering',
      outcomes: [
        { year: '2020', graduationRate: 80, employmentRate: 82, furtherEducationRate: 12 },
        { year: '2021', graduationRate: 83, employmentRate: 85, furtherEducationRate: 10 },
        { year: '2022', graduationRate: 85, employmentRate: 87, furtherEducationRate: 8 },
        { year: '2023', graduationRate: 87, employmentRate: 89, furtherEducationRate: 6 },
      ],
    },
  ];

  const currentProgram = programs.find(program => program.id === activeProgram) || programs[0];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Student Outcomes (ERLAW)</h1>
        <p className="text-gray-600 mt-2">
          Tracking graduation rates, employment outcomes, and further education statistics
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Program selector */}
        <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Programs</h2>
          <ul className="space-y-2">
            {programs.map(program => (
              <li key={program.id}>
                <button
                  onClick={() => setActiveProgram(program.id)}
                  className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                    activeProgram === program.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {program.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Graduation Rate</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {currentProgram.outcomes[currentProgram.outcomes.length - 1].graduationRate}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Employment Rate</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {currentProgram.outcomes[currentProgram.outcomes.length - 1].employmentRate}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                  <BookOpen size={24} />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Further Education</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {currentProgram.outcomes[currentProgram.outcomes.length - 1].furtherEducationRate}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              {currentProgram.name} Outcomes Over Time
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={currentProgram.outcomes}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="graduationRate" fill="#3b82f6" name="Graduation Rate" />
                  <Bar dataKey="employmentRate" fill="#10b981" name="Employment Rate" />
                  <Bar dataKey="furtherEducationRate" fill="#8b5cf6" name="Further Education" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Additional resources */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Resources</h2>
            <div className="space-y-3">
              <Link
                to="/career-services"
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md transition-colors"
              >
                <span className="text-blue-600 font-medium">Career Services</span>
                <ArrowRight size={18} className="text-gray-400" />
              </Link>
              <Link
                to="/alumni-network"
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md transition-colors"
              >
                <span className="text-blue-600 font-medium">Alumni Network</span>
                <ArrowRight size={18} className="text-gray-400" />
              </Link>
              <Link
                to="/graduate-programs"
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md transition-colors"
              >
                <span className="text-blue-600 font-medium">Graduate Programs</span>
                <ArrowRight size={18} className="text-gray-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentOutcomes;
This component includes:
1. A responsive layout with program selection sidebar
2. Summary cards showing key metrics
3. An interactive bar chart showing trends over time
4. Resource links for further information
5. Realistic mock data for different academic programs
6. Proper TypeScript typing
7. Complete styling with TailwindCSS
8. React state management for the active program
9. Icons from lucide-react
10. Responsive design for different screen sizes