import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProjectFile } from '@/types';

const API_BASE = '/api';

interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children: TreeNode[];
}

function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      let existing = current.find((n) => n.name === part);
      if (!existing) {
        existing = {
          name: part,
          type: isLast ? 'file' : 'folder',
          path: parts.slice(0, i + 1).join('/'),
          children: [],
        };
        current.push(existing);
      }
      current = existing.children;
    }
  }
  return root;
}

export function FileExplorer() {
  const { currentProject, activeFile, setActiveFile, projects, setProjects, setCurrentProject, updateProject } = useAppStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['src']));
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  if (!currentProject) return null;

  const tree = buildTree(currentProject.files);

  const toggleExpand = (path: string) => {
    const next = new Set(expanded);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpanded(next);
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/projects/${currentProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error('Rename failed');
      const updated = { ...currentProject, name: newName.trim() };
      setCurrentProject(updated);
      setProjects(projects.map((p) => p.id === updated.id ? updated : p));
      setRenaming(false);
    } catch { /* ignore */ }
  };

  const handleDeleteFile = async (filePath: string) => {
    if (!currentProject) return;
    try {
      const res = await fetch(`${API_BASE}/projects/${currentProject.id}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });
      if (!res.ok) throw new Error('Delete failed');
      const reload = await fetch(`${API_BASE}/projects/${currentProject.id}`);
      if (reload.ok) {
        const updated = await reload.json();
        updateProject(updated);
      }
    } catch (e) { console.error('Delete file error:', e); }
  };

  const handleCreateFile = async () => {
    if (!newFilePath.trim() || !currentProject) return;
    try {
      const res = await fetch(`${API_BASE}/projects/${currentProject.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newFilePath.trim(), content: '' }),
      });
      if (!res.ok) throw new Error('Create failed');
      // Reload project from server to get updated file list
      const reload = await fetch(`${API_BASE}/projects/${currentProject.id}`);
      if (reload.ok) {
        const updated = await reload.json();
        updateProject(updated);
      }
      setCreating(false);
      setNewFilePath('');
    } catch (e) { console.error('Create file error:', e); }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects/${currentProject.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      setProjects(projects.filter((p) => p.id !== currentProject.id));
      setCurrentProject(null);
    } catch { /* ignore */ }
    setDeleting(false);
  };

  const renderNode = (node: TreeNode, depth: number) => {
    const isExpanded = expanded.has(node.path);
    const fileExtensions: Record<string, string> = {
      ts: '🔵', tsx: '⚡', css: '🎨', json: '📋', html: '🌐', js: '🟡',
    };
    const ext = node.name.split('.').pop() || '';
    const icon = node.type === 'folder'
      ? (isExpanded ? '📂' : '📁')
      : (fileExtensions[ext] || '📄');

    return (
      <div key={node.path} onMouseEnter={() => setHoveredPath(node.path)} onMouseLeave={() => setHoveredPath(null)}>
        <div
          className={`w-full flex items-center gap-2 px-2 py-1 text-sm rounded hover:bg-accent/50 transition-colors group ${
            activeFile === node.path ? 'bg-accent text-accent-foreground' : ''
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          <button
            onClick={() => {
              if (node.type === 'folder') toggleExpand(node.path);
              else setActiveFile(node.path);
            }}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            <span className="text-xs shrink-0">{icon}</span>
            <span className="truncate">{node.name}</span>
          </button>
          {node.type === 'file' && hoveredPath === node.path && (
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteFile(node.path); }}
              className="text-xs text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              title="Delete file"
            >
              ✕
            </button>
          )}
        </div>
        {node.type === 'folder' && isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold truncate max-w-[140px]" title={currentProject.name}>
            {currentProject.name}
          </h3>
          <div className="flex items-center gap-1">
              <button
                onClick={() => { setCreating(true); setNewFilePath('src/'); }}
                className="text-xs text-muted-foreground hover:text-foreground px-1"
                title="New file"
              >
                +
              </button>
              <button
                onClick={() => { setNewName(currentProject.name); setRenaming(!renaming); }}
                className="text-xs text-muted-foreground hover:text-foreground px-1"
                title="Rename project"
              >
                ✎
              </button>
              <button
                onClick={() => setDeleting(true)}
                className="text-xs text-red-400 hover:text-red-300 px-1"
                title="Delete project"
              >
                ✕
              </button>
          </div>
        </div>
        {renaming && (
          <div className="flex gap-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
              className="text-xs h-7"
              autoFocus
            />
            <Button size="sm" onClick={handleRename} className="text-xs h-7">Save</Button>
          </div>
        )}
        {creating && (
          <div className="flex gap-1">
            <Input
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFile(); if (e.key === 'Escape') setCreating(false); }}
              className="text-xs h-7 flex-1"
              placeholder="src/NewFile.tsx"
              autoFocus
            />
            <Button size="sm" onClick={handleCreateFile} className="text-xs h-7">Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)} className="text-xs h-7">✕</Button>
          </div>
        )}
        {deleting && (
          <div className="flex gap-1">
            <span className="text-xs text-red-400">Permanently delete?</span>
            <Button size="sm" variant="destructive" onClick={handleDelete} className="text-xs h-7">Delete</Button>
            <Button size="sm" variant="ghost" onClick={() => setDeleting(false)} className="text-xs h-7">Cancel</Button>
          </div>
        )}
      </div>
      <ScrollArea className="flex-1 p-1">
        {tree.map((node) => renderNode(node, 0))}
      </ScrollArea>
    </div>
  );
}
