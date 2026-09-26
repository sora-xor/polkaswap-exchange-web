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

Use the dedicated static origin at `https://mof.sora.org`. Never use `ipfs.io`, `dweb.link`, or their subdomains as an origin or fallback: [Shipyard is winding down those public gateways](https://ipshipyard.com/blog/2026-the-end-of-ipfs-at-shipyard/). The content remains available through pinned IPFS data. See `docs/ipfs-origin.md` for the dedicated service and replication commands.

Use this exact order when the user asks to rebuild, redeploy to IPFS, and update Bunny:

1. Run `yarn ipfs:publish` from the repo root. Capture the **Production CID**, **Production CIDv1**, **Production Bunny origin URL**, and **Production Bunny origin host header** from the command output. Do not use the testnet CID for `polkaswap.io`. Before testing or switching the public origin, transfer both production and testnet DAGs to the dedicated MOF origin with `ipfs dag export` and remote `ipfs dag import --pin-roots`, and verify both roots are recursively pinned using `docs/ipfs-origin.md`. `IPFS_PUBLIC_GATEWAY_URL` overrides the publisher's gateway base only for an explicitly approved, maintained static origin.
2. Before saving Bunny, test the candidate origin as a static gateway with the new production CIDv1. The origin is valid only if it returns the real built files with no `3xx` redirect and no IPFS service-worker shell:
   - `curl -sS -D - -o /tmp/origin-root.html <origin>/`
   - `curl -sS -D - -o /tmp/origin-index.js <origin>/assets/<index-*.js>`
   - `curl -sS -D - -o /tmp/origin-sample.js <origin>/assets/<lazy-chunk>.js`
   - JS assets must return `200` with JavaScript content, not `text/html`.
3. In the Bunny `polkaswap` pull zone, set **Origin URL** to `https://mof.sora.org/ipfs/<production-cidv1>` and **Host header** to `mof.sora.org`. Filebase's path gateway `https://ipfs.filebase.io/ipfs/<production-cidv1>` with host header `ipfs.filebase.io` is an opt-in emergency alternative only after the same static-file checks pass; public-gateway limits make it unsuitable as the default durable origin. Any alternative must be explicitly approved, maintained, and non-redirecting. Do **not** use Traffic Manager, regional redirects, or any traffic redirection workaround.
4. Never use `*.ipfs.inbrowser.link` as a Bunny origin. It is a browser-only service-worker gateway: the first document request returns the IPFS service-worker shell, and direct asset requests such as `/assets/*.js` can return HTML instead of JavaScript. It may be useful as a direct browser fallback URL only after the service worker installs and the page reloads, for example `https://<cidv1>.ipfs.inbrowser.link/#/swap`, but Bunny cannot run that service worker.
5. Confirm the Bunny origin settings stay in this state:
   - **Forward host header**: off
   - **Follow redirects**: on
   - **Verify origin SSL certificate**: on for the dedicated `mof.sora.org` origin, which has valid TLS
   - **Cache error responses**: off
6. Confirm the Edge Rule named `RawDwebOriginHeaders` exists:
   - Action: `Add Request Header` on `Origin`
   - Header name: `Sec-Fetch-Dest`
   - Header value: `empty`
   - Condition: stable host URL, for example `*://polkaswap.io/*`
7. Confirm the Edge Rule named `SetPolkaswapCSP` exists for every origin, including the dedicated MOF gateway and any emergency Filebase origin:
   - Action: `Cache Origin Set Response Header`
   - Header name: `Content-Security-Policy`
   - Header value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' chrome-extension: moz-extension: https://telegram.org https://apis.google.com https://accounts.google.com https://www.google.com https://www.gstatic.com; connect-src 'self' https: wss: http://127.0.0.1:39847; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data: https:; worker-src 'self' blob:; frame-src 'self' https://buy.moonpay.com https://buy-staging.moonpay.com https://secure.walletconnect.org https://secure.walletconnect.com https://verify.walletconnect.org https://verify.walletconnect.com https://accounts.google.com https://content.googleapis.com https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self';`
   - Condition: stable host URL, for example `*://polkaswap.io/*`
8. Save the origin settings and wait for Bunny to show the success toast before purging.
9. **Standing user authorization: always purge** the `polkaswap` Bunny pull-zone cache after every validated and saved production IPFS origin update; do not repeatedly ask for permission when using an authorized API/CLI. Prefer `yarn ipfs:purge:bunny` with an existing `BUNNY_API_KEY` supplied securely through the environment. The command verifies zone ID `5860217`, name `polkaswap`, and hostname `polkaswap.io` before purging. Never put the key in CLI arguments or logs, extract browser credentials, or create a key without authorization. Do not add purging to `ipfs:publish`, which runs before the origin update. Deployment is not complete until the purge has happened and live verification passes.
10. **Standing user instruction renewed on 2026-09-14: always purge; never ask for purge confirmation again.** Every Polkaswap production deployment includes purging the `polkaswap` Bunny pull-zone cache after the validated origin is saved. An explicit request to purge also authorizes immediate purging of that zone. This authorization covers both the existing API/CLI and the authenticated Bunny UI, including its purge confirmation dialog. Proceed without another user permission question. If access is unavailable, continue all independent deployment work and identify the concrete access issue; do not describe it as missing purge authorization. Do not add a repository-level approval gate. Prefer the authorized API/CLI when available; any unavoidable tool-level restriction must be identified precisely instead of being presented as a project requirement.
11. Immediately verify the root is serving the new CID with `curl -sS -D - -o /tmp/polkaswap-root.html https://polkaswap.io/` and check `x-ipfs-roots` for the new CIDv1 root. Also verify the entry JS and CSS from the current `index.html` return `200`.
12. Warm Bunny sequentially before running browser verification. Warm the current entry assets from `index.html`, then the lazy chunks needed by `/#/swap`, before attempting all of `dist/assets`. If a WebKit run reports `504` for a chunk, do not switch origins repeatedly; resolve that file's CID locally, warm the raw CID first, then warm the stable path:
   - `ipfs resolve /ipfs/<production-cidv0>/assets/<chunk>.js`
   - `curl -sS -D - -o /tmp/raw.js https://mof.sora.org/ipfs/<file-cidv0>`
   - `curl -sS -D - -o /tmp/path.js https://mof.sora.org/ipfs/<cidv1>/assets/<chunk>.js`
   - `curl -sS -D - -o /tmp/bunny.js https://polkaswap.io/assets/<chunk>.js`
13. If the dedicated origin cannot serve a raw file CID that local `ipfs cat` can read, verify its root pin and repeat the CAR import from `docs/ipfs-origin.md` before retrying. For an approved emergency gateway that retrieves content from the network, re-announce the file CID and root DAG before retrying: `ipfs routing provide <file-cidv0>` and `ipfs routing provide --recursive <production-cidv0>`. If an origin change is necessary, validate a maintained static gateway and repeat the save, purge, and live checks. Do not replace the Bunny origin with a retired or browser-service-worker gateway to work around a cold chunk.
14. Run the official WebKit verification:
   - `IPFS_CHECK_SETTLE_MS=30000 node scripts/ipfs/check-browser.js --url 'https://polkaswap.io/#/swap' --no-spawn-gateway --browser=webkit`
15. Do a final WebKit title check. Deployment is not complete until the title reaches `Swap - Polkaswap`, `x-ipfs-roots` is the new CIDv1 root, and there are `0` failed requests and `0` console errors.

The `RawDwebOriginHeaders` rule retains its historical name and ensures Bunny sends `Sec-Fetch-Dest: empty` for static origin fetches; its name is not a recommendation to use a retired gateway. The dedicated gateway serves raw files with a restrictive sandboxed CSP that allows image styling but blocks scripts. `SetPolkaswapCSP` replaces that header on the stable Bunny hostname so Polkaswap can load scripts, API/WebSocket connections, and WebAssembly; keep this rule with every origin. If a real browser is stuck on an old IPFS service-worker shell, open `https://polkaswap.io/?ipfs-sw-unregister=true` once, then reload. For direct CID debugging in a browser, `https://<cidv1>.ipfs.inbrowser.link/#/swap` can be used only as an end-user URL after service-worker installation; it is never a Bunny origin.

The single `http://127.0.0.1:39847` connect source is for the optional user-run Codex companion only. Keep it limited to that loopback address and port; the companion must enforce the exact Polkaswap origin, local pairing, and a session token. It has no wallet, signing, or transaction endpoint.

Fast failure triage for IPFS hash updates:

- If `curl -sS -D - -o /tmp/polkaswap-root.html https://polkaswap.io/` shows the expected `x-ipfs-roots` but the browser stays on the pink loader, the hash update reached Bunny and the failure is almost certainly a cold/missing lazy asset or origin gateway problem. Do not rebuild again just because the loader is visible.
- Do not trust a checker result that only proves `#app` contains the bootstrap loader. Treat this as still broken unless WebKit/Safari reaches title `Swap - Polkaswap` and body text contains real swap UI text such as `Connect account`, `Network Fee`, or `Node connected`.
- Find the stuck asset before changing anything else. In Playwright/WebKit, collect `requestfailed`, `response >= 400`, and long-pending `script` requests. In shell, test the suspicious chunk directly with `curl --max-time 30 https://polkaswap.io/assets/<chunk>.js`.
- If Bunny or the origin hangs or times out for a required chunk, resolve the file CID with `ipfs resolve /ipfs/<production-cidv0>/assets/<chunk>.js`. If local `ipfs cat /ipfs/<file-cidv0>` works, confirm the dedicated origin's recursive root pin, repair missing content with a CAR import, and test the origin asset directly. Re-announce the file and root if a maintained remote gateway needs to retrieve them. Only switch to an explicitly approved static origin after its root and JS pass the same checks, then save and purge. Never switch to a retired gateway. This is an origin/content-availability fix, not a rebuild.
- After switching origin, do not waste time warming all of `dist` first. Warm the exact failed chunks from the WebKit output sequentially through `https://polkaswap.io/assets/<chunk>.js`, then rerun the WebKit check. Add more chunks only if the next run names them.
- Successful final evidence is: Bunny root response has `x-ipfs-roots: <production-cidv1>`, Safari or WebKit title is `Swap - Polkaswap`, the swap UI is visible, and a WebKit request/console capture reports `0` failed requests and `0` console errors.

## PR Checklist (must pass before merging)

- [ ] Unit tests added/updated for all new/changed functions and critical paths.
- [ ] `yarn test:unit` and `yarn test:translation` pass locally.
- [ ] Translations regenerated/fixed for any new strings.
- [ ] Documentation updated (comments and any relevant docs).
- [ ] Security reviewed (inputs validated, math safe, no secrets exposed).

If anything here conflicts with explicit user or system instructions, follow those higher‑priority instructions and update this document accordingly.
