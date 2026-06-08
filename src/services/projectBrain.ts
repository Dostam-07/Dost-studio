import type { ProjectBrain, Conversation, Decision, Modification, GraphNode, Component, Route, ProjectFile } from '@/types';

const BRAIN_KEY = 'dost-brain-';

export class ProjectBrainService {
  private brain: Map<string, ProjectBrain> = new Map();

  getKey(projectId: string): ProjectBrain {
    const key = `${BRAIN_KEY}${projectId}`;
    if (this.brain.has(key)) return this.brain.get(key)!;

    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as ProjectBrain;
      this.brain.set(key, parsed);
      return parsed;
    }

    const empty: ProjectBrain = {
      prompt: '',
      enhancedPrompt: null,
      prd: null,
      architecture: null,
      conversations: [],
      decisions: [],
      modifications: [],
      knowledgeGraph: [],
      components: [],
      routes: [],
      files: [],
      metadata: {},
    };

    this.brain.set(key, empty);
    return empty;
  }

  save(projectId: string, brain: ProjectBrain): void {
    const key = `${BRAIN_KEY}${projectId}`;
    this.brain.set(key, brain);
    localStorage.setItem(key, JSON.stringify(brain));
  }

  addConversation(projectId: string, conversation: Conversation): void {
    const brain = this.getKey(projectId);
    brain.conversations.push(conversation);
    this.save(projectId, brain);
  }

  addDecision(projectId: string, decision: Decision): void {
    const brain = this.getKey(projectId);
    brain.decisions.push(decision);
    this.save(projectId, brain);
  }

  addModification(projectId: string, modification: Modification): void {
    const brain = this.getKey(projectId);
    brain.modifications.push(modification);
    this.save(projectId, brain);
  }

  addGraphNode(projectId: string, node: GraphNode): void {
    const brain = this.getKey(projectId);
    brain.knowledgeGraph.push(node);
    this.save(projectId, brain);
  }

  addComponent(projectId: string, component: Component): void {
    const brain = this.getKey(projectId);
    brain.components.push(component);
    this.save(projectId, brain);
  }

  addRoute(projectId: string, route: Route): void {
    const brain = this.getKey(projectId);
    brain.routes.push(route);
    this.save(projectId, brain);
  }

  addFile(projectId: string, file: ProjectFile): void {
    const brain = this.getKey(projectId);
    brain.files.push(file);
    this.save(projectId, brain);
  }

  getConversations(projectId: string): Conversation[] {
    return this.getKey(projectId).conversations;
  }

  getDecisions(projectId: string): Decision[] {
    return this.getKey(projectId).decisions;
  }

  getGraph(projectId: string): GraphNode[] {
    return this.getKey(projectId).knowledgeGraph;
  }

  query(projectId: string, question: string, activeFilePath?: string): string {
    const brain = this.getKey(projectId);
    const recentConversations = brain.conversations.slice(-5).map((c) =>
      `[${c.role}] ${c.content.slice(0, 500)}`
    ).join('\n');

    const recentModifications = brain.modifications.slice(-3).map((m) =>
      `- ${m.description}: ${m.files.map((f) => f.path).join(', ')}`
    ).join('\n');

    const context = `
Project Prompt: ${brain.prompt}
Features: ${brain.prd?.features.map((f) => f.name).join(', ') || 'N/A'}
Components: ${brain.components.map((c) => c.name).join(', ') || 'N/A'}
Routes: ${brain.routes.map((r) => r.path).join(', ') || 'N/A'}
Files: ${brain.files.map((f) => f.path).join(', ') || 'N/A'}
Decisions: ${brain.decisions.map((d) => d.description).join(', ') || 'N/A'}
Active File: ${activeFilePath || 'None'}

Recent Conversations (last 5):
${recentConversations || 'None'}

Recent Modifications (last 3):
${recentModifications || 'None'}
`;
    return context;
  }

  clear(projectId: string): void {
    const key = `${BRAIN_KEY}${projectId}`;
    this.brain.delete(key);
    localStorage.removeItem(key);
  }
}

export const projectBrain = new ProjectBrainService();
