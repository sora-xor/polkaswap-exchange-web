import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import dynamicImport from 'vite-plugin-dynamic-import';
import { createVuePlugin as vue } from 'vite-plugin-vue2';
import svgLoader from 'vite-svg-loader';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), dynamicImport(), svgLoader()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~': fileURLToPath(new URL('./node_modules', import.meta.url)),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @import "@/styles/_breakpoints.scss";
          @import "@/styles/_layout.scss";
          @import "@/styles/_mixins.scss";
          @import "@/styles/_typography.scss";;
        `,
      },
    },
  },
  server: {
    host: true,
    port: 8080,
    strictPort: true,
  },
  preview: {
    port: 8888,
    strictPort: true,
  },
});