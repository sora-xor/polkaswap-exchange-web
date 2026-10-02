# Visible Bots strategy library — 2026-09-15

Published and verified at [Polkaswap Bots](https://polkaswap.io/#/bots).

## Result

- Input/output tokens, starting amount and the prominent Run action remain first.
- All three basic presets and all nine composable recipes are visible on the main page, including direct SMA links. Recipe ideas are readable without hover or a More strategies / Mix rules gate.
- Selecting a recipe activates its exact conditions and shows its animation, explanation and editor inline. Selection never starts research or trading. Switching to a basic preset restores one selected configuration.
- The library remains visible during and after results. Settings and analytics start expanded. A second Run action beside the selected strategy uses the same guarded batch path as the top action.
- Saved custom strategies retain their actual name and explanation when another result is selected.
- Desktop uses three recipe columns; narrow phones use one full-width column. Native light/dark, reduced motion, recorded outcome bins and wallet review are preserved.

## Verification

- 64 focused unit tests and 13 translation checks pass; no new translation keys.
- Eight final static-IPFS browser cases pass: Chromium/WebKit × light/dark × desktop/mobile. Mobile column counts and screenshots were verified after correcting a Sass `minmax` name collision.
- Eight fresh unmocked production WebKit contexts pass with zero failed requests, HTTP errors, page errors or console errors.
- Production checks exercise direct SMA discovery, all nine recipes, exact Spring conditions, returning to a basic preset, one explicit real 30-day historical run through the second Run action, persistent catalog, unchanged outcome bins and animation controls, and wallet chooser entry. No wallet was selected and no transaction was signed or submitted.
- The official 30-second WebKit check and independent final title check pass: `Swap - Polkaswap`, real Swap UI, Node connected and the expected release root.

## Deployment

- Production CID: `Qmbo8w3d9VM5zm8AR4pW4yGGp3nZVdC6FJxYEFLKe59VJq`
- Production CIDv1: `bafybeigh6dywvbwqmxvh4avdf3i5gb4gpv72wjoa23lret3o7syivhivti`
- Testnet CID: `QmQHsxP56qqifRwenFQS63SJBpzCiKHzUixydFgQ8iT9Ce`
- Testnet CIDv1: `bafybeia5agn537zd7luipywduk2ngyffneqmmwfplrrzuv7qrhe4raekam`
- Bunny origin: `https://mof.sora.org/ipfs/bafybeigh6dywvbwqmxvh4avdf3i5gb4gpv72wjoa23lret3o7syivhivti`, host `mof.sora.org`.
- Both final DAGs imported and recursively pinned; 50 retained pins verified.
- Root, entry JS/CSS, Swap and Bots chunks returned 200 with exact build bytes and correct types before the origin update.
- Saved origin and purge success notifications observed; required origin flags, cache settings and edge rules verified. 88 assets warmed sequentially after purge. Live root returns the expected CIDv1 and `Cache-Control: no-cache`.

## Evidence

Local evidence: `output/bots-discovery/`.

- `unit.log`, `translation.log`, `browser/verification.json`
- `live-production/summary.json`, `live-production/verification.json`
- `deploy/deployment-summary.json`, `deploy/release.json`, `deploy/bunny-update.json`
- `deploy/remote-pins.log`, `deploy/origin-assets.json`, `deploy/live-assets.json`, `deploy/warm-assets.json`
- `deploy/official-webkit-summary.json`, `deploy/final-title.json`

See [implementation notes](../bots-simple-start.md#strategy-discovery-correction).
