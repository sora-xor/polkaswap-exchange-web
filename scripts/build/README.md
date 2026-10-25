# Browser Node compatibility

`browserNodePolyfillsPlugin.mjs` supplies only `assert`, `buffer`, `events`, `process`, and `util`, plus the `Buffer`, `process`, and `global` globals required by current dependencies. The same explicit package implementations are used by Rollup builds and Vite's development optimizer. Development application modules initialize the globals after Vue/TypeScript compilation. Native SSR and script tests retain Node's own APIs.

The optimizer rewrites free `Buffer`, `process`, and `global` references to the corresponding browser globals. Application modules import `src/shims/node-globals.mjs` first to initialize them. Do not inject that initializer into every optimized dependency: injecting it into the `buffer` package itself creates a circular initialization when Vite emits Buffer as a separate optimized entry. Regressions cover the real scanner, split optimized entries, and the development filesystem URL used after Vue compilation.

The Vite configuration restricts initial dependency discovery to `index.html`. Retained HTML research snapshots and previous build output are not application entries; scanning them can exhaust memory before the development page loads. Dependencies imported later are still discovered normally.

The blanket `vite-plugin-node-polyfills` / `node-stdlib-browser` dependency was removed because it installed `crypto-browserify` and vulnerable Elliptic even when the production bundle did not use them. Do not reintroduce blanket Node polyfills. Add a specific browser API only after checking the new caller and its dependency tree.

`dependencySecurityPlugin.mjs` checks emitted chunks for Elliptic, `crypto-browserify`, and legacy Zod 3 paths (`/v3`, `/src/v3`, or the old `/lib` entry). Zod 4 still ships a legacy compatibility entry, so a clean registry audit alone does not exclude that code. The web and Electron renderer builds share this plugin configuration.

The existing audited Node-crypto fallbacks in `crypto-js`, `tweetnacl`, and `brorand` remain unreachable when browser Web Crypto is present. Only those fallback imports receive the empty module, retaining their native failure when secure randomness is unavailable. Every other `crypto` / `node:crypto` import fails the browser build or optimizer. No signing or hashing algorithm is replaced.

`src/shims/buffer.ts` uses `buffer` 6.0.3, the same implementation embedded by the former plugin. It preserves finite buffer limits and legacy optional exports; unsupported Node-only exports remain `undefined`. Tests exercise bundled Buffer/global behavior, Node-compatible assertion/event/format APIs, a SHA-256 known-answer vector, browser randomness, missing-Web-Crypto failure, and rejection of unknown Node crypto consumers through both build paths.
