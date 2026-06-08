import type { Project, FileChange, ProjectFile } from '@/types';
import { projectBrain } from './projectBrain';
import { knowledgeGraph } from './knowledgeGraph';
import { diffEngine } from './diffEngine';
import { versioning } from './versioning';
import { ollamaService } from './ollama';

export interface EditPlan {
  request: string;
  context: string;
  impact: {
    filesChanged: string[];
    dependenciesAffected: string[];
    risks: string[];
  };
  proposedChanges: {
    files: { path: string; oldContent: string; newContent: string }[];
    summary: string;
    reasoning: string;
  };
  diff: {
    changes: FileChange[];
    summary: string;
  };
}

export class ContextAwareEditing {
  async analyzeRequest(project: Project, request: string, model: string): Promise<EditPlan> {
    // 1. Understand request through brain context
    const brainContext = projectBrain.query(project.id, request);

    // 2. Query Knowledge Graph for impact analysis
    const graphNodes = project.brain?.knowledgeGraph || [];
    const relevantFiles: string[] = [];

    // Find files related to the request
    for (const node of graphNodes) {
      if (node.type === 'file' || node.type === 'component') {
        relevantFiles.push(node.label);
      }
    }

    // 3. Analyze impact using AI
    const impactAnalysis = await ollamaService.generateJSON<{
      filesChanged: string[];
      dependenciesAffected: string[];
      risks: string[];
    }>(
      model,
      `Project Context: ${brainContext}

User Request: "${request}"

Analyze the impact of this change. Consider:
1. Which files need to be modified?
2. What dependencies will be affected?
3. What are the risks?

Available files: ${relevantFiles.join(', ')}

Return a JSON object with:
- filesChanged: string[] (paths of files to change)
- dependenciesAffected: string[] (paths of dependent files)
- risks: string[] (list of risks)`,
      'You are an expert software architect analyzing change impact.'
    );

    const fileContents = project.files
      .map((f) => `### ${f.path}\n${f.content.slice(0, 3000)}${f.content.length > 3000 ? '\n... (truncated)' : ''}`)
      .join('\n\n');

    // 4. Generate implementation plan
    const implementationPlan = await ollamaService.generateJSON<{
      summary: string;
      reasoning: string;
      fileChanges: { path: string; description: string; newContent: string }[];
    }>(
      model,
      `Project Context: ${brainContext}
User Request: "${request}"
Files to change: ${impactAnalysis.filesChanged?.join(', ') || ''}

Current file contents:
${fileContents}

Generate a complete implementation plan. For each file, provide the complete new content.
You MUST base your newContent on the existing file shown above. Do not invent imports or components that don't exist.
Only use plain TailwindCSS classes — never import from shadcn/ui or @/components/ui.
Return JSON with:
- summary: string
- reasoning: string
- fileChanges: array of { path, description, newContent }`,
      'You are an expert senior software engineer. Generate complete, working code.'
    );

    const fileChanges = Array.isArray(implementationPlan.fileChanges) ? implementationPlan.fileChanges : [];

    // 5. Create diffs
    const changes: FileChange[] = [];
    const proposedFiles: { path: string; oldContent: string; newContent: string }[] = [];

    for (const change of fileChanges) {
      const existingFile = project.files.find((f) => f.path === change.path);
      const oldContent = existingFile?.content || '';
      const { diff, hasChanges } = diffEngine.computeFileChange(oldContent, change.newContent);

      proposedFiles.push({
        path: change.path,
        oldContent,
        newContent: change.newContent,
      });

      changes.push({
        path: change.path,
        type: existingFile ? 'modified' : 'added',
        diff,
        content: change.newContent,
      });
    }

    return {
      request,
      context: brainContext,
      impact: {
        filesChanged: Array.isArray(impactAnalysis.filesChanged) ? impactAnalysis.filesChanged : [],
        dependenciesAffected: Array.isArray(impactAnalysis.dependenciesAffected) ? impactAnalysis.dependenciesAffected : [],
        risks: Array.isArray(impactAnalysis.risks) ? impactAnalysis.risks : [],
      },
      proposedChanges: {
        files: proposedFiles,
        summary: implementationPlan.summary || 'Generated implementation plan',
        reasoning: implementationPlan.reasoning || 'No reasoning returned from model.',
      },
      diff: {
        changes,
        summary: diffEngine.generateSummary(changes),
      },
    };
  }

  async applyChanges(project: Project, plan: EditPlan): Promise<Project> {
    const updatedProject = { ...project };
    const oldFiles = [...project.files];

    // Create version before changes
    const version = versioning.createVersion(
      project,
      plan.proposedChanges.summary,
      oldFiles,
      plan.proposedChanges.files.map((f) => ({
        path: f.path,
        content: f.newContent,
        language: f.path.split('.').pop() || 'typescript',
        type: 'modified' as const,
      })),
      plan.proposedChanges.reasoning
    );

    // Apply file changes
    for (const fileChange of plan.proposedChanges.files) {
      const idx = updatedProject.files.findIndex((f) => f.path === fileChange.path);
      if (idx >= 0) {
        updatedProject.files[idx] = {
          ...updatedProject.files[idx],
          content: fileChange.newContent,
        };
      } else {
        updatedProject.files.push({
          path: fileChange.path,
          content: fileChange.newContent,
          language: fileChange.path.split('.').pop() || 'typescript',
          type: 'modified',
        });
      }
    }

    updatedProject.versions = [...updatedProject.versions, version];
    updatedProject.updatedAt = new Date().toISOString();

    // Update project brain
    if (updatedProject.brain) {
      updatedProject.brain.modifications.push({
        id: version.id,
        description: plan.proposedChanges.summary,
        files: plan.diff.changes,
        timestamp: version.timestamp,
        version: version.version,
        reasoning: plan.proposedChanges.reasoning,
      });
      projectBrain.save(updatedProject.id, updatedProject.brain);
    }

    return updatedProject;
  }
}

export const contextAwareEditing = new ContextAwareEditing();
