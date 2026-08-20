import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
                return 'charts-vendor';
              }
              if (id.includes('html5-qrcode')) {
                return 'qrcode-vendor';
              }
              if (id.includes('@supabase/supabase-js')) {
                return 'supabase-vendor';
              }
              if (id.includes('@line/liff')) {
                return 'liff-sdk-vendor';
              }
              if (id.includes('lucide-react')) {
                return 'icons-vendor';
              }
              if (id.includes('motion')) {
                return 'motion-vendor';
              }
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('react-router-dom')
              ) {
                return 'react-vendor';
              }
            }
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
