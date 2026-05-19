# AGENTS Guidelines

This repository is a Node.js + Vue (Vite) project that compiles into a static site and is deployed via IPFS. There is no server runtime — all functionality must work from static assets produced by the build.

## Task Handling

- When a large task or request is given, break it down into smaller actionable tasks automatically and proceed with solid software engineering practices instead of rejecting the request.

## Project Basics

- Runtime: Node 24 (see `.nvmrc` and `package.json` engines).
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
2. In the Bunny `polkaswap` pull zone, update **Origin URL** to the CIDv1 dweb subdomain printed by the publish command, for example `https://<cidv1>.ipfs.dweb.link`. Set **Host header** to the same hostname without `https://`. If a Bunny edge repeatedly returns `5xx`/`504` while pulling from dweb.link, do **not** use Traffic Manager, regional redirects, or any traffic redirection workaround. Switch only the pull-zone origin to Filebase's IPFS path gateway: **Origin URL** `https://ipfs.filebase.io/ipfs/<cidv1>` and **Host header** `ipfs.filebase.io`.
3. Confirm the Bunny origin settings stay in this state:
   - **Forward host header**: off
   - **Follow redirects**: on
   - **Verify origin SSL certificate**: off for dweb.link/Filebase IPFS gateway origins
   - **Cache error responses**: off
4. Confirm the Edge Rule named `RawDwebOriginHeaders` exists:
   - Action: `Add Request Header` on `Origin`
   - Header name: `Sec-Fetch-Dest`
   - Header value: `empty`
   - Condition: stable host URL, for example `*://polkaswap.io/*`
5. Confirm the Edge Rule named `SetPolkaswapCSP` exists when the origin is Filebase:
   - Action: `Cache Origin Set Response Header`
   - Header name: `Content-Security-Policy`
   - Header value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'; connect-src 'self' https: wss:; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; worker-src 'self' blob:; frame-src 'self' https:;`
   - Condition: stable host URL, for example `*://polkaswap.io/*`
6. Save the origin settings and wait for Bunny to show the success toast before purging.
7. Purge the Bunny pull-zone cache only after explicit user confirmation. Cache purge deletes cached CDN objects, so Computer Use requires action-time confirmation even if the user asked for a deploy earlier.
8. Immediately verify the root is serving the new CID with `curl -sS -D - -o /tmp/polkaswap-root.html https://polkaswap.io/` and check `x-ipfs-roots` for the new CIDv1 root.
9. Warm Bunny sequentially before running browser verification. dweb.link often returns `429` when a cold Bunny edge requests many chunks at once. Warm all `dist/assets` plus `/`, `/index.html`, and JSON/text root files with one request at a time and short delays. If WebKit verification still reports `429`, warm through Playwright WebKit using `page.evaluate(() => fetch(assetUrl))`; plain `curl` can warm a different Bunny edge than WebKit.
10. Run the official WebKit verification:
   - `IPFS_CHECK_SETTLE_MS=30000 node scripts/ipfs/check-browser.js --url 'https://polkaswap.io/#/swap' --no-spawn-gateway --browser=webkit`
11. Do a final WebKit title check. Deployment is not complete until the title reaches `Swap - Polkaswap`, `x-ipfs-roots` is the new CIDv1 root, and there are `0` failed requests and `0` console errors.

The `RawDwebOriginHeaders` rule prevents dweb.link from treating Bunny's browser-style origin fetch as a document navigation and redirecting to the IPFS in-browser service-worker shell. The `SetPolkaswapCSP` rule replaces Filebase's restrictive gateway CSP, which otherwise blocks Polkaswap's API/WebSocket connections and WebAssembly. If a real browser is stuck on an old IPFS service-worker shell, open `https://polkaswap.io/?ipfs-sw-unregister=true` once, then reload.

## PR Checklist (must pass before merging)

- [ ] Unit tests added/updated for all new/changed functions and critical paths.
- [ ] `yarn test:unit` and `yarn test:translation` pass locally.
- [ ] Translations regenerated/fixed for any new strings.
- [ ] Documentation updated (comments and any relevant docs).
- [ ] Security reviewed (inputs validated, math safe, no secrets exposed).

If anything here conflicts with explicit user or system instructions, follow those higher‑priority instructions and update this document accordingly.
