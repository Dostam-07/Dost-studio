import { unzipSync } from 'fflate';
import { figmaAgent, type FigmaNode, type FigmaFile, type FigmaDesignTokens, type FigmaFrameInfo } from './figmaAgent';
import { figmaToPrompt, type FigmaPromptResult } from './figmaToPrompt';
import { visionAgent } from './visionAgent';
import type { VisionAnalysis } from './visionAgent';

export interface FigFileResult {
  figmaFile: FigmaFile;
  document: FigmaNode;
  tokens: FigmaDesignTokens;
  frames: FigmaFrameInfo[];
  images: Map<string, string>;
}

interface FigDocumentJson {
  document: FigmaNode;
  schemaVersion: number;
  styles?: Record<string, unknown>;
  components?: Record<string, unknown>;
  componentSets?: Record<string, unknown>;
}

function arrayBufferToBase64(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

export function parseFigFile(buffer: ArrayBuffer, fileName: string): FigFileResult {
  const zipData = new Uint8Array(buffer);
  const unzipped = unzipSync(zipData);

  const documentRaw = new TextDecoder().decode(unzipped['document.json']);
  const doc = JSON.parse(documentRaw) as FigDocumentJson;
  const rootNode = doc.document || (doc as unknown as FigmaNode);

  const figmaFile: FigmaFile = {
    name: fileName.replace(/\.fig$/i, ''),
    lastModified: new Date().toISOString(),
    thumbnailUrl: '',
    version: String(doc.schemaVersion || '1'),
    document: rootNode,
  };

  const tokens = figmaAgent.extractDesignTokens(rootNode);
  const frames = figmaAgent.extractFrames(rootNode);

  const images = new Map<string, string>();
  for (const [path, data] of Object.entries(unzipped)) {
    if (path.startsWith('images/') && (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg'))) {
      const base64 = arrayBufferToBase64(data);
      const mime = path.endsWith('.png') ? 'image/png' : 'image/jpeg';
      images.set(path, `data:${mime};base64,${base64}`);
    }
  }

  return { figmaFile, document: rootNode, tokens, frames, images };
}

export async function figFileToPromptResult(
  figmaFile: FigmaFile,
  tokens: FigmaDesignTokens,
  frames: FigmaFrameInfo[],
  images: Map<string, string>,
  visionModel?: string
): Promise<FigmaPromptResult & { fullText: string }> {
  const baseResult = figmaToPrompt(figmaFile, tokens, frames);

  let visionText = '';
  if (images.size > 0 && visionModel) {
    for (const [path, dataUrl] of images) {
      try {
        const base64 = dataUrl.split(',')[1];
        const analysis = await visionAgent.analyzeImage(base64, visionModel);
        visionText += `\n\n[Embedded image: ${path}]\nLayout: ${analysis.layout}\nComponents: ${analysis.components.join(', ')}\nColors: ${analysis.colors.join(', ')}\nSuggestions: ${analysis.suggestions.join('; ')}`;
      } catch {
        visionText += `\n\n[Embedded image: ${path} — vision analysis skipped]`;
      }
    }
  }

  const fullText = [
    baseResult.designSummary,
    baseResult.designTokens,
    baseResult.componentHierarchy,
    baseResult.codePrompt,
    ...(visionText ? [visionText] : []),
  ].join('\n\n');

  return { ...baseResult, fullText };
}
