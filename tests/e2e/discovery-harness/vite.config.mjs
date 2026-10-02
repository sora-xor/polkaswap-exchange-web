import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const stub = fileURLToPath(new URL('./stubs.ts', import.meta.url));

/** Mount the real view while replacing network, wallet, and engine boundaries with inert browser fixtures. */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue()],
  resolve: {
    alias: [
      { find: /^@\/composables\/useTranslation$/, replacement: stub },
      { find: /^@\/lib\/substrate\/sdk\/assets\/consts$/, replacement: stub },
      { find: /^@\/lib\/substrate\/math$/, replacement: stub },
      { find: /^\.\.\/amounts$/, replacement: stub },
      { find: /^\.\.\/campaign$/, replacement: stub },
      { find: /^\.\.\/discovery-live-feedback$/, replacement: stub },
      { find: /^\.\.\/discovery-storage$/, replacement: stub },
      { find: /^\.\.\/discovery-provider$/, replacement: stub },
      { find: /^\.\.\/discovery$/, replacement: stub },
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 41879,
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL('../../..', import.meta.url))] },
  },
});
