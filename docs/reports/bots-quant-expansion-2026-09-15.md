# Bots quant expansion — 15 September 2026

## Delivered behavior

Input and output token selection is the first content in the Bots lab, before its title and navigation. The controls retain the lab's existing market state through a single Vue Teleport; changing or reversing the pair changes the experiment configuration. They remain available when the strategy editor collapses.

The composer now offers **10 conditions and 9 recipes**. New conditions are lagged restoring strength, path efficiency, simple-window RSI, and drawdown from a rolling close high. Five added recipes are Spring rebound, Persistent trend, Range recovery, Trend pullback, and Quiet expansion. Users can change each condition, threshold, lookback and all/any grouping, then share the resulting public rules or run the existing chronological study.

The UI adds raised and inset surfaces, theme-aware neon accents, tactile selection, replay-linked scan/progress, and active-run motion. Reduced-motion preferences suppress travel/hover effects. Recipe grids use the repository's escaped CSS `minmax` convention, avoiding its same-named Sass breakpoint helper.

The spring filter measures a **first-order, OU-inspired restoring tendency** with an intercept and exact lagged OLS. It excludes the current move, requires regular observation spacing, and makes flat regressions unavailable. It is not a physical spring constant, a stationarity test, or an exact reproduction of an unverified Idris formula. Its lesson uses labeled authored prices; its events are produced by the actual evaluator.

## Research and scope

- [Research reviewed through 15 September 2026 and acceptance goals](../bots-quant-research-2026-09.md)
- [Exact new formulas and edge cases](../bots-rule-extensions.md)
- [Composition, execution, and held-out evaluation contract](../bot-composable-strategies.md)

The Internet Archive series index and page 2 were retrieved; attempts at later pages returned missing captures, timeouts, or connection errors. The five public GitHub strategy examples were inspected at tree `433e8e51e1f3c2b0d16d0ea84649d00ed59a1588`. The specific original spring article was not recovered. Independently implemented formulas are distinguished from both Idris's examples and recent frontier research.

## Validation

| Check | Result |
| --- | --- |
| Full frozen `yarn test:unit` | 5,714 passed: 5,437 app tests in 864 files and 277 script tests in 24 files |
| All Bots unit suites | 857 passed in 52 files |
| `yarn test:translation` | 13 passed in 4 files |
| Changed TypeScript/Vue/test lint | Passed |
| RuleBuilder Sass with real breakpoint imports | Valid desktop/mobile recipe and field grids |
| Static build | Passed; final artifact coordinated with the concurrent CORS release |
| Chromium, light and dark | Both scenarios passed on the final immutable build, each covering desktop and 390px mobile |
| WebKit, light and dark | Both scenarios passed on the final immutable build, each covering desktop and 390px mobile |

The first full unit run overlapped source changes in two active tasks; its stale-transform failures were retained in `output/bots-quant-september/unit-all.log`. The frozen rerun is `unit-frozen.log`. Focused evidence includes `bots-final.log`, `translation-tests.log`, and `rule-builder-compiled.css` in the same directory.

The final browser target was the release task's immutable `http://127.0.0.1:5282/ipfs/cors-final/` snapshot. Both engines verified token selection before the title, nine recipes and ten conditions, three desktop/two mobile recipe columns, editable spring rules, rejection of invalid thresholds, and reduced-motion behavior. No unexpected page or console errors were recorded. Desktop and mobile screenshots were also inspected. Chromium results are in `final-browser.log`; the clean final WebKit rerun is in `final-webkit.log`. Earlier WebKit failures came from the desktop browser's physical screen orientation activating the application's portrait advisory; the test fixture now models screen orientation consistently with its viewport.

All six acceptance goals are complete within the documented scope: G1 research/source limits, G2 composition, G3 exact financial evaluation, G4 tactile responsive presentation, G5 integration validation, and G6 chronological research safeguards.

## Production confirmation

The coordinated release task completed publication of production CIDv1 `bafybeidqwlo5mhitnp7qk7fnnre2qxqxlkg2uyt2rrlee72w6mmz7izvsq` through the dedicated `mof.sora.org` origin. Bunny origin saving and full-zone cache purging were confirmed. The final built root and assets matched, sequential warming passed, and the official WebKit Swap check reached the real UI with the expected CID and no request or console failures.

Eight additional fresh production WebKit contexts covered desktop/mobile and light/dark Lab and Swap. The recorded summary reports all eight passed, with zero console errors, page errors, failed requests, or HTTP errors. Its final title was `Swap - Polkaswap`. Release evidence is in `output/bots-cors/deploy/live-verification/summary.json`, `output/bots-cors/deploy/official-webkit.log`, and `output/bots-cors/deploy/bunny-update.json`. No further deployment is required for this implementation.

All 23 added translation keys exist in all 30 non-English catalogs. Nine short labels were manually localized in ordinary locales; fourteen longer explanations use English fallback after public translation requests returned HTTP 429. Akkadian and Egyptian use mathematical adaptations with existing localized labels. The unchanged 8% catalog drift limit and script constraints pass. This does not establish linguistic review of all prose.

No profitability claim follows from synthetic fixtures, UI lessons, or passing engineering tests. New recipes retain frozen configurations, next-observation fills, explicit costs, and existing wallet authorization boundaries.
