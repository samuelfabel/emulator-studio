/// <reference types="vitest/config" />
import { join } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

const workspaceRoot = join(__dirname, '../..');
const apiPort = Number(process.env.API_PORT ?? 3001);
const apiOrigin = `http://localhost:${apiPort}`;

export default defineConfig({
  root: __dirname,
  cacheDir: join(workspaceRoot, 'node_modules/.vite/apps/web'),
  envDir: workspaceRoot,
  server: {
    port: 3000,
    strictPort: true,
    host: 'localhost',
    proxy: {
      '/api': apiOrigin,
      '/health': apiOrigin,
      '/docs': apiOrigin,
    },
  },
  preview: {
    port: 3000,
    strictPort: true,
    host: 'localhost',
  },
  plugins: [react(), nxViteTsPaths()],
  build: {
    outDir: join(workspaceRoot, 'dist/apps/web'),
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: join(workspaceRoot, 'coverage/apps/web'),
    },
  },
});
