import type { FileChange } from '@/types';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

export class DiffEngine {
  computeDiff(oldContent: string, newContent: string): DiffLine[] {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const result: DiffLine[] = [];

    // Simple LCS-based diff
    const lcs = this.longestCommonSubsequence(oldLines, newLines);
    let oldIdx = 0;
    let newIdx = 0;
    let lineNum = 0;

    for (const common of lcs) {
      // Lines removed from old
      while (oldIdx < common.oldIdx) {
        result.push({ type: 'removed', content: oldLines[oldIdx], lineNumber: lineNum++ });
        oldIdx++;
      }
      // Lines added in new
      while (newIdx < common.newIdx) {
        result.push({ type: 'added', content: newLines[newIdx], lineNumber: lineNum++ });
        newIdx++;
      }
      // Common lines
      result.push({ type: 'unchanged', content: oldLines[oldIdx], lineNumber: lineNum++ });
      oldIdx++;
      newIdx++;
    }

    // Remaining removed lines
    while (oldIdx < oldLines.length) {
      result.push({ type: 'removed', content: oldLines[oldIdx], lineNumber: lineNum++ });
      oldIdx++;
    }

    // Remaining added lines
    while (newIdx < newLines.length) {
      result.push({ type: 'added', content: newLines[newIdx], lineNumber: lineNum++ });
      newIdx++;
    }

    return result;
  }

  private longestCommonSubsequence(a: string[], b: string[]): { oldIdx: number; newIdx: number }[] {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const result: { oldIdx: number; newIdx: number }[] = [];
    let i = m;
    let j = n;

    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        result.unshift({ oldIdx: i - 1, newIdx: j - 1 });
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return result;
  }

  computeFileChange(oldContent: string, newContent: string): { diff: string; hasChanges: boolean } {
    if (oldContent === newContent) {
      return { diff: '', hasChanges: false };
    }

    const lines = this.computeDiff(oldContent, newContent);
    let diff = '';
    for (const line of lines) {
      const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
      diff += `${prefix} ${line.content}\n`;
    }

    return { diff, hasChanges: true };
  }

  generateSummary(changes: FileChange[]): string {
    const added = changes.filter((c) => c.type === 'added').length;
    const modified = changes.filter((c) => c.type === 'modified').length;
    const deleted = changes.filter((c) => c.type === 'deleted').length;

    const parts: string[] = [];
    if (added > 0) parts.push(`${added} file(s) added`);
    if (modified > 0) parts.push(`${modified} file(s) modified`);
    if (deleted > 0) parts.push(`${deleted} file(s) deleted`);

    return parts.join(', ') || 'No changes';
  }
}

export const diffEngine = new DiffEngine();
