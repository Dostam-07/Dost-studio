import { spawn, type ChildProcess } from 'child_process';
import path from 'path';

// Resolve vite binary from the project's own node_modules
function viteBin(): string {
  const p = path.resolve(__dirname, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');
  return p;
}

interface DevServerInstance {
  projectId: string;
  port: number;
  process: ChildProcess;
}

const instances = new Map<string, DevServerInstance>();
let nextPort = 4173;

export function getDevServerUrl(projectId: string): string | null {
  const inst = instances.get(projectId);
  return inst ? `http://localhost:${inst.port}` : null;
}

export function getDevServerPort(projectId: string): number | null {
  const inst = instances.get(projectId);
  return inst ? inst.port : null;
}

export async function startDevServer(projectDir: string, projectId: string): Promise<number> {
  const existing = instances.get(projectId);
  if (existing) {
    return existing.port;
  }

  const port = nextPort++;

  const absProjectDir = path.resolve(projectDir);
  const rootArg = `--root=${absProjectDir}`;
  const proc = spawn(viteBin(), [rootArg, '--port', String(port), '--host', 'localhost', '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsVerbatimArguments: true,
  });

  proc.stdout?.on('data', (data: Buffer) => {
    const text = data.toString();
    console.log(`[DevServer ${projectId}] ${text.trim()}`);
  });

  proc.stderr?.on('data', (data: Buffer) => {
    const text = data.toString();
    console.error(`[DevServer ${projectId}] ${text.trim()}`);
  });

  proc.on('exit', (code) => {
    console.log(`[DevServer ${projectId}] Exited with code ${code}`);
    instances.delete(projectId);
  });

  proc.on('error', (err) => {
    console.error(`[DevServer ${projectId}] Error:`, err.message);
    instances.delete(projectId);
  });

  instances.set(projectId, { projectId, port, process: proc });

  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Dev server start timeout'));
    }, 30000);

    const checkReady = (data: Buffer) => {
      const text = data.toString();
      if (text.includes('Local:') || text.includes('ready in') || text.includes('localhost:' + port)) {
        clearTimeout(timeout);
        cleanup();
        resolve();
      }
    };

    const cleanup = () => {
      proc.stdout?.off('data', checkReady);
      proc.stderr?.off('data', checkReady);
    };

    proc.stdout?.on('data', checkReady);
    proc.stderr?.on('data', checkReady);

    proc.on('exit', (code) => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error(`Dev server exited with code ${code} before ready`));
    });
  });

  console.log(`[DevServer] Started for ${projectId} on port ${port}`);
  return port;
}

export async function stopDevServer(projectId: string): Promise<void> {
  const inst = instances.get(projectId);
  if (!inst) return;

  inst.process.kill('SIGTERM');
  setTimeout(() => {
    try { inst.process.kill('SIGKILL'); } catch { /* already dead */ }
  }, 5000);
  instances.delete(projectId);
  console.log(`[DevServer] Stopped for ${projectId}`);
}

export function stopAllDevServers(): void {
  for (const [id] of instances) {
    stopDevServer(id);
  }
}
