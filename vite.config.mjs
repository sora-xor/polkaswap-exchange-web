import { existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import './scripts/suppress-baseline-warning.js';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dynamicImport from 'vite-plugin-dynamic-import';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import svgLoader from 'vite-svg-loader';

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
const walletShimPath = fileURLToPath(new URL('./src/shims/wallet.ts', import.meta.url));
const bufferShimPath = fileURLToPath(new URL('./src/shims/buffer.ts', import.meta.url));
const safeBufferShimPath = fileURLToPath(new URL('./src/shims/safe-buffer.ts', import.meta.url));
const polkadotUiSharedPath = fileURLToPath(new URL('./vendor/@polkadot/ui-shared', import.meta.url));

const VUE_COMPAT_AUTO_IMPORTS = [
  'computed',
  'getCurrentInstance',
  'h',
  'inject',
  'markRaw',
  'nextTick',
  'onBeforeUnmount',
  'onMounted',
  'onScopeDispose',
  'onUnmounted',
  'provide',
  'reactive',
  'readonly',
  'ref',
  'shallowReactive',
  'shallowRef',
  'toRef',
  'toRefs',
  'unref',
  'useAttrs',
  'useSlots',
  'watch',
  'watchEffect',
];

const VUEUSE_COMPAT_AUTO_IMPORTS = [
  'eagerComputed',
  'templateRef',
  'unrefElement',
  'useFocus',
  'useResizeObserver',
  'useToggle',
  'watchOnce',
  'whenever',
];

const collectNamedImports = (code, moduleName) => {
  const names = new Set();
  const matcher = new RegExp(
    String.raw`import\s*\{([^}]*)\}\s*from\s*['"]${moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`,
    'g'
  );

  for (const match of code.matchAll(matcher)) {
    const specifiers = match[1].split(',');
    for (const specifier of specifiers) {
      const localName = specifier.trim().split(/\s+as\s+/).at(-1)?.trim();
      if (localName) {
        names.add(localName);
      }
    }
  }

  return names;
};

const hasLocalBinding = (code, identifier) => {
  const patterns = [
    new RegExp(String.raw`\b(?:const|let|var|function|class)\s+${identifier}\b`),
    new RegExp(String.raw`\bcatch\s*\(\s*${identifier}\s*\)`),
    new RegExp(String.raw`\bfor\s*\(\s*(?:const|let|var)\s+${identifier}\b`),
  ];

  return patterns.some((pattern) => pattern.test(code));
};

const injectCompatImports = (source) => {
  const vueImports = collectNamedImports(source, 'vue');
  const vueUseImports = collectNamedImports(source, '@vueuse/core');
  const injectVue = VUE_COMPAT_AUTO_IMPORTS.filter((identifier) => {
    return (
      new RegExp(String.raw`\b${identifier}\b`).test(source) &&
      !vueImports.has(identifier) &&
      !hasLocalBinding(source, identifier)
    );
  });
  const injectVueUse = VUEUSE_COMPAT_AUTO_IMPORTS.filter((identifier) => {
    return (
      new RegExp(String.raw`\b${identifier}\b`).test(source) &&
      !vueUseImports.has(identifier) &&
      !hasLocalBinding(source, identifier)
    );
  });

  if (!injectVue.length && !injectVueUse.length) {
    return null;
  }

  const banner = [
    injectVue.length ? `import { ${injectVue.join(', ')} } from 'vue';` : '',
    injectVueUse.length ? `import { ${injectVueUse.join(', ')} } from '@vueuse/core';` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `${banner}\n${source}`;
};

const compatAutoImportPlugin = () => ({
  name: 'compat-auto-imports',
  enforce: 'pre',
  transform(code, id) {
    if (id.includes('?')) {
      return null;
    }

    const isVendoredSource = id.startsWith(soramitsuUiRootPath) || id.startsWith(soraneoWalletSrcPath);

    if (!isVendoredSource) {
      return null;
    }

    if (id.endsWith('.vue')) {
      const match = code.match(/<script\b([^>]*)>([\s\S]*?)<\/script>/);
      if (!match) return null;

      const [fullMatch, attrs, scriptContent] = match;
      const nextScriptContent = injectCompatImports(scriptContent);
      if (!nextScriptContent) return null;

      return code.replace(fullMatch, `<script${attrs}>\n${nextScriptContent}\n</script>`);
    }

    if (/\.([cm]?js|ts|tsx)$/.test(id)) {
      const nextCode = injectCompatImports(code);
      if (!nextCode) return null;

      return {
        code: nextCode,
        map: null,
      };
    }

    return null;
  },
});

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
  { find: '@wallet/lib/soraneo-wallet-web.css', replacement: soraneoWalletCssEntry },
  { find: '@wallet/lib', replacement: soraneoWalletSrcPath },
  { find: '@wallet/core', replacement: `${soraneoWalletSrcPath}/core.ts` },
  { find: '@wallet/internal', replacement: `${soraneoWalletSrcPath}/index.ts` },
  { find: '@wallet/vuex', replacement: `${soraneoWalletSrcPath}/vuex.ts` },
  { find: '@wallet/src', replacement: soraneoWalletSrcPath },
  { find: '@wallet', replacement: walletShimPath },
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

if (isTest) {
  const walletStubRoot = fileURLToPath(new URL('./tests/stubs/@wallet', import.meta.url));
  const emptyCssPath = fileURLToPath(new URL('./tests/stubs/empty.css', import.meta.url));
  const soramitsuUiStubPath = fileURLToPath(new URL('./tests/stubs/soramitsu-ui/index.ts', import.meta.url));
  alias.unshift(
    { find: /^@wallet\/lib\/soraneo-wallet-web\.css$/, replacement: emptyCssPath },
    { find: /^@wallet\/(.*)$/, replacement: `${walletStubRoot}/$1` },
    { find: '@wallet', replacement: walletStubRoot },
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
  plugins: [vue(), dynamicImport(), svgLoader(), compatAutoImportPlugin(), ...(disableNodePolyfills ? [] : [nodePolyfills()])],
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
    noExternal: isTest ? ['@soramitsu-ui/ui', '@wallet'] : undefined,
  },
  build: {
    chunkSizeWarningLimit: 6000,
    cssCodeSplit: false,
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
        // Rollup's default chunk graph avoids the circular startup imports that
        // were produced by the custom manual chunk topology.
      },
    },
  },
});
