import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { CodeMirrorEditor } from './CodeMirrorEditor';

const API_BASE = '/api';
const SAVE_DEBOUNCE_MS = 800;

export function EditorPanel() {
  const { currentProject, activeFile, openTabs, setActiveFile, closeTab, updateProject, triggerPreviewRefresh } = useAppStore();
  const [editContent, setEditContent] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const file = currentProject?.files.find((f) => f.path === activeFile);

  useEffect(() => {
    if (file) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setEditContent(file.content);
    }
  }, [file?.path, file?.content]);

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  const persistToServer = useCallback(async (content: string) => {
    if (!currentProject || !activeFile) return;
    try {
      await fetch(`${API_BASE}/projects/${currentProject.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFile, content }),
      });
    } catch { /* silent */ }
  }, [currentProject, activeFile]);

  const handleSave = useCallback((content?: string) => {
    const saveContent = content ?? editContent;
    if (!currentProject || !file) return;
    const updatedFiles = currentProject.files.map((f) =>
      f.path === file.path ? { ...f, content: saveContent } : f
    );
    updateProject({
      ...currentProject,
      files: updatedFiles,
      updatedAt: new Date().toISOString(),
    });
    persistToServer(saveContent);
  }, [currentProject, file, editContent, updateProject, persistToServer]);

  const handleContentChange = useCallback((value: string) => {
    setEditContent(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => handleSave(value), SAVE_DEBOUNCE_MS);
  }, [handleSave]);

  const fileLabel = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  if (!activeFile && openTabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Select a file to edit</p>
          <p className="text-sm text-muted-foreground/60">Browse files in the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      {openTabs.length > 0 && (
        <div className="flex items-center border-b border-border bg-muted/20 shrink-0 overflow-x-auto">
          {openTabs.map((path) => (
            <div
              key={path}
              onClick={() => setActiveFile(path)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-border shrink-0 transition-colors ${
                path === activeFile
                  ? 'bg-background text-foreground border-b-2 border-b-primary'
                  : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <span className="truncate max-w-[160px]">{fileLabel(path)}</span>
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(path); }}
                className="opacity-0 group-hover:opacity-100 hover:text-foreground text-muted-foreground/40 text-[10px] leading-none px-0.5"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Toolbar */}
      {file && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{file.path}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{file.language}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground/60">{editContent === file.content ? 'Saved' : 'Unsaved'}</span>
            <Button size="sm" variant="default" onClick={() => handleSave()} disabled={editContent === file.content} className="text-xs">
              Save
            </Button>
          </div>
        </div>
      )}
      {/* Editor */}
      {file ? (
        <div className="flex-1 overflow-hidden [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-y-auto">
          <CodeMirrorEditor
            value={editContent}
            onChange={handleContentChange}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">File not found</p>
        </div>
      )}
    </div>
  );
}
