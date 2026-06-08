import React, { useMemo } from 'react';

interface CodeBlock {
  language: string;
  code: string;
}

function parseCodeBlocks(content: string): (string | CodeBlock)[] {
  const parts: (string | CodeBlock)[] = [];
  const re = /```(\w*)\s*([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push({ language: match[1] || 'text', code: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  return parts;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /`([^`]+)`|(\*\*|__)(.+?)\2/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(<code key={parts.length} className="bg-muted/50 text-foreground px-1 py-0.5 rounded text-xs font-mono">{match[1]}</code>);
    } else if (match[3]) {
      parts.push(<strong key={parts.length} className="font-semibold">{match[3]}</strong>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function renderLine(line: string, index: number): React.ReactNode {
  // Headers
  const hMatch = line.match(/^(#{1,6})\s+(.+)/);
  if (hMatch) {
    const level = hMatch[1].length;
    const tagName = `h${level}` as React.ElementType;
    return React.createElement(tagName, {
      key: index,
      className: `font-semibold text-foreground mt-2 mb-1 ${level === 1 ? 'text-base' : level === 2 ? 'text-sm' : 'text-xs'}`,
    }, renderInline(hMatch[2]));
  }

  // Unordered list
  if (line.match(/^[-*+]\s+(.+)/)) {
    return <li key={index} className="text-foreground/80 text-sm ml-4 list-disc">{renderInline(line.replace(/^[-*+]\s+/, ''))}</li>;
  }

  // Ordered list
  const oMatch = line.match(/^\d+[.)]\s+(.+)/);
  if (oMatch) {
    return <li key={index} className="text-foreground/80 text-sm ml-4 list-decimal">{renderInline(oMatch[1])}</li>;
  }

  // Blockquote
  if (line.startsWith('> ')) {
    return <blockquote key={index} className="border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground italic">{renderInline(line.slice(2))}</blockquote>;
  }

  // Horizontal rule
  if (line.match(/^---+$/)) {
    return <hr key={index} className="my-2 border-border" />;
  }

  // Empty line
  if (!line.trim()) {
    return <div key={index} className="h-1" />;
  }

  // Paragraph
  return <p key={index} className="text-foreground/80 text-sm leading-relaxed">{renderInline(line)}</p>;
}

export function MarkdownRenderer({ content }: { content: string }) {
  const parts = useMemo(() => parseCodeBlocks(content), [content]);

  return (
    <div className="space-y-0.5">
      {parts.map((part, i) => {
        if (typeof part === 'string') {
          const lines = part.split('\n');
          return <div key={i}>{lines.map((line, j) => renderLine(line, j))}</div>;
        }
        return (
          <div key={i} className="my-2 rounded-lg border border-border overflow-hidden">
            {part.language && (
              <div className="px-3 py-1 bg-muted/30 border-b border-border text-[10px] text-muted-foreground font-mono">
                {part.language}
              </div>
            )}
            <pre className="p-3 overflow-x-auto">
              <code className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-foreground/90">
                {part.code}
              </code>
            </pre>
          </div>
        );
      })}
    </div>
  );
}
