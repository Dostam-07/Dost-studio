import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';
import { agentSystem, ENHANCER_STYLES } from '@/services/agents';
import { ollamaService } from '@/services/ollama';
import { projectBrain } from '@/services/projectBrain';
import { knowledgeGraph } from '@/services/knowledgeGraph';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { visionAgent } from '@/services/visionAgent';
import { parseFigFile, figFileToPromptResult } from '@/services/figFileParser';
import { figmaToPrompt } from '@/services/figmaToPrompt';
import type { EnhancedPrompt, Project, GenerationProgress, UploadedFile, HomeMessage, ResearchMessage } from '@/types';
import { v4 as uuid } from 'uuid';

const templates = [
  { id: 'saas', name: 'SaaS Dashboard', description: 'Multi-tenant SaaS platform with analytics', icon: '▦' },
  { id: 'crm', name: 'CRM', description: 'Customer relationship management system', icon: '◉' },
  { id: 'marketplace', name: 'Marketplace', description: 'Multi-vendor marketplace platform', icon: '◈' },
  { id: 'ai-product', name: 'AI Product', description: 'AI-powered product with chat interface', icon: '✦' },
  { id: 'learning', name: 'Learning', description: 'Educational platform with courses', icon: '▤' },
  { id: 'landing', name: 'Landing Page', description: 'Marketing landing page', icon: '◐' },
  { id: 'portfolio', name: 'Portfolio', description: 'Personal portfolio website', icon: '◇' },
  { id: 'mobile', name: 'Mobile App', description: 'Responsive mobile-first PWA', icon: '▭' },
  { id: 'admin', name: 'Admin Panel', description: 'Admin panel with data tables', icon: '⊞' },
];

const StageIcon = ({ status }: { status: string }) => {
  if (status === 'in-progress') return <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
  if (status === 'completed') return <span className="text-emerald-500">✓</span>;
  if (status === 'error') return <span className="text-red-500">✗</span>;
  return <div className="w-3.5 h-3.5 rounded-full border-2 border-muted" />;
};

function EnhancedMessage({ data }: { data: EnhancedPrompt }) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Product Vision</h4>
        <p className="text-sm">{data.productVision}</p>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Target Users</h4>
        <p className="text-sm">{data.targetUsers}</p>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Core Features</h4>
        <div className="flex flex-wrap gap-1">
          {(data.coreFeatures || []).map((f, i) => <Badge key={i} variant="secondary">{f}</Badge>)}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pages</h4>
        <div className="flex flex-wrap gap-1">
          {(data.pages || []).map((p, i) => <Badge key={i}>{p}</Badge>)}
        </div>
      </div>
    </div>
  );
}

function ProgressMessage({ data }: { data: GenerationProgress[] }) {
  return (
    <div className="space-y-2">
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full transition-all duration-500"
          style={{ width: `${data.length ? Math.round((data.filter(p => p.status === 'completed').length / data.length) * 100) : 0}%` }}
        />
      </div>
      <div className="space-y-1.5">
        {data.map((p, i) => (
          <div key={i} className={`flex items-center gap-2.5 text-sm ${p.status === 'in-progress' ? 'bg-primary/5 rounded-lg px-2.5 py-1 -mx-2.5' : ''}`}>
            <StageIcon status={p.status} />
            <span className={`flex-1 text-xs ${p.status === 'in-progress' ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{p.stage}</span>
            {p.message && <span className="text-muted-foreground text-[11px] max-w-[160px] truncate">{p.message}</span>}
            {p.status === 'in-progress' && <span className="text-[11px] text-primary font-medium animate-pulse">running</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomePage() {
  const {
    setCurrentView, addProject, setCurrentProject, setIsGenerating, setGenerationProgress,
    updateSettings, settings, ollamaStatus, setOllamaStatus, projects,
    pendingFigPromptData, setPendingFigPromptData,
  } = useAppStore();

  const [prompt, setPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enhanced, setEnhanced] = useState<EnhancedPrompt | null>(null);
  const [styleIndex, setStyleIndex] = useState(0);
  const [messages, setMessages] = useState<HomeMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isResearchMode, setIsResearchMode] = useState(false);
  const [researchTopic, setResearchTopic] = useState('');
  const [researchConversation, setResearchConversation] = useState<ResearchMessage[]>([]);
  const [isResearching, setIsResearching] = useState(false);
  // Refs to avoid stale closure in async handlers
  const researchConvRef = useRef(researchConversation);
  researchConvRef.current = researchConversation;

  const placeholders = [
    'Describe your product idea...',
    'Build a SaaS dashboard with analytics teams will love...',
    'Create a marketplace connecting buyers and sellers...',
    'Design a CRM to manage customer relationships...',
    'Make a personal portfolio that stands out...',
  ];
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    if (prompt) return;
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [prompt]);

  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [visionTexts, setVisionTexts] = useState<Record<number, string>>({});
  const [expandedVision, setExpandedVision] = useState<Record<number, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedProjects = [...projects].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );
  const displayedProjects = sortedProjects.slice(0, 3);
  const isReady = ollamaStatus === 'connected' || settings.apiProvider === 'openrouter';
  const hasMessages = messages.length > 0;

  const addMessage = useCallback((msg: Omit<HomeMessage, 'id' | 'timestamp'>) => {
    setMessages((prev) => [...prev, { ...msg, id: uuid(), timestamp: new Date().toISOString() }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const read = await Promise.all(
      files.map((f) => new Promise<UploadedFile>((resolve, reject) => {
        const reader = new FileReader();
        const isFigFile = f.name.toLowerCase().endsWith('.fig');
        const isImage = !isFigFile && f.type.startsWith('image/');
        if (isFigFile) {
          reader.onload = async () => {
            try {
              const buffer = reader.result as ArrayBuffer;
              const parsed = parseFigFile(buffer, f.name);
              const promptResult = figmaToPrompt(parsed.figmaFile, parsed.tokens, parsed.frames);
              let fullText = [promptResult.designSummary, promptResult.designTokens, promptResult.componentHierarchy, promptResult.codePrompt].join('\n\n');
              for (const [, dataUrl] of parsed.images) {
                try {
                  const base64 = dataUrl.split(',')[1];
                  const analysis = await visionAgent.analyzeImage(base64, settings.models.vision);
                  fullText += `\n\n[Embedded image]\nLayout: ${analysis.layout}\nComponents: ${analysis.components.join(', ')}`;
                } catch {}
              }
              resolve({ name: f.name, content: '', isImage: false, isFigFile: true, dataUrl: fullText, visionAnalysis: fullText });
            } catch {
              resolve({ name: f.name, content: '', isImage: false, isFigFile: true, visionAnalysis: '[Failed to parse .fig file]' });
            }
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(f);
        } else if (isImage) {
          reader.onload = () => resolve({ name: f.name, content: '', isImage: true, dataUrl: reader.result as string });
          reader.onerror = reject;
          reader.readAsDataURL(f);
        } else {
          reader.onload = () => resolve({ name: f.name, content: reader.result as string, isImage: false });
          reader.onerror = reject;
          reader.readAsText(f);
        }
      }))
    );
    setAttachments((prev) => [...prev, ...read]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  useEffect(() => {
    ollamaService.configureWithSettings(settings);
    if (settings.apiProvider === 'ollama') {
      (async () => {
        setOllamaStatus('checking');
        const models = await ollamaService.listModels();
        if (models.length > 0) {
          const names = models.map((m) => m.name);
          const pick = (preferred: string[]): string => {
            for (const p of preferred) {
              const match = names.find((n) => n.startsWith(p));
              if (match) return match;
            }
            return names[0];
          };
          updateSettings({
            models: {
              planner: pick(['hermes', 'llama3', 'qwen3:4b', 'qwen3', 'deepseek-r1', 'qwen2.5-coder']),
              architect: pick(['hermes', 'llama3', 'qwen3:4b', 'qwen3', 'deepseek-r1', 'qwen2.5-coder']),
              coder: pick(['hermes', 'llama3', 'qwen2.5-coder:7b', 'qwen2.5-coder', 'deepseek-r1', 'qwen3']),
              vision: pick(['minicpm-v', 'llava', 'llava-llama3', 'qwen3', 'deepseek-r1']),
            },
          });
          setOllamaStatus('connected');
        } else {
          setOllamaStatus('disconnected');
        }
      })();
    } else {
      setOllamaStatus('connected');
    }
  }, [settings.apiProvider]);

  // Single entry point for research mode actions (used by Enter key, Ctrl+Enter, and Build button)
  const handleResearchAction = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isResearching) return;
    if (trimmed.startsWith('/prompt')) {
      handleGeneratePrompt(trimmed.slice(7).trim() || undefined);
    } else {
      handleResearchMessage(trimmed);
    }
    setPrompt('');
  }, [isResearching]);

  const enhanceWithStyle = async (index: number) => {
    if (!prompt.trim() || isEnhancing) return;
    ollamaService.configureWithSettings(settings);
    setError(null);
    setIsEnhancing(true);
    setEnhanced(null);
    setStyleIndex(index);
    addMessage({ role: 'user', type: 'prompt', content: prompt });
    try {
      let attachmentContext = '';
      if (pendingFigPromptData) {
        attachmentContext += `\n--- Figma Import from Workspace ---\n${pendingFigPromptData}\n--- end Figma Import ---`;
      }
      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        if (att.isImage && att.dataUrl) {
          const cachedAnalysis = visionTexts[i] ?? att.visionAnalysis;
          if (cachedAnalysis) {
            attachmentContext += `\n--- Image: ${att.name} ---\n${cachedAnalysis}\n--- end ${att.name} ---`;
          }
        } else if (att.isFigFile) {
          const figText = visionTexts[i] ?? att.visionAnalysis ?? '[Figma design data]';
          attachmentContext += `\n--- Figma Design: ${att.name} ---\n${figText}\n--- end ${att.name} ---`;
        } else {
          attachmentContext += `\n--- Attached: ${att.name} ---\n${att.content.slice(0, 3000)}${att.content.length > 3000 ? '\n... (truncated)' : ''}\n--- end ${att.name} ---`;
        }
      }
      const result = await agentSystem.enhancePrompt(prompt, settings.models.planner, index, attachmentContext || undefined);
      setEnhanced(result);
      addMessage({ role: 'assistant', type: 'enhanced', content: `Enhanced with ${ENHANCER_STYLES[index].name}`, enhancedData: result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Enhancement failed';
      setError(msg);
      addMessage({ role: 'system', type: 'error', content: msg });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleResearchMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isResearching) return;
    setIsResearching(true);
    // Determine topic from first message
    const topicRef = researchTopic || userMessage;
    if (!researchTopic) setResearchTopic(userMessage);

    const userResearchMsg: ResearchMessage = { id: uuid(), role: 'user', content: userMessage, timestamp: new Date().toISOString() };
    setResearchConversation((prev) => [...prev, userResearchMsg]);
    addMessage({ role: 'user', type: 'prompt', content: userMessage });

    try {
      // Read latest conversation from the ref to avoid stale closure
      const history = [...researchConvRef.current, userResearchMsg];
      const res = await fetch('/api/research/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicRef, messages: history }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errBody.error || 'Research request failed');
      }
      const data = await res.json();
      const aiResearchMsg: ResearchMessage = { id: uuid(), role: 'assistant', content: data.content, timestamp: new Date().toISOString() };
      setResearchConversation((prev) => [...prev, aiResearchMsg]);
      addMessage({ role: 'assistant', type: 'research', content: data.content });
    } catch (err) {
      addMessage({ role: 'system', type: 'error', content: err instanceof Error ? err.message : 'Research failed' });
    } finally {
      setIsResearching(false);
    }
  };

  const handleGeneratePrompt = async (extraInstructions?: string) => {
    const conv = researchConvRef.current;
    if (conv.length === 0 || !researchTopic) return;
    setIsResearching(true);
    try {
      const res = await fetch('/api/research/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: researchTopic,
          messages: conv,
          extraInstructions: extraInstructions || undefined,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errBody.error || 'Prompt generation failed');
      }
      const data = await res.json();
      setPrompt(data.generatedPrompt);
      addMessage({ role: 'system', type: 'success', content: `✅ Prompt generated from research on "${researchTopic}" — ready to build!` });
      // Only clear research state on success
      setIsResearchMode(false);
      setResearchConversation([]);
      setResearchTopic('');
    } catch (err) {
      addMessage({ role: 'system', type: 'error', content: err instanceof Error ? err.message : 'Prompt generation failed' });
    } finally {
      setIsResearching(false);
    }
  };

  const handleEnhance = () => enhanceWithStyle(styleIndex);
  const handleRegenerate = () => enhanceWithStyle((styleIndex + 1) % ENHANCER_STYLES.length);

  const handleBuildProject = async () => {
    if (!prompt.trim() || isBuilding) return;
    ollamaService.configureWithSettings(settings);
    setError(null);
    setIsBuilding(true);
    setIsGenerating(true);
    addMessage({ role: 'user', type: 'prompt', content: prompt });

    let enrichedPrompt = prompt;
    if (pendingFigPromptData) {
      enrichedPrompt += `\n\n--- Figma Import from Workspace ---\n${pendingFigPromptData}\n--- end Figma Import ---`;
      setPendingFigPromptData(null);
    }
    const updatedAtts = [...attachments];
    for (let i = 0; i < attachments.length; i++) {
      const att = attachments[i];
      if (att.isImage && att.dataUrl) {
        const base64 = att.dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const cachedAnalysis = visionTexts[i] ?? att.visionAnalysis;
        let analysisText = cachedAnalysis;
        if (!cachedAnalysis) {
          try {
            const analysis = await visionAgent.analyzeImage(base64, settings.models.vision);
            analysisText = `Layout: ${analysis.layout}\nComponents: ${analysis.components.join(', ')}\nColors: ${analysis.colors.join(', ')}\nSuggestions: ${analysis.suggestions.join('; ')}`;
            updatedAtts[i] = { ...att, visionAnalysis: analysisText };
            setVisionTexts((p) => ({ ...p, [i]: analysisText }));
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Vision analysis failed';
            analysisText = `[Vision analysis failed: ${msg}]`;
          }
        }
        enrichedPrompt += `\n\n--- Image: ${att.name} ---\n${analysisText}\n--- end ${att.name} ---`;
      } else if (att.isFigFile) {
        const figText = visionTexts[i] ?? att.visionAnalysis ?? '[Figma design data]';
        enrichedPrompt += `\n\n--- Figma Design: ${att.name} ---\n${figText}\n--- end ${att.name} ---`;
      } else if (!att.isImage) {
        enrichedPrompt += `\n\n--- Attached: ${att.name} ---\n${att.content.slice(0, 3000)}${att.content.length > 3000 ? '\n... (truncated)' : ''}\n--- end ${att.name} ---`;
      }
    }
    setAttachments(updatedAtts);

    const updateProgress = (p: GenerationProgress[]) => {
      setGenerationProgress([...p]);
    };

    try {
      let modelsToUse = { ...settings.models };
      if (settings.apiProvider === 'openrouter') {
        const orModel = settings.openRouterModel || 'deepseek/deepseek-chat';
        const needsFix = !modelsToUse.planner?.includes('/') ||
          !modelsToUse.architect?.includes('/') ||
          !modelsToUse.coder?.includes('/') ||
          !modelsToUse.vision?.includes('/');
        if (needsFix) {
          modelsToUse = { planner: orModel, architect: orModel, coder: orModel, vision: orModel };
          updateSettings({ models: modelsToUse });
        }
      }

      // Start progress message
      const progressMsg: HomeMessage = { id: uuid(), role: 'system', type: 'progress', content: 'Building your project...', timestamp: new Date().toISOString(), progressData: [] };
      setMessages((prev) => [...prev, progressMsg]);

      const result = await agentSystem.generateAll(
        enrichedPrompt,
        modelsToUse,
        (p) => {
          updateProgress(p);
          setMessages((prev) => prev.map((m) => m.id === progressMsg.id ? { ...m, progressData: [...p] } : m));
        },
        () => {},
        enhanced || undefined
      );

      const project: Project = {
        id: uuid(),
        name: result.prd.title || prompt.slice(0, 50),
        description: result.prd.overview || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        prompt,
        enhancedPrompt: result.enhancedPrompt,
        prd: result.prd,
        architecture: result.architecture,
        files: result.files,
        versions: [],
        brain: {
          prompt, enhancedPrompt: result.enhancedPrompt, prd: result.prd, architecture: result.architecture,
          conversations: [], decisions: [], modifications: [], knowledgeGraph: [], components: result.architecture.components,
          routes: result.architecture.routes, files: result.files, metadata: {},
        },
        graph: [],
      };

      const graphNodes = knowledgeGraph.buildFromProject(result.prd, result.architecture, result.files);
      project.graph = graphNodes;
      project.brain.knowledgeGraph = graphNodes;
      projectBrain.save(project.id, project.brain);

      addProject(project);
      setCurrentProject(project);
      setAttachments([]);
      setMessages((prev) => prev.map((m) => m.id === progressMsg.id ? { ...m, content: `Project "${project.name}" built successfully!`, type: 'success', progressData: undefined } : m));

      try {
        await fetch('/api/projects/save', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project }),
        });
        fetch(`/api/build/${project.id}`, { method: 'POST' }).catch(() => {});
      } catch {}

      setCurrentView('workspace');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      setError(msg);
      addMessage({ role: 'system', type: 'error', content: msg });
    } finally {
      setIsBuilding(false);
      setIsGenerating(false);
    }
  };

  // Keyboard shortcut — defined after all handlers so they're in scope
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && prompt.trim() && !isBuilding && !isResearching) {
        e.preventDefault();
        if (isResearchMode) {
          handleResearchAction(prompt);
        } else {
          handleBuildProject();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prompt, isBuilding, isResearching, isResearchMode]);

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-start pt-16 pb-4 animate-fade-in">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold tracking-tight mb-3">
                dost<span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent font-light">studio</span>
              </h1>
              <p className="text-sm text-muted-foreground/60 tracking-wide">What are you building today?</p>
            </div>

            {pendingFigPromptData && (
              <div className="w-full max-w-xl mb-4 flex items-center justify-between px-3 py-2 rounded-lg bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20 backdrop-blur-sm">
                <span className="text-xs text-muted-foreground">🎨 Figma design imported from workspace</span>
                <div className="flex gap-2">
                  <button onClick={() => { setPrompt((p) => (p ? p + '\n\n' + pendingFigPromptData : pendingFigPromptData)); setPendingFigPromptData(null); }} className="text-xs text-primary hover:underline">append</button>
                  <button onClick={() => setPendingFigPromptData(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-2 max-w-xl mb-8">
              {templates.slice(0, 5).map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setPrompt(`Build a ${t.name}: ${t.description}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-gradient-to-br from-card/50 to-card/0 backdrop-blur-sm hover:border-primary/40 hover:shadow-sm hover:shadow-primary/5 transition-all duration-200 text-xs group animate-scale-in"
                  style={{ animationDelay: `${(i + 1) * 80}ms`, animationFillMode: 'backwards' }}
                >
                  <span className="w-5 h-5 flex items-center justify-center rounded-md bg-gradient-to-br from-primary/10 to-purple-500/10 text-muted-foreground group-hover:text-foreground transition-colors">{t.icon}</span>
                  <span>{t.name}</span>
                </button>
              ))}
            </div>

            {displayedProjects.length > 0 && (
              <div className="w-full max-w-xl">
                <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Recent Projects</p>
                <div className="grid grid-cols-3 gap-2">
                  {displayedProjects.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => { setCurrentProject(p); setCurrentView('workspace'); }}
                      className="text-left p-3 rounded-xl border border-border/60 bg-gradient-to-br from-card/40 to-card/0 backdrop-blur-sm hover:border-primary/40 hover:shadow-sm hover:shadow-primary/5 transition-all duration-200 group animate-scale-in"
                      style={{ animationDelay: `${(i + 1) * 100}ms`, animationFillMode: 'backwards' }}
                    >
                      <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground/50 line-clamp-1 leading-tight mt-1">{p.description || p.prompt?.slice(0, 50) || ''}</p>
                      <p className="text-[9px] text-muted-foreground/30 mt-1.5">{p.files?.length || 0} files</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto py-6 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                className={`animate-message-in ${msg.role === 'user' ? 'flex justify-end' : ''}`}
                style={{ animationDelay: `${idx * 45}ms`, animationFillMode: 'backwards' }}
              >
                <div className={`max-w-[75%] ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-primary/15 to-primary/5 backdrop-blur-sm rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm'
                    : msg.type === 'error'
                      ? 'bg-red-500/5 border border-red-500/20 rounded-2xl rounded-bl-md px-4 py-3'
                      : msg.type === 'success'
                        ? 'bg-emerald-500/5 border border-emerald-500/20 rounded-2xl rounded-bl-md px-4 py-3'
                        : msg.type === 'research'
                          ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-2xl rounded-bl-md px-4 py-3 backdrop-blur-sm'
                          : msg.type === 'enhanced'
                            ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl rounded-bl-md px-4 py-3 backdrop-blur-sm'
                            : 'bg-card/40 backdrop-blur-sm border border-border/30 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm'
                }`}>
                  {msg.role === 'assistant' && msg.type !== 'progress' && msg.type !== 'success' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-[10px] text-indigo-400">✦</div>
                      <span className="text-[10px] font-medium text-muted-foreground/60">dost</span>
                    </div>
                  )}
                  {msg.type === 'enhanced' && msg.enhancedData ? (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">{msg.content}</p>
                      <EnhancedMessage data={msg.enhancedData} />
                    </div>
                  ) : msg.type === 'progress' && msg.progressData ? (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">{msg.content}</p>
                      <ProgressMessage data={msg.progressData} />
                    </div>
                  ) : (
                    <p className={`text-sm ${msg.type === 'error' ? 'text-red-500' : msg.type === 'success' ? 'text-emerald-500' : ''} whitespace-pre-wrap`}>
                      {msg.type === 'error' ? msg.content.replace(/OpenRouter error \(\d+\): (\{.*?\})\s*—/s, (_, json) => {
                        try { const parsed = JSON.parse(json); const m = parsed?.error?.message || json; return m.replace('https://openrouter.ai/settings/credits', 'openrouter.ai/settings/credits'); } catch { return _; }
                      }) : msg.content}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
            {(isBuilding || isEnhancing || isResearching) && (
              <div className="flex items-center gap-2 px-1 py-1.5 animate-fade-in">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                  <span className="text-[9px] text-indigo-400">✦</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce-dot" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce-dot" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce-dot" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[11px] text-muted-foreground/50">
                  {isBuilding ? 'Building your project...' : isEnhancing ? 'Enhancing your idea...' : 'Researching...'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Research mode indicator */}
      {isResearchMode && (
        <div className="max-w-2xl mx-auto w-full px-4 pb-2">
          <div className="flex items-center gap-2 animate-slide-down px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 backdrop-blur-sm">
            <span className="text-xs text-indigo-400">🧠</span>
            <span className="text-xs text-indigo-300 font-medium">Deep Research</span>
            <span className="text-[10px] text-muted-foreground/50 ml-1">
              {researchTopic ? `on "${researchTopic}"` : '— ask about any topic'}
            </span>
            <span className="text-[10px] text-muted-foreground/30 ml-auto hidden sm:inline">
              type <kbd className="px-1 py-0.5 rounded border border-border/20 bg-muted/10 font-mono">/prompt</kbd> to generate a build prompt
            </span>
            <button onClick={() => { setIsResearchMode(false); setResearchConversation([]); setResearchTopic(''); }} className="text-muted-foreground/40 hover:text-foreground text-xs shrink-0 ml-2">✕</button>
          </div>
        </div>
      )}

      {/* Prompt bar */}
      <div className="border-t border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="bg-gradient-to-b from-card/30 to-card/10 backdrop-blur-lg border border-border/40 rounded-2xl shadow-sm transition-all duration-300 focus-within:border-primary/30 focus-within:shadow-primary/5">

            {/* Rich attachment pills */}
            {attachments.length > 0 && (
              <div className="px-3 pt-3 pb-1 flex flex-wrap gap-1.5">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30 border border-border/30 text-xs group animate-scale-in">
                    <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] ${
                      att.isFigFile ? 'bg-purple-500/15 text-purple-400' :
                      att.isImage ? 'bg-blue-500/15 text-blue-400' :
                      'bg-emerald-500/15 text-emerald-400'
                    }`}>
                      {att.isFigFile ? '◈' : att.isImage ? '▣' : '◈'}
                    </span>
                    <span className="truncate max-w-[80px] text-foreground/70">{att.name}</span>
                    <span className="text-[9px] text-muted-foreground/30">{att.content ? `${Math.max(1, Math.round(att.content.length / 1024))}KB` : att.dataUrl ? '~' : '0KB'}</span>
                    {(att.isImage || att.isFigFile) && att.visionAnalysis && (
                      <button onClick={() => setExpandedVision((p) => ({ ...p, [i]: !p[i] }))} className="text-[10px] text-primary/60 hover:text-primary ml-0.5">
                        {expandedVision[i] ? '▲' : '▼'}
                      </button>
                    )}
                    <button onClick={() => { setAttachments((prev) => prev.filter((_, j) => j !== i)); setVisionTexts((p) => { const n = { ...p }; delete n[i]; return n; }); }} className="text-muted-foreground/40 hover:text-foreground ml-0.5">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Expanded vision textareas */}
            {attachments.some((a, i) => (a.isImage || a.isFigFile) && expandedVision[i]) && (
              <div className="px-3 space-y-1 pb-1">
                {attachments.map((att, i) => (att.isImage || att.isFigFile) && expandedVision[i] && (
                  <textarea
                    key={i}
                    value={visionTexts[i] ?? att.visionAnalysis ?? ''}
                    onChange={(e) => setVisionTexts((p) => ({ ...p, [i]: e.target.value }))}
                    className="w-full h-20 text-xs bg-muted/20 border border-border/30 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/20"
                    placeholder="Edit analysis..."
                  />
                ))}
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={isResearchMode ? 'Ask about your research topic...' : placeholders[placeholderIdx]}
              rows={2}
              className="w-full bg-transparent border-0 px-4 pt-3 pb-2 text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0 resize-none transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!prompt.trim() || isBuilding || isResearching) return;
                  if (isResearchMode) {
                    handleResearchAction(prompt);
                  } else {
                    handleBuildProject();
                  }
                }
              }}
            />

            {/* Bottom toolbar */}
            <div className="flex items-center gap-1 px-3 pb-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".ts,.tsx,.js,.jsx,.css,.html,.json,.md,.txt,.py,.yaml,.yml,.csv,image/*,.fig"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/30 transition-all flex items-center gap-1"
                title="Attach files (images, code, .fig)"
              >
                <span>📎</span> Attach
              </button>
              <button
                onClick={() => setIsResearchMode((p) => !p)}
                className={`text-[11px] px-2 py-1 rounded-md transition-all flex items-center gap-1 ${isResearchMode ? 'bg-indigo-500/10 text-indigo-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
                title="Deep Analysis — AI-powered deep thinking (Kimi-style)"
              >
                <span>🧠</span> Deep Analysis
              </button>
              <div className="flex-1" />
              {!isResearchMode && (
                <>
                  <select
                    value={styleIndex}
                    onChange={(e) => setStyleIndex(Number(e.target.value))}
                    className="text-[11px] bg-muted/10 border-0 rounded px-1.5 py-1 text-muted-foreground focus:outline-none cursor-pointer"
                  >
                    {ENHANCER_STYLES.map((s, i) => (
                      <option key={s.id} value={i}>{s.icon} {s.name}</option>
                    ))}
                  </select>
                  <Button
                    onClick={handleEnhance}
                    disabled={!prompt.trim() || isEnhancing || !isReady}
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 h-7"
                  >
                    {isEnhancing ? <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Enhancing</> : '✨ Enhance'}
                  </Button>
                </>
              )}
              <Button
                onClick={() => {
                  if (isResearchMode) {
                    handleResearchAction(prompt);
                  } else {
                    handleBuildProject();
                  }
                }}
                disabled={!prompt.trim() || isBuilding || isResearching || (!isReady && !isResearchMode)}
                size="sm"
                className="text-xs gap-1 h-7"
              >
                {isBuilding || isResearching ? (
                  <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> {isResearching ? 'Researching' : 'Building'}</>
                ) : isResearchMode ? '🧠 Send' : '🚀 Build'}
              </Button>
              <div className="text-[10px] text-muted-foreground/25 ml-1 flex items-center gap-0.5">
                <kbd className="px-1 py-0.5 rounded border border-border/20 bg-muted/10 font-mono text-[9px]">{navigator.platform.includes('Mac') ? '⌘' : '⌃'}</kbd>
                <span>+</span>
                <kbd className="px-1 py-0.5 rounded border border-border/20 bg-muted/10 font-mono text-[9px]">⏎</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
