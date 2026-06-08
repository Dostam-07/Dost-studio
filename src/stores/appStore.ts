import { create } from 'zustand';
import type { Project, Message, GenerationProgress, AppSettings, EnhancedPrompt, PRD, Architecture, GraphNode, ProjectBrain, ResearchResult, KeyCredits } from '@/types';
import { setPromptOverrides } from '@/services/agents';
import { ollamaService } from '@/services/ollama';

interface AppState {
  // Navigation
  currentView: 'home' | 'workspace' | 'settings';
  setCurrentView: (view: 'home' | 'workspace' | 'settings') => void;

  // Projects
  projects: Project[];
  currentProject: Project | null;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  loadProjectsFromServer: () => Promise<void>;

  // Generation
  isGenerating: boolean;
  generationProgress: GenerationProgress[];
  currentPrompt: string;
  enhancedPrompt: EnhancedPrompt | null;
  prd: PRD | null;
  architecture: Architecture | null;
  setIsGenerating: (value: boolean) => void;
  setGenerationProgress: (progress: GenerationProgress[]) => void;
  addGenerationProgress: (progress: GenerationProgress) => void;
  updateGenerationProgress: (stage: string, status: string, message?: string) => void;
  setCurrentPrompt: (prompt: string) => void;
  setEnhancedPrompt: (prompt: EnhancedPrompt | null) => void;
  setPrd: (prd: PRD | null) => void;
  setArchitecture: (architecture: Architecture | null) => void;

  // Chat (scoped by projectId)
  messagesByProject: Record<string, Message[]>;
  isProcessing: boolean;
  setMessages: (projectId: string, messages: Message[]) => void;
  addMessage: (projectId: string, message: Message) => void;
  setIsProcessing: (value: boolean) => void;

  // Preview auto-refresh
  previewRefreshKey: number;
  triggerPreviewRefresh: () => void;

  // Figma pending prompt data (from .fig upload in workspace → homepage)
  pendingFigPromptData: string | null;
  setPendingFigPromptData: (data: string | null) => void;

  // Workspace
  leftPanel: 'chat' | 'files' | 'prd' | 'tasks' | 'history' | 'graph' | 'pm' | 'ux' | 'design' | 'vision' | 'figma';
  leftPanelOpen: boolean;
  rightPanel: 'editor' | 'preview';
  activeFile: string | null;
  openTabs: string[];
  setLeftPanel: (panel: 'chat' | 'files' | 'prd' | 'tasks' | 'history' | 'graph' | 'pm' | 'ux' | 'design' | 'vision' | 'figma') => void;
  toggleLeftPanel: () => void;
  setRightPanel: (panel: 'editor' | 'preview') => void;
  setActiveFile: (file: string | null) => void;
  closeTab: (file: string) => void;

  // Settings
  settings: AppSettings;
  backendAvailable: boolean;
  setBackendAvailable: (available: boolean) => void;
  checkBackendAvailability: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => void;
  loadSettings: () => void;
  ollamaStatus: 'checking' | 'connected' | 'disconnected';
  setOllamaStatus: (status: 'checking' | 'connected' | 'disconnected') => void;

  // Knowledge Graph
  graphNodes: GraphNode[];
  setGraphNodes: (nodes: GraphNode[]) => void;
  addGraphNode: (node: GraphNode) => void;

  // Project Brain
  brain: ProjectBrain | null;
  setBrain: (brain: ProjectBrain | null) => void;

  // Deep Research
  isResearching: boolean;
  researchResult: ResearchResult | null;
  setIsResearching: (value: boolean) => void;
  setResearchResult: (result: ResearchResult | null) => void;

  // Key Credits
  keyCredits: Record<string, KeyCredits>;
  setKeyCredits: (credits: Record<string, KeyCredits>) => void;
  checkKeyCredits: (keys: string[]) => Promise<void>;
}

const STORAGE_KEY = 'dost-studio-settings';

const defaultSettings: AppSettings = {
  theme: 'dark',
  ollamaUrl: 'http://localhost:11434',
  apiProvider: 'openrouter',
  // All 4 OpenRouter keys — rotated automatically when one runs out of credits
  openRouterKey: 'sk-or-v1',
  openRouterKeys: [
    'sk-or-v1',
    'sk-or-v1',
    'sk-or-v1',
    'sk-or-v1',
    'sk-or-v1',
  ],
  openRouterModel: 'deepseek/deepseek-chat',
  models: {
    planner: 'deepseek/deepseek-chat',
    architect: 'deepseek/deepseek-chat',
    coder: 'deepseek/deepseek-chat',
    vision: 'deepseek/deepseek-chat',
  },
  projectsDir: '',
  figmaAccessToken: '',
};

function loadFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const settings: AppSettings = { ...defaultSettings, ...parsed };

      // Always ensure the full key pool is present (merge saved + defaults, deduplicate)
      const savedKeys: string[] = Array.isArray(parsed.openRouterKeys) ? parsed.openRouterKeys : [];
      const allKeys = [...new Set([...defaultSettings.openRouterKeys, ...savedKeys])].filter(Boolean);
      settings.openRouterKeys = allKeys;

      // Ensure active key is from the pool
      if (!settings.openRouterKey || !allKeys.includes(settings.openRouterKey)) {
        settings.openRouterKey = allKeys[0];
      }

      // Sync model names for OpenRouter mode
      if (settings.apiProvider === 'openrouter') {
        const orModel = settings.openRouterModel || 'deepseek/deepseek-chat';
        const needsUpdate = !settings.models?.planner || !settings.models.planner.includes('/') ||
          !settings.models?.architect || !settings.models.architect.includes('/') ||
          !settings.models?.coder || !settings.models.coder.includes('/') ||
          !settings.models?.vision || !settings.models.vision.includes('/');
        if (needsUpdate) {
          settings.models = { planner: orModel, architect: orModel, coder: orModel, vision: orModel };
        }
      }
      return settings;
    }
  } catch { /* ignore */ }
  return defaultSettings;
}

function saveToStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

function loadPromptOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem('dost-studio-prompt-overrides');
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function savePromptOverrides(overrides: Record<string, string | undefined>): void {
  try {
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(overrides)) {
      if (value && value.trim()) clean[key] = value.trim();
    }
    localStorage.setItem('dost-studio-prompt-overrides', JSON.stringify(clean));
  } catch { /* ignore */ }
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'home',
  setCurrentView: (view) => set({ currentView: view }),

  projects: [],
  currentProject: null,
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (project) => set((state) => ({
    currentProject: state.currentProject?.id === project.id ? project : state.currentProject,
    projects: state.projects.map((p) => p.id === project.id ? project : p),
  })),
  loadProjectsFromServer: async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) return;
      const serverProjects = await res.json();
      if (!Array.isArray(serverProjects) || serverProjects.length === 0) return;
      set((state) => {
        // Merge: keep in-memory projects but add any server projects not yet in store
        const existingIds = new Set(state.projects.map((p: Project) => p.id));
        const newFromServer = serverProjects.filter((p: Project) => !existingIds.has(p.id));
        if (newFromServer.length === 0) return state;
        return { projects: [...state.projects, ...newFromServer] };
      });
    } catch {
      // non-fatal
    }
  },

  isGenerating: false,
  generationProgress: [],
  currentPrompt: '',
  enhancedPrompt: null,
  prd: null,
  architecture: null,
  setIsGenerating: (value) => set({ isGenerating: value }),
  setGenerationProgress: (progress) => set({ generationProgress: progress }),
  addGenerationProgress: (progress) =>
    set((state) => ({ generationProgress: [...state.generationProgress, progress] })),
  updateGenerationProgress: (stage, status, message) =>
    set((state) => ({
      generationProgress: state.generationProgress.map((p) =>
        p.stage === stage ? { ...p, status: status as 'pending' | 'in-progress' | 'completed' | 'error', message } : p
      ),
    })),
  setCurrentPrompt: (prompt) => set({ currentPrompt: prompt }),
  setEnhancedPrompt: (prompt) => set({ enhancedPrompt: prompt }),
  setPrd: (prd) => set({ prd }),
  setArchitecture: (architecture) => set({ architecture }),

  messagesByProject: {},
  isProcessing: false,
  setMessages: (projectId, messages) => set((state) => ({
    messagesByProject: { ...state.messagesByProject, [projectId]: messages },
  })),
  addMessage: (projectId, message) => set((state) => ({
    messagesByProject: {
      ...state.messagesByProject,
      [projectId]: [...(state.messagesByProject[projectId] || []), message],
    },
  })),
  setIsProcessing: (value) => set({ isProcessing: value }),

  previewRefreshKey: 0,
  triggerPreviewRefresh: () => set((state) => ({ previewRefreshKey: state.previewRefreshKey + 1 })),

  pendingFigPromptData: null,
  setPendingFigPromptData: (data) => set({ pendingFigPromptData: data }),

  leftPanel: 'chat',
  leftPanelOpen: true,
  rightPanel: 'preview',
  activeFile: null,
  openTabs: [],
  setLeftPanel: (panel) => set({ leftPanel: panel, leftPanelOpen: true }),
  toggleLeftPanel: () => set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),
  setRightPanel: (panel) => set({ rightPanel: panel }),
  setActiveFile: (file) => set((state) => ({
    activeFile: file,
    openTabs: file && !state.openTabs.includes(file)
      ? [...state.openTabs, file]
      : state.openTabs,
  })),
  closeTab: (file) => set((state) => {
    const tabs = state.openTabs.filter((t) => t !== file);
    const newActive = state.activeFile === file
      ? (tabs.length > 0 ? tabs[tabs.length - 1] : null)
      : state.activeFile;
    return { openTabs: tabs, activeFile: newActive };
  }),

  settings: loadFromStorage(),
  backendAvailable: false,
  setBackendAvailable: (available) => set({ backendAvailable: available }),
  checkBackendAvailability: async () => {
    // Retry up to 3 times with backoff — Express might still be booting
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * attempt));
      try {
        const res = await fetch('/api/projects', { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          set({ backendAvailable: true });
          return;
        }
      } catch { /* try next attempt */ }
    }
    set({ backendAvailable: false });
  },
  updateSettings: (newSettings) =>
    set((state) => {
      const updated = { ...state.settings, ...newSettings };
      if (updated.apiProvider === 'openrouter') {
        const orModel = updated.openRouterModel || 'deepseek/deepseek-chat';
        const modelChanged = newSettings.openRouterModel !== undefined;
        const needsUpdate = modelChanged ||
          !updated.models?.planner || !updated.models.planner.includes('/') ||
          !updated.models?.architect || !updated.models.architect.includes('/') ||
          !updated.models?.coder || !updated.models.coder.includes('/') ||
          !updated.models?.vision || !updated.models.vision.includes('/');
        if (needsUpdate) {
          updated.models = {
            planner: orModel,
            architect: orModel,
            coder: orModel,
            vision: orModel,
          };
        }
      }
      saveToStorage(updated);
      savePromptOverrides(updated.promptOverrides || {});
      setPromptOverrides(updated.promptOverrides || {});
      ollamaService.configureWithSettings(updated);
      // Sync to server so /api/element-edit uses the correct model
      if (state.backendAvailable) {
        fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
          .then((res) => { if (!res.ok) set({ backendAvailable: false }); })
          .catch(() => { set({ backendAvailable: false }); });
      }
      return { settings: updated };
    }),
  loadSettings: () => {
    const loaded = loadFromStorage();
    const promptOverrides = loadPromptOverrides();
    setPromptOverrides(promptOverrides);
    ollamaService.configureWithSettings(loaded);
    set({ settings: { ...loaded, promptOverrides } });
    get().checkBackendAvailability();
  },
  ollamaStatus: 'checking',
  setOllamaStatus: (status) => set({ ollamaStatus: status }),

  graphNodes: [],
  setGraphNodes: (nodes) => set({ graphNodes: nodes }),
  addGraphNode: (node) => set((state) => ({ graphNodes: [...state.graphNodes, node] })),

  brain: null,
  setBrain: (brain) => set({ brain }),

  isResearching: false,
  researchResult: null,
  setIsResearching: (value) => set({ isResearching: value }),
  setResearchResult: (result) => set({ researchResult: result }),

  // Key Credits
  keyCredits: {},
  setKeyCredits: (credits) => set({ keyCredits: credits }),
  checkKeyCredits: async (keys) => {
    const results: Record<string, KeyCredits> = {};
    for (const key of keys) {
      try {
        const res = await fetch('/api/check-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        });
        results[key] = await res.json();
      } catch {
        results[key] = { ok: false, error: 'Network error', isFree: true };
      }
    }
    set({ keyCredits: results });
  },
}));
