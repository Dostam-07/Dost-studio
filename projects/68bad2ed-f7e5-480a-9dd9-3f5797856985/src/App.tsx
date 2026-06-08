import React from 'react';
import './index.css';
import AnalyticsCharttest from './components/AnalyticsChart.test';
import AnalyticsChart from './components/AnalyticsChart';
import CollaborationBoardtest from './components/CollaborationBoard.test';
import CollaborationBoard from './components/CollaborationBoard';
import DataFormtest from './components/DataForm.test';
import DataForm from './components/DataForm';
import Navbartest from './components/Navbar.test';
import Navbar from './components/Navbar';
import Analyticstest from './pages/Analytics.test';
import Analytics from './pages/Analytics';
import CollaborationHubtest from './pages/CollaborationHub.test';
import CollaborationHub from './pages/CollaborationHub';
import DataEntrytest from './pages/DataEntry.test';
import DataEntry from './pages/DataEntry';
import HomeDashboardtest from './pages/HomeDashboard.test';
import HomeDashboard from './pages/HomeDashboard';

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Analyticstest />
    </div>
  );
}

export default App;