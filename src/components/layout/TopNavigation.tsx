import { useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';

export function TopNavigation() {
  const { currentView, setCurrentView, settings, currentProject, projects, setCurrentProject, ollamaStatus, backendAvailable, checkBackendAvailability, updateSettings, keyCredits } = useAppStore();
  const healthInterval = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    const initCheck = setTimeout(checkBackendAvailability, 3000);
    healthInterval.current = setInterval(checkBackendAvailability, 30000);
    return () => { clearTimeout(initCheck); clearInterval(healthInterval.current); };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: '◈' },
    { id: 'workspace' as const, label: 'Workspace', icon: '⊞' },
    { id: 'settings' as const, label: 'Settings', icon: '⚙' },
  ];

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  const aiStatusColor = ollamaStatus === 'connected' ? 'bg-emerald-500' : ollamaStatus === 'checking' ? 'bg-amber-500' : 'bg-red-500';
  const serverStatusColor = backendAvailable ? 'bg-emerald-500' : 'bg-red-500';

  // Compute best key credit percentage for the pill
  const bestCredit = Object.values(keyCredits).reduce<{ pct: number } | null>((best, c) => {
    if (!c.ok || !c.limit) return best;
    const pct = Math.round((1 - (c.usage ?? 0) / c.limit) * 100);
    if (!best || pct > best.pct) return { pct };
    return best;
  }, null);
  const creditColor = !bestCredit ? '' : bestCredit.pct >= 30 ? 'text-emerald-500' : bestCredit.pct >= 10 ? 'text-amber-500' : 'text-red-500';
  const creditBg = !bestCredit ? '' : bestCredit.pct >= 30 ? 'bg-emerald-500/10' : bestCredit.pct >= 10 ? 'bg-amber-500/10' : 'bg-red-500/10';

  return (
    <nav className="flex items-center justify-between px-4 h-12 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <button onClick={() => setCurrentView('home')} className="flex items-center gap-1.5 group">
          <span className="text-lg font-bold tracking-tight">dost</span>
          <span className="text-xs font-light text-muted-foreground group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-purple-500 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">studio</span>
        </button>
        <div className="flex items-center gap-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`relative px-2.5 py-1 rounded-md text-xs transition-all ${
                currentView === item.id
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.icon} {item.label}
              {currentView === item.id && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-foreground/30 animate-scale-in" />
              )}
            </button>
          ))}
        </div>
        {currentProject && currentView === 'workspace' && (
          <span className="text-xs text-muted-foreground truncate max-w-[180px] border-l border-border pl-3 ml-1">{currentProject.name}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {currentView === 'workspace' && projects.length > 1 && (
          <select
            value={currentProject?.id || ''}
            onChange={(e) => { const p = projects.find((p) => p.id === e.target.value); if (p) setCurrentProject(p); }}
            className="text-xs bg-transparent border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none max-w-[120px]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={toggleTheme}
          className="w-6 h-6 flex items-center justify-center rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-300"
          title={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className="inline-block transition-transform duration-300" style={{ transform: settings.theme === 'dark' ? 'rotate(0deg)' : 'rotate(180deg)' }}>
            {settings.theme === 'dark' ? '☀' : '☾'}
          </span>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1" title={backendAvailable ? 'Server connected' : 'Server unavailable'}>
            <span className={`w-1.5 h-1.5 rounded-full ${serverStatusColor}`} />
            <span className={`w-1.5 h-1.5 rounded-full ${aiStatusColor}`} />
          </div>
          {bestCredit && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${creditColor} ${creditBg}`} title="Credits remaining">
              {bestCredit.pct}%
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
