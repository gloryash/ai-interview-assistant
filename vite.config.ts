import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    proxy: {
      '/claude': {
        target: 'https://code.newcli.com/claude/droid',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/claude/, ''),
      },
      '/dashscope-ws': {
        target: 'https://dashscope.aliyuncs.com',
        ws: true,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/dashscope-ws/, ''),
        configure: (proxy) => {
          proxy.on('proxyReqWs', (proxyReq, req) => {
            // 从 URL query 中提取 api_key，转为 Authorization header
            const url = new URL(req.url!, 'http://localhost');
            const apiKey = url.searchParams.get('api_key');
            if (apiKey) {
              proxyReq.setHeader('Authorization', `bearer ${apiKey}`);
            }
          });
        },
      },
    },
  },
});
