# Bots sharing, historical evidence, and validation

The Bots workspace runs entirely in the static Polkaswap bundle. This document describes the current data and interaction contracts; production publishing follows the separate IPFS/Bunny runbook.

## Shareable views

| View                     | URL                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Build and compare        | [Open lab](https://polkaswap.io/#/bots/lab)                                          |
| Historical inspector     | [Open backtesting](https://polkaswap.io/#/bots/backtesting)                          |
| My bots                  | [Open My bots](https://polkaswap.io/#/bots/my-bots)                                  |
| Strategy composer        | [Open composer](https://polkaswap.io/#/bots/lab?panel=composer)                      |
| Threshold strategy       | [Open threshold strategy](https://polkaswap.io/#/bots/lab?strategy=threshold)        |
| Moving-average inspector | [Open moving-average strategy](https://polkaswap.io/#/bots/backtesting?strategy=sma) |

/#/bots remains an entry to the lab. Unknown subpages fall back to the lab; supported strategy values are dca, threshold, and sma. Unsupported or repeated strategy values use the default. Direct loads, reloads, and browser Back/Forward preserve the selected view. Hash routing also works beneath /ipfs/&lt;cid&gt;/.

An existing local bot can be opened with /#/bots/my-bots?bot=&lt;id&gt; and &chart=equity or &chart=backtest. Its ID refers to that browser's saved record. A recipient without the record sees the workspace without another bot substituted. Links never contain research drafts, saved results, API keys, wallet data, or signing consent, and cannot save, start, or resume a bot. See [Bot trading](bot-trading.md) for operating instructions.

## Three different kinds of evidence

| Evidence                       | What it measures                                                                                                  | Interpretation                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Full-study portfolio           | Chronological fills, inventory, costs, equity, and drawdown across the requested history                          | Historical strategy performance across that period                 |
| Candidate-outcome distribution | Each evaluated opportunity's attribution at a common final close, separated into selected and excluded candidates | A descriptive view of opportunities and constraints                |
| Held-out validation            | Frozen training choices evaluated on later chronological windows with fresh capital                               | Performance on observations unavailable during parameter selection |

The full-study result is not the held-out result. Candidate attribution is not an additional portfolio return: excluded opportunities overlap, and their hypothetical allocations cannot all be invested simultaneously. Candidates share the same final valuation price and are dependent observations. Their positive-outcome share cannot be read as the probability of a profitable future trade.

### Candidate outcomes and statistics

Signals use completed observations and fills use the next completed close. Attribution marks each proposed fill against keeping its input until the common endpoint, after the stated entry slippage, pool fee, and network fee. There is no invented closing sale. Historical fees use the observed assumptions supplied to the study; close-based replay does not reconstruct historical liquidity.

The result-insights module computes statistics directly from exact decimal P&L values. It uses eight equal-width intervals on each side of zero and a separate zero bin. Explicit inclusive/exclusive boundaries count every valid observation once. Selected and excluded groups share the same edges; their counts add to each bin's total. Invalid values are omitted and counted explicitly.

The median and first/third quartiles use Type-7 empirical interpolation. The interval from the first to the third quartile describes the middle half of observed values; it is not a confidence interval. Empty groups have no statistic. Small groups retain their observed values without manufactured certainty about future outcomes. Counts, median, quartiles, and positive-outcome share remain descriptive even when the sample is large.

### Rendering and calculation progress

The study distribution grows only when actual study candidates arrive. Training alternatives and validation folds do not add observations to that distribution, replace its axis with another sample, or replay completed study evidence. Completion freezes the result.

Profit is green, loss is red, and zero is neutral. Histogram columns, range highlights, median and quartile values, and inspected outcomes use the same sign colors. The decorative density surfaces and particle rings are removed. Financial arithmetic stays in FPNumber; ordinary numbers are limited to display geometry and ranks.

WebGL2 and supported WebGL1 render the histogram columns, grid, and range highlight in one GPU batch. Canvas2D handles unavailable capabilities or context loss without changing candidate IDs, exact amounts, inspection state, or calculation acknowledgements. Every dataset uses solid count-scaled columns. Pale columns show all candidates and solid overlays show selected candidates; all visibility filters retain the same count scale. Hover lookup uses cached original indices, avoiding repeated financial parsing while moving the pointer. Every original candidate remains in the inspection model and is reachable with the keyboard and ledger.

Checkpoint transitions change measured geometry or opacity. They do not generate synthetic outcomes, flying batches, or an animation after work finishes. Reduced motion, hidden tabs, cancellation, and pausing release pending presentation acknowledgements safely.

## Chronological cross-validation

The default is **three walk-forward test windows**, with optimization disabled. Training starts with the configured initial percentage and expands for later folds. Test windows are chronological and disjoint. Later training may include an earlier test window only after those observations have become historical.

One boundary candle is excluded from training selection and test fills. Test settings, including absolute threshold anchors, are fixed from training data. Every test starts with fresh virtual capital, no training inventory, no spent fee budget, and no trading cooldown carried forward.

For SMA strategies, earlier observations and the previously known indicator signal initialize the test indicator. The excluded boundary candle can supply past indicator context. Warmup makes no fills and spends no fees; it cannot use a later test price. Each fold records its dates, candle and opportunity counts, warmup count, excluded boundary, and actual executed trades. A zero-trade test remains visible and cannot establish evidence about execution quality.

### Parameter selection and comparisons

When optimization is explicitly enabled, the evaluator tries the current setting and at most two nearby variants of the chosen strategy. It selects the highest **net training return**; ties retain the current choice. This is not a risk-adjusted objective, and neither drawdown nor held-out return selects the winning variant. The search count and objective are recorded. It is not an exhaustive strategy search.

Each train/test period includes a passive buy-and-hold comparison when entry is possible. It invests the available input capital once at the same first next-close opportunity, using the same entry slippage, pool fee, network fee, asset precision, and fee-reserve valuation. Remaining holdings are marked at the period endpoint without a fabricated exit. The passive allocation is not constrained to the strategy's per-trade sizing. If capital or the fee reserve prevents entry, the benchmark and excess-return comparison are unavailable.

Excess return is strategy return minus that period's passive return, in percentage points. Train and test periods can have different lengths. The daily rate is the exact linear calculation **period return × 24 hours / observed duration**; it is neither an annualized or compounded result nor a forecast. Separate fresh-capital folds are summarized without multiplying their returns into a fictional continuous portfolio.

The validation summary exposes fold returns, their median/range, worst observed drawdown, executed-trade counts, and available passive comparisons. Its sample screen requires at least three folds, five executions in every fold, complete reported coverage, and positive net returns in every fold before describing results as consistent. These are disclosed presentation thresholds, not a statistical confidence level. A one-candle gap does not guarantee independent observations, eliminate all overfitting, or prove robustness to another market regime. Higher-cost stress tests are not part of the current evaluator.

Chronological splitting and a configurable gap are established techniques described by [scikit-learn's TimeSeriesSplit documentation](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html). Repeated strategy selection can still produce misleading backtests; see [Bailey and colleagues, The Probability of Backtest Overfitting](https://www.davidhbailey.com/dhbpapers/backtest-prob.pdf). The interface reports observed evidence and limitations rather than a probability of future profitability.

## Persistence and verification

New per-fold evidence is optional when reading older saved studies. The public research storage schema accepts its explicit fields and rejects unknown secret-bearing fields, malformed decimal metrics, and nonfinite numeric data. Saved data remains separate from wallet and live-order state.

Current regression coverage includes exact interval boundaries and quantiles, conservation of candidate counts, historical indicator warmup without future leakage, next-close passive entry costs, unequal-duration comparisons, storage compatibility, checkpoint acknowledgement, reduced motion, complete inspection, and GPU fallback. Final integrated validation results are recorded below by the implementation task.

### Historical validation evidence

An earlier sharing/visual revision passed the full unit suite: **876 files and 5,430 tests**, plus **13 translation checks** and static IPFS-path browser checks. A later animation/color revision passed **645 bot-trading tests across 43 files**, six browser GPU checks, two responsive checks, and a production build. These results describe earlier revisions and do not substitute for validation of the current evidence and cross-validation changes.

### Evidence revision validation

The integrated bot-trading suite passed **658 tests across 46 files**. The final browser-yield and stable-array regression passed **38 backtesting component tests**. Translation consistency passed **13 tests across four files**; targeted ESLint and formatting checks passed. The final static build completed in **20.29 seconds**.

New guidance was machine-translated into 27 supported locales with exact runtime placeholders. Solomon Islands Pijin retains readable English fallbacks because the provider does not support it. Ancient-script catalogs reuse existing terminology and mathematical notation.

Browser GPU fixtures passed **six tests** across Chromium and WebKit, covering WebGL2, WebGL1, semantic colors, and unavailable-extension fallback. Both light and dark responsive checks passed. The final live WebKit run verified **4,754 candidates and three completed chronological folds**, including histogram accounting, a shared count scale across filters, and accounting preserved after GPU context loss. During the study, frame intervals were **17 ms median, 21 ms p95, and 26 ms maximum**, with **no frames above 50 ms**. Validation recorded **804 frames**, with a **48 ms maximum**. The run reported **zero console errors and zero failed requests**. Mobile screenshots were visually checked after dismissing the delayed rotation notice; the chart and validation summary fit the viewport, and the detailed fold table scrolls within its container.

The local preview is available at `http://127.0.0.1:5200/ipfs/bots-sculpture/#/bots/backtesting`. Machine-readable local browser evidence is in `output/playwright/bots-webgl/webkit-automatic.json`. The subsequent authorized production release is documented in [the deployment report](reports/bots-evidence-deployment-2026-09-15.md).

### Animated explanation revision

The lab now begins with compact controls and a finite strategy lesson. Scheduled buys, a fixed price threshold, and configured moving-average crossings produce their own example events. The playhead pauses at each event to show the rule, spending checks, and example trade. These examples are labeled and never enter the historical results. Unchanged parent settings preserve playback; hidden/offscreen views suspend the clock without jumping ahead. Reduced motion shows the completed static lesson.

Completed distributions stay above the validation walkthrough, equity chart, and comparison table. The optional validation walkthrough follows recorded training and test dates and keeps the returned metrics unchanged. Repeated histogram and validation explanations are available in disclosures, while metrics and historical/sample limitations remain visible. Dark result colors preserve green profit and red loss with readable contrast.

This revision passed **676 bot-trading tests across 47 files**, **13 translation tests**, targeted ESLint and Prettier checks, and the production static build. Browser checks cover both themes at 1440 and 390 pixels, meaningful lesson events, exact paused frames, finite completion/replay, reduced motion, offscreen behavior, full-width single results, and opening the detailed explanations. Final production CID, cache purge, and live browser evidence are recorded in [the deployment report](reports/bots-evidence-deployment-2026-09-15.md).
