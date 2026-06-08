import { useEffect, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function CodeMirrorEditor({ value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        oneDark,
        updateListener,
        javascript({ jsx: true, typescript: true }),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    setReady(true);

    return () => {
      view.destroy();
      viewRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const view = viewRef.current;
    if (!view) return;
    const doc = view.state.doc.toString();
    if (value !== doc) {
      view.dispatch({
        changes: { from: 0, to: doc.length, insert: value },
      });
    }
  }, [value, ready]);

  return <div ref={containerRef} className="h-full overflow-y-auto" />;
}
