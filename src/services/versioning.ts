import type { Version, FileChange, Project, ProjectFile } from '@/types';
import { v4 as uuid } from 'uuid';
import { diffEngine } from './diffEngine';

export class VersioningService {
  createVersion(
    project: Project,
    description: string,
    oldFiles: ProjectFile[],
    newFiles: ProjectFile[],
    reasoning: string
  ): Version {
    const changes: FileChange[] = [];

    // Track added/modified/deleted files
    for (const newFile of newFiles) {
      const oldFile = oldFiles.find((f) => f.path === newFile.path);
      if (!oldFile) {
        changes.push({
          path: newFile.path,
          type: 'added',
          diff: '',
          content: newFile.content,
        });
      } else if (oldFile.content !== newFile.content) {
        const { diff, hasChanges } = diffEngine.computeFileChange(oldFile.content, newFile.content);
        if (hasChanges) {
          changes.push({
            path: newFile.path,
            type: 'modified',
            diff,
            content: newFile.content,
          });
        }
      }
    }

    // Track deleted files
    for (const oldFile of oldFiles) {
      if (!newFiles.find((f) => f.path === oldFile.path)) {
        changes.push({
          path: oldFile.path,
          type: 'deleted',
          diff: '',
        });
      }
    }

    const versionNumber = project.versions.length + 1;
    const version: Version = {
      id: uuid(),
      version: `v${versionNumber}`,
      description,
      timestamp: new Date().toISOString(),
      files: changes,
    };

    return version;
  }

  restoreVersion(project: Project, versionId: string): ProjectFile[] | null {
    const version = project.versions.find((v) => v.id === versionId);
    if (!version) return null;

    // Reconstruct files from the version's changes
    const restoredFiles: ProjectFile[] = [...project.files];

    for (const change of version.files) {
      if (change.type === 'added' || change.type === 'modified') {
        const idx = restoredFiles.findIndex((f) => f.path === change.path);
        if (idx >= 0) {
          restoredFiles[idx] = {
            ...restoredFiles[idx],
            content: change.content || '',
          };
        } else {
          restoredFiles.push({
            path: change.path,
            content: change.content || '',
            language: change.path.split('.').pop() || 'typescript',
            type: 'generated',
          });
        }
      } else if (change.type === 'deleted') {
        const idx = restoredFiles.findIndex((f) => f.path === change.path);
        if (idx >= 0) {
          restoredFiles.splice(idx, 1);
        }
      }
    }

    return restoredFiles;
  }

  compareVersions(versionA: Version, versionB: Version): { added: string[]; modified: string[]; deleted: string[] } {
    const filesA = new Map(versionA.files.map((f) => [f.path, f]));
    const filesB = new Map(versionB.files.map((f) => [f.path, f]));

    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];

    for (const [path] of filesB) {
      if (!filesA.has(path)) {
        added.push(path);
      } else if (filesA.get(path)!.content !== filesB.get(path)!.content) {
        modified.push(path);
      }
    }

    for (const [path] of filesA) {
      if (!filesB.has(path)) {
        deleted.push(path);
      }
    }

    return { added, modified, deleted };
  }
}

export const versioning = new VersioningService();
