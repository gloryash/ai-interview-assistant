import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/claude': {
        target: 'https://code.newcli.com/claude/droid',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/claude/, ''),
      },
    },
  },
});
