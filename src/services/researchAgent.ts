import type { ResearchResult } from '@/types';

export class ResearchAgent {
  /**
   * Perform deep research on a topic using AI model deep analysis
   * (Kimi-style) via the Express proxy endpoint.
   */
  async research(topic: string, _depth: 'basic' | 'advanced' = 'basic'): Promise<ResearchResult> {
    const res = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topic.trim() }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Research request failed');
    }

    return res.json();
  }

  /**
   * Format research results as a context string for prompt enhancement.
   */
  toPromptContext(result: ResearchResult): string {
    const sections: string[] = [];

    if (result.summary) {
      sections.push(`AI Deep Analysis Summary:\n${result.summary}`);
    }

    if (result.insights?.length > 0) {
      sections.push(`Key Insights:\n${result.insights.map((i) => `- ${i}`).join('\n')}`);
    }

    if (result.sources?.length > 0) {
      sections.push(`Analysis Breakdown:\n${result.sources.map((s) => `- ${s.title}: ${s.snippet.slice(0, 300)}`).join('\n')}`);
    }

    return sections.join('\n\n');
  }
}

export const researchAgent = new ResearchAgent();
