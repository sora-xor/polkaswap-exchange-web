import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue2';
import { defineConfig } from 'vite';
import dynamicImport from 'vite-plugin-dynamic-import';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import svgLoader from 'vite-svg-loader';

const isTest = !!process.env.VITEST;

const stylesPath = fileURLToPath(new URL('./src/styles', import.meta.url));
const nodeModulesPath = fileURLToPath(new URL('./node_modules', import.meta.url));

const muteSassWarnings = {
  name: 'mute-sass-legacy-warnings',
  configResolved() {
    const originalWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk, encoding, cb) => {
      const message = typeof chunk === 'string' ? chunk : chunk.toString();
      if (message.includes('legacy-js-api')) {
        if (typeof cb === 'function') cb();
        return true;
      }
      return originalWrite(chunk, encoding, cb);
    };
  },
};

export default defineConfig({
  plugins: [muteSassWarnings, vue(), dynamicImport(), svgLoader(), nodePolyfills()],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: '~', replacement: nodeModulesPath },
      {
        find: /^vue-property-decorator$/,
        replacement: fileURLToPath(new URL('./src/compat/vue-property-decorator.ts', import.meta.url)),
      },
      { find: 'unfetch', replacement: fileURLToPath(new URL('./src/compat/unfetch.ts', import.meta.url)) },
      { find: 'stream/web', replacement: 'web-streams-polyfill/dist/ponyfill.es2018.js' },
      { find: 'node:stream/web', replacement: 'web-streams-polyfill/dist/ponyfill.es2018.js' },
      ...(isTest
        ? [
            {
              find: '@sora-substrate/sdk',
              replacement: fileURLToPath(new URL('./tests/stubs/sora-sdk.ts', import.meta.url)),
            },
            {
              find: '@sora-substrate/sdk/build/assets/consts',
              replacement: fileURLToPath(new URL('./tests/stubs/sora-consts.ts', import.meta.url)),
            },
            {
              find: '@sora-substrate/sdk/build/assets',
              replacement: fileURLToPath(new URL('./tests/stubs/sora-assets.ts', import.meta.url)),
            },
            {
              find: '@sora-substrate/sdk/build/bridgeProxy/consts',
              replacement: fileURLToPath(new URL('./tests/stubs/empty.ts', import.meta.url)),
            },
            {
              find: '@sora-substrate/sdk/build/bridgeProxy/types',
              replacement: fileURLToPath(new URL('./tests/stubs/empty.ts', import.meta.url)),
            },
            {
              find: '@sora-substrate/sdk/build/bridgeProxy/sub/consts',
              replacement: fileURLToPath(new URL('./tests/stubs/empty.ts', import.meta.url)),
            },
            {
              find: '@sora-substrate/sdk/build/bridgeProxy/sub/types',
              replacement: fileURLToPath(new URL('./tests/stubs/empty.ts', import.meta.url)),
            },
            {
              find: '@sora-substrate/sdk/build/bridgeProxy/eth/types',
              replacement: fileURLToPath(new URL('./tests/stubs/empty.ts', import.meta.url)),
            },
            {
              find: '@sora-substrate/sdk/build/bridgeProxy/evm/types',
              replacement: fileURLToPath(new URL('./tests/stubs/empty.ts', import.meta.url)),
            },
            {
              find: '@sora-substrate/sdk/build/kensetsu/consts',
              replacement: fileURLToPath(new URL('./tests/stubs/empty.ts', import.meta.url)),
            },
          ]
        : []),
    ],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
  },
  css: {
    preprocessorOptions: {
      scss: {
        includePaths: [stylesPath, nodeModulesPath],
        quietDeps: true,
        additionalData: `
          @use "@/styles/breakpoints" as *;
          @use "@/styles/layout" as *;
          @use "@/styles/mixins" as *;
          @use "@/styles/typography" as *;
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
  build: {
    chunkSizeWarningLimit: 6000,
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        const message = warning.message ?? '';
        if (
          message.includes('/*#__PURE__*/') ||
          warning.code === 'EVAL' ||
          message.includes('dynamic import will not move module into another chunk')
        ) {
          return;
        }
        defaultHandler(warning);
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('vue')) return 'vendor-vue';
          if (id.includes('@soramitsu/soraneo-wallet-web')) return 'soraneo-wallet';
          if (id.includes('@walletconnect')) return 'walletconnect';
          if (id.includes('@polkadot')) return 'polkadot';
          if (id.includes('echarts')) return 'echarts';
          if (id.includes('lodash')) return 'lodash';
        },
      },
    },
  },
});
