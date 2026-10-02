# Simple Bots release — 2026-09-15

Published and verified at [polkaswap.io/#/bots](https://polkaswap.io/#/bots).

## Completed goals

1. Token pair and starting amount first, one strategy preset, a prominent Run results / Run results again action, and optional advanced controls.
2. Starting/final portfolio value, net change after costs, worst decline, holding comparison, and checked/signalled/taken counts.
3. Recorded decisions drive the animation. Taken trades are the default result view; users can pause, slow, scrub and follow one dated decision with its actual rule evidence. Mobile uses readable counters and a dedicated histogram layout.
4. Start bot carries the exact studied configuration into wallet connection, balance review and explicit consent. Account/network/denomination changes and cancellation invalidate pending starts. Original capital is preserved; research never grants execution authority.
5. Native light/dark and mobile verification, synchronized translations, IPFS publishing, MOF replication, validated Bunny origin update, full purge and live verification.

The browser must remain open and visible for live execution. Sessions last up to 24 hours and require renewal. Verification opened the wallet chooser and used mocked signer tests; no real wallet was connected or trade submitted.

## Release

- Production CID: `QmQkxFLEpHT3T5nuHCrnAooJFT5bXMGDoFQ7b7arYH3dPc`
- Production CIDv1: `bafybeibd6esnxj4lmmtrtb34s5bef34r5izpggblligh2z7aebd5gopyt4`
- Testnet CID: `QmbyXZjs4XLmzjkMdSEkzyF5TGLe7cpvCViNexeEfgZVLH`
- Testnet CIDv1: `bafybeigktjlytfwcabyukqy4f6x7xaox24gxvz6c2qrfb6web2h7ssixhy`
- Bunny origin: `https://mof.sora.org/ipfs/bafybeibd6esnxj4lmmtrtb34s5bef34r5izpggblligh2z7aebd5gopyt4`
- Host header: `mof.sora.org`
- Both DAGs imported and recursively pinned; all 46 retained pins passed integrity checks.
- Root, entry JS/CSS, Swap and Bots chunks returned 200 with expected content types, no redirects and exact build bytes.
- Origin save and full purge success toasts observed. Required header rules and cache/TLS settings verified. All 88 required assets warmed sequentially.

## Validation

- Full unit run: 5,812 tests in 891 files passed; later focused chart and wallet checks passed.
- Translation checks: 13 passed, all 31 catalogs synchronized.
- Final local static build: 8 Chromium/WebKit × light/dark × desktop/mobile cases passed.
- Production: 8 fresh unmocked WebKit contexts passed with 0 failed requests, HTTP errors, page errors and console errors.
- Real 30-day public-history preview completed, rerun stayed available, outcome bins remained unchanged through inspection/playback, and Start bot opened the wallet chooser.
- Official 30-second WebKit check passed with real Swap UI and Node connected. A separate final title check observed `Swap - Polkaswap` and the expected CID with zero errors.
- The chooser now defers Google Drive discovery until Google OAuth succeeds; 42 focused wallet tests verify the loading and authorization order.

## Evidence

Local evidence is retained under `output/bots-simple/`:

- `deploy/deployment-summary.json`, `deploy/release.json`
- `deploy/origin-assets.json`, `deploy/live-assets.json`, `deploy/warm-assets.json`
- `deploy/bunny-update.json`, `deploy/remote-pins.log`
- `deploy/official-webkit-summary.json`, `deploy/final-title.json`
- `live-production/summary.json`, `live-production/verification.json`
- `browser/verification.json`, `unit-all.log`, `translation-tests.log`, `wallet-chooser-tests.log`

See [implementation and acceptance notes](../bots-simple-start.md).
