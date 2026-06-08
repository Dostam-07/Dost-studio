import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { ollamaService } from '@/services/ollama';
import { projectBrain } from '@/services/projectBrain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ProductManager() {
  const { currentProject, settings } = useAppStore();
  const [auditResult, setAuditResult] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState(false);

  const handleAudit = async () => {
    if (!currentProject) return;
    setIsAuditing(true);
    try {
      ollamaService.configureWithSettings(settings);
      const context = projectBrain.query(currentProject.id, 'Audit my product');
      const result = await ollamaService.generate(
        settings.models.planner,
        `Perform a comprehensive product audit on this project:

${context}

Analyze:
1. Strengths - What's working well
2. Weaknesses - What needs improvement
3. Missing Features - What should be added
4. Growth Opportunities - How to scale
5. UX Risks - User experience issues
6. Accessibility Risks - Accessibility concerns
7. Technical Debt - Code quality issues

Be thorough, specific, and actionable. Reference specific components and features.`,
        'You are an expert Product Manager performing a product audit.'
      );
      setAuditResult(result);
    } catch (error) {
      setAuditResult('Error performing audit. Please try again.');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold mb-2">AI Product Manager</h3>
      <p className="text-xs text-muted-foreground mb-4">Audit your product for improvements</p>
      <Button onClick={handleAudit} disabled={isAuditing} className="mb-4">
        {isAuditing ? 'Analyzing...' : 'Audit My Product'}
      </Button>
      <ScrollArea className="flex-1">
        {auditResult && (
          <div className="prose prose-sm dark:prose-invert">
            <div className="whitespace-pre-wrap text-sm">{auditResult}</div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
