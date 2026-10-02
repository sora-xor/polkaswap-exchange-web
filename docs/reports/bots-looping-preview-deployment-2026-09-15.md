# Bots looping preview and action order — 2026-09-15

Published and verified at [Polkaswap Bots](https://polkaswap.io/#/bots).

## Result

The setup order is **tokens and starting amount → all twelve strategies → history range → selected strategy animation → Run results / Run results again**. There is one selected preview, directly adjacent to the main Run action. The same controls and preview move together into the page-first region. Custom strategy descriptions preserve the exact saved strategy. Editable rule conditions and comparison settings stay in Customize your strategy, with its Run action after the settings.

Both RuleFlow and illustrative StrategyFlow now loop over the same deterministic observations, holding the final frame for 800 ms before beginning again. Pause retains the current playhead, including at the endpoint; Replay restarts it. Updating rule inputs resets the example while preserving a manual pause. Hidden, offscreen, inactive, and reduced-motion states suspend the clock. Recorded historical decision cards retain their static evidence.

RuleBuilder defaults `showFlow` to true for standalone use; StrategyLab sets it false because the parent owns the sole preview. Invalid rules replace the preview with a visible error and disable both Run actions. No token math, trading authorization, research execution, or historical outcome distribution changes.

## Verification

- 82 focused unit tests pass across StrategyLab, RuleBuilder, RuleFlow, and StrategyFlow. They cover three continuous loops, final-frame pause, updates while paused, lifecycle gates, placement and teleport uniqueness, exact strategy identity, edit propagation, invalid drafts and unchanged run/start boundaries.
- 13 translation checks pass; existing translation keys are reused.
- ESLint passes for changed components, tests and E2E layout assertions.
- Eight built browser cases pass: Chromium/WebKit × native light/dark × desktop/mobile. All verify the sole preview before Run, exact recipe selection, valid/invalid edits, comparison behavior and unchanged result evidence. Realtime browser sampling proves at least two full wraps with continued playback for both kinds of preview. Pause/Resume and reduced motion pass.
- Settled desktop-light and mobile-dark screenshots were inspected after the entrance transition; the preview and all ancestors reach full opacity.
- Official 30-second WebKit check and independent final title check pass: `Swap - Polkaswap`, real Swap UI, Node connected, expected new CIDv1, and zero console/page/request/HTTP errors.
- Eight fresh unmocked production WebKit contexts pass across Bots/Swap, desktop/mobile and light/dark with zero console/page/request/HTTP errors. Both previews continue after two complete realtime cycles. A real historical Run completes, the main action becomes Run results again, all twelve strategies remain visible, and outcome evidence remains usable. No wallet was connected and no trade was submitted.
- Browser and production verification evidence is written under `output/bots-loop/`: `browser/verification.json`, `browser-settled/`, `live-production/summary.json`, `deploy/deployment-summary.json`, `deploy/bunny-update.json` and `deploy/final-title.json`.

## Release

- Production CID: `QmeB2QHUE4Lm6LgguQLfUUwi2jP11pCZEpaS7fVJG7JJbb`
- Production CIDv1: `bafybeihlio27kvwhjmdivv5ismul3zd2mtydv6a2mem37umgklytasde4i`
- Testnet CID: `QmQvB2U5deyMSgdKdVFYhQKbL9G91HakEnUei5AhFt36on`
- Testnet CIDv1: `bafybeibgjxi5dsogiucwtj2r5yshargcdlqv4f7le3z2ju2posq4yhombu`
- Origin: `https://mof.sora.org/ipfs/bafybeihlio27kvwhjmdivv5ismul3zd2mtydv6a2mem37umgklytasde4i`, host `mof.sora.org`.
- Both DAGs imported into MOF and recursively pinned; all 54 retained pins verified.
- Root, entry JavaScript/CSS and Bots/Swap chunks verified as exact built bytes, correct MIME, 200 and no redirects.

- Validated Bunny origin saved with direct success confirmation; full cache purge confirmed. Required origin/cache flags and both edge rules verified.
- Live root returns the new CIDv1 with `Cache-Control: no-cache`; five entry/lazy asset checks pass and 88 assets were warmed sequentially with exact-byte checks.

See [implementation notes](../bots-simple-start.md#continuous-strategy-preview).
