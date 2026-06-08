import { io, Socket } from 'socket.io-client';

// Connect through Vite's dev proxy (/socket.io → Express) so we don't hardcode the server port
const CONNECT_URL = location.origin;

let socket: Socket | null = null;
let currentProjectId: string | null = null;

const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

function getSocket(): Socket {
  if (!socket) {
    socket = io(CONNECT_URL, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
      if (currentProjectId) socket?.emit('join-project', currentProjectId);
    });
    socket.on('disconnect', () => console.log('Socket disconnected'));
    // Re-broadcast stored events to local listeners
    socket.onAny((event, ...args) => {
      const set = listeners.get(event);
      if (set) set.forEach((fn) => fn(...args));
    });
  }
  return socket;
}

export function joinProject(projectId: string | null) {
  const s = getSocket();
  if (currentProjectId && currentProjectId !== projectId) {
    // leave old room implicitly
  }
  currentProjectId = projectId;
  if (projectId && s.connected) {
    s.emit('join-project', projectId);
  }
}

export function onSocketEvent(event: string, fn: (...args: unknown[]) => void) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(fn);
  return () => {
    listeners.get(event)?.delete(fn);
  };
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentProjectId = null;
  }
}
