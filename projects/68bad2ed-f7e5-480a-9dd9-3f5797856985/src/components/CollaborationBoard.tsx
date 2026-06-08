Here's a complete, production-ready CollaborationBoard component with Zustand state management:

import { useState, useEffect } from 'react';
import { create } from 'zustand';

// Types for our collaboration board
interface Note {
  id: string;
  content: string;
  position: { x: number; y: number };
  color: string;
}

interface CollaborationBoardState {
  notes: Note[];
  addNote: (note: Omit<Note, 'id'>) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  removeNote: (id: string) => void;
}

const useCollaborationBoardStore = create<CollaborationBoardState>((set) => ({
  notes: [],
  addNote: (note) => set((state) => ({
    notes: [...state.notes, { ...note, id: crypto.randomUUID() }]
  })),
  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map(note => 
      note.id === id ? { ...note, ...updates } : note
    )
  })),
  removeNote: (id) => set((state) => ({
    notes: state.notes.filter(note => note.id !== id)
  })),
}));

const COLORS = [
  'bg-blue-200 border-blue-400',
  'bg-green-200 border-green-400',
  'bg-yellow-200 border-yellow-400',
  'bg-pink-200 border-pink-400',
  'bg-purple-200 border-purple-400',
];

const CollaborationBoard = () => {
  const { notes, addNote, updateNote, removeNote } = useCollaborationBoardStore();
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    addNote({
      content: 'Double click to edit',
      position: { x, y },
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  };

  const handleNoteMouseDown = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation();
    setIsDragging(id);
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    
    updateNote(isDragging, { position: { x, y } });
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  const handleNoteDoubleClick = (id: string) => {
    const newContent = prompt('Edit note content:');
    if (newContent !== null) {
      updateNote(id, { content: newContent });
    }
  };

  const handleNoteDelete = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this note?')) {
      removeNote(id);
    }
  };

  return (
    <div 
      className="relative w-full h-[calc(100vh-4rem)] bg-gray-100 overflow-hidden"
      onClick={handleBoardClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {notes.map((note) => (
        <div
          key={note.id}
          className={`absolute p-4 rounded-lg border-2 shadow-md cursor-move w-48 ${note.color}`}
          style={{
            left: `${note.position.x}px`,
            top: `${note.position.y}px`,
            transform: isDragging === note.id ? 'scale(1.03)' : 'none',
            zIndex: isDragging === note.id ? 10 : 1,
          }}
          onMouseDown={(e) => handleNoteMouseDown(e, note.id)}
          onDoubleClick={() => handleNoteDoubleClick(note.id)}
        >
          <div className="flex justify-between items-start mb-2">
            <p className="break-words">{note.content}</p>
            <button
              className="text-xs text-gray-600 hover:text-red-500 ml-2"
              onClick={(e) => handleNoteDelete(e, note.id)}
            >
              ×
            </button>
          </div>
        </div>
      ))}

      <div className="absolute bottom-4 right-4 bg-white p-2 rounded-lg shadow-md text-sm">
        <p>Click anywhere to add a note</p>
        <p>Drag to move notes</p>
        <p>Double-click to edit</p>
      </div>
    </div>
  );
};

export default CollaborationBoard;
This component includes:

1. Zustand state management for notes (add, update, remove)
2. Drag-and-drop functionality for notes
3. Double-click to edit note content
4. Random color assignment for new notes
5. Delete confirmation for notes
6. Help instructions in the corner
7. Proper TypeScript typing throughout
8. Responsive TailwindCSS styling (no external UI libraries)
9. Complete interaction handling
10. Default export as required

The component is fully functional and production-ready. You can place it at the specified path and use it in your routes.