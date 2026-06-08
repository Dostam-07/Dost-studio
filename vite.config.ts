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
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
            if (id.includes('zustand')) return 'zustand-vendor';
            if (id.includes('tailwindcss')) return 'tailwind-vendor';
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    watch: {
      ignored: ['**/projects/**'],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        timeout: 300000,
        proxyTimeout: 300000,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res: any) => {
            // ECONNREFUSED is expected during Express startup — handled silently
            try {
              if (!res.headersSent) { res.writeHead(502); res.end(JSON.stringify({ error: 'Server not ready' })); }
            } catch { /* socket already closed */ }
          });
        },
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3001',
        ws: true,
      },
      '/preview': {
        target: 'http://127.0.0.1:3001',
      },
    },
  },
})
