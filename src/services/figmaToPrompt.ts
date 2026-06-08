import type { FigmaDesignTokens, FigmaFrameInfo, FigmaFile } from './figmaAgent';

export interface FigmaPromptResult {
  designSummary: string;
  designTokens: string;
  componentHierarchy: string;
  codePrompt: string;
}

export function figmaToPrompt(
  file: FigmaFile,
  tokens: FigmaDesignTokens,
  frames: FigmaFrameInfo[]
): FigmaPromptResult {
  const designSummary = buildDesignSummary(file);
  const designTokensText = buildDesignTokensText(tokens);
  const componentHierarchy = buildComponentHierarchy(frames);
  const codePrompt = buildCodePrompt(file, tokens, frames);

  return { designSummary, designTokens: designTokensText, componentHierarchy, codePrompt };
}

function buildDesignSummary(file: FigmaFile): string {
  return [
    `Design File: ${file.name}`,
    `Last modified: ${file.lastModified}`,
    `Version: ${file.version}`,
    '',
    'This Figma design has been imported for code generation. Use the design tokens and component hierarchy below to implement the UI accurately.',
  ].join('\n');
}

function buildDesignTokensText(tokens: FigmaDesignTokens): string {
  const parts: string[] = ['## Design Tokens', ''];

  if (tokens.colors.length > 0) {
    parts.push('### Colors');
    const seen = new Set<string>();
    for (const c of tokens.colors) {
      if (!seen.has(c.hex)) {
        seen.add(c.hex);
        parts.push(`- \`${c.hex}\` — ${c.name}${c.opacity < 1 ? ` (opacity: ${c.opacity})` : ''}`);
      }
    }
    parts.push('');
  }

  if (tokens.typography.length > 0) {
    parts.push('### Typography');
    for (const t of tokens.typography) {
      parts.push(`- ${t.name}: ${t.fontFamily} ${t.fontWeight} ${t.fontSize}px${t.letterSpacing ? ` / ${t.letterSpacing}px` : ''}`);
    }
    parts.push('');
  }

  if (tokens.spacing.length > 0) {
    parts.push('### Spacing');
    for (const s of tokens.spacing) {
      parts.push(`- ${s.name}: ${s.value}px`);
    }
    parts.push('');
  }

  if (tokens.effects.length > 0) {
    parts.push('### Effects');
    for (const e of tokens.effects) {
      parts.push(`- ${e.name}: ${e.type} — ${e.value}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}

function buildComponentHierarchy(frames: FigmaFrameInfo[]): string {
  const parts: string[] = ['## Component Hierarchy'];

  for (const frame of frames) {
    parts.push('');
    parts.push(`### ${frame.name} (${frame.width}×${frame.height})`);
    parts.push(`Type: ${frame.type}`);
    parts.push('Children:');
    for (const child of frame.children) {
      parts.push(`- **${child.name}** (${child.type}) — ${child.description}`);
    }
  }

  return parts.join('\n');
}

function buildCodePrompt(file: FigmaFile, tokens: FigmaDesignTokens, frames: FigmaFrameInfo[]): string {
  const parts: string[] = [
    '## Code Generation Instructions',
    '',
    `Generate a React + TailwindCSS implementation of the Figma design "${file.name}".`,
    '',
    '### Requirements',
    '- Use React functional components with TypeScript',
    '- Use TailwindCSS for all styling',
    '- Follow the component hierarchy exactly',
    '- Implement responsive behavior',
    '- Use the exact colors from the design tokens below',
    '- Do NOT import from shadcn/ui or any external component library',
    '- Every file must have a default export',
    '',
  ];

  if (tokens.colors.length > 0) {
    const seen = new Set<string>();
    parts.push('### Color Palette (for TailwindCSS config)');
    parts.push('```tailwind.config');
    parts.push('colors: {');
    for (const c of tokens.colors) {
      if (!seen.has(c.hex)) {
        seen.add(c.hex);
        const name = c.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().slice(0, 20);
        parts.push(`  '${name}': '${c.hex}',`);
      }
    }
    parts.push('}');
    parts.push('```');
    parts.push('');
  }

  if (tokens.typography.length > 0) {
    parts.push('### Typography');
    for (const t of tokens.typography) {
      parts.push(`- Use ${t.fontFamily} with ${t.fontWeight} weight at ${t.fontSize}px`);
    }
    parts.push('');
  }

  parts.push('### Page Structure');
  parts.push('Create the following components based on the Figma frames:');
  for (const frame of frames) {
    const componentName = frame.name.replace(/[^a-zA-Z0-9]/g, '').replace(/^[0-9]/, '_');
    const width = frame.width ? `${frame.width}px` : 'auto';
    const height = frame.height ? `${frame.height}px` : 'auto';
    parts.push(`- \`${componentName}.tsx\` — ${frame.name} (${width} × ${height})`);
    parts.push('  Elements:');
    for (const child of frame.children) {
      parts.push(`  - ${child.name} (${child.type})`);
    }
  }

  parts.push('');
  parts.push('Generate clean, well-structured React components with proper TypeScript types and TailwindCSS classes.');

  return parts.join('\n');
}
