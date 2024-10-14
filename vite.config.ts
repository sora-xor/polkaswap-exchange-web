import fs from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
// import electron from 'vite-plugin-electron/simple'
import dynamicImport from 'vite-plugin-dynamic-import';
import { createVuePlugin as vue } from 'vite-plugin-vue2';
import svgLoader from 'vite-svg-loader';

// import pkg from './package.json'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  fs.rmSync('dist-electron', { recursive: true, force: true });

  // const isServe = command === 'serve';
  // const isBuild = command === 'build';
  // const sourcemap = isServe || !!process.env.VSCODE_DEBUG;

  return {
    plugins: [
      vue(),
      dynamicImport(),
      svgLoader(),
      // electron({
      //   main: {
      //     // Shortcut of `build.lib.entry`
      //     entry: 'electron/main/index.ts',
      //     onstart({ startup }) {
      //       if (process.env.VSCODE_DEBUG) {
      //         console.log(/* For `.vscode/.debug.script.mjs` */'[startup] Electron App')
      //       } else {
      //         startup()
      //       }
      //     },
      //     vite: {
      //       build: {
      //         sourcemap,
      //         minify: isBuild,
      //         outDir: 'dist-electron/main',
      //         rollupOptions: {
      //           // Some third-party Node.js libraries may not be built correctly by Vite, especially `C/C++` addons,
      //           // we can use `external` to exclude them to ensure they work correctly.
      //           // Others need to put them in `dependencies` to ensure they are collected into `app.asar` after the app is built.
      //           // Of course, this is not absolute, just this way is relatively simple. :)
      //           external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
      //         },
      //       },
      //     },
      //   },
      //   preload: {
      //     // Shortcut of `build.rollupOptions.input`.
      //     // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
      //     input: 'electron/preload/index.ts',
      //     vite: {
      //       build: {
      //         sourcemap: sourcemap ? 'inline' : undefined, // #332
      //         minify: isBuild,
      //         outDir: 'dist-electron/preload',
      //         rollupOptions: {
      //           external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
      //         },
      //       },
      //     },
      //   },
      //   // Ployfill the Electron and Node.js API for Renderer process.
      //   // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      //   // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      //   renderer: {},
      // }),
    ],
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
  };
});
