import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/stores/appStore';
import { agentSystem } from '@/services/agents';
import { projectBrain } from '@/services/projectBrain';
import { contextAwareEditing } from '@/services/contextAwareEditing';
import { visionAgent } from '@/services/visionAgent';
import { versioning } from '@/services/versioning';
import { joinProject } from '@/services/socket';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { v4 as uuid } from 'uuid';
import type { Message, EditResult, FileEdit, UploadedFile } from '@/types';

const API_BASE = '/api';

async function readUploadedFile(file: File): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isImage = file.type.startsWith('image/');

    if (isImage) {
      reader.onload = () => resolve({ name: file.name, content: '', isImage: true, dataUrl: reader.result as string });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => resolve({ name: file.name, content: reader.result as string, isImage: false });
      reader.onerror = reject;
      reader.readAsText(file);
    }
  });
}

function countChangedLines(oldContent: string, newContent: string): { added: number; removed: number } {
  const oldLines = new Set(oldContent.split('\n'));
  const newLines = newContent.split('\n');
  let added = 0;
  for (const l of newLines) if (!oldLines.has(l)) added++;
  const newSet = new Set(newContent.split('\n'));
  let removed = 0;
  for (const l of oldContent.split('\n')) if (!newSet.has(l)) removed++;
  return { added, removed };
}

function fileIcon(path: string) {
  if (path.endsWith('.tsx') || path.endsWith('.ts')) return '◈';
  if (path.endsWith('.css')) return '◇';
  if (path.endsWith('.html')) return '▤';
  return '▦';
}

function FileChangeCard({ edit }: { edit: FileEdit }) {
  const [expanded, setExpanded] = useState(false);
  const { added, removed } = countChangedLines(edit.oldContent, edit.newContent);

  return (
    <div className="rounded-lg border border-border overflow-hidden text-xs">
      <button
        onClick={() => setExpanded((x) => !x)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="text-muted-foreground">{fileIcon(edit.path)}</span>
        <span className="flex-1 font-mono truncate text-foreground/80">{edit.path}</span>
        {edit.isNew && (
          <Badge variant="secondary" className="text-[10px] shrink-0 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            new
          </Badge>
        )}
        {added > 0 && <span className="text-emerald-500 shrink-0">+{added}</span>}
        {removed > 0 && <span className="text-red-500 shrink-0">-{removed}</span>}
        <span className="text-muted-foreground/60">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="border-t border-border bg-background">
          <p className="px-3 py-1.5 text-muted-foreground italic">{edit.description}</p>
          <ScrollArea className="max-h-48">
            <pre className="px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/80">
              {edit.newContent.slice(0, 2000)}
              {edit.newContent.length > 2000 && '\n… (truncated)'}
            </pre>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

interface EditCardProps {
  message: Message;
  onApply: (msgId: string, result: EditResult) => void;
  onReject: (msgId: string) => void;
}

function EditCard({ message, onApply, onReject }: EditCardProps) {
  const result = message.editResult;
  if (!result) return null;
  const fileEdits = result.fileEdits || [];
  const status = message.editStatus;

  if (status === 'applied') {
    return (
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm">
        <div className="flex items-center gap-2 text-emerald-500 font-medium mb-1">
          <span>✓</span>
          <span>Applied</span>
        </div>
        <p className="text-foreground/70 text-xs">{result.summary}</p>
        <p className="text-muted-foreground text-[11px] mt-1">{fileEdits.length} file{fileEdits.length !== 1 ? 's' : ''} changed</p>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="rounded-xl bg-muted/30 border border-border px-3 py-2 text-xs text-muted-foreground line-through">
        {result.summary}
      </div>
    );
  }

  if (status === 'applying') {
    return (
      <div className="rounded-xl bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
        <div className="flex items-center gap-2 text-primary animate-pulse">
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Applying changes…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-3 py-2 bg-muted/20 border-b border-border">
        <p className="text-sm font-medium">{result.summary}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{result.reasoning}</p>
      </div>
      <div className="p-2 space-y-1.5">
        {fileEdits.map((edit, i) => (
          <FileChangeCard key={i} edit={edit} />
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-muted/10">
        <Button size="sm" className="flex-1 text-xs gap-1.5" onClick={() => onApply(message.id, result)}>
          <span>✓</span> Apply changes
        </Button>
        <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => onReject(message.id)}>
          Discard
        </Button>
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: 'Add dark mode', icon: '◐', prompt: 'Add dark mode support with a toggle button' },
  { label: 'Fix responsive', icon: '▭', prompt: 'Make the layout fully responsive on mobile' },
  { label: 'Add loading states', icon: '↻', prompt: 'Add loading spinners and skeleton states' },
  { label: 'Improve styling', icon: '✦', prompt: 'Improve the overall visual design and spacing' },
];

export function ChatPanel() {
  const {
    currentProject,
    messagesByProject,
    addMessage,
    setMessages,
    isProcessing,
    setIsProcessing,
    settings,
    updateProject,
    setRightPanel,
    triggerPreviewRefresh,
    activeFile,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectId = currentProject?.id;
  const messages = useMemo(() => projectId ? (messagesByProject[projectId] || []) : [], [messagesByProject, projectId]);

  // Load persisted messages from brain on mount / project switch
  useEffect(() => {
    if (!projectId) return;
    const existing = messagesByProject[projectId];
    if (existing && existing.length > 0) return; // already in store
    const brain = projectBrain.getKey(projectId);
    const persisted = brain.conversations.map((c) => ({
      id: c.id,
      role: c.role as 'user' | 'assistant',
      content: c.content,
      timestamp: c.timestamp,
    }));
    if (persisted.length > 0) setMessages(projectId, persisted);
  }, [projectId]);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [input]);

  const patchMessage = useCallback((id: string, patch: Partial<Message>) => {
    if (!projectId) return;
    const msgs = useAppStore.getState().messagesByProject[projectId] || [];
    useAppStore.getState().setMessages(projectId, msgs.map((m) => m.id === id ? { ...m, ...patch } : m));
  }, [projectId]);

  const saveAndRefreshPreview = useCallback(async (project: typeof currentProject) => {
    if (!project) return;
    try {
      await fetch(`${API_BASE}/projects/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project }),
      });
      await fetch(`${API_BASE}/build/${project.id}`, { method: 'POST' });
      triggerPreviewRefresh();
    } catch {
      // non-fatal
    }
  }, [triggerPreviewRefresh]);

  // Join Socket.IO room for the current project
  useEffect(() => {
    joinProject(projectId || null);
  }, [projectId]);

  const handleApply = useCallback(async (msgId: string, result: EditResult) => {
    if (!currentProject) return;
    patchMessage(msgId, { editStatus: 'applying' });

    const oldFiles = [...currentProject.files];
    const updatedFiles = [...currentProject.files];

    const fileEdits = result.fileEdits || [];
    for (const edit of fileEdits) {
      const idx = updatedFiles.findIndex((f) => f.path === edit.path);
      if (idx >= 0) {
        updatedFiles[idx] = { ...updatedFiles[idx], content: edit.newContent, type: 'modified' };
      } else {
        updatedFiles.push({
          path: edit.path,
          content: edit.newContent,
          language: edit.path.endsWith('.tsx') || edit.path.endsWith('.ts') ? 'typescript' : 'html',
          type: 'modified',
        });
      }
    }

    const version = versioning.createVersion(
      currentProject,
      result.summary,
      oldFiles,
      updatedFiles,
      result.reasoning
    );

    const updatedProject = {
      ...currentProject,
      files: updatedFiles,
      versions: [...currentProject.versions, version],
      updatedAt: new Date().toISOString(),
    };

    if (updatedProject.brain) {
      updatedProject.brain.files = updatedFiles;
      updatedProject.brain.modifications.push({
        id: version.id,
        description: result.summary,
        files: fileEdits.map((e) => ({
          path: e.path,
          type: e.isNew ? 'added' as const : 'modified' as const,
          diff: '',
          content: e.newContent,
        })),
        timestamp: version.timestamp,
        version: version.version,
        reasoning: result.reasoning,
      });
      projectBrain.save(updatedProject.id, updatedProject.brain);
    }

    updateProject(updatedProject);
    patchMessage(msgId, { editStatus: 'applied' });

    await saveAndRefreshPreview(updatedProject);
    // Previously, we switched to the preview panel after applying changes.
    // Keeping the chat panel active allows the user to continue the conversation seamlessly.
    // setRightPanel('preview'); // removed to stay in chat

  }, [currentProject, updateProject, patchMessage, saveAndRefreshPreview, setRightPanel]);

  const handleReject = useCallback((msgId: string) => {
    patchMessage(msgId, { editStatus: 'rejected' });
  }, [patchMessage]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const read = await Promise.all(files.map(readUploadedFile));
    setAttachments((prev) => [...prev, ...read]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeAttachment = useCallback((idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachments.length === 0) || !currentProject || isProcessing) return;

    const userText = input.trim();
    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    setIsProcessing(true);

    const attachmentNames = currentAttachments.map((a) => a.name).join(', ');
    const displayContent = userText + (attachmentNames ? `\n📎 ${attachmentNames}` : '');

    const userMsg: Message = {
      id: uuid(),
      role: 'user',
      content: displayContent,
      timestamp: new Date().toISOString(),
    };
    addMessage(currentProject.id, userMsg);

    let enrichedPrompt = userText;
    for (const att of currentAttachments) {
      if (att.isImage && att.dataUrl) {
        enrichedPrompt += `\n\n[Attached image: ${att.name}]`;
        const base64 = att.dataUrl.replace(/^data:image\/\w+;base64,/, '');
        try {
          const analysis = await visionAgent.analyzeImage(base64, settings.models.vision);
          enrichedPrompt += `\n\nVision analysis of image "${att.name}":\nLayout: ${analysis.layout}\nComponents: ${analysis.components.join(', ')}\nColors: ${analysis.colors.join(', ')}\nSuggestions: ${analysis.suggestions.join('; ')}`;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error('Vision analysis failed:', errorMsg);
          enrichedPrompt += `\n[Vision analysis failed: ${errorMsg}]`;
        }
      } else if (att.isImage) {
        enrichedPrompt += `\n\n[Attached image: ${att.name}]`;
      } else {
        enrichedPrompt += `\n\n--- Attached file: ${att.name} ---\n${att.content.slice(0, 3000)}${att.content.length > 3000 ? '\n... (truncated)' : ''}\n--- end of ${att.name} ---`;
      }
    }

    const intent = userText ? agentSystem.detectIntent(userText) : 'edit';
    const brainContext = projectBrain.query(currentProject.id, userText, activeFile || undefined);

    const assistantMsgId = uuid();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    addMessage(currentProject.id, assistantMsg);

    try {
      if (intent === 'edit') {
        patchMessage(assistantMsgId, { content: '◈ Analyzing your request…' });

        const conversationHistoryPayload = messages.map((msg) => ({ role: msg.role, content: msg.content }));

        let editResult: EditResult;
        try {
          const res = await fetch(`${API_BASE}/chat-edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: currentProject.id,
              prompt: enrichedPrompt,
              conversationHistory: conversationHistoryPayload,
            }),
          });

          if (!res.ok) {
            const errorBody = await res.text();
            throw new Error(`Chat edit failed: ${errorBody}`);
          }

          const data = await res.json();
          const endpointFiles = Array.isArray(data.files) ? data.files : [];
          editResult = {
            isEdit: true,
            summary: data.summary || 'Applied chat edit',
            reasoning: data.reasoning || enrichedPrompt,
            fileEdits: endpointFiles.map((file: any) => ({
              path: file.path,
              oldContent: file.oldContent || '',
              newContent: file.newContent || '',
              isNew: !currentProject.files.some((pf) => pf.path === file.path),
              description: file.path,
            })),
          };
        } catch (error) {
          console.warn('Chat edit endpoint failed, falling back to local editing:', (error as Error).message);
          const plan = await contextAwareEditing.analyzeRequest(currentProject, enrichedPrompt, settings.models.coder);
          const fallbackFiles = Array.isArray(plan.proposedChanges?.files) ? plan.proposedChanges.files : [];
          editResult = {
            isEdit: true,
            summary: plan.proposedChanges?.summary || 'Planned changes',
            reasoning: plan.proposedChanges?.reasoning || enrichedPrompt,
            fileEdits: fallbackFiles.map((f) => ({
              path: f.path,
              oldContent: f.oldContent || '',
              newContent: f.newContent || '',
              isNew: !currentProject.files.some((pf) => pf.path === f.path),
              description: f.path,
            })),
          };
        }

        patchMessage(assistantMsgId, {
          content: '',
          editResult,
          editStatus: 'pending',
        });

        projectBrain.addConversation(currentProject.id, { id: uuid(), role: 'user', content: enrichedPrompt, timestamp: new Date().toISOString() });
        projectBrain.addConversation(currentProject.id, { id: uuid(), role: 'assistant', content: editResult.summary, timestamp: new Date().toISOString() });
      } else {
        let fullContent = '';
        await agentSystem.chatWithProject(enrichedPrompt, settings.models.coder, brainContext, (chunk) => {
          fullContent += chunk;
          patchMessage(assistantMsgId, { content: fullContent });
        });

        projectBrain.addConversation(currentProject.id, { id: uuid(), role: 'user', content: enrichedPrompt, timestamp: new Date().toISOString() });
        projectBrain.addConversation(currentProject.id, { id: uuid(), role: 'assistant', content: fullContent, timestamp: new Date().toISOString() });
      }
    } catch (err) {
      patchMessage(assistantMsgId, {
        content: `Error: ${(err as Error).message}. Please try again.`,
        editResult: undefined,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [input, currentProject, isProcessing, settings, addMessage, setIsProcessing, patchMessage, attachments]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/10 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold">AI Engineer</h3>
            <p className="text-[10px] text-muted-foreground">Ask a question or request changes</p>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {currentProject ? `${currentProject.files.length} files` : 'no project'}
          </Badge>
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 px-3 py-3">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="py-4">
              <p className="text-xs text-muted-foreground text-center mb-3">What would you like to change?</p>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => setInput(action.prompt)}
                    className="flex items-center gap-1.5 text-left px-2.5 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/30 transition-all text-xs"
                  >
                    <span className="text-primary/70">{action.icon}</span>
                    <span className="text-muted-foreground">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.role === 'user' && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              )}

              {msg.role === 'assistant' && (
                <div className="flex justify-start">
                  <div className="max-w-[95%] w-full space-y-2">
                    {msg.content && (
                      <div className={`rounded-xl rounded-bl-sm px-3 py-2 text-sm ${
                        msg.content.startsWith('◈') ? 'bg-muted text-primary animate-pulse' : 'bg-muted text-foreground'
                      }`}>
                        <div className="leading-relaxed">
                          {msg.content.startsWith('◈') ? (
                            msg.content
                          ) : (
                            <MarkdownRenderer content={msg.content} />
                          )}
                        </div>
                      </div>
                    )}
                    {msg.editResult && (
                      <EditCard
                        message={msg}
                        onApply={handleApply}
                        onReject={handleReject}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isProcessing && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-xl px-3 py-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border shrink-0 space-y-2">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted border border-border text-xs max-w-full"
              >
                {att.isImage && att.dataUrl ? (
                  <img src={att.dataUrl} alt={att.name} className="w-6 h-6 rounded object-cover shrink-0" />
                ) : (
                  <span className="text-muted-foreground shrink-0">◈</span>
                )}
                <span className="truncate max-w-[120px] text-foreground/80">{att.name}</span>
                <button
                  onClick={() => removeAttachment(i)}
                  className="text-muted-foreground hover:text-foreground ml-0.5 shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.ts,.tsx,.js,.jsx,.css,.html,.json,.md,.txt,.py,.yaml,.yml"
            className="hidden"
            onChange={handleFileSelect}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || !currentProject}
            className="absolute left-2 bottom-2 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            title="Attach a file or image"
          >
            📎
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing || !currentProject}
            placeholder={currentProject ? 'Ask or request changes… (Shift+Enter for newline)' : 'Open a project first'}
            className="w-full bg-transparent pl-10 pr-10 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none resize-none leading-relaxed"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && attachments.length === 0) || isProcessing || !currentProject}
            className="absolute right-2 bottom-2 w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : '↑'}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 text-center">
          Edit requests modify files directly · attach any file or image for context
        </p>
      </div>
    </div>
  );
}
