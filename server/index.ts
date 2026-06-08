import express from 'express';
import { createServer } from 'http';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { startDevServer, stopDevServer, stopAllDevServers, getDevServerUrl, getDevServerPort } from './devServerManager';

const ollamaAgent = new http.Agent({ keepAlive: true, maxSockets: 1, maxFreeSockets: 1 });

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      // Allow any localhost Vite dev server port (5173-5199)
      if (!origin || /^http:\/\/(localhost|127\.0\.0\.1):(517[3-9]|518\d|519\d)$/.test(origin)) {
        cb(null, true);
      } else {
        cb(null, true); // permissive in dev
      }
    },
    methods: ['GET', 'POST'],
  },
});

const PORT = 3001;
const PROJECTS_DIR = path.join(process.cwd(), 'projects');

process.on('uncaughtException', (err) => console.error('Uncaught exception:', err.message));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', (err as Error).message));

if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// ========== OLLAMA AUTO-START ==========

let ollamaProcess: ChildProcess | null = null;

/**
 * Check if Ollama is already listening on port 11434.
 * Returns true if the HTTP API is reachable.
 */
function isOllamaRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: '127.0.0.1', port: 11434, path: '/api/tags', method: 'GET', timeout: 2000 },
      (res) => { resolve(res.statusCode === 200); res.resume(); }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

/**
 * Spawn `ollama serve` as a background child process.
 * Stdout/stderr are piped to the server console with a [ollama] prefix.
 * The process is killed when the server shuts down.
 */
async function ensureOllamaRunning() {
  const already = await isOllamaRunning();
  if (already) {
    console.log('[ollama] Already running on port 11434 ✓');
    return;
  }

  console.log('[ollama] Starting ollama serve…');
  const isWin = process.platform === 'win32';

  ollamaProcess = isWin
    ? spawn('cmd.exe', ['/d', '/c', 'ollama', 'serve'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsVerbatimArguments: true,
        detached: false,
      })
    : spawn('ollama', ['serve'], { stdio: ['ignore', 'pipe', 'pipe'] });

  ollamaProcess.stdout?.on('data', (d: Buffer) => {
    const lines = d.toString().split('\n').filter(Boolean);
    lines.forEach((l) => console.log(`[ollama] ${l}`));
  });
  ollamaProcess.stderr?.on('data', (d: Buffer) => {
    const lines = d.toString().split('\n').filter(Boolean);
    lines.forEach((l) => console.log(`[ollama] ${l}`));
  });
  ollamaProcess.on('close', (code) => {
    if (code !== null && code !== 0) {
      console.warn(`[ollama] process exited with code ${code}`);
    }
    ollamaProcess = null;
  });
  ollamaProcess.on('error', (err) => {
    // ollama not installed — non-fatal, OpenRouter is the default provider
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn('[ollama] `ollama` binary not found — skipping auto-start. Install from https://ollama.com');
    } else {
      console.warn('[ollama] Failed to start:', err.message);
    }
    ollamaProcess = null;
  });

  // Give it 3 seconds to come up, then confirm
  await new Promise((r) => setTimeout(r, 3000));
  const running = await isOllamaRunning();
  if (running) {
    console.log('[ollama] Serving on port 11434 ✓');
  } else {
    console.warn('[ollama] Still not responding — fallback to OpenRouter will be used if credits are available.');
  }
}

// Kill ollama if we started it when the server exits
function cleanupOllama() {
  if (ollamaProcess && !ollamaProcess.killed) {
    console.log('[ollama] Stopping ollama serve…');
    ollamaProcess.kill();
    ollamaProcess = null;
  }
}
process.on('exit', cleanupOllama);
process.on('SIGINT', () => { cleanupOllama(); process.exit(0); });
process.on('SIGTERM', () => { cleanupOllama(); process.exit(0); });

// Start Ollama immediately — non-blocking
ensureOllamaRunning().catch((err) => console.warn('[ollama] auto-start error:', err.message));

app.use(express.json({ limit: '50mb' }));

// ========== OLLAMA PROXY ==========

function doProxyReq(res: express.Response, options: http.RequestOptions, body: string | undefined, retriesLeft: number) {
  let finished = false;
  const proxyReq = http.request(options, (proxyRes) => {
    let data = '';
    proxyRes.on('data', (chunk) => { data += chunk; });
    proxyRes.on('end', () => {
      if (finished) return;
      finished = true;
      if ((proxyRes.statusCode === 502 || proxyRes.statusCode === 503) && data.includes('not ready')) {
        if (retriesLeft > 0) {
          console.error('Ollama not ready, retrying...');
          setTimeout(() => doProxyReq(res, options, body, retriesLeft - 1), 3000);
          return;
        }
      }
      res.status(proxyRes.statusCode || 502);
      const rct = proxyRes.headers['content-type'];
      if (rct) res.set('Content-Type', Array.isArray(rct) ? rct[0] : rct);
      res.send(data);
    });
  });

  proxyReq.on('error', (err) => {
    if (finished) return;
    finished = true;
    proxyReq.destroy();
    if (retriesLeft > 0) {
      console.error(`Ollama proxy error, retrying (${retriesLeft} left):`, err.message);
      setTimeout(() => doProxyReq(res, options, body, retriesLeft - 1), 2000);
      return;
    }
    console.error('Ollama proxy error:', err.message);
    if (!res.headersSent) res.status(502).json({ error: `Ollama proxy error: ${err.message}` });
  });

  proxyReq.on('timeout', () => {
    if (finished) return;
    finished = true;
    proxyReq.destroy();
    if (retriesLeft > 0) {
      console.error('Ollama proxy timeout, retrying...');
      setTimeout(() => doProxyReq(res, options, body, retriesLeft - 1), 2000);
      return;
    }
    if (!res.headersSent) res.status(504).json({ error: 'Ollama proxy timeout' });
  });

  if (body) proxyReq.write(body);
  proxyReq.end();
}

app.use('/api/ollama', (req, res) => {
  const ollamaPath = '/api' + req.path;
  const queryIdx = req.url.indexOf('?');
  const query = queryIdx >= 0 ? req.url.slice(queryIdx) : '';
  const headers: Record<string, string> = {};
  const ct = req.headers['content-type'];
  if (ct) headers['Content-Type'] = ct as string;
  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    body = JSON.stringify(req.body);
    headers['Content-Length'] = Buffer.byteLength(body).toString();
  }

  const options = {
    hostname: '127.0.0.1',
    port: 11434,
    path: ollamaPath + query,
    method: req.method,
    headers,
    timeout: 300000,
    agent: ollamaAgent,
  };

  doProxyReq(res, options, body, 3);
});

// ========== PROJECT CRUD ==========

app.get('/api/projects', (req, res) => {
  try {
    if (!fs.existsSync(PROJECTS_DIR)) {
      return res.json([]);
    }
    const dirs = fs.readdirSync(PROJECTS_DIR);
    const projects = dirs
      .filter((d) => fs.statSync(path.join(PROJECTS_DIR, d)).isDirectory())
      .map((d) => {
        const metaPath = path.join(PROJECTS_DIR, d, 'metadata.json');
        if (fs.existsSync(metaPath)) {
          return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        }
        return { id: d, name: d };
      });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ========== SCAFFOLD & BUILD ==========

/**
 * Regenerates src/App.tsx by discovering all .tsx files (excluding test files)
 * and wiring them up with React Router routes.
 * If a Layout component exists, routes are nested under it.
 */
function regenerateAppTsx(projectDir: string, routes: { component: string; path: string }[]) {
  const srcDir = path.join(projectDir, 'src');
  if (!fs.existsSync(srcDir)) return;

  const generatedFiles: string[] = [];
  function walk(dir: string) {
    let entries: string[] = [];
    try { entries = fs.readdirSync(dir); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e);
      try {
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (e.endsWith('.tsx') && !e.includes('.test.') && !e.includes('.spec.')) {
          generatedFiles.push(path.relative(srcDir, full).replace(/\\/g, '/').replace(/\.tsx$/, ''));
        }
      } catch {}
    }
  }
  walk(srcDir);

  const layoutFile = generatedFiles.find(f => f === 'components/Layout' || f.endsWith('/Layout'));
  const otherFiles = generatedFiles.filter(f => f !== layoutFile);

  const imports: string[] = [];
  const namedExports: { file: string; name: string }[] = [];

  for (const f of otherFiles) {
    const name = path.basename(f).replace(/[^a-zA-Z0-9]/g, '') || 'Component';
    imports.push(`import ${name} from './${f}';`);
    namedExports.push({ file: f, name });
  }

  imports.push(`import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';`);

  let layoutImport = '';
  if (layoutFile) {
    layoutImport = `import Layout from './${layoutFile}';`;
  }

  const routeElements: string[] = [];
  for (const route of routes) {
    const compName = route.component.replace(/[^a-zA-Z0-9]/g, '');
    const match = namedExports.find(e => {
      const base = path.basename(e.file).replace(/[^a-zA-Z0-9]/g, '');
      return base === compName || base.endsWith(compName) || compName.endsWith(base);
    });
    const componentName = match?.name || compName;
    if (match || imports.some(i => i.includes(componentName))) {
      const routePath = route.path || `/${compName.toLowerCase()}`;
      routeElements.push(`          <Route path="${routePath}" element={<${componentName} />} />`);
    }
  }

  if (routeElements.length === 0 && namedExports.length > 0) {
    routeElements.push(`          <Route path="/" element={<${namedExports[0].name} />} />`);
  }

  let wrappedRoutes = '';
  let catchAllRoute = `          <Route path="*" element={<Navigate to="/" replace />} />`;
  if (layoutFile && routeElements.length > 0) {
    wrappedRoutes = `          <Route element={<Layout />}>
${routeElements.join('\n')}
${' '.repeat(10)}${catchAllRoute.trimStart()}
          </Route>`;
    catchAllRoute = '';
  } else if (routeElements.length > 0) {
    wrappedRoutes = routeElements.join('\n');
  }

  const appContent = namedExports.length > 1 || (namedExports.length === 1 && layoutFile)
    ? `import React from 'react';
import './index.css';
${imports.join('\n')}
${layoutImport ? layoutImport + '\n' : ''}
function App() {
  return (
    <BrowserRouter>
      <Routes>
${wrappedRoutes}
${catchAllRoute}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
`
    : namedExports.length === 1
    ? `import React from 'react';
import './index.css';
${imports.join('\n')}
${layoutImport ? layoutImport + '\n' : ''}
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<${namedExports[0].name} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
`
    : `import React from 'react';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-gray-500 text-lg">No components generated yet.</p>
    </div>
  );
}

export default App;
`;

  fs.writeFileSync(path.join(srcDir, 'App.tsx'), appContent);
  console.log(`[scaffold] Regenerated App.tsx — ${namedExports.length} components, ${routeElements.length} routes${layoutFile ? ', wrapped in Layout' : ''}`);
}

/**
 * Generates src/components/Layout.tsx with responsive navbar
 * containing links for each route.
 */
function generateLayout(projectDir: string, routes: { component: string; path: string }[]) {
  const layoutDir = path.join(projectDir, 'src', 'components');
  if (!fs.existsSync(layoutDir)) fs.mkdirSync(layoutDir, { recursive: true });

  const navItems = routes
    .filter(r => r.component && r.path !== undefined)
    .map(r => {
      const displayName = r.component.replace(/([A-Z])/g, ' $1').trim();
      return `  { path: '${r.path || '/'}', name: '${displayName}' }`;
    }).join(',\n');

  const layoutContent = `import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const navItems = [
${navItems}
];

export default function Layout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <span className="text-xl font-bold text-gray-900">App</span>
              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={location.pathname === item.path
                      ? 'px-3 py-2 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-700'
                      : 'px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-200 px-4 py-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={location.pathname === item.path
                  ? 'block px-3 py-2 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-700'
                  : 'block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100'
                }
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
`;

  const layoutPath = path.join(layoutDir, 'Layout.tsx');
  fs.writeFileSync(layoutPath, layoutContent);
  console.log(`[scaffold] Generated Layout.tsx with ${routes.length} nav links`);
}

function scaffoldProject(projectDir: string, projectId: string, projectName: string, routes: { component: string; path: string }[]) {
  const indexPath = path.join(projectDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    // If a user-generated index.html exists (from agent), back it up as demo
    const demoPath = path.join(projectDir, 'demo.html');
    if (!fs.existsSync(demoPath)) {
      // Extract just the HTML document block before saving as demo
      const rawContent = fs.readFileSync(indexPath, 'utf-8');
      const cleanContent = extractHtmlDocument(rawContent);
      fs.writeFileSync(demoPath, cleanContent);
      fs.unlinkSync(indexPath);
    }
  }

  // Vite entry HTML
  fs.writeFileSync(path.join(projectDir, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${projectName}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`);

  // package.json
  if (!fs.existsSync(path.join(projectDir, 'package.json'))) {
    fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
      name: projectId,
      private: true,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        test: 'vitest run',
        'test:watch': 'vitest',
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.21.0',
      },
      devDependencies: {
        '@types/react': '^18.2.43',
        '@types/react-dom': '^18.2.17',
        '@vitejs/plugin-react': '^4.2.1',
        autoprefixer: '^10.4.16',
        postcss: '^8.4.32',
        tailwindcss: '^3.4.0',
        typescript: '^5.3.3',
        vite: '^5.1.0',
        vitest: '^1.6.0',
        '@testing-library/react': '^16.0.0',
        '@testing-library/jest-dom': '^6.4.0',
        jsdom: '^24.0.0',
      },
    }, null, 2));
  }

  // vite.config.ts
  if (!fs.existsSync(path.join(projectDir, 'vite.config.ts'))) {
    const basePath = `/preview/${projectId}/`;
    fs.writeFileSync(path.join(projectDir, 'vite.config.ts'), `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '${basePath}',
});
`);
  }

  // vitest.config.ts
  if (!fs.existsSync(path.join(projectDir, 'vitest.config.ts'))) {
    fs.writeFileSync(path.join(projectDir, 'vitest.config.ts'), `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
`);
  }

  // tsconfig.json
  if (!fs.existsSync(path.join(projectDir, 'tsconfig.json'))) {
    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noFallthroughCasesInSwitch: true,
      },
      include: ['src'],
    }, null, 2));
  }

  // tailwind.config.js
  if (!fs.existsSync(path.join(projectDir, 'tailwind.config.js'))) {
    fs.writeFileSync(path.join(projectDir, 'tailwind.config.js'), `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
`);
  }

  // postcss.config.js
  if (!fs.existsSync(path.join(projectDir, 'postcss.config.js'))) {
    fs.writeFileSync(path.join(projectDir, 'postcss.config.js'), `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`);
  }

  // src/index.css
  const srcDir = path.join(projectDir, 'src');
  const cssDir = srcDir;
  if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true });
  const cssPath = path.join(cssDir, 'index.css');
  if (!fs.existsSync(cssPath)) {
    fs.writeFileSync(cssPath, `@tailwind base;
@tailwind components;
@tailwind utilities;
`);
  }

  // src/test-setup.ts
  const testSetupPath = path.join(cssDir, 'test-setup.ts');
  if (!fs.existsSync(testSetupPath)) {
    fs.writeFileSync(testSetupPath, `import '@testing-library/jest-dom';
`);
  }

  // Generate Layout.tsx with nav links + regenerate App.tsx with all routes
  generateLayout(projectDir, routes);
  regenerateAppTsx(projectDir, routes);

  // Add Layout.tsx and App.tsx to project metadata files so they show in file explorer
  try {
    const metaPath = path.join(projectDir, 'metadata.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      const existingPaths = new Set((meta.files || []).map((f: { path: string }) => f.path));
      const newFiles: { path: string; content: string; language: string; type: string }[] = [];
      const layoutPath = path.join(projectDir, 'src/components/Layout.tsx');
      if (fs.existsSync(layoutPath) && !existingPaths.has('src/components/Layout.tsx')) {
        newFiles.push({ path: 'src/components/Layout.tsx', content: fs.readFileSync(layoutPath, 'utf-8'), language: 'typescript', type: 'generated' });
      }
      const appPath = path.join(projectDir, 'src/App.tsx');
      if (fs.existsSync(appPath) && !existingPaths.has('src/App.tsx')) {
        newFiles.push({ path: 'src/App.tsx', content: fs.readFileSync(appPath, 'utf-8'), language: 'typescript', type: 'generated' });
      }
      if (newFiles.length > 0) {
        meta.files = [...(meta.files || []), ...newFiles];
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      }
    }
  } catch { /* non-fatal */ }

  // src/main.tsx
  const mainPath = path.join(srcDir, 'main.tsx');
  if (!fs.existsSync(mainPath)) {
    fs.writeFileSync(mainPath, `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`);
  }
}

async function buildProject(projectDir: string, onProgress?: (msg: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';
    const npmCmd = isWin ? 'npm.cmd' : 'npm';

    console.log(`[install] Installing deps in ${projectDir}...`);
    const install = isWin
      ? spawn('cmd.exe', ['/d', '/c', npmCmd, 'install', '--no-audit', '--no-fund'], { cwd: projectDir, stdio: ['ignore', 'pipe', 'pipe'], windowsVerbatimArguments: true })
      : spawn(npmCmd, ['install', '--no-audit', '--no-fund'], { cwd: projectDir, stdio: ['ignore', 'pipe', 'pipe'] });

    let installErr = '';
    install.stdout.on('data', (d: Buffer) => {
      const text = d.toString();
      process.stdout.write(`[npm-install] ${text}`);
      if (onProgress && text.trim()) onProgress(text.trim().split('\n').filter(Boolean).pop() || text.trim());
    });
    install.stderr.on('data', (d: Buffer) => { installErr += d.toString(); process.stderr.write(`[npm-install] ${d}`); });

    install.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`npm install failed (exit ${code}): ${installErr.slice(0, 200)}`));
      }
      console.log(`[install] Success: ${projectDir}`);
      resolve();
    });
  });
}

// ========== PROJECT SAVE ==========

app.post('/api/projects/save', (req, res) => {
  try {
    const { project } = req.body || {};
    if (!project || !project.id) {
      return res.status(400).json({ error: 'Missing project data in request body' });
    }
    const projectDir = path.join(PROJECTS_DIR, project.id);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(projectDir, 'metadata.json'),
      JSON.stringify(project, null, 2)
    );

    if (project.files) {
      for (const file of project.files) {
        const filePath = path.join(projectDir, file.path);
        const fileDir = path.dirname(filePath);
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        // Strip markdown code fences from generated files
        const content = (file.content || '').replace(/```\w*\s*[\r\n]/g, '').replace(/```\s*$/gm, '').trim();
        fs.writeFileSync(filePath, content);
      }
    }

    if (project.brain) {
      fs.writeFileSync(
        path.join(projectDir, 'brain.json'),
        JSON.stringify(project.brain, null, 2)
      );
    }

    if (project.graph) {
      fs.writeFileSync(
        path.join(projectDir, 'graph.json'),
        JSON.stringify(project.graph, null, 2)
      );
    }

    // Auto-scaffold Vite project files
    const routes = project.brain?.architecture?.routes || [];
    scaffoldProject(projectDir, project.id, project.name || project.id, routes);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ========== BUILD ENDPOINT ==========

/**
 * Extracts the first valid HTML document from a string that may contain
 * markdown prose, code fences, and other non-HTML content around the
 * actual <!DOCTYPE html> ... </html> block.
 */
function extractHtmlDocument(raw: string): string {
  // Strip markdown code fences first
  let content = raw.replace(/```html\s*/gi, '').replace(/```\s*$/gm, '').trim();

  // Find the first <!DOCTYPE html> or <html (case-insensitive)
  const doctypeIdx = content.search(/<!DOCTYPE\s+html/i);
  const htmlTagIdx = content.search(/<html[\s>]/i);
  const startIdx = doctypeIdx >= 0 ? doctypeIdx : htmlTagIdx >= 0 ? htmlTagIdx : -1;

  if (startIdx < 0) {
    // No HTML document found — return cleaned content as-is
    return content;
  }

  // Find the closing </html> tag
  const closeIdx = content.toLowerCase().lastIndexOf('</html>');
  if (closeIdx < 0) {
    return content.slice(startIdx).trim();
  }

  return content.slice(startIdx, closeIdx + '</html>'.length).trim();
}

function cleanGeneratedFiles(projectDir: string, onProgress?: (file: string, action: string) => void) {
  const re = /```\w*\s*[\r\n]/g;
  const closeRe = /```\s*$/gm;
  function walk(dir: string) {
    let entries: string[] = [];
    try { entries = fs.readdirSync(dir); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e);
      try {
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (e.endsWith('.tsx') || e.endsWith('.ts') || e.endsWith('.css')) {
          let content = fs.readFileSync(full, 'utf-8');
          const cleaned = content.replace(re, '').replace(closeRe, '').trim();
          if (cleaned !== content) {
            fs.writeFileSync(full, cleaned);
            onProgress?.(e, 'cleaned');
          } else {
            onProgress?.(e, 'ok');
          }
        } else if (e === 'demo.html') {
          // demo.html is the AI-generated preview — extract just the HTML document
          let content = fs.readFileSync(full, 'utf-8');
          const extracted = extractHtmlDocument(content);
          if (extracted !== content) fs.writeFileSync(full, extracted);
        }
      } catch {}
    }
  }
  walk(projectDir);
}

// Track build status per project
const buildStatus: Record<string, { status: 'idle' | 'building' | 'done' | 'error'; error?: string }> = {};

app.post('/api/build/:id', async (req, res) => {
  const projectDir = path.join(PROJECTS_DIR, req.params.id);

  if (!fs.existsSync(path.join(projectDir, 'metadata.json'))) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (buildStatus[req.params.id]?.status === 'building') {
    return res.status(409).json({ error: 'Build already in progress' });
  }

  // Scaffold project files and mark as done (skip npm/vite build — unreliable with AI-generated code)
  try {
    const emit = (stage: string, status: string, message: string) => {
      io.to(`project:${req.params.id}`).emit('build-progress', { projectId: req.params.id, stage, status, message });
    };

    emit('scaffold', 'in-progress', 'Setting up project structure...');
    const meta = JSON.parse(fs.readFileSync(path.join(projectDir, 'metadata.json'), 'utf-8'));
    const routes = meta.brain?.architecture?.routes || [];
    scaffoldProject(projectDir, req.params.id, meta.name || req.params.id, routes);

    emit('validate', 'in-progress', 'Cleaning and validating generated files...');
    let cleanedCount = 0;
    let okCount = 0;
    cleanGeneratedFiles(projectDir, (file, action) => {
      if (action === 'cleaned') cleanedCount++;
      else okCount++;
      io.to(`project:${req.params.id}`).emit('build-progress', {
        projectId: req.params.id,
        stage: 'validate',
        status: 'in-progress',
        message: `${file}: ${action}`,
        detail: { file, action },
      });
    });
    emit('validate', 'done', `Validated ${cleanedCount + okCount} files (${cleanedCount} cleaned, ${okCount} ok)`);

    // Install dependencies and start Vite dev server for a dynamic preview
    emit('deps', 'in-progress', 'Installing dependencies...');
    try {
      await buildProject(projectDir, (msg) => {
        io.to(`project:${req.params.id}`).emit('build-progress', {
          projectId: req.params.id, stage: 'deps', status: 'in-progress', message: msg,
        });
      });
      emit('deps', 'done', 'Dependencies installed');
    } catch (installErr) {
      const msg = (installErr as Error).message;
      console.error('npm install failed, falling back to static preview:', msg);
      emit('deps', 'error', `npm install failed: ${msg}. Showing static preview.`);
    }

    emit('server', 'in-progress', 'Starting dev server...');
    buildStatus[req.params.id] = { status: 'done' };
    try {
      await startDevServer(projectDir, req.params.id);
      emit('server', 'done', 'Dev server running');
    } catch (devErr) {
      console.error('Dev server start failed, falling back to static preview:', devErr);
      emit('server', 'error', 'Dev server unavailable, showing static preview');
    }
    emit('complete', 'done', 'Build complete');
    io.to(`project:${req.params.id}`).emit('build-complete', { projectId: req.params.id, status: 'done' });
    res.json({ status: 'done' });
  } catch (e) {
    buildStatus[req.params.id] = { status: 'error', error: 'Scaffold failed: ' + (e as Error).message };
    res.status(500).json(buildStatus[req.params.id]);
  }
});

app.get('/api/build/:id/status', (req, res) => {
  res.json(buildStatus[req.params.id] || { status: 'idle' });
});

// ========== DEEP RESEARCH (AI deep thinking — Kimi-style) ==========

const DEEP_RESEARCH_SYSTEM_PROMPT = `You are a deep research analyst. Analyze the given topic thoroughly.

Output valid JSON only (no markdown):
{
  "topic": "the original topic",
  "summary": "2-3 paragraph comprehensive analysis of the topic",
  "sources": [
    { "title": "Key finding or section", "snippet": "Analysis details (2-3 sentences)" }
  ],
  "insights": [
    "Key takeaway #1",
    "Key takeaway #2",
    "Key takeaway #3"
  ]
}

Include 3-5 sources (analysis sections) and 3 insights. Base on your training knowledge.`;

app.post('/api/research', async (req, res) => {
  const { topic } = req.body || {};
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: 'Missing topic' });
  }

  try {
    // Use Ollama directly for deep thinking (best for Kimi-style analysis)
    const config = { provider: 'ollama' as const, model: 'qwen2.5-coder:1.5b', baseUrl: 'http://localhost:11434' };
    const response = await callLLM(
      DEEP_RESEARCH_SYSTEM_PROMPT,
      [{ role: 'user', content: topic.trim() }],
      config,
      true,
      4096,
      300000
    );

    if (response?.error) {
      throw new Error(response.error.message || JSON.stringify(response.error));
    }

    const raw = typeof response === 'string' ? response : (
      response?.choices?.[0]?.message?.content ||
      response?.message?.content ||
      response?.text ||
      JSON.stringify(response)
    );

    let result: any;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { result = JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
    }

    if (!result || !result.summary) {
      result = {
        topic: topic.trim(),
        summary: raw.slice(0, 2000),
        sources: [{ title: 'AI Analysis', snippet: raw.slice(0, 1000) }],
        insights: [raw.slice(0, 300)],
      };
    }

    res.json({
      topic: result.topic || topic.trim(),
      summary: result.summary || '',
      sources: (result.sources || []).map((s: any) => ({
        title: s.title || 'Analysis',
        snippet: (s.snippet || s.content || '').slice(0, 500),
        url: s.url || '',
        relevance: s.relevance || 0.5,
      })),
      insights: result.insights || [],
    });
  } catch (err) {
    console.error('[research] Error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

// ========== RESEARCH CONVERSATION ==========

app.post('/api/research/message', async (req, res) => {
  const { topic, messages } = req.body || {};
  if (!topic || !messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing topic or messages' });
  }

  try {
    // Pass full conversation as proper message array for real conversational context
    const llmMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const systemPrompt = `You are a world-class deep research analyst discussing "${topic}". Do NOT ask generic follow-up questions like "what specifically would you like to know" — instead, immediately provide substantive analysis: key concepts, trade-offs, real-world applications, pros/cons, emerging trends, and connections to adjacent domains. Use the full conversation history to build on previous points. If the user introduces a specific angle, dive deep with concrete details, comparisons, and examples. Be decisive and opinionated where appropriate. Return JSON: { "answer": "your analysis here" }`;

    const config = { provider: 'ollama' as const, model: 'qwen2.5-coder:1.5b', baseUrl: 'http://localhost:11434' };
    const response = await callLLM(systemPrompt, llmMessages, config, true, 2048, 120000);

    // Extract from Ollama response format: { model, message: { role, content }, ... }
    const content = response?.message?.content || response?.text || '';

    // The content should be JSON { "answer": "..." } — parse it
    let answer = content;
    try {
      const parsed = JSON.parse(content);
      if (parsed.answer) answer = parsed.answer;
      else if (parsed.response) answer = parsed.response;
    } catch {
      // Not JSON — use raw content directly
    }

    res.json({ content: String(answer || '').slice(0, 2000) });
  } catch (err) {
    console.error('[research/message] Error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/research/prompt', async (req, res) => {
  const { topic, messages, extraInstructions } = req.body || {};
  if (!topic || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing topic or messages' });
  }

  try {
    const llmMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const extra = extraInstructions ? `\n\nUser instructions: ${extraInstructions}` : '';
    const systemPrompt = `Output ONLY a JSON object with a key "generatedPrompt". The value must be a single, detailed build prompt for a React app about "${topic}". Write in second person ("Build a...", "Create...", "The app should..."). Be concrete — reference specific features, pages, and technical decisions from the research conversation. Do NOT describe what a build prompt is. Just write the prompt text directly.${extra}\n\nExample format:\n{"generatedPrompt": "Build a SaaS dashboard with team analytics. Include a login page, a dashboard with charts, a team management page, and settings. Use React Router for navigation..."}`;

    const config = { provider: 'ollama' as const, model: 'qwen2.5-coder:1.5b', baseUrl: 'http://localhost:11434' };
    const response = await callLLM(systemPrompt, llmMessages, config, true, 4096, 180000);

    const content = response?.message?.content || response?.text || '';

    let generatedPrompt = content;
    try {
      const parsed = JSON.parse(content);
      if (parsed.generatedPrompt) generatedPrompt = parsed.generatedPrompt;
      else if (parsed.prompt) generatedPrompt = parsed.prompt;
      else if (parsed.response) generatedPrompt = parsed.response;
    } catch {
      // Use raw content
    }

    res.json({ generatedPrompt: String(generatedPrompt || '') });
  } catch (err) {
    console.error('[research/prompt] Error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

// ========== SETTINGS SYNC ==========
app.get('/api/settings', (req, res) => {
  const settingsPath = path.join(PROJECTS_DIR, '_settings.json');
  if (fs.existsSync(settingsPath)) {
    res.json(JSON.parse(fs.readFileSync(settingsPath, 'utf-8')));
  } else {
    res.json({ provider: 'ollama', model: 'qwen2.5-coder:7b', baseUrl: 'http://localhost:11434' });
  }
});

app.post('/api/settings', (req, res) => {
  const settingsPath = path.join(PROJECTS_DIR, '_settings.json');
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ========== KEY CREDITS CHECK ==========

const keyCreditCache = new Map<string, { credits: KeyCheckResult; ts: number }>();
const KEY_CACHE_TTL = 60_000; // 1 minute

interface KeyCheckResult {
  ok: boolean;
  label?: string;
  usage?: number;
  limit?: number;
  rateLimit?: { requests: number; interval: string };
  isFree?: boolean;
  error?: string;
}

app.post('/api/check-key', async (req, res) => {
  const { key } = req.body || {};
  if (!key || typeof key !== 'string' || !key.trim()) {
    return res.status(400).json({ ok: false, error: 'Missing key' });
  }

  const cached = keyCreditCache.get(key);
  if (cached && Date.now() - cached.ts < KEY_CACHE_TTL) {
    return res.json(cached.credits);
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { 'Authorization': `Bearer ${key.trim()}` },
    });
    const data = await response.json();

    let result: KeyCheckResult = { ok: false };
    if (data?.data) {
      const d = data.data;
      result = {
        ok: true,
        label: d.label || '',
        usage: d.usage,
        limit: d.limit,
        rateLimit: d.rate_limit ? { requests: d.rate_limit.requests, interval: d.rate_limit.interval } : undefined,
        isFree: d.is_free ?? false,
      };
    } else {
      result = { ok: false, error: data?.error?.message || data?.error || 'Unknown error' };
    }

    keyCreditCache.set(key, { credits: result, ts: Date.now() });
    res.json(result);
  } catch (err) {
    res.json({ ok: false, error: (err as Error).message, isFree: true } as KeyCheckResult);
  }
});

// ========== HELPERS for AI calls ==========
function walkDir(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseFileBlocks(text: string): { file: string; content: string }[] {
  const blocks: { file: string; content: string }[] = [];
  const regex = /FILE:\s*(.+?)\s*[\r\n]+```(?:[\w+-]*)?\s*([\s\S]*?)[\r\n]+```/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const pathValue = match[1].trim();
    const contentValue = match[2].replace(/\r\n/g, '\n').trim();
    blocks.push({ file: pathValue, content: contentValue });
  }
  return blocks;
}

function extractSummaryReasoning(text: string): { summary: string; reasoning: string } {
  const summaryMatch = text.match(/SUMMARY:\s*(.+)/i);
  const reasoningMatch = text.match(/REASONING:\s*([\s\S]*?)(?:\nFILE:|$)/i);
  return {
    summary: summaryMatch?.[1]?.trim() || '',
    reasoning: reasoningMatch?.[1]?.trim() || '',
  };
}

async function getActiveModelConfig(): Promise<{ provider: 'ollama' | 'openrouter'; model: string; baseUrl: string; apiKey?: string }> {
  const settingsPath = path.join(process.cwd(), 'projects', '_settings.json');
  const defaults = { provider: 'ollama' as const, model: 'qwen2.5-coder:7b', baseUrl: 'http://localhost:11434' };
  if (!fs.existsSync(settingsPath)) return defaults;
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    const provider = settings.apiProvider || defaults.provider;
    let model = defaults.model;
    if (provider === 'openrouter') {
      model = settings.openRouterModel || 'deepseek/deepseek-chat';
    } else {
      model = settings.models?.coder || settings.ollamaModel || defaults.model;
    }
    return {
      provider,
      model,
      baseUrl: settings.ollamaUrl || defaults.baseUrl,
      apiKey: settings.openRouterKey || undefined,
    };
  } catch { return defaults; }
}

async function callLLM(systemPrompt: string, messages: { role: string; content: string }[], config: { provider: string; model: string; baseUrl: string; apiKey?: string }, jsonMode?: boolean, maxTokens?: number, requestTimeout?: number): Promise<any> {
  if (config.provider === 'openrouter') {
    let modelToUse = config.model;
    if (modelToUse && !modelToUse.includes('/')) {
      console.warn(`Local model ID "${modelToUse}" passed to OpenRouter in backend. Falling back to default.`);
      modelToUse = 'deepseek/deepseek-chat';
    }
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': 'https://doststudio.app',
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: maxTokens ?? 1024,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: AbortSignal.timeout(requestTimeout ?? 120000),
    });
    return response.json();
  } else {
    // Ollama
    const ollamaMessages = [{ role: 'system', content: systemPrompt }, ...messages];
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ model: config.model, messages: ollamaMessages, stream: false, ...(jsonMode ? { format: 'json' } : {}) });
      const options: http.RequestOptions = {
        hostname: new URL(config.baseUrl).hostname,
        port: new URL(config.baseUrl).port || 11434,
        path: '/api/chat',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        agent: ollamaAgent,
        timeout: requestTimeout ?? 120000,
      };
      const req = http.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            // Ollama returns { status: 'error', message: '...' } when a model is missing or fails
            if (parsed?.status === 'error') {
              reject(new Error(parsed.message || 'Ollama request failed'));
            } else {
              resolve(parsed);
            }
          }
          catch { reject(new Error('Failed to parse Ollama response: ' + data.slice(0, 500))); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Ollama request timed out')); });
      req.write(body);
      req.end();
    });
  }
}

/**
 * Reads architecture routes from a project's metadata.json
 */
function readProjectRoutes(projectDir: string): { component: string; path: string }[] {
  try {
    const metaPath = path.join(projectDir, 'metadata.json');
    if (!fs.existsSync(metaPath)) return [];
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    return meta.brain?.architecture?.routes || [];
  } catch {
    return [];
  }
}

// ========== ELEMENT EDIT (Selection Tool) ==========
app.post('/api/element-edit', async (req, res) => {
  const { projectId, element, prompt } = req.body;
  if (!projectId || !element || !prompt) {
    return res.status(400).json({ error: 'Missing projectId, element, or prompt' });
  }
  const projectDir = path.join(PROJECTS_DIR, projectId);
  if (!fs.existsSync(projectDir)) {
    return res.status(404).json({ error: 'Project not found' });
  }

  try {
    // Collect project files for context
    const srcDir = path.join(projectDir, 'src');
    const fileMap: Record<string, string> = {};
    if (fs.existsSync(srcDir)) {
      const files = walkDir(srcDir);
      for (const f of files) {
        if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.css')) {
          fileMap[path.relative(projectDir, f)] = fs.readFileSync(f, 'utf-8').slice(0, 4000);
        }
      }
    }

    const systemPrompt = `You are a precise code editor. The user has selected an element in their app's preview and wants to modify it.

Selected element:
- Tag: <${element.tag}>
- CSS selector: ${element.selector}
- HTML snippet: ${element.html.slice(0, 300)}
- Text content: "${element.text.slice(0, 100)}"

Current project files for context:
${Object.entries(fileMap).slice(0, 8).map(([name, code]) => `--- ${name} ---\n${code.slice(0, 1500)}`).join('\n\n')}

The user wants: "${prompt}"

Respond with ONLY the exact file path (relative to project root) and the updated file content in this format:
FILE: path/to/file.tsx
\`\`\`
updated content here
\`\`\`

If multiple files need changes, provide multiple blocks. Only output changed files. Use the same code style as the existing code.`;

    const agentConfig = await getActiveModelConfig();
    const response = await callLLM(systemPrompt, [{ role: 'user', content: prompt }], agentConfig, false);
    const content = response?.text || response?.message?.content || '';

    // Parse file blocks from response
    const fileBlocks = parseFileBlocks(content);
    if (fileBlocks.length === 0) {
      return res.status(400).json({ error: 'AI did not return valid file edits', raw: content.slice(0, 500) });
    }

    for (const block of fileBlocks) {
      const fullPath = path.join(projectDir, block.file);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, block.content, 'utf-8');
    }

    // Re-scaffold (re-run clean + rebuild)
    cleanGeneratedFiles(projectDir, () => {});
    const routes = readProjectRoutes(projectDir);
    regenerateAppTsx(projectDir, routes);
    buildStatus[projectId] = { status: 'done' };
    io.to(`project:${projectId}`).emit('build-complete', { projectId, status: 'done' });

    res.json({ status: 'done', editedFiles: fileBlocks.map(b => b.file) });
  } catch (err) {
    console.error('Element edit error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/chat-edit', async (req, res) => {
  const { projectId, prompt, conversationHistory } = req.body || {};
  if (!projectId || !prompt) {
    return res.status(400).json({ error: 'Missing projectId or prompt' });
  }

  const projectDir = path.join(PROJECTS_DIR, projectId);
  if (!fs.existsSync(projectDir)) {
    return res.status(404).json({ error: 'Project not found' });
  }

  try {
    const srcDir = path.join(projectDir, 'src');
    const files: { path: string; content: string }[] = [];
    if (fs.existsSync(srcDir)) {
      for (const filePath of walkDir(srcDir)) {
        if (/\.(tsx|ts|css)$/i.test(filePath)) {
          let content = fs.readFileSync(filePath, 'utf-8');
          if (content.length > 4000) {
            content = content.slice(0, 4000) + '\n... (truncated)';
          }
          files.push({ path: path.relative(projectDir, filePath).replace(/\\/g, '/'), content });
        }
      }
    }

    const fileContents = files.map((f) => `### ${f.path}\n${f.content}`).join('\n\n');
    const historyText = Array.isArray(conversationHistory)
      ? conversationHistory.map((entry: { role: string; content: string }) => `${entry.role.toUpperCase()}: ${entry.content}`).join('\n')
      : '';

    const systemPrompt = `You are an expert software engineer editing a React + TypeScript + TailwindCSS project.

Use only plain TailwindCSS utility classes. Do not import from shadcn/ui, @/components/ui, radix-ui, @radix-ui, or any external UI component library.
Every React component file MUST have a default export.
Only modify or add files that are required to satisfy the user request.
Preserve the existing project structure and imports whenever possible.
Respond with changes in the exact format:
FILE: src/path/to/file.tsx
\`\`\`
new content here
\`\`\`

Include a SUMMARY: line and a REASONING: block before the file definitions.`;

    const userPrompt = `Current file contents:\n${fileContents}\n\nUser request: "${prompt}"${historyText ? `\n\nConversation history:\n${historyText}` : ''}\n\nReturn only SUMMARY, REASONING, and valid FILE blocks in the format described. Do not include extra explanation outside the requested format.`;

    const agentConfig = await getActiveModelConfig();
    const response = await callLLM(systemPrompt, [{ role: 'user', content: userPrompt }], agentConfig, false);
    const content = response?.text || response?.message?.content || '';

    const fileBlocks = parseFileBlocks(content);
    if (!fileBlocks.length) {
      return res.status(400).json({ error: 'AI did not return valid file edits', raw: content.slice(0, 500) });
    }

    const parsed = extractSummaryReasoning(content);
    const summary = parsed.summary || `Applied changes to ${fileBlocks.length} file(s).`;
    const reasoning = parsed.reasoning || prompt;

    const edits: { path: string; oldContent: string; newContent: string }[] = [];
    for (const block of fileBlocks) {
      const fullPath = path.join(projectDir, block.file);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const oldContent = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : '';
      fs.writeFileSync(fullPath, block.content, 'utf-8');
      edits.push({ path: block.file, oldContent, newContent: block.content });
    }

    cleanGeneratedFiles(projectDir, () => {});
    const routes = readProjectRoutes(projectDir);
    regenerateAppTsx(projectDir, routes);
    buildStatus[projectId] = { status: 'done' };
    io.to(`project:${projectId}`).emit('build-complete', { projectId, status: 'done' });

    try {
      await buildProject(projectDir, () => {});
      await startDevServer(projectDir, projectId);
    } catch (error) {
      console.warn('chat-edit rebuild warning:', (error as Error).message);
    }

    res.json({
      files: edits,
      summary,
      reasoning,
    });
  } catch (error) {
    console.error('Chat edit error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// ========== DEV SERVER ==========

app.get('/api/dev-server/:id', (req, res) => {
  const url = getDevServerUrl(req.params.id);
  res.json({ running: !!url, url });
});

app.post('/api/dev-server/:id/start', async (req, res) => {
  const projectDir = path.join(PROJECTS_DIR, req.params.id);
  if (!fs.existsSync(path.join(projectDir, 'metadata.json'))) {
    return res.status(404).json({ error: 'Project not found' });
  }
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(projectDir, 'metadata.json'), 'utf-8'));
    const routes = meta.brain?.architecture?.routes || [];
    scaffoldProject(projectDir, req.params.id, meta.name || req.params.id, routes);
    await buildProject(projectDir);
    const port = await startDevServer(projectDir, req.params.id);
    res.json({ running: true, url: `http://localhost:${port}`, port });
  } catch (e) {
    res.json({ running: false, error: (e as Error).message });
  }
});

app.post('/api/dev-server/:id/stop', async (req, res) => {
  await stopDevServer(req.params.id);
  res.json({ success: true });
});

// ========== DELETE / RENAME PROJECT ==========

app.delete('/api/projects/:id', (req, res) => {
  const projectDir = path.join(PROJECTS_DIR, req.params.id);
  if (!fs.existsSync(projectDir)) {
    return res.status(404).json({ error: 'Project not found' });
  }
  try {
    stopDevServer(req.params.id);
    fs.rmSync(projectDir, { recursive: true, force: true });
    console.log(`Deleted project: ${req.params.id}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete project: ' + (e as Error).message });
  }
});

app.patch('/api/projects/:id', (req, res) => {
  const projectDir = path.join(PROJECTS_DIR, req.params.id);
  const metaPath = path.join(projectDir, 'metadata.json');
  if (!fs.existsSync(metaPath)) {
    return res.status(404).json({ error: 'Project not found' });
  }
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    meta.name = name.trim();
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    console.log(`Renamed project ${req.params.id} to: ${name}`);
    res.json({ success: true, name: meta.name });
  } catch (e) {
    res.status(500).json({ error: 'Failed to rename project: ' + (e as Error).message });
  }
});

// ========== FILE OPERATIONS ==========

app.post('/api/projects/:id/files', (req, res) => {
  const projectDir = path.join(PROJECTS_DIR, req.params.id);
  const metaPath = path.join(projectDir, 'metadata.json');
  if (!fs.existsSync(metaPath)) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const { path: filePath, content } = req.body;
  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: 'File path is required' });
  }
  try {
    const fullPath = path.join(projectDir, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(fullPath) && content === undefined) {
      return res.status(409).json({ error: 'File already exists' });
    }
    fs.writeFileSync(fullPath, content ?? '', 'utf-8');
    // Regenerate App.tsx to include the new file if it's a .tsx component
    if (filePath.endsWith('.tsx') && !filePath.includes('.test.') && !filePath.includes('.spec.')) {
      const projectDir = path.join(PROJECTS_DIR, req.params.id);
      const routes = readProjectRoutes(projectDir);
      regenerateAppTsx(projectDir, routes);
    }
    console.log(`File created/updated: ${filePath} in project ${req.params.id}`);
    res.json({ success: true, path: filePath });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create file: ' + (e as Error).message });
  }
});

app.delete('/api/projects/:id/files', (req, res) => {
  const projectDir = path.join(PROJECTS_DIR, req.params.id);
  const metaPath = path.join(projectDir, 'metadata.json');
  if (!fs.existsSync(metaPath)) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const { path: filePath } = req.body;
  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: 'File path is required' });
  }
  try {
    const fullPath = path.join(projectDir, filePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    fs.rmSync(fullPath);
    // Regenerate App.tsx after deleting a component file
    if (filePath.endsWith('.tsx') && !filePath.includes('.test.') && !filePath.includes('.spec.')) {
      const projectDir = path.join(PROJECTS_DIR, req.params.id);
      const routes = readProjectRoutes(projectDir);
      regenerateAppTsx(projectDir, routes);
    }
    console.log(`File deleted: ${filePath} from project ${req.params.id}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete file: ' + (e as Error).message });
  }
});

// ========== EXPORT AS ZIP ==========

/**
 * Minimal ZIP builder — no extra dependencies, uses Node's built-in zlib.
 * Supports STORE (no compression) and DEFLATE methods.
 */
function buildZip(files: { name: string; data: Buffer }[]): Buffer {
  const { deflateRawSync } = require('zlib') as typeof import('zlib');
  const centralDir: Buffer[] = [];
  const localHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = Buffer.from(file.name, 'utf8');
    const compressed = deflateRawSync(file.data, { level: 6 });
    const crc = crc32(file.data);

    // Local file header
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);  // signature
    local.writeUInt16LE(20, 4);           // version needed
    local.writeUInt16LE(0x800, 6);        // flags (UTF-8)
    local.writeUInt16LE(8, 8);            // method: DEFLATE
    local.writeUInt16LE(0, 10);           // mod time
    local.writeUInt16LE(0, 12);           // mod date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    nameBytes.copy(local, 30);

    localHeaders.push(local, compressed);

    // Central dir entry
    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0); // signature
    central.writeUInt16LE(20, 4);          // version made
    central.writeUInt16LE(20, 6);          // version needed
    central.writeUInt16LE(0x800, 8);       // flags
    central.writeUInt16LE(8, 10);          // method
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30);          // extra
    central.writeUInt16LE(0, 32);          // comment
    central.writeUInt16LE(0, 34);          // disk start
    central.writeUInt16LE(0, 36);          // int attrib
    central.writeUInt32LE(0, 38);          // ext attrib
    central.writeUInt32LE(offset, 42);     // local header offset
    nameBytes.copy(central, 46);
    centralDir.push(central);

    offset += local.length + compressed.length;
  }

  const centralDirBuf = Buffer.concat(centralDir);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, centralDirBuf, eocd]);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

app.get('/api/export/:id', (req, res) => {
  try {
    const projectId = req.params.id;
    const projectDir = path.join(PROJECTS_DIR, projectId);
    const metaPath = path.join(projectDir, 'metadata.json');

    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const projectName = (meta.name || projectId).replace(/[^a-zA-Z0-9_\-]/g, '_');

    // Collect all files to include in the zip
    const zipFiles: { name: string; data: Buffer }[] = [];
    const skipDirs = new Set(['node_modules', 'dist', '.git']);

    function collectFiles(dir: string, zipPrefix: string) {
      let entries: string[] = [];
      try { entries = fs.readdirSync(dir); } catch { return; }
      for (const entry of entries) {
        if (skipDirs.has(entry)) continue;
        const fullPath = path.join(dir, entry);
        const zipPath = zipPrefix ? `${zipPrefix}/${entry}` : entry;
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            collectFiles(fullPath, zipPath);
          } else {
            const data = fs.readFileSync(fullPath);
            zipFiles.push({ name: zipPath, data });
          }
        } catch { /* skip unreadable */ }
      }
    }

    collectFiles(projectDir, '');

    // Add a README with run instructions if not already present
    if (!zipFiles.some(f => f.name === 'README.md')) {
      const readme = `# ${meta.name || projectId}

Generated by Dost Studio.

## Run locally

\`\`\`bash
npm install
npm run dev
\`\`\`

Then open http://localhost:5173
`;
      zipFiles.push({ name: 'README.md', data: Buffer.from(readme, 'utf8') });
    }

    const zipBuffer = buildZip(zipFiles);
    const filename = `${projectName}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);

    console.log(`[export] ${filename} — ${zipFiles.length} files, ${(zipBuffer.length / 1024).toFixed(1)} KB`);
  } catch (err) {
    console.error('[export] error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

// ========== LOAD PROJECT ==========

app.get('/api/projects/:id', (req, res) => {
  try {
    const projectDir = path.join(PROJECTS_DIR, req.params.id);
    const metaPath = path.join(projectDir, 'metadata.json');

    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

    const brainPath = path.join(projectDir, 'brain.json');
    if (fs.existsSync(brainPath)) {
      project.brain = JSON.parse(fs.readFileSync(brainPath, 'utf-8'));
    }

    const graphPath = path.join(projectDir, 'graph.json');
    if (fs.existsSync(graphPath)) {
      project.graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ========== PREVIEW ==========

function generateFileBrowserHtml(projectDir: string, projectId: string): string {
  const files: string[] = [];
  function walk(dir: string, prefix = '') {
    let entries;
    try { entries = fs.readdirSync(dir); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e);
      const rel = prefix ? `${prefix}/${e}` : e;
      if (e === 'node_modules' || e === 'dist' || e === '.git') continue;
      try {
        if (fs.statSync(full).isDirectory()) walk(full, rel);
        else files.push(rel);
      } catch {}
    }
  }
  walk(projectDir);

  const fileLinks = files.map(f => {
    return `<li><a href="/preview/${projectId}/${f}" target="_blank" class="file-link">${f}</a></li>`;
  }).join('\n');

  const distExists = fs.existsSync(path.join(projectDir, 'dist', 'index.html'));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${projectId} — Preview</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: system-ui, -apple-system, sans-serif; background:#0a0a0b; color:#e4e4e7; }
.container { max-width:900px; margin:0 auto; padding:2rem; }
h1 { font-size:1.5rem; margin-bottom:1rem; color:#fafafa; }
.file-list { list-style:none; display:flex; flex-direction:column; gap:0.25rem; }
.file-link { display:block; padding:0.4rem 0.75rem; color:#818cf8; text-decoration:none; border-radius:6px; font-family:monospace; font-size:0.875rem; }
.file-link:hover { background:#18181b; color:#a5b4fc; }
.help { margin-top:2rem; padding:1rem; background:#18181b; border-radius:8px; font-size:0.875rem; color:#a1a1aa; line-height:1.6; }
.help code { background:#27272a; padding:0.15rem 0.4rem; border-radius:4px; font-size:0.8rem; }
.btn { display:inline-block; margin-top:1rem; padding:0.6rem 1.2rem; background:#6366f1; color:#fff; border:none; border-radius:6px; font-size:0.875rem; cursor:pointer; text-decoration:none; }
.btn:hover { background:#4f46e5; }
</style>
</head>
<body>
<div class="container">
<h1>📁 ${projectId}</h1>
<p style="color:#71717a;margin-bottom:1.5rem;">${distExists ? '✅ Built preview available' : 'Project files — click to view'}</p>
${distExists ? `<a href="/preview/${projectId}/" class="btn">Open Live Preview</a>` : ''}
<ul class="file-list">${fileLinks || '<li style="color:#71717a;">No files generated yet</li>'}</ul>
<div class="help">
<strong>${distExists ? 'Live preview ready!' : 'To run this project locally:'}</strong><br>
${distExists
  ? 'The project has been built. Click "Open Live Preview" above to see the running app.'
  : '1. Go to the Preview tab in Dost Studio and click "Build Project"<br>2. Or run <code>npm install && npm run dev</code> locally'}
</div>
</div>
</body>
</html>`;
}

// Selection/inspection script injected into preview pages
const SELECTION_SCRIPT = `<script>
(function(){
  let selectMode = false;
  let hoveredEl = null;
  const overlay = document.createElement('div');
  overlay.id = '__ds_overlay';
  overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:999999;border:2px solid #6366f1;background:rgba(99,102,241,0.1);transition:all 0.1s;display:none;';
  document.body.appendChild(overlay);

  function getSelector(el) {
    if (!el || el === document.body) return 'body';
    let path = [];
    while (el && el !== document.body) {
      let selector = el.tagName.toLowerCase();
      if (el.id) { path.unshift('#' + el.id); break; }
      if (el.className && typeof el.className === 'string') {
        const cls = el.className.trim().split(/\\s+/).slice(0,2).join('.');
        if (cls) selector += '.' + cls;
      }
      const parent = el.parentElement;
      if (parent) {
        const idx = Array.from(parent.children).indexOf(el) + 1;
        selector += ':nth-child(' + idx + ')';
      }
      path.unshift(selector);
      el = el.parentElement;
    }
    return path.join(' > ');
  }

  function getDetails(el) {
    const rect = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classes: (el.className && typeof el.className === 'string') ? el.className.trim().split(/\\s+/) : [],
      text: (el.textContent || '').trim().slice(0, 200),
      selector: getSelector(el),
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      html: el.outerHTML.slice(0, 500),
      attributes: Array.from(el.attributes || []).map(a => ({ name: a.name, value: a.value })),
    };
  }

  function onMove(e) {
    if (!selectMode) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === hoveredEl || el === overlay || el.id === '__ds_overlay') return;
    hoveredEl = el;
    const r = el.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.left = r.left + 'px';
    overlay.style.top = r.top + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
    el.style.outline = 'none';
  }

  function onClick(e) {
    if (!selectMode) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;
    if (el === overlay) return;
    selectMode = false;
    overlay.style.display = 'none';
    window.parent.postMessage({ type: '__DS_SELECT', details: getDetails(el) }, '*');
  }

  window.addEventListener('mousemove', onMove, true);
  window.addEventListener('click', onClick, true);

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === '__DS_SET_MODE') {
      selectMode = e.data.mode;
      document.body.style.cursor = selectMode ? 'crosshair' : '';
      overlay.style.display = 'none';
      hoveredEl = null;
    }
  });
})();
<\/script>`;

function injectSelectionScript(html) {
  if (html.includes('__ds_overlay') || html.includes('SELECTION_SCRIPT')) return html;
  return html.replace('</body>', SELECTION_SCRIPT + '\n</body>');
}

// Single preview middleware: serves built dist/ first, then raw files, then file browser
app.use('/preview', (req, res, next) => {
  try {
    const urlPath = req.path.replace(/^\//, '');
    const parts = urlPath.split('/');
    const projectId = parts[0];
    if (!projectId) return next();

    const projectDir = path.join(PROJECTS_DIR, projectId);
    if (!fs.existsSync(projectDir)) return next();

    const relPath = parts.slice(1).join('/');

    // If a Vite dev server is running, proxy through it to get HMR + selection script injection
    const devPort = getDevServerPort(projectId);
    if (devPort) {
      const targetPath = relPath || '/';
      // Forward only necessary headers, skip content-length (body may not exist)
      const headers: Record<string, string | string[]> = { ...req.headers, host: `localhost:${devPort}` };
      if (['GET', 'HEAD'].includes(req.method)) delete headers['content-length'];
      const proxyReq = http.request(
        { hostname: 'localhost', port: devPort, path: '/' + targetPath, method: req.method, headers },
        (proxyRes) => {
          let body = Buffer.alloc(0);
          proxyRes.on('data', (chunk: Buffer) => { body = Buffer.concat([body, chunk]); });
          proxyRes.on('end', () => {
            const contentType = proxyRes.headers['content-type'] || '';
            if (contentType.includes('text/html')) {
              const html = body.toString('utf-8');
              res.type('html').send(injectSelectionScript(html));
            } else {
              res.status(proxyRes.statusCode || 200);
              for (const [k, v] of Object.entries(proxyRes.headers)) {
                if (v) res.setHeader(k, v);
              }
              res.send(body);
            }
          });
        }
      );
      proxyReq.on('error', (err) => { console.error('Vite proxy error:', err.message); next(); });
      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) proxyReq.write(JSON.stringify(req.body));
      proxyReq.end();
      return;
    }

    function tryServe(filePath: string): boolean {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.sendFile(filePath);
        return true;
      }
      return false;
    }

    if (relPath && path.extname(relPath)) {
      if (tryServe(path.join(projectDir, 'dist', relPath))) return;
      if (tryServe(path.join(projectDir, relPath))) return;
      return next();
    }

    // Serve demo.html (AI-generated static preview) with on-the-fly HTML extraction
    const demoHtmlPath = path.join(projectDir, 'demo.html');
    if (fs.existsSync(demoHtmlPath) && fs.statSync(demoHtmlPath).isFile()) {
      const raw = fs.readFileSync(demoHtmlPath, 'utf-8');
      const extracted = extractHtmlDocument(raw);
      // If extraction gave us a real HTML document, persist the clean version and serve it
      if (extracted.toLowerCase().includes('<!doctype') || extracted.toLowerCase().startsWith('<html')) {
        if (extracted !== raw) fs.writeFileSync(demoHtmlPath, extracted);
        res.type('html').send(injectSelectionScript(extracted));
      } else {
        // Couldn't find a valid HTML block — wrap it in a basic page
        res.type('html').send(injectSelectionScript(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Preview</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-white p-8 font-sans text-gray-800"><pre class="whitespace-pre-wrap text-sm">${extracted.replace(/</g, '&lt;')}</pre></body></html>`));
      }
      return;
    }

    // Fallback: serve the Vite entry index.html (will be blank without a build)
    // but skip it because it requires a Vite dev server to work
    if (!relPath) {
      return res.type('html').send(injectSelectionScript(generateFileBrowserHtml(projectDir, projectId)));
    }

    next();
  } catch (err) {
    next(err);
  }
});

// ========== SOCKET.IO ==========

// Expose io for devServerManager
globalThis.__io = io;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-project', (projectId: string) => {
    socket.join(`project:${projectId}`);
    console.log(`Socket ${socket.id} joined project ${projectId}`);
  });

  socket.on('file-change', (data: { projectId: string; file: { path: string; content: string } }) => {
    socket.to(`project:${data.projectId}`).emit('file-updated', data.file);
  });

  socket.on('preview-reload', (projectId: string) => {
    io.to(`project:${projectId}`).emit('reload-preview');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// 404 handler — return JSON, never HTML
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler — always return JSON, never HTML
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

function tryListen(port: number): void {
  const onError = (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && port < PORT + 20) {
      console.warn(`[server] Port ${port} in use, trying ${port + 1}...`);
      server.removeListener('error', onError);
      server.removeListener('listening', onListening);
      server.close(() => tryListen(port + 1));
    } else {
      console.error(`[server] Failed to start on port ${port}: ${err.message}`);
      process.exit(1);
    }
  };
  const onListening = () => {
    server.removeListener('error', onError);
    const addr = server.address();
    const actualPort = addr && typeof addr === 'object' ? addr.port : port;
    console.log(`Dost Studio server running on http://localhost:${actualPort}`);
  };
  server.once('error', onError);
  server.once('listening', onListening);
  server.listen(port, '0.0.0.0');
}

tryListen(PORT);
