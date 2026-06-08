import type { GraphNode, GraphRelationship, PRD, Architecture, Component, Route, ProjectFile } from '@/types';
import { v4 as uuid } from 'uuid';

export class KnowledgeGraphService {
  private nodes: Map<string, GraphNode> = new Map();

  addNode(node: GraphNode): GraphNode {
    this.nodes.set(node.id, node);
    return node;
  }

  removeNode(id: string): void {
    this.nodes.delete(id);
    // Remove relationships pointing to this node
    for (const node of this.nodes.values()) {
      node.relationships = node.relationships.filter((r) => r.from !== id && r.to !== id);
    }
  }

  addRelationship(from: string, to: string, type: GraphRelationship['type'], description?: string): void {
    const fromNode = this.nodes.get(from);
    const toNode = this.nodes.get(to);
    if (!fromNode || !toNode) return;

    const exists = fromNode.relationships.some((r) => r.from === from && r.to === to && r.type === type);
    if (!exists) {
      fromNode.relationships.push({ from, to, type, description });
    }
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  getDependencies(id: string): GraphNode[] {
    const node = this.nodes.get(id);
    if (!node) return [];
    return node.relationships
      .filter((r) => r.from === id && r.type === 'depends-on')
      .map((r) => this.nodes.get(r.to))
      .filter(Boolean) as GraphNode[];
  }

  getDependents(id: string): GraphNode[] {
    const dependents: GraphNode[] = [];
    for (const node of this.nodes.values()) {
      const hasDep = node.relationships.some((r) => r.to === id && r.type === 'depends-on');
      if (hasDep) dependents.push(node);
    }
    return dependents;
  }

  getImpact(id: string): { direct: GraphNode[]; indirect: GraphNode[] } {
    const direct = this.getDependents(id);
    const indirect: GraphNode[] = [];
    for (const dep of direct) {
      const subDeps = this.getDependents(dep.id);
      indirect.push(...subDeps.filter((n) => n.id !== id && !direct.includes(n) && !indirect.includes(n)));
    }
    return { direct, indirect };
  }

  buildFromProject(prd: PRD, architecture: Architecture, files: ProjectFile[]): GraphNode[] {
    this.nodes.clear();

    // Vision node
    const visionNode = this.createNode('vision', prd.title, prd.overview);
    this.addNode(visionNode);

    // Feature nodes
    for (const feature of prd.features) {
      const featureNode = this.createNode('feature', feature.name, feature.description, { priority: feature.priority });
      this.addNode(featureNode);
      this.addRelationship(visionNode.id, featureNode.id, 'contains');
    }

    // Page nodes
    for (const page of prd.pages) {
      const pageNode = this.createNode('page', page, `Page: ${page}`);
      this.addNode(pageNode);
      this.addRelationship(visionNode.id, pageNode.id, 'contains');
    }

    // Route nodes
    for (const route of architecture.routes) {
      const routeNode = this.createNode('route', route.path, route.description);
      this.addNode(routeNode);
      const pageMatch = prd.pages.find((p) => route.path.includes(p.toLowerCase().replace(/\s+/g, '')));
      if (pageMatch) {
        const pageNode = Array.from(this.nodes.values()).find((n) => n.label === pageMatch);
        if (pageNode) this.addRelationship(routeNode.id, pageNode.id, 'implements');
      }
    }

    // Component nodes
    for (const component of architecture.components) {
      const compNode = this.createNode('component', component.name, component.description);
      this.addNode(compNode);
      for (const dep of component.dependencies) {
        const depNode = this.createNode('dependency', dep, `Dependency: ${dep}`);
        this.addNode(depNode);
        this.addRelationship(compNode.id, depNode.id, 'depends-on');
      }
    }

    // File nodes
    for (const file of files) {
      const fileNode = this.createNode('file', file.path, `File: ${file.path}`, { language: file.language });
      this.addNode(fileNode);
      const compMatch = architecture.components.find((c) => file.path.includes(c.name.toLowerCase()));
      if (compMatch) {
        const compNode = Array.from(this.nodes.values()).find((n) => n.label === compMatch.name);
        if (compNode) this.addRelationship(fileNode.id, compNode.id, 'implements');
      }
    }

    return this.getAllNodes();
  }

  toJSON(): string {
    return JSON.stringify(this.getAllNodes());
  }

  fromJSON(json: string): void {
    const nodes = JSON.parse(json) as GraphNode[];
    this.nodes.clear();
    for (const node of nodes) {
      this.nodes.set(node.id, node);
    }
  }

  private createNode(type: GraphNode['type'], label: string, description: string, metadata?: Record<string, unknown>): GraphNode {
    return {
      id: uuid(),
      type,
      label,
      description,
      metadata,
      relationships: [],
    };
  }
}

export const knowledgeGraph = new KnowledgeGraphService();
