# Polkaswap security deployment — 24 October 2026

Status: **deployed and publicly verified**. Production and testnet are separately pinned on the approved origin. Bunny was updated and purged; all five live WebKit routes passed with zero failed requests and zero raw console errors.

Raw logs, CARs and source archives are retained locally under `output/playwright/security-deploy-20261024/` and are not committed to the public repository. Paths below identify that local evidence. Public release identifiers, checksums and verification results are recorded here.

## Release identity

| Artifact       | Previous CIDv1                                                | New CIDv1                                                     |
| -------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| Production     | `bafybeicjwe24zlmugkwtmtue6ynybsyqfcnzfjyeipdbonsinv7gt2ig7i` | `bafybeicqvi4opmxmxoqem73mtybdh4ka2ltx3wo7nlvr5k46tqypd3bxea` |
| Paired testnet | `bafybeice6og6ia5vtmx7bj4vnqjo6kotrqlplr6sse4pomwzwnqip2mumy` | `bafybeihezo3i5u3ohglt47rrjddcdy3ecacvooys3kze6mext5cwlyxshi` |

Production CIDv0: `QmTmXsTfJZ27Xvg1upfYERXpr3RgEHKjhPDF2mVkfg1ezK`. Testnet CIDv0: `Qmdjmq4pynnUCx91dpTBtUPRys2mJhgSYkzifiSgVx7EFT`.

Bunny zone `polkaswap` / `5860217` now uses `https://pi.soramitsu.io/ipfs/bafybeicqvi4opmxmxoqem73mtybdh4ka2ltx3wo7nlvr5k46tqypd3bxea`, with Host header `pi.soramitsu.io`. The publisher used the explicit Pi gateway override. See the publisher log (`output/playwright/security-deploy-20261024/publish.log`) and CID receipt (`output/playwright/security-deploy-20261024/release-cids.json`).

## Source and feature preservation

This release contains the [dependency and security remediation](dependency-security-2026-10-24.md), including the Zod 4.6.7 consumer migration, removal of the Elliptic dependency chain, explicit browser polyfills, wallet-message bounds, and copied Lodash fixes.

The isolated candidate starts from the exact October 22 deployed source assembly, whose baseline HEAD was `0fbddf49939e2936b48daece66aaa53fb513ca5d`, then overlays the security changes. All 13,085 retained baseline files were verified before staging. The candidate records 13,113 source files: 13,051 baseline files unchanged, 32 changed, 30 added, and two obsolete Electron preload files removed. Its application version is `1.46.0-security-20261024`, built with Node 26.12.1 and Yarn 4.10.3.

The shipped Bots, Store, Buy XOR, Get TS, temporary-wallet flow, production configuration, payment package and remove-liquidity layout fix are preserved. The six unrelated unshipped bot source changes, their locale changes and new live-only module were excluded from this isolated release. The working checkout was not rolled back or overwritten. The candidate uses the already audited installed dependency graph through a `node_modules` symlink; manifest, lockfile, patches and copied sources are retained for reconstruction.

The staging receipt (`output/playwright/security-deploy-20261024/staging-receipt.json`), feature provenance (`output/playwright/security-deploy-20261024/feature-provenance-preflight.json`), source manifest (`output/playwright/security-deploy-20261024/source-evidence.json`), and source archive receipt (`output/playwright/security-deploy-20261024/source-archive.json`) record exact paths and hashes. The retained source archive is 872,071,343 bytes, SHA-256 `10b05e200cf42c0e79629015c5af8ecc3bf1ece5900f7f197f53dbc65b8c2afe`.

## Validation before promotion

| Check                                                          | Result                                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Security/build/Electron regressions                            | 105 tests passed                                                                    |
| Wallet, shipped Bots, security/shims and liquidity regressions | 442 tests passed                                                                    |
| Translation consistency                                        | 13 tests passed                                                                     |
| Application, copied vendor and standalone UCAN audits          | All three passed, zero known advisories                                             |
| Publisher production build                                     | Passed in 27.87s                                                                    |
| Combined static feature parity                                 | 837 reachable modules, 8,330 imports, all 45 route fragments and five page bindings |
| Actual production CID extraction                               | 928 files / 42,272,588 bytes, exactly matching the built production directory       |
| Source integrity                                               | All 13,113 candidate hashes unchanged                                               |

These are focused release tests; they do not represent a new full-unit-suite run. See staged validation (`output/playwright/security-deploy-20261024/staged-validation.json`), static parity (`output/playwright/security-deploy-20261024/static-feature-parity.json`), and frozen-build comparison (`output/playwright/security-deploy-20261024/frozen-production-verification.json`).

All five candidate routes passed the unmodified official WebKit checker with a 30-second settling interval, real approved mainnet RPC verification, mounted feature UI and exact requested route/title. Failed requests and raw console errors were zero on every route. Candidate bytes were served through the checker's static preview at the production hostname; CDN delivery was checked separately. The updated Playwright package first required its matching WebKit runtime to be installed; the initial tooling-only failure is retained under `candidate-webkit-missing/`.

See the candidate summary (`output/playwright/security-deploy-20261024/candidate-summary.json`) and raw console review (`output/playwright/security-deploy-20261024/candidate-raw-console-summary.json`).

## IPFS replication and origin verification

Production and testnet were exported as separate CARs and separately imported with root pinning into the approved `207.254.29.218` host's private `pi-ipfs` repository. Both recursive root listings passed, and full integrity verification reported all 13 retained pins `ok`.

| CAR        |      Bytes | SHA-256                                                            |
| ---------- | ---------: | ------------------------------------------------------------------ |
| Production | 42,388,913 | `6284a862f9ad8489d46db0877b40b0762f5fc032b4c71f0e84dd2c7668c867d4` |
| Testnet    | 42,387,076 | `988f5081141cfed950387ea955c25e61f8ac4f0d0bade12ce3944f4f09f63669` |

All 15 origin HTTPS checks returned HTTP 200 without redirects, with expected MIME types and complete bodies matching the frozen build's sizes and SHA-256 hashes. Coverage includes production root/index, configuration, Store configuration, entry JavaScript/CSS, required lazy pages, and paired testnet root/configuration. See CAR evidence (`output/playwright/security-deploy-20261024/car-evidence.json`), pin integrity (`output/playwright/security-deploy-20261024/origin-pin-integrity.log`), and origin delivery (`output/playwright/security-deploy-20261024/delivery-origin.json`).

## Bunny promotion and live verification

Authenticated Safari verified the exact zone and hostname. The new origin was saved and read back after a fresh reload. Host forwarding remains off, redirects on, origin TLS verification on, error caching off, and Smart Cache on. `RawDwebOriginHeaders` and the complete `SetPolkaswapCSP` value match the deployment runbook.

The full-zone purge used a blank optional search tag. Bunny explicitly confirmed: “Pull Zone was successfully purged.” The immediate public root returned the new production CID and byte-identical built HTML, SHA-256 `494be725c12b36d94a6b8bc13443e4d86b41c8760cf4c6c7e0638c388b5e10c2`. Its effective CSP matches the runbook and its HTML cache policy remains `no-cache`.

See Bunny evidence (`output/playwright/security-deploy-20261024/bunny-evidence.json`), immediate root headers (`output/playwright/security-deploy-20261024/immediate-live-root.headers`), and live response policy (`output/playwright/security-deploy-20261024/live-response-policy.json`).

Sequential warming checked the current entry assets first, then Swap dependencies, then the remaining observed route assets. All **409** public checks returned HTTP 200, no redirects, expected content types, and complete matching bodies. No origin switching or asset repair was needed.

All five live routes passed the official WebKit checker without preview interception, with a 30-second settling interval. Every route reported the new production CID, retained its requested mounted UI, and verified the approved mainnet RPC. Raw console and cleanup errors were independently reviewed and were zero.

| Live route   | Final title         | Failed requests | Raw console errors |
| ------------ | ------------------- | --------------: | -----------------: |
| `/#/bots`    | Bots - Polkaswap    |               0 |                  0 |
| `/#/store`   | Store - Polkaswap   |               0 |                  0 |
| `/#/buy-xor` | Buy XOR - Polkaswap |               0 |                  0 |
| `/#/get-ts`  | Get TS - Polkaswap  |               0 |                  0 |
| `/#/swap`    | Swap - Polkaswap    |               0 |                  0 |

The final independent HTTPS check at **19:03 JST** returned the new CID and the exact 4,529-byte built HTML. The last WebKit title was **Swap - Polkaswap**. See public delivery (`output/playwright/security-deploy-20261024/delivery-live.json`), live browser summary (`output/playwright/security-deploy-20261024/live-summary.json`), raw console review (`output/playwright/security-deploy-20261024/live-raw-console-summary.json`), and final verification (`output/playwright/security-deploy-20261024/final-verification.json`).
