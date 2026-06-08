import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { joinProject, onSocketEvent } from '@/services/socket';

const PREVIEW_BASE = '/preview';
const API_BASE = '/api';

type BuildStatus = 'idle' | 'building' | 'done' | 'error';
interface BuildLogEntry {
  stage: string;
  message: string;
  detail?: { file: string; action: string };
}
interface SelectedElement {
  tag: string;
  id: string | null;
  classes: string[];
  text: string;
  selector: string;
  rect: { x: number; y: number; w: number; h: number };
  html: string;
  attributes: { name: string; value: string }[];
}

export function PreviewPanel() {
  const { currentProject, previewRefreshKey } = useAppStore();
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [buildStatus, setBuildStatus] = useState<BuildStatus>('idle');
  const [buildError, setBuildError] = useState('');
  const [buildProgress, setBuildProgress] = useState<string>('');
  const [previewKey, setPreviewKey] = useState(0);
  const [devServerUrl, setDevServerUrl] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [buildLogs, setBuildLogs] = useState<BuildLogEntry[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [selectionPrompt, setSelectionPrompt] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const projectId = currentProject?.id;
  const previewUrl = projectId ? `${PREVIEW_BASE}/${projectId}/` : null;
  // Initialize iframe URL path when preview source changes (dev server or static preview)
  useEffect(() => {
    // Reset to root path on preview change
    setIframeUrl('/');
  }, [previewUrl, devServerUrl]);
  // Join Socket.IO room for the current project
  useEffect(() => {
    joinProject(projectId || null);
  }, [projectId]);

  // Listen for Socket.IO build events — no HTTP polling
  useEffect(() => {
    const unsubComplete = onSocketEvent('build-complete', (data: unknown) => {
      const ev = data as { projectId?: string; status?: string; error?: string };
      if (ev.projectId && ev.projectId !== projectId) return;
      if (ev.status === 'done') {
        setBuildStatus('done');
        setPreviewKey(k => k + 1);
        // Check for dev server after build completes
        if (projectId) {
          fetch(`${API_BASE}/dev-server/${projectId}`)
            .then(r => r.json())
            .then(data => setDevServerUrl(data.running ? data.url : null))
            .catch(() => {});
        }
      } else if (ev.status === 'error') {
        setBuildStatus('error');
        setBuildError(ev.error || 'Build failed');
      }
    });
    const unsubProgress = onSocketEvent('build-progress', (data: unknown) => {
      const ev = data as { projectId?: string; message?: string; stage?: string; detail?: { file: string; action: string } };
      if (ev.projectId && ev.projectId !== projectId) return;
      if (ev.message) setBuildProgress(ev.message);
      if (ev.stage && ev.detail) {
        setBuildLogs(prev => [...prev, { stage: ev.stage!, message: ev.message || '', detail: ev.detail }]);
      }
    });
    const unsubReload = onSocketEvent('reload-preview', () => {
      setPreviewKey(k => k + 1);
    });
    return () => { unsubComplete(); unsubProgress(); unsubReload(); };
  }, [projectId]);

  // Listen for element selection from the iframe
  useEffect(() => {
    function handler(e: MessageEvent) {
      if (e.data?.type === '__DS_SELECT') {
        setSelectedElement(e.data.details);
        setSelectMode(false);
        setSelectionPrompt('');
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Listen for optional iframe navigation events from preview content
  useEffect(() => {
    function navHandler(e: MessageEvent) {
      if (e.data?.type === '__DS_NAVIGATED' && typeof e.data.path === 'string') {
        setIframeUrl(e.data.path);
      }
    }
    window.addEventListener('message', navHandler);
    return () => window.removeEventListener('message', navHandler);
  }, []);

  // Send select mode to iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: '__DS_SET_MODE', mode: selectMode }, '*');
    }
  }, [selectMode, previewKey]);

  // Check build status, dev server, and auto-start if needed
  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    const checkStatus = async () => {
      try {
        // Detect if preview is served (via either build status endpoint or HTML check)
        let isBuilt = false;

        // Check build status
        const statusRes = await fetch(`${API_BASE}/build/${projectId}/status`);
        const statusData = await statusRes.json();
        isBuilt = statusData.status === 'done';
        if (statusData.error) setBuildError(statusData.error);

        // If build status is idle, check if HTML preview exists (server restart recovery)
        if (statusData.status === 'idle') {
          try {
            const htmlRes = await fetch(`${PREVIEW_BASE}/${projectId}/`);
            if (htmlRes.ok) {
              const html = await htmlRes.text();
              isBuilt = html.toLowerCase().includes('<!doctype') || html.toLowerCase().includes('<html');
            }
          } catch {}
        }

        if (isBuilt) {
          if (!cancelled) {
            setBuildStatus('done');
            setPreviewKey(k => k + 1);
          }
          // Check Vite dev server and auto-start if needed
          const devRes = await fetch(`${API_BASE}/dev-server/${projectId}`);
          const devData = await devRes.json();
          if (!cancelled) setDevServerUrl(devData.running ? devData.url : null);

          if (!devData.running) {
            if (!cancelled) {
              setBuildProgress('Starting dev server...');
              setBuildLogs(prev => [...prev, { stage: 'server', message: 'Starting dev server...' }]);
            }
            try {
              const startRes = await fetch(`${API_BASE}/dev-server/${projectId}/start`, { method: 'POST' });
              const startData = await startRes.json();
              if (!cancelled && startData.running) {
                setDevServerUrl(startData.url);
                setPreviewKey(k => k + 1);
                setBuildLogs(prev => [...prev, { stage: 'server', message: 'Dev server running' }]);
              }
            } catch (s) {
              console.error('Dev server start failed:', s);
            }
          }
        } else if (!cancelled) {
          setBuildStatus('idle');
          setDevServerUrl(null);
        }
      } catch {
        if (!cancelled) {
          setBuildStatus('idle');
          setDevServerUrl(null);
        }
      }
    };
    checkStatus();
    return () => { cancelled = true; };
  }, [projectId, previewRefreshKey]);

  useEffect(() => {
    if (!projectId) return;
    if (devServerUrl && buildStatus === 'done') {
      iframeRef.current?.contentWindow?.location.reload();
    } else if (!devServerUrl) {
      setPreviewKey((k) => k + 1);
    }
  }, [previewRefreshKey, devServerUrl, buildStatus, projectId]);

  const handleBuild = useCallback(async () => {
    if (!projectId) return;
    setBuildStatus('building');
    setBuildProgress('Starting...');
    setBuildError('');
    setBuildLogs([]);

    try {
      const saveRes = await fetch(`${API_BASE}/projects/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: currentProject }),
      });
      if (!saveRes.ok) {
        const errData = await saveRes.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(errData.error || 'Save failed');
      }

      const res = await fetch(`${API_BASE}/build/${projectId}`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Build failed');
      }

      if (data.status === 'done') {
        setBuildStatus('done');
        setBuildProgress('');
        setPreviewKey(k => k + 1);
      } else if (data.status === 'error') {
        throw new Error(data.error || 'Build failed');
      }
    } catch (err) {
      const msg = (err as Error).message;
      console.error('[PreviewPanel] Build error:', msg, err);
      setBuildStatus('error');
      if (msg === 'Failed to fetch') {
        setBuildError('Cannot connect to server — make sure `npm run dev` (both Vite + Express) is running');
      } else {
        setBuildError(msg);
      }
    }
  }, [projectId, currentProject]);

  const handleSelectionSubmit = useCallback(async () => {
    if (!projectId || !selectedElement || !selectionPrompt.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/element-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          element: selectedElement,
          prompt: selectionPrompt.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedElement(null);
        setSelectionPrompt('');
        setBuildStatus('done');
        setPreviewKey(k => k + 1);
      } else {
        console.error('Element edit failed:', data.error);
      }
    } catch (err) {
      console.error('Element edit error:', err);
    }
  }, [projectId, selectedElement, selectionPrompt]);

  const deviceStyles = {
    desktop: { width: '100%', height: '100%' },
    tablet: { width: '768px', height: '100%' },
    mobile: { width: '375px', height: '100%' },
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-1.5">
            {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
              <Button
                key={d}
                variant={device === d ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDevice(d)}
                className="text-xs"
              >
                {d === 'desktop' ? '⊞' : d === 'tablet' ? '▯' : '▭'}
              </Button>
            ))}
            {/* Navigation controls */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                iframeRef.current?.contentWindow?.history.back();
              }}
              className="text-xs"
              title="Back"
            >←</Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                iframeRef.current?.contentWindow?.history.forward();
              }}
              className="text-xs"
              title="Forward"
            >→</Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                iframeRef.current?.contentWindow?.location.reload();
              }}
              className="text-xs"
              title="Refresh"
            >⟳</Button>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full ${devServerUrl ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${devServerUrl ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {devServerUrl ? 'Live' : 'Static'}
            </span>
            {/* URL Bar */}
            <input
              type="text"
              value={iframeUrl}
              onChange={e => setIframeUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const base = devServerUrl || previewUrl || '';
                  // Ensure base ends with '/'
                  const fullUrl = base.replace(/\/+$/, '') + '/' + iframeUrl.replace(/^\//, '');
                  iframeRef.current?.contentWindow?.location.assign(fullUrl);
                }
              }}
              placeholder="Enter path, e.g., /dashboard"
              className="flex-1 min-w-0 px-2 py-1 text-xs border border-border rounded focus:outline-none focus:border-primary transition-colors mr-2"
            />
          </div>
        <div className="flex items-center gap-2">
          {buildStatus === 'building' && (
            <span className="text-xs text-amber-500">{buildProgress || 'Preparing...'}</span>
          )}
          {buildStatus === 'done' && (
            <span className="text-xs text-green-500">Built ✓</span>
          )}
          {buildStatus === 'error' && (
            <span className="text-xs text-red-500" title={buildError}>Build failed</span>
          )}
          {buildStatus === 'done' && previewUrl && (
            <Button
              size="sm"
              variant={selectMode ? 'secondary' : 'ghost'}
              onClick={() => {
                setSelectMode(s => !s);
                setSelectedElement(null);
                setSelectionPrompt('');
              }}
              className="text-xs"
              title="Select an element to modify"
            >
              {selectMode ? '⊕ Select...' : '⊜ Select'}
            </Button>
          )}
          <Button
            size="sm"
            variant={buildStatus === 'done' ? 'outline' : 'default'}
            onClick={handleBuild}
            disabled={!projectId || buildStatus === 'building'}
            className="text-xs"
          >
            {buildStatus === 'idle' ? 'Preview' :
             buildStatus === 'building' ? 'Preparing...' :
             buildStatus === 'done' ? 'Refresh Preview' : 'Retry'}
          </Button>
          {previewUrl && buildStatus === 'done' && (
            <a
              href={devServerUrl || previewUrl}
              target="_blank"
              className="text-xs text-primary hover:underline"
            >
              ↗
            </a>
          )}
        </div>
      </div>
      {selectMode && buildStatus === 'done' && (
        <div className="px-4 py-1.5 bg-indigo-500/10 border-b border-indigo-500/20 text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
          Click any element in the preview to select it for modification
        </div>
      )}
      <div className="flex-1 flex items-start justify-center p-4 bg-muted/20 overflow-y-auto">
        <div
          className="bg-background rounded-lg border border-border shadow-sm transition-all overflow-y-auto"
          style={deviceStyles[device]}
        >
          {buildStatus === 'done' && previewUrl ? (
            <iframe
              ref={iframeRef}
              key={devServerUrl ? undefined : previewKey}
              src={devServerUrl || previewUrl || ''}
              className="w-full h-full border-0"
              title="Project Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation"
              onLoad={() => {
                try {
                  const loc = iframeRef.current?.contentWindow?.location.href;
                  if (loc) {
                    const url = new URL(loc);
                    const path = url.pathname + url.search + url.hash;
                    setIframeUrl(path);
                    return;
                  }
                } catch {
                  // Cross-origin iframe navigation cannot expose location, fall back to the iframe src path.
                }
                try {
                  const currentSrc = iframeRef.current?.src || ''; 
                  if (currentSrc) {
                    const url = new URL(currentSrc, window.location.origin);
                    const base = new URL(devServerUrl || previewUrl || '', window.location.origin);
                    const path = url.pathname.replace(base.pathname.replace(/\/+$/, ''), '') || '/';
                    setIframeUrl(path + url.search + url.hash);
                  }
                } catch {
                  // ignore
                }
              }}
            />
          ) : buildStatus === 'building' ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-6">
              <div className="text-center space-y-3 mb-4">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-sm text-muted-foreground">{buildProgress || 'Preparing preview...'}</p>
              </div>
              {buildLogs.length > 0 && (
                <div className="w-full max-w-md max-h-48 overflow-y-auto space-y-0.5 text-xs font-mono">
                  {buildLogs.map((log, i) => (
                    <div key={i} className={`flex items-center gap-1.5 ${log.detail?.action === 'cleaned' ? 'text-amber-400' : 'text-muted-foreground/60'}`}>
                      <span className="shrink-0">{log.detail?.action === 'cleaned' ? '~' : '✓'}</span>
                      <span className="truncate">{log.detail?.file || log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : buildStatus === 'error' ? (
            <div className="flex items-center justify-center h-full min-h-[300px] p-8">
              <div className="text-center space-y-2 max-w-md">
                <p className="text-sm text-red-500 font-medium">Build failed</p>
                <p className="text-xs text-muted-foreground break-words">{buildError}</p>
                <Button size="sm" variant="outline" onClick={handleBuild} className="mt-2 text-xs">
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[300px] p-8">
              <div className="text-center space-y-2 max-w-sm">
                <p className="text-muted-foreground">No preview yet</p>
                <p className="text-xs text-muted-foreground/60">Click "Preview" to generate and view your app's UI</p>
                <Button size="sm" onClick={handleBuild} disabled={!projectId} className="mt-2 text-xs">
                  Preview
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {selectedElement && (
        <div className="shrink-0 border-t border-border bg-muted/30 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                  {selectedElement.tag}{selectedElement.id ? `#${selectedElement.id}` : ''}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {selectedElement.text.slice(0, 60)}
                </span>
              </div>
              <input
                type="text"
                value={selectionPrompt}
                onChange={e => setSelectionPrompt(e.target.value)}
                placeholder="What should I change about this element?"
                className="w-full text-sm bg-background border border-border rounded px-3 py-1.5 outline-none focus:border-indigo-500 transition-colors"
                onKeyDown={e => { if (e.key === 'Enter') handleSelectionSubmit(); }}
              />
            </div>
            <Button
              size="sm"
              onClick={handleSelectionSubmit}
              disabled={!selectionPrompt.trim()}
              className="mt-6 text-xs shrink-0"
            >
              Apply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedElement(null)}
              className="mt-6 text-xs shrink-0"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
