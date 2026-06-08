import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { ollamaService } from '@/services/ollama';
import { projectBrain } from '@/services/projectBrain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export function UXReviewer() {
  const { currentProject, settings } = useAppStore();
  const [target, setTarget] = useState('');
  const [review, setReview] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const handleReview = async () => {
    if (!currentProject || !target.trim()) return;
    setIsReviewing(true);
    try {
      ollamaService.configureWithSettings(settings);
      const context = projectBrain.query(currentProject.id, `Review ${target}`);
      const result = await ollamaService.generate(
        settings.models.architect,
        `Review the UX of "${target}" in this project:

${context}

Analyze:
1. User Flows - Are they intuitive?
2. Heuristics - Nielsen's usability heuristics
3. Accessibility - WCAG compliance
4. Information Architecture - Is content organized well?
5. Consistency - Is the design consistent?
6. Feedback - Does the UI provide feedback?
7. Error Prevention - Are errors prevented?

Provide specific, actionable recommendations.`,
        'You are an expert UX Reviewer.'
      );
      setReview(result);
    } catch (error) {
      setReview('Error performing review. Please try again.');
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold mb-2">AI UX Reviewer</h3>
      <p className="text-xs text-muted-foreground mb-4">Analyze user experience and usability</p>
      <div className="flex gap-2 mb-4">
        <Input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="e.g., onboarding, dashboard, navigation"
          className="flex-1"
        />
        <Button onClick={handleReview} disabled={isReviewing || !target.trim()} size="sm">
          {isReviewing ? '...' : 'Review'}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {review && (
          <div className="whitespace-pre-wrap text-sm">{review}</div>
        )}
      </ScrollArea>
    </div>
  );
}
