# Bots trade flow

The motion reference is the [particle filtering and distribution video supplied by the user](https://x.com/silvanrec/status/2095630252852605239/video/1). The intended visual is an incoming stream of evaluated trading opportunities that passes through visible checks and settles into an outcome distribution.

## Meaning of the animation

Each particle represents one hourly decision returned by the research engine. Its checks, selection state, and signed outcome come from that decision’s recorded data. Solid particles represent trades taken in the simulation; hollow particles represent skipped checks. A check without a trade signal is distinct from a signal blocked by available capital, order limits, fees, or timing. Non-signal observations may include a hypothetical proposed buy, so the total number of checks is not the number of eligible trade signals.

The check gates show the actual recorded checks. Checks are evaluated independently by the engine. The animation routes an excluded opportunity out of the main stream at its first failed check to keep the flow readable; that visual bypass does not mean later checks were skipped during evaluation.

A particle's destination is the bin containing its exact signed outcome. Counts and bin membership derive from the recorded outcomes, rather than random motion or an assumed probability curve. Animation coordinates may interpolate between positions, but interpolation does not recalculate token amounts or change any outcome.

## Interaction and lifecycle

- Input token, output token, and starting amounts remain first on the page. The prominent **Run results** and **Run results again** action is unchanged.
- During a study, the flow receives real calculation checkpoints and shows the opportunities that have been evaluated so far. It does not invent activity while waiting for data.
- While calculating, all hourly checks stay visible and comparison filters are disabled. Once calculation finishes, **Trades taken** becomes the default. **Skipped checks** and **All hourly checks** are optional comparisons.
- After completion, **Replay trade flow** replays recorded outcomes explicitly. It does not start a new calculation or place trades. **Show distribution** settles the animation immediately. Pause, speed (0.25×, 0.5×, 1×, 2×), and a seek control affect replay only; they cannot delay a live evaluator checkpoint.
- **Follow one decision** opens its recorded timestamp, strategy reason, proposed action, rule evidence, and common-date outcome, then animates that one record. Reduced-motion users receive the same inspection without animation. Arrow navigation and bin selection stay within the selected comparison group.
- Labels distinguish active filtering, replay, and recorded outcomes. The landed counter refers to visible animation progress, not additional research work.
- Reduced motion presents settled results. Hiding the document or unmounting the view settles pending checkpoint work so presentation cannot block research or leave animation tasks running.
- The historical validation report stays readable and static; the earlier validation walkthrough is not restored.

## Presentation

Use the application's native light and dark surface, text, accent, and shadow tokens. Scientific character comes from aligned gates, readable scales, exact counts, and smoothly arriving particles. Raised and inset surfaces retain the existing neuomorphic treatment. Filled and hollow particle shapes distinguish selection state without relying on color alone.

All new copy lives under `bots.tradeFlow`. The 31 locale catalogs share the same keys and interpolation placeholders. Akkadian and Egyptian use the repository's existing script-constrained adaptation process; these adaptations are not claimed to be scholarly translations.

## Filter and decision clarity

Completed results default to **Trades taken**. The adjacent **Skipped checks** and **All hourly checks** filters expose hypothetical comparisons only when requested. Summary counts separate hourly checks, no signal, signal blocked, and trades taken. Records without a signal check remain explicitly unknown. These categories include records whose invalid outcome is omitted from the chart; chart counts and omission notes remain distinct from recorded decision counts.

The x-axis keeps the exact same signed value intervals across comparisons. The y-axis adapts to the visible group so a small number of taken trades stays legible when thousands of checks were skipped. A visible note explains the changing count scale. **All hourly checks** overlays both groups on one shared count scale. Binning, statistics, decimal amounts, and original checkpoint/replay timing remain immutable. Readouts, keyboard navigation, and rule-pass totals follow the selected group.

The animation uses neutral dots during rule checks; outcome colors appear only on the route to the value bin. Filled dots represent taken trades and hollow dots represent skipped what-if outcomes. Gate counters advance when the displayed records cross the corresponding check. A skipped record contributes to exactly one first-failure reason; the engine still evaluates checks independently. Following one decision limits the animated counters to that record while retaining the other recorded outcomes.

When replay finishes, its gate area collapses. On mobile the gates use a readable vertical list above a full-width, 240-pixel-high histogram, instead of squeezing the desktop gate labels into a small canvas. A completed run with no taken trades shows an explanation and the actual skip reasons. Capital, order-limit, and fee-budget blocks offer a **Review order size and limits** action.

The value axis explicitly compares each proposed trade with holding the tokens it would spend. The common final valuation date and the fact that these are per-decision comparisons, not portfolio profit, stay visible. Labels distinguish **Beat holding**, **Below holding**, and **Same as holding**. The individual inspector shows the recorded next-close price and pair, strategy reason, signal time in UTC, and rule values. Amount evidence is decoded with the recorded asset’s decimals through `FPNumber`; this includes external XOR fee-reserve failures. Missing asset metadata displays an unavailable value, never an invented denomination. Cooldown evidence is shown in exact seconds.

## Component integration

`TradeDistribution` accepts the original `ResearchCandidate` records structurally. Optional `valuationTimestamp`, `outputSymbol`, and `evidenceAssets` props supply the final study date, price-pair label, and denomination metadata during partial results. `select` continues to emit the recorded decision ID; the inspector is self-contained. `reviewLimits` asks the parent to expose editable order and budget controls. `waitForCheckpoint` retains its existing presentation acknowledgement contract. No preview, filter, replay, or inspection action authorizes live trading.

The `decision-inspection.ts` helper owns mutually exclusive decision categories, filtered navigation and bin counts, count-only layout scaling, common-date validation, and exact denomination formatting. The current simpler-review implementation passed all 76 focused component, decision-helper, and flow tests, including sparse taken results, zero-trade explanations, self-contained inspection, replay pause/speed/seek, hidden-page settlement, native themes, and the unchanged checkpoint contract. Evidence: `output/bots-simple/distribution-tests-final.log`. This section describes the workspace implementation; the release records below retain their original deployment evidence.

The preceding clarity update passed 913 Bots tests during implementation, then 65 focused component and flow tests after its final counter correction. Its 31 locale catalogs passed all 13 translation tests. Evidence: `output/bots-clarity/bots-unit.log`, `output/bots-clarity/final-focused-tests.log`, and `output/bots-filter-clarity/translation-tests.log`.

## Validation

- `yarn lang:fix` completed.
- `yarn test:translation`: 13 tests passed, including key parity and script constraints.
- `yarn test:unit`: 5,751 tests passed during implementation (5,474 application tests and 277 script tests). Evidence: `output/bots-trade-flow/all-unit.log`.
- After the final landing and native-theme corrections, `yarn vitest run --project unit tests/unit/features/bot-trading/TradeDistribution.spec.ts tests/unit/features/bot-trading/trade-flow.spec.ts` passed all 50 tests. Coverage includes exact signed-bin boundaries, invalid observations, independent checks, progressive landings, replay completion, retained results, lifecycle settlement, both renderers, and the real Sass/Vue scoped-selector compilation for dark-mode colors. Evidence: `output/bots-trade-flow/release-focused-tests.log`.
- The release build passed all eight browser combinations: Chromium and WebKit, native light and dark, desktop and mobile. All cases had zero captured errors and verified the token-first action order, correct computed palette, visible gate/bypass motion, partial histogram growth, complete landing, replay finish, reduced motion, and simulated document hiding. WebKit also exercised actual GPU context loss and Canvas2D fallback. Evidence, composited screenshots, and recordings: `output/bots-trade-flow/browser-release/verification.json` and its sibling case directories.

The eight-case browser matrix uses three engine-generated **synthetic engineering studies**, saved through the real storage API in isolated localhost browser contexts under an IPFS subpath. The recorded distribution contains 255 evaluated opportunities (48 selected and 207 excluded). Financial/runtime network responses are mocked only in those local contexts. These fixtures test presentation and exact count preservation; they are not market-performance evidence or a production data check. The visibility test dispatches a simulated lifecycle event; GPU context loss uses the real browser extension where available.

## Production release — 15 September 2026

The production build is published at `bafybeibsz4u7xoartwirhfp5eo4j5vqrpp2mxcvy4ih5bme66jndbqd2j4`. Both production and testnet DAGs were imported into the dedicated MOF origin and their recursive pins verified. Root HTML, entry JavaScript/CSS, and the Swap and Bots chunks returned HTTP 200 without redirects and matched the built files byte for byte.

Bunny's `polkaswap` origin was saved with host header `mof.sora.org`, followed by a confirmed full-zone cache purge. The live root returned the new CID, the application CSP, and `Cache-Control: no-cache`. All 88 required assets were warmed sequentially and verified against the build. Evidence: `output/bots-trade-flow/deploy/`.

The official WebKit production check passed with the real Swap interface, a connected node, zero failed requests, and zero console errors. Its compact evidence is `output/bots-trade-flow/deploy/official-webkit-summary.json`.

All eight unmocked production WebKit cases also passed: Bots and Swap in desktop/mobile light/dark contexts. Every document returned the new CID; the final title was `Swap - Polkaswap`; failed requests, HTTP errors, page errors, and console errors were all zero. The actual historical run produced 4,759 evaluated opportunities. Replay showed progressive landings, visibly moving gate particles, unchanged exact bins/statistics, correct native light/dark colors, and a working finish control. No fixture or financial data mocks were used for these production checks. Evidence: `output/bots-trade-flow/live-production/verification.json`, `summary.json`, and composited screenshots. The consolidated release record is `output/bots-trade-flow/deploy/deployment-summary.json`.

## Clarity release — 15 September 2026

The filter and decision-clarity update supersedes the preceding release with production CID `bafybeifmohvhtakrobypi65hh2oydplk36x57vkwbmugr4yxmxbd4n5ebm`. Both production and testnet DAGs were imported into MOF, with recursive pins and retained content integrity verified. The origin's root, entry JavaScript/CSS, Swap chunk, and Bots chunk passed static-file checks and matched the build exactly.

Bunny's production origin was saved, its required headers and settings preserved, and its full-zone cache purge confirmed. The public root returned the new CID, the application CSP, and `Cache-Control: no-cache`. All 88 required assets were warmed sequentially and matched the build. The official WebKit check reached the real Swap interface with a connected node, zero failed requests, and zero console errors. Evidence: `output/bots-clarity/deploy/`.

All eight final local browser cases passed across Chromium/WebKit, native light/dark, and desktop/mobile. They verified filter-specific counters, recorded first-failure reasons, neutral particles through checks, exact outcomes, readable mobile counts, the compact idle chart, replay, reduced motion, lifecycle settlement, and GPU fallback. These cases use the isolated synthetic engineering fixtures described above. Evidence: `output/bots-clarity/browser-final/verification.json`.

All eight unmocked production WebKit cases passed for Bots and Swap on desktop/mobile in light/dark modes. Every document returned the final CID, the final Swap title was `Swap - Polkaswap`, and request, HTTP, page, and console errors were all zero. The final full-history Scheduled buys study produced 4,760 opportunities: 9 trades taken and 4,751 skipped, each attributed to available capital as its first failed check. Filters preserved the exact underlying bins and statistics. Live replay showed advancing rule counters, moving particles, progressive arrivals, the expanding/collapsing viewport, and matching mobile counters.

The first production attempt completed seven cases; its remaining replay check was intercepted by the application's existing rotation notice during a test viewport resize. The output-only verifier was corrected to dismiss the visible notice normally, and only that case was rerun. No application change or data mock was used for recovery. The combined evidence retains both attempts and their provenance in `output/bots-clarity/live-production-final/`. The consolidated release record is `output/bots-clarity/deploy/deployment-summary.json`.
