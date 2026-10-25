# Startup performance

What the first page load downloads, and the rules that keep it small. The measurements are cold loads of `/#/swap` from a production build served over HTTP/2 with brotli, the same way Bunny serves `polkaswap.io`.

| Cold load of `/#/swap` (median of interleaved runs)              | Before (2026-10-03) |     After |
| ---------------------------------------------------------------- | ------------------: | --------: |
| Swap form visible, mobile profile (150 ms RTT, 1.6 Mbps, 4× CPU) |              11.8 s |     9.5 s |
| Swap form visible, high latency (300 ms RTT, 5 Mbps, 2× CPU)     |               6.0 s |     4.1 s |
| Swap form visible, desktop profile (40 ms RTT, 10 Mbps)          |              2.10 s |    1.66 s |
| Cumulative layout shift (CLS)                                    |             0.9–1.1 | 0.04–0.05 |
| Transfer before the shell mounts (mobile profile)                |             1.85 MB |   1.41 MB |
| SORA SDK chunk (raw)                                             |             1.89 MB |   1.37 MB |

## How the first render loads

1. `index.html` loads the entry script and the single stylesheet.
2. `src/app/bootstrap` starts the Sora and icon font downloads, then loads Pinia, the router and the locale.
3. It then loads, in parallel: runtime plugins, the app shell, the shell chrome (header, menu, footer), and the optional agent API.
4. The app mounts once those are ready. The route page and its own lazy widgets load next.

`build.modulePreload` is enabled. Each dynamic import fetches its static dependencies in parallel, so the browser does not discover them one level at a time.

## Rules

- **Keep heavy libraries off the startup path.** ECharts, ethers, the bridge store and APIs, and the zxing QR encoder must stay behind dynamic imports on pages that render at startup. `tests/unit/app/startupBundle.source.spec.ts` checks the known cases.
- **Avoid barrel imports that re-export heavy components.** `@/shared/ui/widgets` re-exports the chart widgets. Importing anything from it makes ECharts a static dependency, so import single widgets from their own files.
- **Load optional work in parallel.** Start anything that does not change the first render (for example the agent API) alongside the shell, not after it.
- **Resolve lazy wrappers that render in the first paint.** A `defineAsyncComponent` wrapper renders nothing for at least one task, even when its chunk is cached, so its content pops in and shifts the page. `preloadAsyncComponents()` in `@/shared/ui/async` resolves wrappers before mount. Use it only for components whose code is already on the startup path; otherwise it adds downloads.
- **Node built-ins.** `vite-plugin-node-polyfills` maps `crypto` to `crypto-browserify`, which is large. `scripts/build/browserCryptoFallbackPlugin.mjs` resolves `crypto` to an empty module for `crypto-js`, `tweetnacl` and `brorand`, which only use it as a Node.js fallback when Web Crypto is missing. Before adding a package to that list, check that its browser code path never needs Node crypto.

## Checking a change

1. Build into a scratch directory, not the shared `dist/`: `npx vite build --outDir <tmp>/dist`.
2. Compare the sizes of the largest files in `<tmp>/dist/assets` with the previous build, or add a `generateBundle` plugin to a scratch Vite config to see which modules each chunk contains.
3. Run the browser checks for the release routes against the build:

   ```bash
   IPFS_CHECK_SETTLE_MS=30000 node scripts/ipfs/check-browser.js --url 'https://polkaswap.io/#/swap' --preview-dist <abs path to dist> --no-spawn-gateway --browser=webkit
   ```

   Repeat for `/#/bots`, `/#/store`, `/#/buy-xor` and `/#/get-ts`.
