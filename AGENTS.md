# AGENTS Guidelines

This repository is a Node.js + Vue (Vite) project that compiles into a static site and is deployed via IPFS. There is no server runtime — all functionality must work from static assets produced by the build.

## Task Handling

- When a large task or request is given, break it down into smaller actionable tasks automatically and proceed with solid software engineering practices instead of rejecting the request.

## Project Basics

- Runtime: Node 26 (see `.nvmrc` and `package.json` engines).
- Package manager: Yarn 4.x (Berry, pinned via `.yarnrc.yml` `yarnPath` and `.yarn/releases`).
- `npm install` is not supported (the repo uses Yarn's `patch:` protocol for dependencies).
- Build: `yarn build` produces static assets (dist/) suitable for IPFS hosting.
- Dev: `yarn serve` for local development.

## Testing Requirements

- Every new function or feature must include at least one unit test; add more for edge cases and critical paths.
- Test runner: Vitest (projects defined in `vitest.config.mjs`).
- Unit tests live under `tests/unit/**`, mirroring the source structure where possible.
- Run tests:
  - `yarn test:unit` — unit tests
  - `yarn test:translation` — i18n consistency checks
  - `yarn test:all` — convenience alias for unit tests
- Guidelines:
  - Do not perform network calls or require external services. Mock SDKs, wallet APIs, and providers.
  - Prefer lightweight mocking for the concrete wallet modules a suite imports (for example `@/lib/soraneo-wallet/src/api`) and `@/utils/ethers-util` when testing bridge flows.
  - Follow the wallet mock pattern in `tests/README.md` (`createWalletMock` + shared stubs) so every suite sees the same baseline exports.
  - Cover redenomination math and token amount handling with precise expectations.

## Internationalization (i18n)

- If you add or change user‑visible strings:
  - Update `src/lang/en.json` (authoritative keys).
  - Run `yarn lang:fix` (and/or `yarn lang:generate`) to propagate/fix translation keys.
  - Update all locale catalogs so they mirror English keys: keep `src/lang/*.json` and `src/lang/card/*.json` in sync with `en.json`. Do not leave missing keys.
  - For special locales (e.g., Akkadian `akk`), ensure locale‑specific constraints are respected (cuneiform‑only). Run `yarn test:translation` to verify and optionally `tsx scripts/lang/enforce-cuneiform.ts --locales=akk`.
  - Ensure `yarn test:translation` passes.
- Use existing message keys where possible; keep wording consistent across the app.

## Documentation

- Document everything you add:
  - Use clear JSDoc/TSDoc comments on functions, classes, and modules.
  - If you introduce new components, modules, or flows, add brief usage notes (and update README or module‑level docs as appropriate).
  - Keep inline comments minimal and focused on non‑obvious logic.

## Security Expectations (Financial Application)

This is a financial application — treat security as a first‑class concern.

- Math & amounts:
  - Never use raw JavaScript floating‑point for token math.
  - Use `FPNumber` helpers consistently (e.g., `fromCodecValue`, `fromNatural`, `toCodecString`).
  - Handle decimals, rounding, and denomination (chain‑provided denominator) explicitly.
- Input & data handling:
  - Validate and sanitize all user inputs; avoid `eval`/dynamic code execution.
  - Guard against overflow/underflow and invalid states.
  - Do not expose secrets or sensitive data. Avoid logging PII or private keys.
- Network & bridging:
  - Validate network selection and addresses before signing or sending.
  - Respect chain‑provided configuration (e.g., denomination) and handle error cases with safe fallbacks.
- Dependencies:
  - Avoid adding new libraries without a clear need. Prefer vetted, existing dependencies.
  - Keep version ranges conservative and align with repository conventions.

## Coding Conventions

- Align with the existing codebase style and structure.
- Keep changes minimal and focused; avoid broad refactors unless requested.
- Use the `@/` alias for imports from `src`.
- Follow TypeScript best practices and avoid `any` when possible.

## Build & IPFS Considerations

- The site must work as static files served from IPFS:
  - Avoid absolute URLs for internal navigation/resources unless required.
  - Ensure assets and routes resolve under content‑addressed paths.
- Verify that dynamic features degrade gracefully without server assistance.

### Bunny/IPFS Deployment Runbook

Use this exact order when the user asks to rebuild, redeploy to IPFS, and update Bunny:

1. Run `yarn ipfs:publish` from the repo root. Capture the **Production CID**, **Production Bunny origin URL**, and **Production Bunny origin host header** from the command output. Do not use the testnet CID for `polkaswap.io`.
2. Before saving Bunny, test the candidate origin as a static gateway with the new production CIDv1. The origin is valid only if it returns the real built files with no `3xx` redirect and no IPFS service-worker shell:
   - `curl -sS -D - -o /tmp/origin-root.html <origin>/`
   - `curl -sS -D - -o /tmp/origin-index.js <origin>/assets/<index-*.js>`
   - `curl -sS -D - -o /tmp/origin-sample.js <origin>/assets/<lazy-chunk>.js`
   - JS assets must return `200` with JavaScript content, not `text/html`.
3. In the Bunny `polkaswap` pull zone, update **Origin URL** to a non-redirecting static IPFS gateway for the production CID. Prefer Filebase's IPFS path gateway when dweb is unstable: **Origin URL** `https://ipfs.filebase.io/ipfs/<cidv1>` and **Host header** `ipfs.filebase.io`. Use the CIDv1 dweb subdomain only if it passes the no-redirect static-file checks: **Origin URL** `https://<cidv1>.ipfs.dweb.link` and **Host header** `<cidv1>.ipfs.dweb.link`. Do **not** use Traffic Manager, regional redirects, or any traffic redirection workaround.
4. Never use `*.ipfs.inbrowser.link` as a Bunny origin. It is a browser-only service-worker gateway: the first document request returns the IPFS service-worker shell, and direct asset requests such as `/assets/*.js` can return HTML instead of JavaScript. It may be useful as a direct browser fallback URL only after the service worker installs and the page reloads, for example `https://<cidv1>.ipfs.inbrowser.link/#/swap`, but Bunny cannot run that service worker.
5. Confirm the Bunny origin settings stay in this state:
   - **Forward host header**: off
   - **Follow redirects**: on
   - **Verify origin SSL certificate**: off for dweb.link/Filebase IPFS gateway origins
   - **Cache error responses**: off
6. Confirm the Edge Rule named `RawDwebOriginHeaders` exists:
   - Action: `Add Request Header` on `Origin`
   - Header name: `Sec-Fetch-Dest`
   - Header value: `empty`
   - Condition: stable host URL, for example `*://polkaswap.io/*`
7. Confirm the Edge Rule named `SetPolkaswapCSP` exists when the origin is Filebase:
   - Action: `Cache Origin Set Response Header`
   - Header name: `Content-Security-Policy`
   - Header value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' https://telegram.org https://apis.google.com https://accounts.google.com https://www.google.com https://www.gstatic.com; connect-src 'self' https: wss:; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data: https:; worker-src 'self' blob:; frame-src 'self' https://buy.moonpay.com https://buy-staging.moonpay.com https://secure.walletconnect.org https://secure.walletconnect.com https://verify.walletconnect.org https://verify.walletconnect.com https://accounts.google.com https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self';`
   - Condition: stable host URL, for example `*://polkaswap.io/*`
8. Save the origin settings and wait for Bunny to show the success toast before purging.
9. Purge the Bunny pull-zone cache after every production IPFS hash update. Deployment is not complete until the purge has happened, either because the user already performed it or because the agent performs it after confirmation.
10. If purging through Bunny's UI with Computer Use, get explicit action-time confirmation immediately before clicking purge. Cache purge deletes cached CDN objects, so Computer Use requires action-time confirmation even if the user asked for a deploy earlier.
11. Immediately verify the root is serving the new CID with `curl -sS -D - -o /tmp/polkaswap-root.html https://polkaswap.io/` and check `x-ipfs-roots` for the new CIDv1 root. Also verify the entry JS and CSS from the current `index.html` return `200`.
12. Warm Bunny sequentially before running browser verification. Warm the current entry assets from `index.html`, then the lazy chunks needed by `/#/swap`, before attempting all of `dist/assets`. If a WebKit run reports `504` for a chunk, do not switch origins repeatedly; resolve that file's CID locally, warm the raw CID first, then warm the stable path:
   - `ipfs resolve /ipfs/<production-cidv0>/assets/<chunk>.js`
   - `curl -sS -D - -o /tmp/raw.js https://ipfs.filebase.io/ipfs/<file-cidv0>`
   - `curl -sS -D - -o /tmp/path.js https://ipfs.filebase.io/ipfs/<cidv1>/assets/<chunk>.js`
   - `curl -sS -D - -o /tmp/bunny.js https://polkaswap.io/assets/<chunk>.js`
13. If Filebase cannot serve a specific raw file CID but dweb can, re-announce that file CID and the root DAG before retrying Filebase: `ipfs routing provide <file-cidv0>` and `ipfs routing provide --recursive <production-cidv0>`. Do not replace the Bunny origin with a browser-service-worker gateway to work around a cold chunk.
14. Run the official WebKit verification:
   - `IPFS_CHECK_SETTLE_MS=30000 node scripts/ipfs/check-browser.js --url 'https://polkaswap.io/#/swap' --no-spawn-gateway --browser=webkit`
15. Do a final WebKit title check. Deployment is not complete until the title reaches `Swap - Polkaswap`, `x-ipfs-roots` is the new CIDv1 root, and there are `0` failed requests and `0` console errors.

The `RawDwebOriginHeaders` rule prevents dweb.link from treating Bunny's browser-style origin fetch as a document navigation and redirecting to the IPFS in-browser service-worker shell. The `SetPolkaswapCSP` rule replaces Filebase's restrictive gateway CSP, which otherwise blocks Polkaswap's API/WebSocket connections and WebAssembly. If a real browser is stuck on an old IPFS service-worker shell, open `https://polkaswap.io/?ipfs-sw-unregister=true` once, then reload. For direct CID debugging in a browser, `https://<cidv1>.ipfs.inbrowser.link/#/swap` can be used only as an end-user URL after service-worker installation; it is never a Bunny origin.

Fast failure triage for IPFS hash updates:

- If `curl -sS -D - -o /tmp/polkaswap-root.html https://polkaswap.io/` shows the expected `x-ipfs-roots` but the browser stays on the pink loader, the hash update reached Bunny and the failure is almost certainly a cold/missing lazy asset or origin gateway problem. Do not rebuild again just because the loader is visible.
- Do not trust a checker result that only proves `#app` contains the bootstrap loader. Treat this as still broken unless WebKit/Safari reaches title `Swap - Polkaswap` and body text contains real swap UI text such as `Connect account`, `Network Fee`, or `Node connected`.
- Find the stuck asset before changing anything else. In Playwright/WebKit, collect `requestfailed`, `response >= 400`, and long-pending `script` requests. In shell, test the suspicious chunk directly with `curl --max-time 30 https://polkaswap.io/assets/<chunk>.js`.
- If Bunny/Filebase hangs or times out for a required chunk, resolve the file CID with `ipfs resolve /ipfs/<production-cidv0>/assets/<chunk>.js`. If local `ipfs cat /ipfs/<file-cidv0>` works and dweb serves `https://<cidv1>.ipfs.dweb.link/assets/<chunk>.js`, switch Bunny origin to the dweb CID subdomain and matching host header. This is an origin fix, not a rebuild.
- After switching origin, do not waste time warming all of `dist` first. Warm the exact failed chunks from the WebKit output sequentially through `https://polkaswap.io/assets/<chunk>.js`, then rerun the WebKit check. Add more chunks only if the next run names them.
- Successful final evidence is: Bunny root response has `x-ipfs-roots: <production-cidv1>`, Safari or WebKit title is `Swap - Polkaswap`, the swap UI is visible, and a WebKit request/console capture reports `0` failed requests and `0` console errors.

## PR Checklist (must pass before merging)

- [ ] Unit tests added/updated for all new/changed functions and critical paths.
- [ ] `yarn test:unit` and `yarn test:translation` pass locally.
- [ ] Translations regenerated/fixed for any new strings.
- [ ] Documentation updated (comments and any relevant docs).
- [ ] Security reviewed (inputs validated, math safe, no secrets exposed).

If anything here conflicts with explicit user or system instructions, follow those higher‑priority instructions and update this document accordingly.
