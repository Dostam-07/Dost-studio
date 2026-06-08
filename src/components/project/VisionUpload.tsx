import { useState, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import { visionAgent, type VisionAnalysis } from '@/services/visionAgent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export function VisionUpload() {
  const { settings } = useAppStore();
  const [image, setImage] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string>('image/png');
  const [imageName, setImageName] = useState<string>('');
  const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'analyze' | 'code'>('analyze');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    setAnalysis(null);
    setError(null);
    setGeneratedCode('');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const parts = result.split(',');
      setImageType(file.type || 'image/png');
      setImage(parts[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!image || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await visionAgent.analyzeImage(image, settings.models.vision);
      setAnalysis(result);
      setMode('analyze');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!image || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await visionAgent.analyzeAndSuggest(image, settings.models.vision);
      setGeneratedCode(result.suggestedCode);
      setMode('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code generation failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      fileRef.current!.files = e.dataTransfer.files;
      handleFile({ target: { files: e.dataTransfer.files } } as any);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold">Vision</h3>
        <p className="text-xs text-muted-foreground">Analyze screenshots & wireframes</p>
      </div>
      <ScrollArea className="flex-1 p-3">
        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all mb-3"
        >
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          {image ? (
            <div className="space-y-2">
              <div className="w-full max-h-32 overflow-hidden rounded-lg">
                <img
                  src={`data:${imageType};base64,${image}`}
                  alt="Uploaded"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-sm text-muted-foreground">{imageName}</p>
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setImage(null); setAnalysis(null); setGeneratedCode(''); }}>
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-3xl">🖼</span>
              <p className="text-sm text-muted-foreground">Drop a screenshot or wireframe here</p>
              <p className="text-xs text-muted-foreground">or click to browse</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {image && !isAnalyzing && (
          <div className="flex gap-2 mb-3">
            <Button onClick={handleAnalyze} size="sm" className="flex-1">
              Analyze Layout
            </Button>
            <Button onClick={handleGenerateCode} variant="outline" size="sm" className="flex-1">
              Generate Code
            </Button>
          </div>
        )}

        {/* Loading */}
        {isAnalyzing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 p-3 rounded-lg bg-muted/50">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Analyzing with {settings.models.vision}...
          </div>
        )}

        {/* Error */}
        {error && (
          <Card className="border-red-500/50 mb-3">
            <CardContent className="pt-4">
              <p className="text-sm text-red-500">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {analysis && mode === 'analyze' && (
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Layout</h4>
              <p className="text-sm bg-muted/50 rounded-lg p-2">{analysis.layout}</p>
            </div>
            {analysis.components.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Components</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.components.map((c, i) => (
                    <Badge key={i} variant="secondary">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
            {analysis.structure && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Structure</h4>
                <p className="text-sm text-muted-foreground">{analysis.structure}</p>
              </div>
            )}
            {analysis.colors.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Colors</h4>
                <div className="flex gap-2">
                  {analysis.colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs">
                      <span className="w-4 h-4 rounded border border-border" style={{ backgroundColor: c }} />
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {analysis.suggestions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Suggestions</h4>
                <ul className="text-sm space-y-1">
                  {analysis.suggestions.map((s, i) => (
                    <li key={i} className="text-muted-foreground">• {s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Generated Code */}
        {mode === 'code' && generatedCode && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Generated Code</h4>
            <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{generatedCode}</pre>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
