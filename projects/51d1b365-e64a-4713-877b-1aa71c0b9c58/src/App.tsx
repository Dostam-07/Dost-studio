import React from 'react';
import './index.css';
import Charttest from './components/Chart.test';
import Chart from './components/Chart';
import Footertest from './components/Footer.test';
import Footer from './components/Footer';
import Navbartest from './components/Navbar.test';
import Navbar from './components/Navbar';
import ReportCardtest from './components/ReportCard.test';
import ReportCard from './components/ReportCard';
import Sidebartest from './components/Sidebar.test';
import Sidebar from './components/Sidebar';
import HomeDashboardtest from './pages/HomeDashboard.test';
import HomeDashboard from './pages/HomeDashboard';
import InstitutionalFrameworktest from './pages/InstitutionalFramework.test';
import InstitutionalFramework from './pages/InstitutionalFramework';
import StudentOutcomestest from './pages/StudentOutcomes.test';
import StudentOutcomes from './pages/StudentOutcomes';
import SystemLeaderImpacttest from './pages/SystemLeaderImpact.test';
import SystemLeaderImpact from './pages/SystemLeaderImpact';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white">
        <Routes>
        <Route path="/" element={<HomeDashboard />} />
        <Route path="/student-outcomes" element={<StudentOutcomes />} />
        <Route path="/system-leader-impact" element={<SystemLeaderImpact />} />
        <Route path="/institutional-framework" element={<InstitutionalFramework />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;