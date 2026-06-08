import { useAppStore } from '@/stores/appStore';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { FileExplorer } from '@/components/project/FileExplorer';
import { EditorPanel } from '@/components/editor/EditorPanel';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { KnowledgeGraphView } from '@/components/project/KnowledgeGraphView';
import { ProductManager } from '@/components/project/ProductManager';
import { UXReviewer } from '@/components/project/UXReviewer';
import { DesignCritic } from '@/components/project/DesignCritic';
import { VisionUpload } from '@/components/project/VisionUpload';
import { FigmaImport } from '@/components/project/FigmaImport';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { versioning } from '@/services/versioning';

const API_BASE = '/api';

// ─── Export button ────────────────────────────────────────────────────────────

function ExportButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/export/${projectId}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + (err as Error).message);
    } finally {
      setExporting(false);
    }
  }, [projectId, projectName, exporting]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={exporting}
      className="gap-1.5 text-xs shrink-0"
      title="Download project as ZIP"
    >
      {exporting
        ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : <span>↓</span>
      }
      {exporting ? 'Exporting…' : 'Export'}
    </Button>
  );
}

// ─── Project history drawer ───────────────────────────────────────────────────

function ProjectDrawer({
  open,
  onClose,
  onDeleteProject,
}: {
  open: boolean;
  onClose: () => void;
  onDeleteProject: (projectId: string) => void;
}) {
  const { projects, currentProject, setCurrentProject, setCurrentView } = useAppStore();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sorted = [...projects].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );

  return (
    <div className="absolute top-full left-0 mt-1 z-50" ref={ref}>
      <div className="w-72 rounded-xl border border-border bg-background shadow-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-muted/10 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">All Projects</span>
          <span className="text-[10px] text-muted-foreground">{projects.length} total</span>
        </div>
        <ScrollArea className="max-h-80">
          <div className="p-1.5 space-y-0.5">
            {sorted.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No projects yet</p>
            )}
            {sorted.map((p) => {
              const isActive = p.id === currentProject?.id;
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setCurrentProject(p);
                    setCurrentView('workspace');
                    onClose();
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrentProject(p); setCurrentView('workspace'); onClose(); } }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group ${
                    isActive
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted/50 border border-transparent'
                  } cursor-pointer`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] text-muted-foreground">▦</span>
                    <span className={`text-xs font-medium truncate ${isActive ? 'text-primary' : 'group-hover:text-foreground'}`}>
                      {p.name}
                    </span>
                    {isActive && (
                      <Badge variant="secondary" className="text-[9px] ml-auto shrink-0">active</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pl-4">
                    <span className="text-[10px] text-muted-foreground/60 truncate flex-1">
                      {p.description || p.prompt?.slice(0, 60) || 'No description'}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40 shrink-0">
                      {p.files?.length ?? 0} files
                    </span>
                  </div>
                  <div className="flex items-center justify-between pl-4 mt-0.5 gap-2">
                    <span className="text-[10px] text-muted-foreground/40">
                      {new Date(p.updatedAt || p.createdAt).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                      className="text-[10px] text-red-400 hover:text-red-300"
                      title="Delete project"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="px-3 py-2 border-t border-border">
          <button
            onClick={() => { setCurrentView('home'); onClose(); }}
            className="w-full text-xs text-center text-primary hover:underline"
          >
            + Create new project
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state (no project selected) ───────────────────────────────────────

function NoProjectView({ onDeleteProject }: { onDeleteProject: (projectId: string) => void }) {
  const { projects, setCurrentProject, setCurrentView } = useAppStore();

  const sorted = [...projects].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );

  return (
    <div className="flex flex-col items-center justify-start h-[calc(100vh-3.5rem)] overflow-y-auto px-6 py-10">
      <div className="text-center mb-8 max-w-md">
        <div className="text-5xl mb-4 text-muted-foreground/20">◈</div>
        <h2 className="text-xl font-semibold mb-1">No project open</h2>
        <p className="text-sm text-muted-foreground">Select a project below or create a new one to get started.</p>
        <Button
          className="mt-4 gap-1.5"
          onClick={() => setCurrentView('home')}
        >
          <span>+</span> Create new project
        </Button>
      </div>

      {sorted.length > 0 && (
        <div className="w-full max-w-2xl">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Your Projects — {sorted.length} total
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sorted.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setCurrentProject(p);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrentProject(p); } }}
                className="text-left p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-accent/20 transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground text-sm">▦</span>
                    <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {p.name}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {p.files?.length ?? 0} files
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground/70 line-clamp-2 leading-relaxed">
                  {p.description || p.prompt?.slice(0, 100) || 'No description'}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  {p.versions?.length > 0 && (
                    <span className="text-[10px] text-muted-foreground/50">
                      ↻ {p.versions.length} version{p.versions.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {(p.prd?.features?.length ?? 0) > 0 && (
                    <span className="text-[10px] text-muted-foreground/50">
                      ✦ {p.prd?.features?.length ?? 0} features
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/40 ml-auto">
                    {new Date(p.updatedAt || p.createdAt).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric'
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                  className="mt-3 text-[10px] text-red-400 hover:text-red-300"
                  title="Delete project"
                >
                  Delete project
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main workspace ───────────────────────────────────────────────────────────

export function WorkspacePage() {
  const {
    currentProject,
    projects,
    leftPanel,
    leftPanelOpen,
    rightPanel,
    setLeftPanel,
    toggleLeftPanel,
    setRightPanel,
    setCurrentProject,
    setCurrentView,
    setProjects,
    updateProject,
  } = useAppStore();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleRestore = useCallback((versionId: string) => {
    if (!currentProject) return;
    const restoredFiles = versioning.restoreVersion(currentProject, versionId);
    if (!restoredFiles) return;
    const version = currentProject.versions.find((v) => v.id === versionId);
    const updated = {
      ...currentProject,
      files: restoredFiles,
      versions: [
        ...currentProject.versions,
        {
          id: uuid(),
          version: `v${currentProject.versions.length + 1}`,
          description: `Restored from ${version?.version || versionId}`,
          timestamp: new Date().toISOString(),
          files: [],
        },
      ],
    };
    updateProject(updated);
  }, [currentProject, updateProject]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    if (!window.confirm('Delete this project permanently?')) return;
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || 'Delete failed');
      }
      setProjects(projects.filter((p) => p.id !== projectId));
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
        setCurrentView('home');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Unable to delete project. Please try again.');
    }
  }, [projects, currentProject, setProjects, setCurrentProject, setCurrentView]);

  if (!currentProject) {
    return <NoProjectView onDeleteProject={handleDeleteProject} />;
  }

  const leftPanels = [
    { id: 'chat' as const, label: 'Chat', icon: '◐', desc: 'Context-aware chat with AI' },
    { id: 'files' as const, label: 'Files', icon: '▦', desc: 'Project file explorer' },
    { id: 'prd' as const, label: 'PRD', icon: '▤', desc: 'Product requirements document' },
    { id: 'tasks' as const, label: 'Tasks', icon: '✓', desc: 'User story task tracking' },
    { id: 'graph' as const, label: 'Graph', icon: '◉', desc: 'Knowledge graph visualization' },
    { id: 'vision' as const, label: 'Vision', icon: '◇', desc: 'Upload screenshots for analysis' },
    { id: 'figma' as const, label: 'Figma', icon: '◇', desc: 'Import Figma designs' },
    { id: 'pm' as const, label: 'PM', icon: '▲', desc: 'Product manager dashboard' },
    { id: 'ux' as const, label: 'UX', icon: '◎', desc: 'UX review & heuristics' },
    { id: 'design' as const, label: 'Design', icon: '✦', desc: 'Design critique & suggestions' },
    { id: 'history' as const, label: 'History', icon: '↻', desc: 'Version history & restore' },
  ];

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left Sidebar Tabs */}
      <div className="w-9 flex flex-col items-center py-1.5 gap-0 border-r border-border bg-muted/5">
        {leftPanels.map((panel) => {
          const isActive = leftPanel === panel.id && leftPanelOpen;
          return (
            <div key={panel.id} className="relative group">
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-gradient-to-b from-primary to-purple-500 animate-scale-in" />
              )}
              <button
                onClick={() => setLeftPanel(panel.id)}
                className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-all duration-150 ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
                title={`${panel.label} — ${panel.desc}`}
              >
                {panel.icon}
              </button>
            </div>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={toggleLeftPanel}
          className="w-7 h-7 flex items-center justify-center rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
          title={leftPanelOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {leftPanelOpen ? '◀' : '▶'}
        </button>
      </div>

      {/* Left Panel */}
      {leftPanelOpen && (
      <div className="w-64 border-r border-border bg-background flex flex-col overflow-hidden">
        <div className="px-3 py-1.5 border-b border-border shrink-0">
          <h3 className="text-xs font-medium text-muted-foreground">
            {leftPanels.find((p) => p.id === leftPanel)?.label}
          </h3>
        </div>
        <div className="flex-1 overflow-hidden">
          <div key={leftPanel + (leftPanelOpen ? '-open' : '-closed')} className="animate-fade-between h-full">
          {leftPanel === 'chat' && <ChatPanel />}
          {leftPanel === 'files' && <FileExplorer />}
          {leftPanel === 'prd' && (
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product Requirements Document</h3>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  onClick={() => {
                    const prd = currentProject.prd;
                    if (!prd) return;
                    const md = `# ${prd.title}\n\n${prd.overview}\n\n## Goals\n${prd.goals.map(g => `- ${g}`).join('\n')}\n\n## Target Audience\n${prd.targetAudience}\n\n## User Personas\n${prd.userPersonas.map(p => `- **${p.name}** (${p.role}): ${p.goals.join(', ')}`).join('\n')}\n\n## Features\n${prd.features.map(f => `- [${f.priority}] **${f.name}**: ${f.description}`).join('\n')}\n\n## User Stories\n${prd.userStories.map(u => `- **${u.title}**: ${u.description}`).join('\n')}\n\n## Pages\n${prd.pages.map(p => `- ${p}`).join('\n')}\n\n## Technical Stack\n${prd.technicalStack}\n\n## Constraints\n${prd.constraints.map(c => `- ${c}`).join('\n')}\n\n## Success Metrics\n${prd.successMetrics.map(m => `- ${m}`).join('\n')}\n\n## Timeline\n${prd.timeline}`;
                    const blob = new Blob([md], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${prd.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_prd.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download PRD
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">{currentProject.prd?.title}</h4>
                    <p className="text-xs text-muted-foreground">{currentProject.prd?.overview}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Features</h4>
                    {currentProject.prd?.features.map((f) => (
                      <div key={f.id} className="flex items-center gap-2 py-1.5">
                        <Badge variant={f.priority === 'critical' ? 'destructive' : f.priority === 'high' ? 'warning' : 'secondary'}>
                          {f.priority}
                        </Badge>
                        <span className="text-sm">{f.name}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">User Stories</h4>
                    {currentProject.prd?.userStories.map((s) => (
                      <div key={s.id} className="py-1.5">
                        <p className="text-sm">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.feature}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
          {leftPanel === 'tasks' && (
            <div className="p-4 h-full flex flex-col">
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {currentProject.prd?.userStories.map((story) => (
                    <div key={story.id} className="flex items-start gap-2 p-2 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <input type="checkbox" className="mt-0.5" />
                      <div>
                        <p className="text-sm">{story.title}</p>
                        <p className="text-xs text-muted-foreground">{story.feature}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          {leftPanel === 'graph' && <KnowledgeGraphView />}
          {leftPanel === 'vision' && <VisionUpload />}
          {leftPanel === 'figma' && <FigmaImport />}
          {leftPanel === 'pm' && <ProductManager />}
          {leftPanel === 'ux' && <UXReviewer />}
          {leftPanel === 'design' && <DesignCritic />}
          {leftPanel === 'history' && (
            <div className="p-4 h-full flex flex-col">
              <ScrollArea className="flex-1">
                {currentProject.versions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No versions yet. Versions are created when AI modifications are applied.</p>
                ) : (
                  <div className="space-y-2">
                    {[...currentProject.versions].reverse().map((v) => (
                      <div key={v.id} className="p-2 rounded-lg border border-border">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{v.version}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(v.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{v.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {v.files.filter((f) => f.type === 'added').length > 0 && (
                            <span className="text-emerald-600 mr-2">+{v.files.filter((f) => f.type === 'added').length} added</span>
                          )}
                          {v.files.filter((f) => f.type === 'modified').length > 0 && (
                            <span className="text-amber-600 mr-2">~{v.files.filter((f) => f.type === 'modified').length} modified</span>
                          )}
                          {v.files.filter((f) => f.type === 'deleted').length > 0 && (
                            <span className="text-red-600">-{v.files.filter((f) => f.type === 'deleted').length} deleted</span>
                          )}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 text-xs"
                          onClick={() => handleRestore(v.id)}
                        >
                          Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
      </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0 relative">
            <button
              onClick={() => setDrawerOpen((o) => !o)}
              className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors min-w-0 group"
              title="Switch project"
            >
              <span className="truncate max-w-[160px]">{currentProject.name}</span>
              <span className={`text-muted-foreground text-xs transition-transform ${drawerOpen ? 'rotate-180' : ''}`}>▾</span>
              {projects.length > 1 && (
                <span className="text-[10px] text-muted-foreground ml-0.5">({projects.length})</span>
              )}
            </button>

            <ProjectDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onDeleteProject={handleDeleteProject} />

            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span>▦ {currentProject.files.length}</span>
              {currentProject.versions.length > 0 && <span>↻ v{currentProject.versions.length}</span>}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <ExportButton projectId={currentProject.id} projectName={currentProject.name} />
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/20 border border-border/30">
              <Button
                variant={rightPanel === 'preview' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setRightPanel('preview')}
                className="text-xs gap-1"
              >
                ◉ Preview
              </Button>
              <Button
                variant={rightPanel === 'editor' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setRightPanel('editor')}
                className="text-xs gap-1"
              >
                ▤ Editor
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div key={rightPanel} className="animate-fade-between h-full">
            {rightPanel === 'preview' ? <PreviewPanel /> : <EditorPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
