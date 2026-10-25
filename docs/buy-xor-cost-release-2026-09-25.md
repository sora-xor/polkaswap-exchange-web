# Buy XOR cost review release — 25 September 2026

The production Buy XOR flow now reviews the complete current card-funded route before opening payment, preserves unresolved funding when users edit their journey, and offers explicit opt-in aggregate purchase-step counts. The shared Get TS flow receives the cost and recovery improvements while keeping its burn stage separate. Existing neumorphic surfaces, controls and mobile layouts are retained.

The current card route still buys ETH and then converts, bridges and swaps into native SORA2 XOR. Direct card settlement into native XOR remains dependent on provider approval; the Banxa and Transak requests do not establish availability. No funded purchase, treasury transfer, liquidity deposit or provider commitment was made in this release.

## Changes

- [Before-card cost review](buy-xor-card-cost-review.md): exact fee-inclusive USD budget, provider fee, conversion and bridge gas reserves, downstream liquidity, and native transaction fees. Existing ETH is excluded from card funding. Stale or changed account/provider/network evidence disables payment until refreshed.
- [Purchase recovery](buy-xor-funding-state.md): keep tracked funding references and reviewed drafts through edits and source links. Matching canonical evidence determines progress; a wallet switch cannot discard a valid returned conversion hash.
- [Read-only quote relay](buy-xor-quote-relay.md): an isolated MOF service fixes the observed upstream browser CORS failure. It accepts only the adapter's constrained quote schema and one fixed upstream endpoint; all transaction validation and signing remain in the client.
- [Aggregate measurement](buy-xor-measurement.md): explicit opt-in, DNT/GPC veto, fixed enums, no user identifiers, wallet addresses, hashes or exact amounts. These are stage observations, not unique buyers, conversion rates or revenue.

## Release identity and activation

| Item | Value |
| --- | --- |
| Production CIDv0 | `QmXm29fRsR561pub9iUQ21nb49ytRYUitZCzfU9qrLVEup` |
| Production CIDv1 | `bafybeiel65owblybt5hsjk5eyzxrfokorrcf26hx2pxamyt6dd2jbtnb7m` |
| Testnet CIDv0 | `QmansBXocvoFZPiAdxQZoERfDYvLmu29y22MqEkFS2A3uU` |
| Testnet CIDv1 | `bafybeifzanzh5wypogvbwbhgjxbu5do474fxtg36eczhoqoaeyeo3yrlim` |
| Bunny origin | `https://mof.sora.org/ipfs/bafybeiel65owblybt5hsjk5eyzxrfokorrcf26hx2pxamyt6dd2jbtnb7m` |
| Origin host header | `mof.sora.org` |
| Pull zone | `polkaswap` / `5860217` |

`yarn ipfs:publish` produced both roots. Both DAGs were imported and verified recursively pinned on the dedicated MOF origin, preserving existing pins. Candidate root, entry JS/CSS and six critical lazy chunks returned HTTP 200 with correct MIME types, no redirects and bytes matching the frozen production build.

The authenticated Bunny UI saved the production origin and completed the full pull-zone purge. The persisted origin was visible and the purge dialog closed without error; no success toast was captured. SSL verification, host forwarding, redirect and error-cache settings and both required edge rules were checked. No API key was extracted from the browser.

The stable root returned the production CIDv1 in `x-ipfs-roots`. All nine critical files and 226 additional dependencies passed sequential HTTP/type/exact-byte validation before browser checks. The frozen app source check covered 2,346 files with no changes after the build.

Final deployment verification completed at **13:56:17 UTC**. The final official WebKit check again reached `Swap - Polkaswap` on the new CID with zero failed requests and zero console errors (`output/tonswap-growth/buy-xor-cost-release/webkit-swap-final.log`). Machine-readable release status is `deployed-and-verified` in `output/tonswap-growth/buy-xor-cost-release/release.json`.

Release artifacts: `output/tonswap-growth/buy-xor-cost-release/`. Candidate static evidence: `output/tonswap-growth/get-ts-ux-candidate-2jbtnb7m/verification.json`. Stable validation and warming: `output/tonswap-growth/get-ts-ux-stable-2jbtnb7m/verification.json`.

## Validation

- Complete `yarn test:unit`: **1,132 suites / 12,016 tests passed** (main unit project: 1,011 / 9,557; unit-scripts: 121 / 2,459). Log: `output/tonswap-growth/buy-xor-cost-release/unit-tests.log`.
- Final focused checks after integration: purchase page 53 tests; cost review, component, conversion and preview 70 tests; quote relay 54 tests; measurement helper 26 and collector 21 tests; liquidity sizing 6 tests. These overlap the main suite and are not added to its total.
- Translation checks passed **4 suites / 13 tests**, plus the Akkadian cuneiform check. A saved audit covers 35 new keys across 31 catalogs with no unrelated value changes. Specialized-locale script checks do not replace expert review of financial meaning. Logs: `output/tonswap-growth/buy-xor-cost-release/measurement-translation-tests.log` and `measurement-cuneiform-check.log`; scope audit: `output/tonswap-growth/buy-xor-measurement-locale-audit.json`.
- Scoped ESLint and whitespace checks passed. There is no clean repository-wide typecheck claim: `vue-tsc` is absent and the targeted TypeScript run encounters inherited dependency errors, with no errors in the new review helper/component/conversion files.
- Local SFC visual checks covered desktop/mobile, light/dark, ready/blocked and expanded fee details. No overflow or browser errors occurred in the isolated fixture. Those quote values were illustrative, not live financial offers.
- Official settled WebKit swap verification passed with title **`Swap - Polkaswap`**, the new CID, real mounted UI, **zero failed requests and zero console errors**. Log: `output/tonswap-growth/buy-xor-cost-release/webkit-swap.log`.
- The same official check passed the Buy XOR and Get TS routes with titles **`Buy XOR - Polkaswap`** and **`Get TS - Polkaswap`**, respectively, the new CID and zero failed requests or console errors. Logs: `output/tonswap-growth/buy-xor-cost-release/webkit-buy-xor.log` and `webkit-get-ts.log`.
- The public $25 card preview used real MoonPay and MOF quote responses on desktop and mobile. Both layouts had zero overflow, console errors and failed requests; measurement remained unchecked with no event traffic. Its initial estimate was approximately 3.130806 XOR **before Ethereum gas**, distinct from the later wallet-bound cost review. Evidence: `output/playwright/buy-xor-final-public-card-25.json` and the adjacent screenshots.
- Measurement passed seven scenarios in each of WebKit and Chromium (installed Chrome): default opt-out, exact opt-in payload, reload persistence, later opt-out, DNT, GPC and legacy DNT. All six event POSTs were fulfilled locally so QA did not pollute production counters. The report retains rapid-reload cancellation diagnostics; it is not the separate settled route smoke result. Evidence: `output/playwright/buy-xor-measurement/report.json`.

## Read-only financial and service evidence

A complete synthetic-account review at 13:40 UTC used zero existing ETH and current public mainnet data. An exact $25 budget left an estimated **2.380549793491646835 spendable XOR** after the stated reserves; the enforced DAI input had approximately 3.2083% impact. Conversion, approval and bridge simulations passed. This is a timestamped estimate with a synthetic selected account, not a connected customer's completed purchase. See `output/tonswap-growth/buy-xor-card-readiness-live.json`.

The production-origin browser relay probe returned preflight 204 and quote POST 200 with zero failed requests. The service also rejected an unknown origin and an arbitrary-endpoint payload. Evidence: `output/playwright/buy-xor-live-relay-synthetic-quote.log` and `output/tonswap-growth/buy-xor-cost-release/quote-relay-verification.json`.

The collector health/preflight, schema and size rejection checks passed. Its fixed verification probe incremented the separate verification counter from zero to one, leaving purchase rows empty. Evidence: `output/tonswap-growth/buy-xor-cost-release/counter-verification.json`. A verification probe establishes transport and storage, not customer acquisition.

## Remaining dependencies

The [liquidity funding proposal](native-xor-liquidity-funding-proposal.md) estimates an additional **2,790.74 DAI plus 508.536737 XOR** for a **100 DAI net pool input at 3% impact** at its recorded snapshot. Treasury source and budget require an explicit decision, and the pool state must be refreshed before any deposit. Buying the required XOR from the same shallow pool invalidates that proportional-inventory model.

Direct native card delivery requires provider acceptance and a real sourcing/settlement arrangement. A funded end-to-end pilot remains necessary before claiming successful customer delivery. XOR purchases or burns do not by themselves establish operating-company cash receipts.
