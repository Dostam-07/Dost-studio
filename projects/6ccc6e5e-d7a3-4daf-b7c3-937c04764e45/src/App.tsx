import React from 'react';
import './index.css';
import App from './App';
import Navbar from './components/Navbar';
import Widget from './components/Widget';
import main from './main';
import Dashboard from './pages/Dashboard';
import DataVisualization from './pages/DataVisualization';
import ReportExport from './pages/ReportExport';
import UserManagement from './pages/UserManagement';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
          <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/data-visualization" element={<DataVisualization />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/report-export" element={<ReportExport />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;