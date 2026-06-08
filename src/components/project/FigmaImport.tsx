import { useState, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import { figmaAgent, type FigmaFile, type FigmaDesignTokens, type FigmaFrameInfo } from '@/services/figmaAgent';
import { figmaToPrompt, type FigmaPromptResult } from '@/services/figmaToPrompt';
import { parseFigFile, figFileToPromptResult } from '@/services/figFileParser';

export function FigmaImport() {
  const { settings, setPendingFigPromptData, setCurrentView } = useAppStore();
  const [tab, setTab] = useState<'url' | 'figfile'>('url');

  // URL tab state
  const [fileKey, setFileKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FigmaPromptResult | null>(null);
  const [file, setFile] = useState<FigmaFile | null>(null);
  const [tokens, setTokens] = useState<FigmaDesignTokens | null>(null);
  const [frames, setFrames] = useState<FigmaFrameInfo[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // .fig file tab state
  const [figFileName, setFigFileName] = useState('');
  const [figFileLoading, setFigFileLoading] = useState(false);
  const figFileRef = useRef<HTMLInputElement>(null);
  const [figResult, setFigResult] = useState<FigmaPromptResult & { fullText: string } | null>(null);
  const [figTokens, setFigTokens] = useState<FigmaDesignTokens | null>(null);
  const [figFrames, setFigFrames] = useState<FigmaFrameInfo[]>([]);
  const [figImages, setFigImages] = useState<Map<string, string>>(new Map());

  // URL tab handlers
  const handleImport = async () => {
    if (!fileKey.trim() || isLoading) return;
    if (!settings.figmaAccessToken) {
      setError('Figma access token not configured. Add it in Settings.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      figmaAgent.configure(settings.figmaAccessToken);
      const data = await figmaAgent.importFigmaDesign(fileKey);
      setFile(data.file);
      setTokens(data.tokens);
      setFrames(data.frames);
      setImageUrls(data.imageUrls);
      const promptResult = figmaToPrompt(data.file, data.tokens, data.frames);
      setResult(promptResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Figma import failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!result) return;
    navigator.clipboard.writeText(fullPromptText(result)).catch(() => {});
  };

  const handleUseInBuildUrl = () => {
    if (!result) return;
    setPendingFigPromptData(fullPromptText(result));
    setCurrentView('home');
  };

  function fullPromptText(r: FigmaPromptResult): string {
    return [r.designSummary, r.designTokens, r.componentHierarchy, r.codePrompt].join('\n\n');
  }

  // .fig file tab handlers
  const handleFigFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFigFileName(f.name);
    setFigFileLoading(true);
    setError(null);
    setFigResult(null);
    try {
      const buffer = await f.arrayBuffer();
      const parsed = parseFigFile(buffer, f.name);
      setFigTokens(parsed.tokens);
      setFigFrames(parsed.frames);
      setFigImages(parsed.images);
      const pr = await figFileToPromptResult(parsed.figmaFile, parsed.tokens, parsed.frames, parsed.images, settings.models.vision);
      setFigResult(pr);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse .fig file');
    } finally {
      setFigFileLoading(false);
    }
  };

  const handleCopyFigPrompt = () => {
    if (!figResult) return;
    navigator.clipboard.writeText(figResult.fullText).catch(() => {});
  };

  const handleUseInBuildFig = () => {
    if (!figResult) return;
    setPendingFigPromptData(figResult.fullText);
    setCurrentView('home');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold">Figma Import</h3>
        <p className="text-xs text-muted-foreground">Import designs to generate React + TailwindCSS</p>
      </div>

      {/* Tab Toggle */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab('url')}
          className={`flex-1 text-xs font-medium py-2 transition-colors ${tab === 'url' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Figma URL
        </button>
        <button
          onClick={() => setTab('figfile')}
          className={`flex-1 text-xs font-medium py-2 transition-colors ${tab === 'figfile' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Upload .fig
        </button>
      </div>

      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        {tab === 'url' ? (
          <>
            {/* URL Import */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Figma File URL or Key</label>
              <input
                value={fileKey}
                onChange={(e) => setFileKey(e.target.value)}
                placeholder="https://www.figma.com/file/ABC123... or raw key"
                className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {!settings.figmaAccessToken && (
              <p className="text-xs text-amber-500">
                Set your Figma access token in Settings (bottom of the page).
              </p>
            )}

            <button
              onClick={handleImport}
              disabled={!fileKey.trim() || isLoading || !settings.figmaAccessToken}
              className="w-full text-sm font-medium py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Importing...' : 'Import from Figma'}
            </button>
          </>
        ) : (
          <>
            {/* .fig File Upload */}
            <div
              onClick={() => figFileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all"
            >
              <input ref={figFileRef} type="file" accept=".fig" onChange={handleFigFileSelect} className="hidden" />
              {figFileLoading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Parsing .fig file...
                </div>
              ) : figFileName ? (
                <div className="space-y-1">
                  <span className="text-2xl">🎨</span>
                  <p className="text-sm font-medium">{figFileName}</p>
                  <p className="text-xs text-muted-foreground">Click to change file</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-2xl">📁</span>
                  <p className="text-sm text-muted-foreground">Drop a .fig file here or click to browse</p>
                  <p className="text-xs text-muted-foreground/50">No API key needed — parsed locally</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="text-xs text-red-500 bg-red-500/10 rounded-lg p-2">{error}</div>
        )}

        {/* URL Results */}
        {tab === 'url' && result && (
          <ResultsSection
            name={file?.name ?? ''}
            tokens={tokens}
            frames={frames}
            imageUrls={imageUrls}
            result={result}
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
            onCopy={handleCopyPrompt}
            onUseInBuild={handleUseInBuildUrl}
          />
        )}

        {/* .fig Results */}
        {tab === 'figfile' && figResult && (
          <ResultsSection
            name={figFileName.replace(/\.fig$/i, '')}
            tokens={figTokens}
            frames={figFrames}
            imageUrls={Object.fromEntries(figImages)}
            result={figResult}
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
            onCopy={handleCopyFigPrompt}
            onUseInBuild={handleUseInBuildFig}
          />
        )}
      </div>
    </div>
  );
}

function ResultsSection({
  name, tokens, frames, imageUrls, result, expandedSection, setExpandedSection, onCopy, onUseInBuild,
}: {
  name: string;
  tokens: FigmaDesignTokens | null;
  frames: FigmaFrameInfo[];
  imageUrls: Record<string, string>;
  result: FigmaPromptResult;
  expandedSection: string | null;
  setExpandedSection: (s: string | null) => void;
  onCopy: () => void;
  onUseInBuild: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Design: {name}</span>
        <div className="flex gap-1">
          <button onClick={onCopy} className="text-[10px] text-primary hover:underline">
            Copy
          </button>
          <button onClick={onUseInBuild} className="text-[10px] text-primary hover:underline font-medium">
            Use in Build
          </button>
        </div>
      </div>

      {/* Image Previews */}
      {Object.keys(imageUrls).length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Frame Previews</p>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(imageUrls).slice(0, 4).map(([id, url]) => {
              const frame = frames.find((f) => f.id === id);
              return (
                <div key={id} className="rounded border border-border overflow-hidden">
                  <img src={url} alt={frame?.name ?? id} className="w-full h-auto" />
                  <p className="text-[9px] text-muted-foreground text-center py-0.5">{frame?.name ?? id}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Design Tokens */}
      <button
        onClick={() => setExpandedSection(expandedSection === 'tokens' ? null : 'tokens')}
        className="w-full text-left text-xs font-medium flex items-center justify-between py-1.5 px-2 rounded bg-muted/30 hover:bg-muted/50"
      >
        Design Tokens ({tokens?.colors.length ?? 0} colors)
        <span>{expandedSection === 'tokens' ? '▲' : '▼'}</span>
      </button>
      {expandedSection === 'tokens' && tokens && (
        <div className="space-y-1 px-1">
          {tokens.colors.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground">Colors</p>
              <div className="flex flex-wrap gap-1">
                {tokens.colors.map((c, i) => {
                  const k = `${c.hex}_${i}`;
                  return (
                    <div key={k} className="flex items-center gap-1 text-[10px] bg-muted/30 rounded px-1.5 py-0.5">
                      <span className="w-3 h-3 rounded border border-border" style={{ backgroundColor: c.hex }} />
                      {c.hex}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Component Hierarchy */}
      <button
        onClick={() => setExpandedSection(expandedSection === 'hierarchy' ? null : 'hierarchy')}
        className="w-full text-left text-xs font-medium flex items-center justify-between py-1.5 px-2 rounded bg-muted/30 hover:bg-muted/50"
      >
        Component Hierarchy ({frames.length} frames)
        <span>{expandedSection === 'hierarchy' ? '▲' : '▼'}</span>
      </button>
      {expandedSection === 'hierarchy' && (
        <div className="space-y-1.5 px-1 max-h-48 overflow-y-auto">
          {frames.map((frame, i) => (
            <div key={i} className="text-[11px] border-l-2 border-primary/30 pl-2">
              <span className="font-medium">{frame.name}</span>
              <span className="text-muted-foreground"> ({frame.width}×{frame.height})</span>
              <div className="text-[10px] text-muted-foreground pl-2">
                {frame.children.slice(0, 5).map((c, j) => (
                  <div key={j}>· {c.name} <span className="text-[9px]">({c.type})</span></div>
                ))}
                {frame.children.length > 5 && <div>· +{frame.children.length - 5} more</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generated Prompt */}
      <button
        onClick={() => setExpandedSection(expandedSection === 'prompt' ? null : 'prompt')}
        className="w-full text-left text-xs font-medium flex items-center justify-between py-1.5 px-2 rounded bg-muted/30 hover:bg-muted/50"
      >
        Generated Code Prompt
        <span>{expandedSection === 'prompt' ? '▲' : '▼'}</span>
      </button>
      {expandedSection === 'prompt' && (
        <div className="max-h-48 overflow-y-auto">
          <pre className="text-[10px] text-muted-foreground bg-muted/20 rounded p-2 whitespace-pre-wrap">{result.codePrompt}</pre>
        </div>
      )}
    </div>
  );
}
