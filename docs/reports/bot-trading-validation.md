# Bot trading validation — 14 September 2026

Implemented the static `/#/bots` workspace and its feature-owned strategy, provider, allocation, and execution modules. Existing uncommitted work was preserved. The final frontend production and testnet releases are published, replicated, and validated at the dedicated IPFS origin. The production Bunny origin is saved and its full cache purged. Official and supplemental live WebKit checks passed: Swap and Bots have the final release CID and correct titles, with zero failed requests or console errors. All 265 initial assets match the published build. No real-wallet trade or paid model request was performed. See [deployment state](bot-trading-deployment.json) for exact release IDs and verification evidence.

| Check | Result |
| --- | --- |
| `yarn test:unit` | Passed: 4,696 application tests and 270 script tests, across 845 files. |
| Focused bot regressions | Passed: 138 tests across 11 files before deployment; the final history/controller run passed 45 tests including three added pagination regressions. All are included in the final full-suite pass. |
| `yarn test:translation` | Passed: 13 tests; all 31 catalogs contain the same 178 bot keys and navigation labels. |
| `yarn build --logLevel error` | Passed; final static bundle in `dist/`. |
| Feature ESLint | Passed with no errors or warnings. |
| Chromium and WebKit browser matrix | Passed: six cases covering root/IPFS routes, desktop/portrait mobile, consent, reload, multiple tabs, and real IndexedDB operations. |
| Final source whitespace check | Passed for feature, integration, tests, and documentation changes. |

The browser run used `tests/e2e/ui/bots.spec.ts` and `tests/e2e/ui/bot-storage-browser.spec.ts` against the final production bundle, served at `/ipfs/polkaswap-bots-e2e`. Both engines reached **Bots - Polkaswap** and the UI cases reported zero console errors and zero failed requests. Mobile settings and the consent dialog were exercised at 390 × 844. Desktop and mobile screenshots were inspected in `output/playwright/bots/`.

The real storage tests used separate same-origin pages and the actual storage adapter. They verified competing allocations, atomic reservations, persisted signed hashes, pending-order restrictions, exact finalized holdings/fees, idempotent settlement, and reload recovery. The browser lock test validates native Web Locks contention; private executor and wallet behavior are tested with mocks.

Focused regression coverage includes same-wallet private key cloning for SORA and Google Drive, external confirmation and rejection, malformed/unrelated calls, quote and consent expiry, storage failures, duplicate/uncertain submissions, Stop during pending work, hidden/suspended authorization, network changes, reusable capital, denomination evidence, next-candle historical fills, and 36-decimal amounts/prices. A narrow correction in the existing agent quote formatter preserves codec precision beyond the arithmetic library's default division precision; public agent/MCP capabilities were not expanded.

Repository-wide `tsc --noEmit` still reports existing SDK alias and legacy typing errors. The final run contains no diagnostics from `src/features/bot-trading`, its unit tests, or the typed provider example. This report does not claim that the repository-wide TypeScript gate is clean.

Translations use existing wording, manual translations, and a limited amount of the repository's supported machine-translation fallback. Native-speaker review is advisable, particularly for Dhivehi, Dzongkha, Amharic, Burmese, and Khmer. Passing catalog checks proves key/token consistency, not certified linguistic quality. Existing Akkadian and Egyptian script constraints remain satisfied.

## Companion indexer

The indexer adds optional denomination evidence to asset snapshots without inventing historical values or requiring a database migration. Its full test run passed 1,309 tests with 25 skipped; the final focused run passed 155 tests and the build passed.

The source and deployment evidence are in the adjacent `polkaswap-indexer` checkout:

- `docs/bot-history.md`
- `build/reports/bot-history-denomination.patch`
- `build/reports/bot-history-rollout-status.json`

The indexer was deployed to `pi.soramitsu.io` on 14 September 2026 (Japan time). The hostname's presented key matched the pre-existing trusted IP record for the approved host, so strict SSH verification succeeded using that IP as `HostKeyAlias`; no trust-file change or bypass was needed.

The production port applies only the denomination changes to the exact deployed `e545865` baseline. Release `release-2026-09-14.bot-history.a69482a`, commit `a69482ac386468749d11f13a9b61482cad26a102`, passed 971 tests (25 existing skips) and its build both locally and on the production host. The public API and worker passed the post-activation smoke checks, and new snapshots contain exact denomination metadata. The previous release, database, dependencies, IPFS origin, RPC node, and nginx configuration were retained. The deployment receipt is `../polkaswap-indexer/build/reports/bot-history-deployment-20260914.json` relative to the frontend checkout root.

A production contract check caught and corrected the frontend history page size before the CDN switch: requests now use 100 rows, with at most 100 pages and 10,000 observations per asset. Three regressions cover long pagination, malformed continuation, and response bounds. History/controller tests pass (45 tests), and both metadata and legacy queries were accepted by the public indexer with the frontend's actual filters. Older closed snapshots retain null metadata; historical coverage grows as newly verified buckets close, unless archival evidence can verify older data.

Current quote-based strategies remain independent of indexer history. Historical testing and moving-average strategies require compatible snapshot metadata or verifiable archival chain evidence and fail closed when that evidence is unavailable.

See [the feature guide](../bot-trading.md) for user behavior, API contracts, execution boundaries, and test commands.
