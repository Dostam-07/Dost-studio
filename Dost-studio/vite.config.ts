import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env': {},
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['esbuild'],
  },
  server: {
    port: 5173,
    watch: {
      ignored: ['**/projects/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        timeout: 300000,
        proxyTimeout: 300000,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res: any) => {
            console.error('[vite proxy error]', (err as NodeJS.ErrnoException).code, err.message);
            try {
              if (!res.headersSent) { res.writeHead(502); res.end(JSON.stringify({ error: 'Server not ready' })); }
            } catch { /* socket already closed */ }
          });
        },
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
      '/preview': {
        target: 'http://localhost:3001',
      },
    },
  },
})
