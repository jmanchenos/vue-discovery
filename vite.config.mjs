import { defineConfig } from 'vite';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      include: [
        'path',
        'child_process',
        'url',
        'events',
        'string_decoder',
        'buffer',
        'util',
        '_stream_passthrough',
        'stream',
        'buffer',
      ],
      protocolImports: true,
      overrides: {},
    }),
  ],
  optimizeDeps: {
    entries: ['node:stream/web'],
    esbuildOptions: {
      target: 'node20',
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/extension.mjs'),
      name: 'vue-discovery-mtm',
      formats: ['cjs'],
      fileName: format => `vue-discovery-mtm.${format}`,
    },
    rollupOptions: {
      shimMissingExports: false,
      external: ['vscode'],
      input: {
        main: path.resolve(__dirname, 'src/extension.mjs'),
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'node22',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  define: {
    // process: {
    //   env: process.env,
    // },
    global: 'globalThis',
  },
});
