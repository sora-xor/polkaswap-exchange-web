import { existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

const virtualWindiEntry = process.env.VITEST
  ? fileURLToPath(new URL('./tests/stubs/empty.css', import.meta.url))
  : fileURLToPath(new URL('./src/lib/soramitsu-ui/theme/style.css', import.meta.url));
const soraneoWalletSrcPath = fileURLToPath(new URL('./src/lib/soraneo-wallet/src', import.meta.url));
const soraneoWalletLibPath = fileURLToPath(new URL('./src/lib/soraneo-wallet/lib', import.meta.url));
const soraneoWalletCssPath = fileURLToPath(
  new URL('./src/lib/soraneo-wallet/lib/soraneo-wallet-web.css', import.meta.url)
);
const soraneoWalletCssFallbackPath = fileURLToPath(
  new URL('./src/styles/soraneo-wallet-web-fallback.css', import.meta.url)
);
const soraneoWalletCssEntry = existsSync(soraneoWalletCssPath) ? soraneoWalletCssPath : soraneoWalletCssFallbackPath;

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: 'src/main.ts',
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@soramitsu-ui/ui': fileURLToPath(new URL('./src/lib/soramitsu-ui/lib.ts', import.meta.url)),
        '@soramitsu-ui/ui/': fileURLToPath(new URL('./src/lib/soramitsu-ui/', import.meta.url)),
        '@soramitsu-ui/ui/styles': fileURLToPath(new URL('./src/lib/soramitsu-ui/theme/style.css', import.meta.url)),
        '@soramitsu-ui/theme/index.ts': fileURLToPath(
          new URL('./src/lib/soramitsu-ui/theme/index.ts', import.meta.url)
        ),
        '@soramitsu-ui/theme': fileURLToPath(new URL('./src/lib/soramitsu-ui/theme/_index.scss', import.meta.url)),
        '@soramitsu-ui/theme/': fileURLToPath(new URL('./src/lib/soramitsu-ui/theme/', import.meta.url)),
        '@soramitsu-ui/theme/sass': fileURLToPath(
          new URL('./src/lib/soramitsu-ui/theme/sass/lib.scss', import.meta.url)
        ),
        '@soramitsu-ui/theme/fonts/Sora': fileURLToPath(
          new URL('./src/lib/soramitsu-ui/theme/fonts/Sora/index.css', import.meta.url)
        ),
        '@soramitsu-ui/icons/': fileURLToPath(new URL('./src/lib/soramitsu-ui/icons/', import.meta.url)),
        '@soramitsu-ui/icons': fileURLToPath(new URL('./src/lib/soramitsu-ui/icons', import.meta.url)),
        'virtual:windi.css': virtualWindiEntry,
        '@wallet/lib/soraneo-wallet-web.css': soraneoWalletCssEntry,
        '@wallet/lib': soraneoWalletLibPath,
        '@wallet/core': `${soraneoWalletSrcPath}/core.ts`,
        '@wallet/internal': `${soraneoWalletSrcPath}/index.ts`,
        '@wallet/vuex': `${soraneoWalletSrcPath}/vuex.ts`,
        '@wallet': `${soraneoWalletSrcPath}/index.ts`,
        '@wallet/src': soraneoWalletSrcPath,
      },
    },
    plugins: [vue()],
  },
});
