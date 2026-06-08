import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { HomePage } from '@/pages/HomePage';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { SettingsPage } from '@/pages/SettingsPage';

function App() {
  const { currentView, loadProjectsFromServer, loadSettings } = useAppStore();

  // Load persisted settings and projects on first mount
  // Load projects with a small delay so Express has time to start
  useEffect(() => {
    loadSettings();
    const loadProjects = setTimeout(loadProjectsFromServer, 4000);
    return () => clearTimeout(loadProjects);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNavigation />
      <div key={currentView} className="animate-fade-between">
        {currentView === 'home' && <HomePage />}
        {currentView === 'workspace' && <WorkspacePage />}
        {currentView === 'settings' && <SettingsPage />}
      </div>
    </div>
  );
}

export default App;
