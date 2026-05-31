# IPFS Pre-flight & Publishing Guide

This guide documents how to prepare Polkaswap for an IPFS release, publish the build artifacts, and verify the deployment using the automated smoke scripts.

## 1. Prerequisites

- Node.js 24 (see `.nvmrc`) and Yarn 4.x.
- The `ipfs` CLI installed and available on your `$PATH`. Follow the [IPFS command-line quick start](https://docs.ipfs.tech/how-to/command-line-quick-start/).
- Local access to the vendored workspace sources committed in this repository (for example `src/lib/soramitsu-ui` and `src/lib/soraneo-wallet`).
- Production/testnet environment configs under `public/env.json` and `public/env.dev.json`.

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
yarn ipfs:publish
```

The script performs the following:

1. Verifies the `ipfs` CLI is available.
2. Builds any vendored workspace dependencies required by the publish pipeline.
3. Runs `yarn build --base ./` to generate an IPFS-friendly `dist/`.
4. Publishes `dist/` to IPFS (production config) and prints the resulting CID and gateway URLs.
5. Creates a temporary copy of `dist/`, swaps in `public/env.dev.json`, publishes the testnet variant, and prints its CID.

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
Production gateway (ipfs.io): https://ipfs.io/ipfs/QmProd/index.html
Production dweb link: https://bafy...ipfs.dweb.link/index.html
Production Bunny origin URL: https://bafy...ipfs.dweb.link
Production Bunny origin host header: bafy...ipfs.dweb.link
Production Bunny origin request header: Sec-Fetch-Dest: empty

Testnet CID: QmTest...
Testnet gateway (ipfs.io): https://ipfs.io/ipfs/QmTest/index.html
Testnet dweb link: https://bafy...ipfs.dweb.link/index.html
Testnet Bunny origin URL: https://bafy...ipfs.dweb.link
Testnet Bunny origin host header: bafy...ipfs.dweb.link
Testnet Bunny origin request header: Sec-Fetch-Dest: empty
```

Record both CIDs for the release announcement and downstream verification.

For Bunny pull zones, use the printed `Bunny origin URL` as the Origin URL and
the printed `Bunny origin host header` as the Host header. Keep **Follow
redirects** enabled, **Verify origin SSL certificate** disabled for dweb.link
origins, and **Cache error response** disabled. This avoids caching transient
gateway 404/403 responses and avoids path-gateway redirects for immutable
assets.

Also add a Bunny Edge Rule for each stable hostname that points at a dweb.link
origin:

- Description: `RawDwebOriginHeaders`
- Action: `Add Request Header` on `Origin`, with header name `Sec-Fetch-Dest`
  and value `empty`
- Condition: `Request URL` matches the stable hostname, for example
  `*://polkaswap.io/*`

Browser navigations send `Sec-Fetch-Dest: document`, which can make dweb.link
redirect the origin request to the IPFS in-browser service-worker shell. The
origin request header override keeps Bunny fetching the raw static site HTML.

When the stable hostname uses Filebase as the origin, also add a Bunny Edge Rule
that replaces Filebase's restrictive CSP:

- Description: `SetPolkaswapCSP`
- Action: `Cache Origin Set Response Header`, with header name
  `Content-Security-Policy`
- Header value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' https://telegram.org https://apis.google.com https://accounts.google.com https://www.google.com https://www.gstatic.com; connect-src 'self' https: wss:; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data: https:; worker-src 'self' blob:; frame-src 'self' https://buy.moonpay.com https://buy-staging.moonpay.com https://secure.walletconnect.org https://secure.walletconnect.com https://verify.walletconnect.org https://verify.walletconnect.com https://accounts.google.com https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self';`
- Condition: `Request URL` matches the stable hostname, for example
  `*://polkaswap.io/*`

The Google Drive wallet dynamically loads Google Identity and Google API
scripts, so the Filebase override must allow `accounts.google.com`,
`apis.google.com`, and `www.gstatic.com`.

## 4. Verifying a CID (`ipfs:check`)

After publishing, run the Playwright-based smoke script against each CID or preview URL. The script opens the site in a headless browser, waits for `#app` to render content, and reports failed requests or console errors.

```bash
node scripts/ipfs/check-browser.js --cid QmProdCID \
  --route '#/swap' \
  --browser=chromium \
  --screenshot ./ipfs-check.png
```

Common flags:

| Flag                                | Description                                                             |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `--cid <cid>`                       | CID to verify (mutually exclusive with `--url`).                        |
| `--url <https://preview>`           | Full URL (useful for Fleek/staging previews).                           |
| `--route '#/bridge'`                | Hash route to load. Defaults to `#/swap`.                               |
| `--selector '#app'`                 | DOM selector that must contain content. Defaults to `#app`.             |
| `--browser chromium,webkit,firefox` | Browser(s) to run. Defaults to all three (chromium > webkit > firefox). |
| `--screenshot path.png`             | Save a full-page screenshot.                                            |
| `--screenshot-base64`               | Output a base64 screenshot in the JSON summary.                         |
| `--ipfs-path /path/to/.ipfs`        | Explicit IPFS repo to use when auto-spawning a gateway.                 |
| `--no-spawn-gateway`                | Skip spawning a local IPFS daemon (useful when testing a remote CID).   |

Results (pass/fail plus console/network details) are printed as a JSON blob at the end of the run. Any failures exit with a non-zero status so CI can alert.

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
  IPFS_PATH=/tmp/polkaswap-ipfs-publish-repo yarn ipfs:publish
  ```
  Keep that temporary repo around if you need the local node to continue serving or pinning those CIDs.
- **Gateway failures in `ipfs:check`** – use `--url` to point to a staging gateway or pass `--ipfs-path` plus `--no-spawn-gateway` if you already have a daemon running.
- **Generic “IPFS Service Worker” screen on `polkaswap.io`** – verify the stable hostname with
  `node scripts/ipfs/check-browser.js --url https://polkaswap.io/ --no-spawn-gateway`. The stable host must serve
  `/` and `/index.html` with short-lived HTML caching, such as `Cache-Control: no-cache`; an immutable HTML response
  can keep old service-worker shells alive in browsers. Confirm the Bunny dweb origin edge rule above is enabled,
  then purge the pull-zone cache. Affected browsers can be unstuck by opening
  `https://polkaswap.io/?ipfs-sw-unregister=true` once, then reloading.
- **Screenshots not written** – set `--screenshot` or export `IPFS_CHECK_SCREENSHOT=<path>` to capture evidence when tests run in CI.

For additional details on the scripts themselves, see:

- `scripts/ipfs/publish.ts` – build/publish workflow.
- `scripts/ipfs/check-browser.js` – Playwright smoke test entrypoint.
- `scripts/ipfs/check-electron.js` – Electron smoke test entrypoint.
