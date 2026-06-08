export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  prompt: string;
  enhancedPrompt: EnhancedPrompt | null;
  prd: PRD | null;
  architecture: Architecture | null;
  files: ProjectFile[];
  versions: Version[];
  brain: ProjectBrain;
  graph: GraphNode[];
}

export interface EnhancedPrompt {
  productVision: string;
  targetUsers: string;
  personas: string[];
  coreFeatures: string[];
  userStories: string[];
  pages: string[];
  userFlows: string[];
  architecture: string;
  database: string;
  uxRequirements: string[];
  technicalRequirements: string[];
  edgeCases: string[];
  acceptanceCriteria: string[];
  successMetrics: string[];
  risks: string[];
}

export interface PRD {
  title: string;
  overview: string;
  goals: string[];
  targetAudience: string;
  userPersonas: Persona[];
  features: Feature[];
  userStories: UserStory[];
  pages: string[];
  technicalStack: string;
  constraints: string[];
  successMetrics: string[];
  timeline: string;
}

export interface Persona {
  name: string;
  role: string;
  goals: string[];
  painPoints: string[];
  behaviors: string[];
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "planned" | "in-progress" | "completed";
  dependencies: string[];
}

export interface UserStory {
  id: string;
  title: string;
  description: string;
  feature: string;
  acceptanceCriteria: string[];
  priority: "critical" | "high" | "medium" | "low";
}

export interface Architecture {
  framework: string;
  folderStructure: FolderItem[];
  routes: Route[];
  components: Component[];
  stateManagement: string;
  database: DatabaseSchema;
  apiEndpoints: APIEndpoint[];
}

export interface FolderItem {
  path: string;
  type: "file" | "folder";
  children?: FolderItem[];
}

export interface Route {
  path: string;
  component: string;
  description: string;
  auth: boolean;
}

export interface Component {
  id: string;
  name: string;
  description: string;
  filePath: string;
  props: string[];
  dependencies: string[];
  routes: string[];
}

export interface DatabaseSchema {
  tables: Table[];
  relationships: Relationship[];
}

export interface Table {
  name: string;
  columns: Column[];
  indexes: string[];
}

export interface Column {
  name: string;
  type: string;
  primary?: boolean;
  foreign?: boolean;
  required?: boolean;
  default?: string;
}

export interface Relationship {
  from: string;
  to: string;
  type: "one-to-one" | "one-to-many" | "many-to-many";
}

export interface APIEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  auth: boolean;
  requestBody?: string;
  responseType?: string;
}

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
  type: "generated" | "modified" | "user-created";
}

export interface Version {
  id: string;
  version: string;
  description: string;
  timestamp: string;
  files: FileChange[];
}

export interface FileChange {
  path: string;
  type: "added" | "modified" | "deleted";
  diff: string;
  content?: string;
}

export interface ProjectBrain {
  prompt: string;
  enhancedPrompt: EnhancedPrompt | null;
  prd: PRD | null;
  architecture: Architecture | null;
  conversations: Conversation[];
  decisions: Decision[];
  modifications: Modification[];
  knowledgeGraph: GraphNode[];
  components: Component[];
  routes: Route[];
  files: ProjectFile[];
  metadata: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  context?: string;
}

export interface Decision {
  id: string;
  description: string;
  reasoning: string;
  alternatives: string[];
  timestamp: string;
  category: "architecture" | "ux" | "feature" | "technical" | "other";
}

export interface Modification {
  id: string;
  description: string;
  files: FileChange[];
  timestamp: string;
  version: string;
  reasoning: string;
}

export interface GraphNode {
  id: string;
  type: "vision" | "feature" | "page" | "route" | "component" | "file" | "dependency" | "state" | "database" | "decision" | "conversation";
  label: string;
  description: string;
  metadata?: Record<string, unknown>;
  relationships: GraphRelationship[];
}

export interface GraphRelationship {
  from: string;
  to: string;
  type: "depends-on" | "implements" | "contains" | "references" | "creates" | "modifies" | "related-to";
  description?: string;
}

export interface FileEdit {
  path: string;
  oldContent: string;
  newContent: string;
  description: string;
  isNew: boolean;
}

export interface EditResult {
  summary: string;
  reasoning: string;
  fileEdits: FileEdit[];
  isEdit: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  editResult?: EditResult;
  editStatus?: 'pending' | 'applying' | 'applied' | 'rejected';
  metadata?: {
    model?: string;
    tokens?: number;
    processingTime?: number;
  };
}

export interface AgentOutput {
  agent: string;
  model: string;
  output: string;
  structured?: Record<string, unknown>;
  timestamp: string;
}

export interface VisionAnalysis {
  layout: string;
  components: string[];
  structure: string;
  colors: string[];
  typography: string[];
  suggestions: string[];
}

export interface UploadedFile {
  name: string;
  content: string;
  isImage: boolean;
  isFigFile?: boolean;
  dataUrl?: string;
  visionAnalysis?: string;
}

export interface GenerationProgress {
  stage: string;
  status: "pending" | "in-progress" | "completed" | "error";
  message?: string;
  progress?: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export interface OllamaModel {
  name: string;
  model: string;
  size: string;
  modified: string;
}

export interface HomeMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type: 'prompt' | 'enhanced' | 'error' | 'progress' | 'success' | 'research';
  timestamp: string;
  enhancedData?: EnhancedPrompt;
  progressData?: GenerationProgress[];
  researchData?: ResearchResult;
}

export interface ResearchResult {
  topic: string;
  summary: string;
  sources: ResearchSource[];
  insights: string[];
  rawContent?: string;
}

export interface ResearchSource {
  url: string;
  title: string;
  snippet: string;
  relevance: number;
}

export interface ResearchMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface KeyCredits {
  ok: boolean;
  label?: string;
  usage?: number;
  limit?: number;
  rateLimit?: { requests: number; interval: string };
  isFree?: boolean;
  error?: string;
}

export interface AppSettings {
  theme: "dark" | "light";
  ollamaUrl: string;
  apiProvider: 'ollama' | 'openrouter';
  openRouterKey: string;       // currently active key
  openRouterKeys: string[];    // full rotation pool (all 4 keys)
  openRouterModel: string;
  models: {
    planner: string;
    architect: string;
    coder: string;
    vision: string;
  };
  projectsDir: string;
  figmaAccessToken?: string;
  tavilyApiKey?: string;
  promptOverrides?: {
    planner?: string;
    architect?: string;
    coder?: string;
  };
}
