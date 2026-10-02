# IPFS Pre-flight & Publishing Guide

This guide documents how to prepare Polkaswap for an IPFS release, publish the build artifacts, and verify the deployment using the automated smoke scripts.

## 1. Prerequisites

- Node.js 26 (see `.nvmrc`) and Yarn 4.x.
- The `ipfs` CLI installed and available on your `$PATH`. Follow the [IPFS command-line quick start](https://docs.ipfs.tech/how-to/command-line-quick-start/).
- Local access to the vendored workspace sources committed in this repository (for example `src/lib/soramitsu-ui` and `src/lib/soraneo-wallet`).
- Canonical production config in root `env.json`, mirrored by `public/env.json`, and testnet config under `public/env.dev.json`.

## 2. Pre-flight Checklist

1. Install dependencies:
   ```bash
   yarn install
   ```
2. Run the nightly parity script (translation + native Vue 3 build). This matches what the CI pipeline uses:
   ```bash
   yarn ci:nightly
   ```
   The command runs `yarn test:translation` followed by `yarn build:vue3`. Fix any failures before continuing.
3. Ensure the regular Vite build succeeds with an IPFS-safe base path:
   ```bash
   yarn build --base ./
   ```
   The build stamps runtime requests for mutable public files (`env*.json`,
   `marketing.json`, `whitelist.json`, and `blacklist.json`) with
   `?v=<build-version>`. Vite-emitted JS/CSS/image assets under `dist/assets/`
   keep their content-hashed filenames.
4. (Optional) Start a local IPFS daemon if you plan to host the bundle yourself:
   ```bash
   ipfs daemon
   ```

## 3. Publishing to IPFS

Use the bundled publish script to build required workspaces, swap configs, and upload both production and testnet bundles in one run:

```bash
IPFS_PUBLIC_GATEWAY_URL=https://pi.soramitsu.io yarn ipfs:publish
```

The script performs the following:

1. Verifies the `ipfs` CLI is available.
2. Builds any vendored workspace dependencies required by the publish pipeline.
3. Runs `yarn build --base ./` to generate an IPFS-friendly `dist/`.
4. Copies canonical root `env.json` into the built `dist/env.json`, checks combined static feature parity, then publishes production `dist/` and prints its CID and gateway URLs.
5. Creates a temporary copy of finalized production `dist/`, replaces its `env.json` with the built `env.dev.json`, checks the same combined feature baseline, publishes the testnet variant, and prints its CID.

The approved static origin is `https://pi.soramitsu.io` on `208.83.1.62`, with
Host header `pi.soramitsu.io`. The publisher still defaults to `https://mof.sora.org`,
so every release must supply the explicit Pi override shown above. This static
origin is separate from the existing MOF RPC/indexer application endpoints.
Before changing Bunny's origin, replicate and pin both published roots on Pi
using the [dedicated origin runbook](ipfs-origin.md). Publishing locally alone
does not make a release available from the approved origin. Do not use another
host, public gateway, or browser service-worker gateway as an origin or fallback.

Do not use `ipfs.io`, `dweb.link`, or their subdomains as an origin or fallback.
Shipyard announced the wind-down of those public gateways in
[The end of IPFS at Shipyard](https://ipshipyard.com/blog/2026-the-end-of-ipfs-at-shipyard/).
A gateway retirement does not change the CID or require a rebuild: the pinned
content can be served by the dedicated origin.

For stable gateway hostnames or container deployments, keep `index.html`
uncached or revalidated while allowing hashed `dist/assets/*` files to be
cached immutably. The Docker image in this repo ships `nginx.conf` with those
headers:

| Path                                        | Cache policy                                         |
| ------------------------------------------- | ---------------------------------------------------- |
| `/`, `/index.html`, SPA fallbacks           | `Cache-Control: no-store`                            |
| `/env*.json`, `/marketing.json`, lists JSON | `Cache-Control: no-cache, must-revalidate`           |
| `/assets/*`                                 | `Cache-Control: public, max-age=31536000, immutable` |
| Other root public assets                    | `Cache-Control: no-cache, must-revalidate`           |

The output looks similar to:

```
Production CID: QmProd...
Production CIDv1: bafy...
Production public gateway: https://pi.soramitsu.io/ipfs/bafy.../index.html
Production Bunny origin URL: https://pi.soramitsu.io/ipfs/bafy...
Production Bunny origin host header: pi.soramitsu.io
Production Bunny origin request header: Sec-Fetch-Dest: empty

Testnet CID: QmTest...
Testnet CIDv1: bafy...
Testnet public gateway: https://pi.soramitsu.io/ipfs/bafy.../index.html
Testnet Bunny origin URL: https://pi.soramitsu.io/ipfs/bafy...
Testnet Bunny origin host header: pi.soramitsu.io
Testnet Bunny origin request header: Sec-Fetch-Dest: empty
```

Record both CIDs for the release announcement and downstream verification.

For Bunny pull zones, use the printed `Bunny origin URL` as the Origin URL and
the printed `Bunny origin host header` as the Host header. For the dedicated
origin these are `https://pi.soramitsu.io/ipfs/<production-cidv1>` and
`pi.soramitsu.io`. Keep **Forward host header** disabled, **Follow redirects**
enabled, **Verify origin SSL certificate** enabled, and **Cache error response**
disabled. The dedicated host has valid TLS. Before saving, require the root,
entry JS, and a lazy chunk to return `200` without redirects or a service-worker
shell; JS must have a JavaScript content type. Do not use Traffic Manager or
regional redirects to work around a failing origin.

Retain the existing Bunny Edge Rule for each stable hostname:

- Description: `RawDwebOriginHeaders`
- Action: `Add Request Header` on `Origin`, with header name `Sec-Fetch-Dest`
  and value `empty`
- Condition: `Request URL` matches the stable hostname, for example
  `*://polkaswap.io/*`

The rule name is historical; its `Sec-Fetch-Dest: empty` request header preserves
static origin fetch behavior. It does not make retired gateways suitable origins.
Never use `inbrowser.link` or its subdomains as a Bunny origin: they need a
browser service worker, and direct JS requests can return HTML. A browser-only
gateway can be used for direct end-user debugging after service-worker
installation, but Bunny cannot execute that worker.

Keep the following Bunny Edge Rule for the approved Pi origin:

- Description: `SetPolkaswapCSP`
- Action: `Cache Origin Set Response Header`, with header name
  `Content-Security-Policy`
- Header value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' chrome-extension: moz-extension: https://telegram.org https://apis.google.com https://accounts.google.com https://www.google.com https://www.gstatic.com; connect-src 'self' https: wss: http://127.0.0.1:39847; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data: https:; worker-src 'self' blob:; frame-src 'self' https://buy.moonpay.com https://buy-staging.moonpay.com https://secure.walletconnect.org https://secure.walletconnect.com https://verify.walletconnect.org https://verify.walletconnect.com https://accounts.google.com https://content.googleapis.com https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self';`
- Condition: `Request URL` matches the stable hostname, for example
  `*://polkaswap.io/*`

The dedicated gateway deliberately serves a restrictive sandboxed CSP that allows image styling but blocks scripts. Its direct URL is a raw content origin; the interactive application
runs on the stable Bunny hostname with this response-header replacement. The
Google Drive wallet dynamically loads Google Identity and Google API
scripts, so the override must allow `accounts.google.com`,
`apis.google.com`, and `www.gstatic.com`.
Substrate wallet extensions inject their page bridge through browser extension
URLs, so `script-src` must also allow `chrome-extension:` and
`moz-extension:`.

### Purge after the production origin is saved

The user's standing deployment preference is **always purge**: after validating
the production CID's static root and JS assets, saving the matching Bunny origin
and host header, and confirming the save succeeded, run:

```bash
yarn ipfs:purge:bunny
```

Supply an existing Bunny account API credential as `BUNNY_API_KEY` through your
secret manager or protected process environment. Do not paste keys into commands,
logs, source files, or browser scripts. The Node 26 command has no confirmation
prompt and cannot target another zone: it first verifies ID `5860217`, name
`polkaswap`, and hostname `polkaswap.io` with Bunny's
[Get Pull Zone API](https://bunny.net/docs/api-reference/core/pull-zone/get-pull-zone),
then calls the [Purge Cache API](https://docs.bunny.net/api-reference/core/pull-zone/purge-cache).
It accepts only the documented `204` purge response, rejects redirects, uses a
15-second deadline per request, and never logs credentials or response bodies.
No key is created and no browser credential is extracted by this command.

This invalidates cached CDN objects, not the IPFS content. It is intentionally
separate from `ipfs:publish`: purging before the new origin is saved can refill
the cache with the old release. Do not skip the purge or repeatedly request
permission for this authorized deployment step. The user's authorization was
renewed on 2026-09-06 and also covers the authenticated Bunny UI. Do not add a
repository-level confirmation gate. If an unavoidable tool-level restriction
blocks the action, identify the exact restriction separately.

After an accepted purge, verify `https://polkaswap.io/` reports the new CIDv1 in
`x-ipfs-roots`, warm the entry assets and required lazy chunks sequentially, then
run all four mandatory route checks below with `IPFS_CHECK_SETTLE_MS=30000`.
Require the requested route, its real title/UI, and zero failed requests or
console errors. A timeout
or failed POST response is an uncertain purge: inspect live CDN state before
retrying, since the command never automatically repeats the request.

## 4. Verifying a CID (`ipfs:check`)

After publishing, run the Playwright-based smoke script against each CID or preview URL. The script opens the site in a headless browser, waits for the requested hash path and mounted feature, and reports failed requests or console errors. Swap, Bots, Store, and Buy XOR additionally require their route titles and feature controls; nonempty bootstrap HTML does not pass. The settled JSON `hydration.routePath` is read from the browser, so a missing `/#/bots` route falling back to `/#/swap` fails even if stale titles or DOM still match. Hash query parameters may change, but the requested route path (including a Bots section) must remain unchanged.

```bash
node scripts/ipfs/check-browser.js --cid QmProdCID \
  --route '#/swap' \
  --browser=chromium \
  --screenshot ./ipfs-check.png
```

Common flags:

| Flag                                | Description                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `--cid <cid>`                       | CID to verify (mutually exclusive with `--url`).                                                   |
| `--url <https://preview>`           | Full URL (useful for Fleek/staging previews).                                                      |
| `--route '#/bridge'`                | Hash route to load. Defaults to `#/swap`.                                                          |
| `--selector '#app'`                 | DOM selector that must contain content. Defaults to `#app`.                                        |
| `--browser chromium,webkit,firefox` | Browser(s) to run. Defaults to all three (chromium > webkit > firefox).                            |
| `--screenshot path.png`             | Save a full-page screenshot.                                                                       |
| `--screenshot-base64`               | Output a base64 screenshot in the JSON summary.                                                    |
| `--ipfs-path /path/to/.ipfs`        | Explicit IPFS repo to use when auto-spawning a gateway.                                            |
| `--no-spawn-gateway`                | Skip spawning a local IPFS daemon (useful when testing a remote CID).                              |
| `--preview-dist /absolute/dist`     | Serve local candidate static files under the explicit `--url` origin; external requests stay live. |

Results (pass/fail plus console/network details) are printed as a JSON blob at the end of the run. Any failures exit with a non-zero status so CI can alert.

### Mandatory combined release verification

Every production origin update must preserve **Swap, Bots, Store, Buy XOR, and Get TS together**,
including releases made from an isolated feature worktree. A passing Swap check
or the changed feature's tests alone cannot validate a replacement application.
Before building, compare the current production release record with the candidate
source and integrate any already-deployed features that its branch lacks. Do not
restore an older CID solely to recover one route if it removes another live feature.

`yarn ipfs:publish` now checks the built files before either production or testnet
IPFS publication. `scripts/ipfs/feature-parity.ts` parses the JavaScript modules
reachable from `index.html`, requires the 45 route fragments preserved by the
2026-09-28 combined release, and verifies that Swap, Bots, Store, Buy XOR, and
Get TS each reference their own reachable page chunk. Missing relative imports
also fail the check. It reads files without executing app code or making network
requests. Restore missing features rather than deleting their baseline entries;
intentional route removals require reviewing the baseline explicitly.

This static guard catches accidental omissions; it does not replace the browser
checks or verify purchases and trades. Run all five checks below and bind their
results to the same production CID before changing the origin.

Before switching Bunny, run these five WebKit checks against the **same frozen
production CID** through the local IPFS gateway. Retain each result with that CID:

```bash
set -e
: "${POLKASWAP_RELEASE_CID:?Set this to the frozen production CIDv1}"
for route in swap bots store buy-xor get-ts; do
  IPFS_CHECK_SETTLE_MS=30000 node scripts/ipfs/check-browser.js \
    --cid "$POLKASWAP_RELEASE_CID" --route "#/$route" --browser=webkit --no-spawn-gateway
done
```

This browser gate uses the local gateway because the dedicated Pi origin serves
a restrictive sandboxed CSP. If a route requires stable-host CORS, as Store does,
use the production-origin preview below with a frozen snapshot of the same CID.
The existing origin byte, pin, and asset checks are
still required before saving Bunny. After saving, purging, and sequentially warming
the corresponding route assets, repeat the complete gate on the stable hostname:

```bash
set -e
for route in swap bots store buy-xor get-ts; do
  IPFS_CHECK_SETTLE_MS=30000 node scripts/ipfs/check-browser.js \
    --url "https://polkaswap.io/#/$route" --browser=webkit --no-spawn-gateway
done
```

All five runs must exit zero with unchanged requested paths, real mounted UI,
titles `Swap - Polkaswap`, `Bots - Polkaswap`, `Store - Polkaswap`,
`Buy XOR - Polkaswap`, and `Get TS - Polkaswap`, and zero
failed requests and console errors. Verify each run's `mainResponse.headers`
contains the intended production root in `x-ipfs-roots`; do not combine passing
results from different CIDs. Retain the five reports in the release receipt.
These checks are read-only: no wallet unlock, order creation, signature, or trade
is needed. Any missing route blocks promotion or completion of the release.

### Candidate preview with production-origin CORS

The Store relay intentionally accepts the Polkaswap origin and rejects localhost.
For candidate checks that need this origin, use the frozen production build with
`--preview-dist` and an explicit stable-host `--url`:

```bash
set -e
: "${POLKASWAP_PREVIEW_DIST:?Set this to the absolute frozen production dist directory}"
for route in swap bots store buy-xor get-ts; do
  IPFS_CHECK_SETTLE_MS=30000 node scripts/ipfs/check-browser.js \
    --url "https://polkaswap.io/#/$route" --preview-dist "$POLKASWAP_PREVIEW_DIST" --browser=webkit
done
```

This is a **static candidate preview, not a live deployment check**. The JSON report
records `mode: "static-preview"`, `previewDist`, and `previewOrigin`. Browser GETs
to exactly that origin read only the chosen directory; `/` maps to `index.html`.
Traversal, escaping symlinks, and missing assets fail without falling back to the
live site. External requests, including the real Store catalog, retain their live
responses and CORS checks; non-GET requests are not replaced. The mode neither
creates orders nor changes application behavior, and service workers are blocked
to prevent them from bypassing candidate interception. It does not synthesize
production CSP or CID response headers.

Verify the frozen directory's bytes against the published production CID separately.
After saving and purging Bunny, run the complete stable-host gate **without**
`--preview-dist` and require the actual production CID and headers. A static preview
must never be reported as evidence that Bunny serves the candidate release.

### Electron-based check

For an additional layer that mimics the Electron shell, run:

```bash
yarn ipfs:check:electron --cid QmProdCID --route '#/swap'
```

It shares the same CLI flags as the browser script and captures console/network errors emitted by Electron’s `webContents`.

## 5. Troubleshooting

- **Missing `dist/` directory** – run `yarn build --base ./` before `yarn ipfs:publish`.
- **Permission errors while building workspaces** – build the dependency manually (`yarn && yarn build` inside the workspace) so the generated files exist, then re-run `yarn ipfs:publish`.
- **IPFS CLI not found** – install the CLI and ensure `ipfs --version` works in your shell.
- **`no space left on device` while publishing** – `yarn ipfs:publish` now runs `ipfs repo gc` once and retries automatically. If the retry still fails, free host disk space or prune old IPFS data manually, then rerun the publish. `du -sh ~/.ipfs` and `df -h ~/.ipfs` are the quickest checks. As a fallback, you can publish from a fresh temporary repo instead of `~/.ipfs`:
  ```bash
  IPFS_PATH=/tmp/polkaswap-ipfs-publish-repo ipfs init
  IPFS_PATH=/tmp/polkaswap-ipfs-publish-repo IPFS_PUBLIC_GATEWAY_URL=https://pi.soramitsu.io yarn ipfs:publish
  ```
  Keep that temporary repo around if you need the local node to continue serving or pinning those CIDs.
- **Gateway failures in `ipfs:check`** – use `--url` to point to a staging gateway or pass `--ipfs-path` plus `--no-spawn-gateway` if you already have a daemon running.
- **Cold or missing asset after an origin update** – if `x-ipfs-roots` is correct,
  identify the exact failed chunk before rebuilding. Resolve its file CID with
  `ipfs resolve /ipfs/<production-cid>/assets/<chunk>.js`, verify local `ipfs cat`,
  and confirm the production root is recursively pinned on the dedicated host.
  Repair a missing pin with the CAR transfer in [the origin runbook](ipfs-origin.md),
  then warm that asset through the Pi origin followed by `polkaswap.io`.
  Routing announcements cannot supply missing blocks to this offline origin;
  repeat the complete CAR import and pin integrity checks before retrying.
  Preserve the approved Pi origin and resolve its content or delivery failure;
  do not switch to another host or gateway as a fallback.
- **Generic “IPFS Service Worker” screen on `polkaswap.io`** – verify the stable hostname with
  `node scripts/ipfs/check-browser.js --url https://polkaswap.io/ --no-spawn-gateway`. The stable host must serve
  `/` and `/index.html` with short-lived HTML caching, such as `Cache-Control: no-cache`; an immutable HTML response
  can keep old service-worker shells alive in browsers. Confirm Bunny uses the
  validated static origin and the request/CSP edge rules above, then purge the
  pull-zone cache. Affected browsers can be unstuck by opening
  `https://polkaswap.io/?ipfs-sw-unregister=true` once, then reloading.
- **Screenshots not written** – set `--screenshot` or export `IPFS_CHECK_SCREENSHOT=<path>` to capture evidence when tests run in CI.

For additional details on the scripts themselves, see:

- `scripts/ipfs/publish.ts` – build/publish workflow.
- `scripts/ipfs/purge-bunny.mjs` – prompt-free production-only Bunny purge, after origin save.
- `scripts/ipfs/check-browser.js` – Playwright smoke test entrypoint.
- `scripts/ipfs/check-electron.js` – Electron smoke test entrypoint.
- [Dedicated IPFS origin runbook](ipfs-origin.md) – persistent hosting, replication, and recovery.
