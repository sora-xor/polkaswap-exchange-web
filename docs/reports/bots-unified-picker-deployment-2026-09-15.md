# Unified Bots strategy picker — 2026-09-15

Published and verified at [Polkaswap Bots](https://polkaswap.io/#/bots).

## Result

The first setup block now reads: **input/output tokens and starting amount → one picker containing all twelve strategies → selected explanation → history range and Run**. Basic presets and composable recipes share the same 58px tiles, glyph treatment, typography and selected state. The separate three-preset row and lower recipe grid are gone. Desktop has four columns; narrow phones have two, with no clipped names.

Selecting a choice activates its exact strategy without running anything. Its animation and rule editor appear in Customize your strategy. The selected idea appears above Run. Comparison settings use plain Compare checkboxes; they preserve the primary choice and its explanation. Separate preview-only buttons were removed because their explanation could diverge from the strategy being run. Irrelevant basic dip/SMA parameter inputs are omitted when they do not affect the current strategies.

Both Run actions retain the same guarded batch path. The picker persists through results, and live bot setup still requires wallet review. No execution authority or token math changed.

## Validation

- 76 focused unit tests pass, covering exact selection of every recipe, one picker before Run and after amounts, teleport uniqueness, comparison selection consistency, relevant parameter controls, saved custom strategy identity, invalid inputs and running state.
- 13 translation checks pass; existing message keys are reused.
- Eight final static-IPFS cases pass: Chromium/WebKit × light/dark × desktop/mobile. Each verifies all twelve choices occur once in the top picker, equal tile sizes, correct order, four/two columns, readable complete names and no second catalog.
- Eight fresh unmocked production WebKit contexts pass with zero failed requests, HTTP errors, page errors or console errors. A real public-history run, exact Spring conditions, invalid-rule blocking, SMA links, picker persistence, unchanged outcome bins, motion controls and wallet chooser entry were verified. No wallet was selected and no transaction was signed or submitted.
- Official 30-second WebKit check and independent final title check pass: `Swap - Polkaswap`, real Swap UI, Node connected and the expected root.

## Release

- Production CID: `QmdhzZhhgDPV4HFF1D9yQndW3V7uJ7z53TiFucFsBPkfYd`
- Production CIDv1: `bafybeihek3zxzmjhrddi56fuotyxc5oksfyni7kbtlqezyiach5turknli`
- Testnet CID: `QmRjSNXjs3ZviCyezjR58a26DvVESk2veTZxRT8Hd9oHPb`
- Testnet CIDv1: `bafybeibsnf4ckesor2k4uu2gn2sk3a5cgiz4752dghzy2o5muj25ttkrby`
- Bunny origin: `https://mof.sora.org/ipfs/bafybeihek3zxzmjhrddi56fuotyxc5oksfyni7kbtlqezyiach5turknli`, host `mof.sora.org`.
- Both release DAGs imported and recursively pinned; 52 retained pins verified.
- Root, entry JS/CSS and Swap/Bots chunks returned 200 with correct types, no redirects and exact build bytes before saving the origin.
- Origin-save and full-purge success notifications captured directly from Bunny. Required origin flags, cache settings and edge rules verified. 88 assets warmed sequentially after purge. The public root returns this CIDv1 with `Cache-Control: no-cache`.

## Evidence

Under `output/bots-picker/`:

- `unit.log`, `translation.log`, `browser/verification.json`
- `local-public/summary.json`, `live-production/summary.json`, `live-production/verification.json`
- `deploy/deployment-summary.json`, `deploy/release.json`, `deploy/bunny-update.json`
- `deploy/remote-pins.log`, `deploy/origin-assets.json`, `deploy/live-assets.json`, `deploy/warm-assets.json`
- `deploy/official-webkit-summary.json`, `deploy/final-title.json`

See [implementation notes](../bots-simple-start.md#unified-strategy-picker).
