import { existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import './scripts/suppress-baseline-warning.js';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dynamicImport from 'vite-plugin-dynamic-import';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import svgLoader from 'vite-svg-loader';
import { compatAutoImportPlugin } from './scripts/build/compatAutoImportPlugin.mjs';

const isTest = !!process.env.VITEST;
const projectArgIndex = process.argv.findIndex((arg) => arg === '--project');
const vitestProject = projectArgIndex >= 0 ? process.argv[projectArgIndex + 1] : undefined;
const disableNodePolyfills = vitestProject === 'unit-scripts' || process.env.DISABLE_VITE_NODE_POLYFILLS === '1';

const stylesPath = fileURLToPath(new URL('./src/styles', import.meta.url));
const nodeModulesPath = fileURLToPath(new URL('./node_modules', import.meta.url));
const soramitsuUiLibPath = fileURLToPath(new URL('./src/lib/soramitsu-ui/lib.ts', import.meta.url));
const soramitsuUiRootPath = fileURLToPath(new URL('./src/lib/soramitsu-ui', import.meta.url));
const soramitsuUiStylesPath = fileURLToPath(new URL('./src/lib/soramitsu-ui/theme/style.css', import.meta.url));
const soramitsuThemeRootPath = fileURLToPath(new URL('./src/lib/soramitsu-ui/theme', import.meta.url));
const soramitsuUiStylesEntry = isTest
  ? fileURLToPath(new URL('./tests/stubs/empty.css', import.meta.url))
  : soramitsuUiStylesPath;
const soramitsuIconsRootPath = fileURLToPath(new URL('./src/lib/soramitsu-ui/icons', import.meta.url));
const soraSdkSrcPath = fileURLToPath(new URL('./src/lib/substrate/sdk', import.meta.url));
const soraMathSrcPath = fileURLToPath(new URL('./src/lib/substrate/math', import.meta.url));
const soraLiquidityProxySrcPath = fileURLToPath(new URL('./src/lib/substrate/liquidity-proxy', import.meta.url));
const soraApiSrcPath = fileURLToPath(new URL('./src/lib/substrate/api', import.meta.url));
const soraConnectionSrcPath = fileURLToPath(new URL('./src/lib/substrate/connection', import.meta.url));
const soraTypesSrcPath = fileURLToPath(new URL('./src/lib/substrate/types', import.meta.url));
const soraTypeDefsSrcPath = fileURLToPath(new URL('./src/lib/substrate/type-definitions', import.meta.url));
const soraneoWalletSrcPath = fileURLToPath(new URL('./src/lib/soraneo-wallet/src', import.meta.url));
const soraneoWalletCssPath = fileURLToPath(
  new URL('./src/lib/soraneo-wallet/lib/soraneo-wallet-web.css', import.meta.url)
);
const soraneoWalletCssFallbackPath = fileURLToPath(
  new URL('./src/styles/soraneo-wallet-web-fallback.css', import.meta.url)
);
const soraneoWalletCssEntry = existsSync(soraneoWalletCssPath) ? soraneoWalletCssPath : soraneoWalletCssFallbackPath;
const bufferShimPath = fileURLToPath(new URL('./src/shims/buffer.ts', import.meta.url));
const safeBufferShimPath = fileURLToPath(new URL('./src/shims/safe-buffer.ts', import.meta.url));
const polkadotUiSharedPath = fileURLToPath(new URL('./vendor/@polkadot/ui-shared', import.meta.url));
const vueRouterProdPath = fileURLToPath(
  new URL('./node_modules/vue-router/dist/vue-router.esm-browser.prod.js', import.meta.url)
);

const alias = [
  { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
  { find: '~', replacement: nodeModulesPath },
  { find: '@tests', replacement: fileURLToPath(new URL('./tests', import.meta.url)) },
  { find: '@soramitsu-ui/theme/sass', replacement: `${soramitsuThemeRootPath}/sass/lib.scss` },
  { find: '@soramitsu-ui/theme/fonts/Sora', replacement: `${soramitsuThemeRootPath}/fonts/Sora/index.css` },
  { find: /^@soramitsu-ui\/theme\/(.*)$/, replacement: `${soramitsuThemeRootPath}/$1` },
  { find: '@soramitsu-ui/theme/index.ts', replacement: `${soramitsuThemeRootPath}/index.ts` },
  { find: '@soramitsu-ui/theme', replacement: `${soramitsuThemeRootPath}/_index.scss` },
  { find: '@soramitsu-ui/ui/styles', replacement: soramitsuUiStylesEntry },
  { find: /^@soramitsu-ui\/icons\/(.*)$/, replacement: `${soramitsuIconsRootPath}/$1` },
  { find: '@soramitsu-ui/icons', replacement: soramitsuIconsRootPath },
  { find: /^@soramitsu-ui\/ui\/(.*)$/, replacement: `${soramitsuUiRootPath}/$1` },
  { find: '@soramitsu-ui/ui', replacement: soramitsuUiLibPath },
  { find: 'virtual:windi.css', replacement: soramitsuUiStylesEntry },
  { find: 'stream/web', replacement: 'web-streams-polyfill/dist/ponyfill.es2018.js' },
  { find: 'node:stream/web', replacement: 'web-streams-polyfill/dist/ponyfill.es2018.js' },
  { find: /^buffer$/, replacement: bufferShimPath },
  { find: /^node:buffer$/, replacement: bufferShimPath },
  {
    find: 'vite-plugin-node-polyfills/shims/global',
    replacement: fileURLToPath(
      new URL('./node_modules/vite-plugin-node-polyfills/shims/global/dist/index.js', import.meta.url)
    ),
  },
  {
    find: 'vite-plugin-node-polyfills/shims/buffer',
    replacement: fileURLToPath(
      new URL('./node_modules/vite-plugin-node-polyfills/shims/buffer/dist/index.js', import.meta.url)
    ),
  },
  {
    find: 'vite-plugin-node-polyfills/shims/process',
    replacement: fileURLToPath(
      new URL('./node_modules/vite-plugin-node-polyfills/shims/process/dist/index.js', import.meta.url)
    ),
  },
  { find: '@sora-substrate/sdk/build/index.js', replacement: `${soraSdkSrcPath}/index.ts` },
  { find: '@sora-substrate/sdk/build/index', replacement: `${soraSdkSrcPath}/index.ts` },
  { find: '@sora-substrate/sdk/build', replacement: soraSdkSrcPath },
  { find: '@sora-substrate/sdk', replacement: `${soraSdkSrcPath}/index.ts` },
  { find: '@sora-substrate/math/', replacement: `${soraMathSrcPath}/` },
  { find: '@sora-substrate/math', replacement: `${soraMathSrcPath}/index.ts` },
  { find: '@sora-substrate/liquidity-proxy/build', replacement: soraLiquidityProxySrcPath },
  { find: '@sora-substrate/liquidity-proxy', replacement: `${soraLiquidityProxySrcPath}/index.ts` },
  { find: '@sora-substrate/api', replacement: `${soraApiSrcPath}/index.ts` },
  { find: '@sora-substrate/api/', replacement: `${soraApiSrcPath}/` },
  { find: '@sora-substrate/connection', replacement: `${soraConnectionSrcPath}/index.ts` },
  { find: '@sora-substrate/connection/', replacement: `${soraConnectionSrcPath}/` },
  { find: '@sora-substrate/types/build', replacement: soraTypesSrcPath },
  { find: '@sora-substrate/types', replacement: `${soraTypesSrcPath}/index.ts` },
  { find: '@sora-substrate/type-definitions/build', replacement: soraTypeDefsSrcPath },
  { find: '@sora-substrate/type-definitions', replacement: `${soraTypeDefsSrcPath}/index.ts` },
  { find: '@/lib/soraneo-wallet/lib/soraneo-wallet-web.css', replacement: soraneoWalletCssEntry },
  { find: '@/lib/soraneo-wallet/src/core', replacement: `${soraneoWalletSrcPath}/core.ts` },
  { find: /^safe-buffer(?:\/index(?:\.js)?)?$/, replacement: safeBufferShimPath },
  {
    find: '@vueuse/core',
    replacement: fileURLToPath(new URL('./vendor/@vueuse/core', import.meta.url)),
  },
  {
    find: '@vueuse/math',
    replacement: fileURLToPath(new URL('./vendor/@vueuse/math', import.meta.url)),
  },
  {
    find: '@vueuse/shared',
    replacement: fileURLToPath(new URL('./vendor/@vueuse/shared', import.meta.url)),
  },
  {
    find: '@vueuse/metadata',
    replacement: fileURLToPath(new URL('./vendor/@vueuse/metadata', import.meta.url)),
  },
  {
    find: /^focus-trap$/,
    replacement: fileURLToPath(new URL('./vendor/focus-trap', import.meta.url)),
  },
  {
    find: '@popperjs/core',
    replacement: fileURLToPath(new URL('./vendor/@popperjs/core/dist/esm/index.js', import.meta.url)),
  },
  {
    find: 'lodash-es',
    replacement: fileURLToPath(new URL('./vendor/lodash-es', import.meta.url)),
  },
  {
    find: /^tabbable$/,
    replacement: fileURLToPath(new URL('./vendor/tabbable', import.meta.url)),
  },
  {
    find: '@polkadot/ui-shared',
    replacement: polkadotUiSharedPath,
  },
  {
    find: '@polkadot/vue-identicon',
    replacement: fileURLToPath(new URL('./vendor/@polkadot/vue-identicon', import.meta.url)),
  },
  {
    find: /^maska\/vue$/,
    replacement: fileURLToPath(new URL('./vendor/maska/dist/vue.mjs', import.meta.url)),
  },
  {
    find: /^maska$/,
    replacement: fileURLToPath(new URL('./vendor/maska/dist/maska.mjs', import.meta.url)),
  },
  {
    find: 'vue-virtual-scroller',
    replacement: fileURLToPath(new URL('./vendor/vue-virtual-scroller', import.meta.url)),
  },
  {
    find: 'vue-resize',
    replacement: fileURLToPath(new URL('./vendor/vue-resize/dist/vue-resize.esm.js', import.meta.url)),
  },
];

if (!isTest) {
  alias.unshift({
    find: /^vue-router$/,
    replacement: vueRouterProdPath,
  });
}

if (isTest) {
  const emptyCssPath = fileURLToPath(new URL('./tests/stubs/empty.css', import.meta.url));
  const soramitsuUiStubPath = fileURLToPath(new URL('./tests/stubs/soramitsu-ui/index.ts', import.meta.url));
  alias.unshift(
    { find: /^@\/lib\/soraneo-wallet\/lib\/soraneo-wallet-web\.css$/, replacement: emptyCssPath },
    { find: /^@soramitsu-ui\/ui(\/.*)?$/, replacement: soramitsuUiStubPath }
  );
}

if (isTest) {
  const ipfsStubPath = fileURLToPath(new URL('./tests/stubs/ipfs-unixfs-importer', import.meta.url));
  const nftStorageStubPath = fileURLToPath(new URL('./tests/stubs/nft-storage.ts', import.meta.url));
  const stubsPath = fileURLToPath(new URL('./tests/stubs', import.meta.url));
  const punycodePath = fileURLToPath(new URL('./node_modules/punycode/punycode.js', import.meta.url));

  alias.unshift(
    { find: /node-stdlib-browser\/node_modules\/punycode\/?$/, replacement: punycodePath },
    { find: /^punycode\/?$/, replacement: punycodePath },
    { find: '@stubs', replacement: stubsPath },
    { find: 'nft.storage', replacement: nftStorageStubPath },
    { find: /^ipfs-unixfs-importer/, replacement: ipfsStubPath }
  );
}

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    dynamicImport(),
    svgLoader(),
    compatAutoImportPlugin({ soramitsuUiRootPath, soraneoWalletSrcPath }),
    ...(disableNodePolyfills ? [] : [nodePolyfills()]),
  ],
  resolve: {
    alias,
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
        includePaths: [stylesPath, nodeModulesPath, soramitsuThemeRootPath],
        quietDeps: true,
        additionalData: `
          @use "@/lib/soraneo-wallet/src/styles/global-imports.scss" as *;
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
    strictPort: false,
  },
  ssr: {
    noExternal: isTest ? ['@soramitsu-ui/ui'] : undefined,
  },
  build: {
    chunkSizeWarningLimit: 6000,
    cssCodeSplit: true,
    modulePreload: false,
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        const message = warning.message ?? '';
        if (
          message.includes('/*#__PURE__*/') ||
          warning.code === 'EVAL' ||
          message.includes('dynamic import will not move module into another chunk') ||
          message.includes('"SignalArgs" is not exported by "node_modules/@interactjs/core/scope.js"')
        ) {
          return;
        }
        defaultHandler(warning);
      },
      output: {
        /**
         * Keep Rollup on its default chunking heuristics here. The lazy-loaded
         * WalletConnect and Cede entry points remove the biggest startup cost,
         * and explicit manual chunks were introducing circular startup graphs
         * that blanked the app before Vue could mount.
         */
      },
    },
  },
});
