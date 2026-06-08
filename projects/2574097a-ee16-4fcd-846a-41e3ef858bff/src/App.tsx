import React from 'react';
import './index.css';
import App from './App';
import main from './main';
import HomeDashboard from './pages/HomeDashboard';
import InstitutionalEffectivenessReport from './pages/InstitutionalEffectivenessReport';
import StudentOutcomesOverview from './pages/StudentOutcomesOverview';
import SystemLeaderImpactAnalysis from './pages/SystemLeaderImpactAnalysis';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
          <Route element={<Layout />}>
          <Route path="/" element={<HomeDashboard />} />
          <Route path="/student-outcomes" element={<StudentOutcomesOverview />} />
          <Route path="/system-leader-impact" element={<SystemLeaderImpactAnalysis />} />
          <Route path="/institutional-effectiveness" element={<InstitutionalEffectivenessReport />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
