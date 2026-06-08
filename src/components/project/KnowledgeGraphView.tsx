import { useAppStore } from '@/stores/appStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { GraphNode } from '@/types';

const typeColors: Record<string, string> = {
  vision: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  feature: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  page: 'bg-green-500/10 text-green-500 border-green-500/20',
  route: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  component: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  file: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  dependency: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  state: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  database: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  decision: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  conversation: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
};

export function KnowledgeGraphView() {
  const { currentProject, setActiveFile } = useAppStore();
  const nodes = currentProject?.brain?.knowledgeGraph || [];
  const decisions = currentProject?.brain?.decisions || [];

  if (nodes.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground">Knowledge Graph will populate as you build.</p>
      </div>
    );
  }

  const grouped = nodes.reduce<Record<string, GraphNode[]>>((acc, node) => {
    if (!acc[node.type]) acc[node.type] = [];
    acc[node.type].push(node);
    return acc;
  }, {});

  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold mb-1">Knowledge Graph</h3>
      <p className="text-xs text-muted-foreground mb-4">{nodes.length} nodes tracked</p>

      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {Object.entries(grouped).map(([type, typeNodes]) => (
            <div key={type}>
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">{type}</h4>
              <div className="space-y-1">
                {typeNodes.map((node) => (
                  <div
                    key={node.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border border-border ${type === 'file' ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
                    onClick={() => { if (type === 'file') setActiveFile(node.label); }}
                  >
                    <div className={`w-2 h-2 rounded-full ${typeColors[type]?.split(' ')[0] || 'bg-muted'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{node.label}</p>
                      {node.description && (
                        <p className="text-xs text-muted-foreground truncate">{node.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px]">{type}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {decisions.length > 0 && (
          <div className="mt-6">
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Decisions</h4>
            <div className="space-y-2">
              {decisions.map((d) => (
                <div key={d.id} className="p-2 rounded-lg border border-border">
                  <p className="text-sm font-medium">{d.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{d.reasoning}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
