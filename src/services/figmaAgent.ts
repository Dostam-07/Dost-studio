const FIGMA_API_BASE = 'https://api.figma.com/v1';

export interface FigmaFile {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: FigmaNode;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  cornerRadius?: number;
  effects?: FigmaEffect[];
  componentPropertyDefinitions?: Record<string, unknown>;
}

export interface FigmaPaint {
  type: string;
  color?: { r: number; g: number; b: number; a: number };
  opacity?: number;
  blendMode?: string;
  gradientHandlePositions?: unknown[];
  gradientStops?: { position: number; color: { r: number; g: number; b: number; a: number } }[];
  imageRef?: string;
  scaleMode?: string;
}

export interface FigmaEffect {
  type: string;
  visible: boolean;
  radius?: number;
  offset?: { x: number; y: number };
  color?: { r: number; g: number; b: number; a: number };
}

export interface FigmaComponent extends FigmaNode {
  componentId: string;
}

export interface FigmaStyles {
  [key: string]: {
    name: string;
    description: string;
    styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
    style: Record<string, unknown>;
  };
}

export interface FigmaDesignTokens {
  colors: { name: string; hex: string; opacity: number }[];
  typography: { name: string; fontFamily: string; fontSize: number; fontWeight: number; lineHeight: number; letterSpacing: number }[];
  spacing: { name: string; value: number }[];
  effects: { name: string; type: string; value: string }[];
}

export interface FigmaFrameInfo {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  children: { name: string; type: string; description: string }[];
}

export class FigmaAgent {
  private token: string = '';

  configure(token: string) {
    this.token = token;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    if (!this.token) throw new Error('Figma access token not configured. Add it in Settings.');
    const response = await fetch(url, {
      headers: { 'X-Figma-Token': this.token },
    });
    if (!response.ok) {
      const text = await response.text();
      if (response.status === 403) throw new Error('Invalid Figma access token. Check your token in Settings.');
      throw new Error(`Figma API error (${response.status}): ${text}`);
    }
    return response.json();
  }

  private rgbToHex(c: { r: number; g: number; b: number; a?: number }): string {
    const r = Math.round(c.r * 255);
    const g = Math.round(c.g * 255);
    const b = Math.round(c.b * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  async getFile(fileKey: string): Promise<FigmaFile> {
    return this.fetchJson<FigmaFile>(`${FIGMA_API_BASE}/files/${fileKey}`);
  }

  async getFileNodes(fileKey: string, nodeIds: string[]): Promise<unknown> {
    return this.fetchJson(`${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${nodeIds.join(',')}`);
  }

  async getImageRenders(fileKey: string, nodeIds: string[], format: 'png' | 'svg' | 'pdf' = 'png'): Promise<Record<string, string>> {
    const data = await this.fetchJson<{ images: Record<string, string> }>(
      `${FIGMA_API_BASE}/images/${fileKey}?ids=${nodeIds.join(',')}&format=${format}&scale=2`
    );
    return data.images;
  }

  async getStyles(fileKey: string): Promise<FigmaStyles> {
    return this.fetchJson<FigmaStyles>(`${FIGMA_API_BASE}/files/${fileKey}/styles`);
  }

  async getTeamStyles(teamId: string): Promise<FigmaStyles> {
    return this.fetchJson<FigmaStyles>(`${FIGMA_API_BASE}/teams/${teamId}/styles`);
  }

  extractDesignTokens(document: FigmaNode): FigmaDesignTokens {
    const colors: FigmaDesignTokens['colors'] = [];
    const typography: FigmaDesignTokens['typography'] = [];
    const seenColors = new Set<string>();
    const seenFonts = new Set<string>();

    const walk = (node: FigmaNode) => {
      if (node.fills) {
        for (const fill of node.fills) {
          if (fill.color && fill.type !== 'IMAGE') {
            const hex = this.rgbToHex(fill.color);
            const key = `${hex}_${fill.opacity ?? 1}`;
            if (!seenColors.has(key)) {
              seenColors.add(key);
              colors.push({ name: `${node.name} fill`, hex, opacity: fill.opacity ?? 1 });
            }
          }
        }
      }
      if (node.strokes) {
        for (const stroke of node.strokes) {
          if (stroke.color) {
            const hex = this.rgbToHex(stroke.color);
            const key = `stroke_${hex}_${stroke.opacity ?? 1}`;
            if (!seenColors.has(key)) {
              seenColors.add(key);
              colors.push({ name: `${node.name} stroke`, hex, opacity: stroke.opacity ?? 1 });
            }
          }
        }
      }
      if (node.children) {
        for (const child of node.children) {
          walk(child);
        }
      }
    };

    walk(document);
    return { colors, typography, spacing: [], effects: [] };
  }

  extractFrames(document: FigmaNode, maxDepth: number = 3): FigmaFrameInfo[] {
    const frames: FigmaFrameInfo[] = [];

    const walk = (node: FigmaNode, depth: number) => {
      if (depth > maxDepth) return;
      if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        frames.push({
          id: node.id,
          name: node.name,
          type: node.type,
          width: node.absoluteBoundingBox?.width ?? 0,
          height: node.absoluteBoundingBox?.height ?? 0,
          children: (node.children || []).map((c) => ({
            name: c.name,
            type: c.type,
            description: c.type === 'TEXT' ? 'Text element' : c.type === 'RECTANGLE' || c.type === 'ELLIPSE' ? 'Shape' : c.type === 'COMPONENT' ? 'Reusable component' : 'Container',
          })),
        });
      }
      if (node.children) {
        for (const child of node.children) {
          walk(child, depth + 1);
        }
      }
    };

    walk(document, 0);
    return frames;
  }

  validateFileKey(input: string): string {
    const cleaned = input.trim();

    const urlMatch = cleaned.match(/figma\.com\/(file|design)\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) return urlMatch[2];

    const keyMatch = cleaned.match(/^[a-zA-Z0-9_-]{12,}$/);
    if (keyMatch) return cleaned;

    throw new Error('Invalid Figma file key. Provide a URL like "https://www.figma.com/file/ABC123..." or a raw file key.');
  }

  async importFigmaDesign(fileKeyOrUrl: string): Promise<{
    file: FigmaFile;
    tokens: FigmaDesignTokens;
    frames: FigmaFrameInfo[];
    imageUrls: Record<string, string>;
  }> {
    const fileKey = this.validateFileKey(fileKeyOrUrl);
    const file = await this.getFile(fileKey);
    const tokens = this.extractDesignTokens(file.document);
    const frames = this.extractFrames(file.document);

    const frameIds = frames.map((f) => f.id);
    let imageUrls: Record<string, string> = {};
    if (frameIds.length > 0) {
      try {
        imageUrls = await this.getImageRenders(fileKey, frameIds.slice(0, 5));
      } catch {
        // Image rendering is optional
      }
    }

    return { file, tokens, frames, imageUrls };
  }
}

export const figmaAgent = new FigmaAgent();
