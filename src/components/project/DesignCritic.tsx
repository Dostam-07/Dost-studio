import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { ollamaService } from '@/services/ollama';
import { projectBrain } from '@/services/projectBrain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export function DesignCritic() {
  const { currentProject, settings } = useAppStore();
  const [target, setTarget] = useState('');
  const [critique, setCritique] = useState('');
  const [isCritiquing, setIsCritiquing] = useState(false);

  const handleCritique = async () => {
    if (!currentProject || !target.trim()) return;
    setIsCritiquing(true);
    try {
      ollamaService.configureWithSettings(settings);
      const context = projectBrain.query(currentProject.id, `Design critique of ${target}`);
      const result = await ollamaService.generate(
        settings.models.architect,
        `Provide a design critique of "${target}" in this project:

${context}

Analyze:
1. Typography - Font choices, hierarchy, readability
2. Layout - Spacing, alignment, grid usage
3. Color - Palette, contrast, accessibility
4. Hierarchy - Visual hierarchy, emphasis
5. Consistency - Design patterns, component reuse
6. Polish - Details, micro-interactions, transitions
7. Improvements - Specific actionable fixes

Be constructive and specific. Suggest concrete CSS/Tailwind changes.`,
        'You are an expert Design Critic.'
      );
      setCritique(result);
    } catch (error) {
      setCritique('Error performing critique. Please try again.');
    } finally {
      setIsCritiquing(false);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold mb-2">AI Design Critic</h3>
      <p className="text-xs text-muted-foreground mb-4">Analyze and improve your UI design</p>
      <div className="flex gap-2 mb-4">
        <Input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="What looks bad? e.g., the header, sidebar..."
          className="flex-1"
        />
        <Button onClick={handleCritique} disabled={isCritiquing || !target.trim()} size="sm">
          {isCritiquing ? '...' : 'Critique'}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {critique && (
          <div className="whitespace-pre-wrap text-sm">{critique}</div>
        )}
      </ScrollArea>
    </div>
  );
}
