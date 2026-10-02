# Composable bot strategies

The strategy lab can combine ten deterministic price conditions into an entry group and an optional exit group. It uses the same signal evaluator in research and runtime. Nine editable recipes provide starting points; their parameters are educational examples and have not been optimized or validated as profitable. Input and output token selection comes first on the Bots lab, before navigation and strategy controls.

The September expansion adds spring-inspired restoring strength, path efficiency, simple-window RSI, and rolling price drawdown. Their exact formulas, bounds, cadence requirements, and unavailable-data behavior are in [Close-only strategy filters](bots-rule-extensions.md). The five added recipes and research acceptance goals are in [September 2026 research](bots-quant-research-2026-09.md). The original six formulas and four recipes below remain unchanged.

Implementation:

- `src/features/bot-trading/strategy-rules.ts`: strict configuration parser, required history, exact comparisons, and per-condition evidence.
- `src/features/bot-trading/rule-recipes.ts`: starting recipes, bounded study definitions, and public rule links.
- `src/features/bot-trading/engine.ts`: consumed observations, cooldown, trade sizing, exit priority, and inventory.
- `src/features/bot-trading/research.ts`: next-close accounting, full-study opportunities, and chronological validation.

## Configuration and evidence

`StrategyRules` has exactly `version: 1`, `entry`, and `exit`. Each group has `operator: 'all' | 'any'` and one to four conditions. `exit` may be `null`. There are at most eight conditions, no nested groups, no hidden IDs, and no executable expressions.

Every condition has `kind`, integer `window` from 2 through 200, and `direction: 'above' | 'below'`. Momentum/deviation thresholds are ordinary decimal strings from −100 through 100. MAD thresholds are from 0 through 100. Return quantiles use an integer percentile from 1 through 99. Exponents, NaN, infinities, leading-zero integers, unknown fields, accessor properties, and unsupported versions are rejected. Decimal precision is limited to 36 fractional places and 100 input characters. The parser returns a detached canonical copy or throws `bots.errors.config`.

The evaluator returns `entry`, `exit`, `ready`, and evidence for every leaf: `kind`, `ready`, `passed`, `value`, and `threshold`. It preserves all evidence even when an earlier condition decides an `all`/`any` result. **Every leaf in both groups must be ready before either signal can pass**, including `any` groups. Unavailable history is not a zero observation.

Comparisons are strictly `>` or `<`; equality passes neither direction. Price integers and exact rational arithmetic determine the result. Display strings truncate toward zero at 36 decimal places afterward, so the authoritative `passed` flag can distinguish values that look equal at display precision. No floating-point conversion affects a trading comparison.

## Exact condition definitions

Let `C[t]` be the latest completed positive close. Let `M[N,t] = sum(C[t-N+1] … C[t]) / N`. Define the adjacent observed-close percentage return `r[t] = 100 × (C[t]/C[t-1] − 1)`.

| Condition | Evidence value | Evidence threshold | Required closes |
| --- | --- | --- | --- |
| `trend` | `C[t]` | `M[N,t]`, including the latest close | `N` |
| `momentum` | `100 × (C[t]/C[t-N] − 1)` | Configured signed percentage | `N + 1` |
| `breakout` above | `C[t]` | Maximum of `C[t-N] … C[t-1]` | `N + 1` |
| `breakout` below | `C[t]` | Minimum of `C[t-N] … C[t-1]` | `N + 1` |
| `deviation` | `100 × (C[t]/M[N,t] − 1)` | Configured signed percentage | `N` |
| `mad` | `median(abs(r − median(r)))` for `r[t-N] … r[t-1]` | Configured nonnegative percentage | `N + 2` |
| `return-quantile` | `r[t]` | Type-7 quantile of `r[t-N] … r[t-1]` | `N + 2` |

Both return-distribution conditions deliberately exclude the current return from their comparison history. For a sorted prior-return array `y` of length `N`, percentile `p` has rank `h = (N−1)p/100`. Its Type-7 quantile is `y[floor(h)] × (1−fraction(h)) + y[floor(h)+1] × fraction(h)`. An integer rank uses that item directly. This is the linear convention documented by [NumPy](https://numpy.org/doc/stable/reference/generated/numpy.quantile.html).

MAD is the median absolute deviation about the median, with **no normal-distribution scaling factor**. It measures dispersion and is less sensitive to isolated extremes than standard deviation; that also means it can miss rare large jumps. The [SciPy MAD documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.median_abs_deviation.html) distinguishes this statistic and its optional scale. The implementation uses its own integer arithmetic, not SciPy or copied Python code.

Windows count actual observations. Strict chronology and positive decimal closes are required; the evaluator does not forward-fill missing hours. If an hourly source has a gap, an adjacent-close return spans that elapsed gap, and an `N`-observation window can cover more than `N` hours. Source coverage and actual dates remain part of the research report. These values must not be relabeled as exactly one-hour returns when observations are missing.

## Four starting recipes

The table uses the exact condition definitions above. `AND` means `all`; `OR` means `any`.

| Recipe ID | Entry | Exit | Warm-up |
| --- | --- | --- | --- |
| `trend` | Close above its 48-close mean **AND** 24-observation momentum above 1% | Close below its 48-close mean **OR** 24-observation momentum below 0% | 48 closes |
| `breakout` | Close above the preceding 48-close maximum **AND** above its 120-close mean | Close below the preceding 24-close minimum **OR** below its 48-close mean | 120 closes |
| `dip` | Current return below the preceding 48-return 20th percentile **AND** close above its 120-close mean | Deviation above the 24-close mean greater than 1% **OR** close below its 120-close mean | 120 closes |
| `quiet` | Close above the preceding 24-close maximum **AND** preceding 48-return MAD below 0.5% | Close below the preceding 12-close minimum **OR** 24-observation momentum below 0% | 50 closes |

The trend recipe asks for direction plus a minimum recent move. These are related measurements, not independent confirmations. The breakout recipe can buy a false breakout after a spike. The dip recipe tests relative weakness inside a longer rise; a low return quantile does not establish a coming rebound. The quiet recipe measures **prior** dispersion, excluding the current move; it does not cap the size of the breakout, estimate maximum loss, or protect against a sudden regime change.

No recipe is a crossover event, band-reentry state machine, all-in/all-out portfolio, or stop order. Those behaviors require distinct settings and execution semantics.

## Orders, cooldown, and repeated conditions

An entry match proposes the configured **fixed input amount**. It can propose another buy on a later completed close when the condition still holds and cooldown/balance/policy permit. Entry does not require zero output holdings.

An exit match has priority if entry also matches. It proposes a sell sized to the configured input-value amount using the decision price, capped at allocated output holdings and rounded down to output-asset precision. Thus an exit can reduce a position over several observations; it does not necessarily liquidate it. If both groups match without output inventory, exit priority yields no allocation and does not fall through to a buy. `exit: null` simply disables rule-driven sells.

The runtime consumes each ready completed observation once, including a close rejected by cooldown or followed by no fill. A later timer tick cannot reuse that same close after cooldown expires. Successful fills update trade time; a new observation can produce a new level signal. Editing strategy settings clears the consumed-observation marker so the revised rule has its own evaluation state.

Changing a saved bot's strategy or execution limits also removes its attached research summary, which describes the previous specification. Renaming a bot preserves the summary. The original study remains in the research library.

Research evaluates a decision close and fills at the **next observed close**, applying the configured directional network fee, output swap fee, slippage, balance, trade limit, and fee budget. Cooldown is measured between actual fills. The final close cannot execute another signal without a subsequent observation. These indicative prices do not reconstruct historical route liquidity or intrabar execution.

## Chronological validation

Composed-rule studies freeze the complete rule configuration and force `optimize: false`. Each fold therefore evaluates one unchanged specification; the existing parameter search for other presets is not silently applied to rule trees.

The default is three expanding training intervals followed by disjoint test intervals. One observation is excluded between each training end and test start. Test indicators receive only preceding history, including the permitted gap observations. Each test starts from fresh initial holdings, fee totals, cooldown, and consumed-close state. Training positions and fills never carry into a test portfolio.

Ordered splits avoid training on future observations; equal-duration comparisons also require equally spaced samples. A one-observation gap does not guarantee statistical independence. [Scikit-learn TimeSeriesSplit](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html)

Keep three distinct forms of evidence separate:

- The full study is one chronological portfolio replay with repeated fixed-amount fills.
- The candidate histogram marks overlapping opportunities to a common final close. Candidates are dependent and excluded opportunities are not an executable combined portfolio.
- Held-out folds replay the frozen rule over later chronological intervals with fresh portfolios. Display actual dates, fill counts, drawdown, net returns, and comparable entry-cost passive baselines. Zero fills provide no evidence about active trading success.

Neither a green fraction of candidates nor three positive folds estimates the probability of future profit. A linear return per day describes elapsed historical performance, not annualized or forecast returns. Repeatedly changing a rule after reading test results consumes those tests for selection. Log attempted compositions and evaluate a frozen final specification on later untouched observations. The full attempted rule universe matters to data-snooping analysis. [Sullivan, Timmermann and White (1999)](https://onlinelibrary.wiley.com/doi/abs/10.1111/0022-1082.00163)

The probability of backtest overfitting framework is a separate selection diagnostic; this feature does not implement its CSCV/PBO calculation. [Bailey et al.](https://www.davidhbailey.com/dhbpapers/backtest-prob.pdf)

## Research provenance and limits

Ivan Idris's original [NumPy Examples repository](https://github.com/ivanidris/NumPy-Examples) and the archived strategy-series page informed the educational treatment of simple statistics. The retrieved Git tree was `433e8e51e1f3c2b0d16d0ea84649d00ed59a1588`, containing five strategy examples plus their README. The exact accessible series-index capture was [2020-10-20 03:36:32 UTC](https://web.archive.org/web/20201020033632id_/http://ivanidris.net/wordpress/index.php/series/numpy-strategies). That index identified a 23-part series but exposed one post excerpt. Other attempted pagination/post snapshots returned errors or timed out; the full original series was not verified. Retrieval evidence is in `output/bots-composable-research/idris-*`.

The implementation was written independently from mathematical definitions. No code from the unlicensed example repository was copied into the application. In particular, it does not adopt the examples' independent price-level bootstrap or Markov stationary-vector calculation as a future-profit probability.

Moving-average and range rules have historical research precedent in [Brock, Lakonishok and LeBaron (1992)](https://onlinelibrary.wiley.com/doi/10.1111/j.1540-6261.1992.tb04681.x). Own-return momentum has evidence at monthly horizons in a diversified futures/forward study by [Moskowitz, Ooi and Pedersen (2012)](https://docs.lhpedersen.com/TimeSeriesMomentum.pdf). Those markets, horizons, and exposure conventions do not validate these hourly long-only spot recipes. Volatility management research motivates studying exposure separately from direction; it does not validate this MAD threshold. [Moreira and Muir](https://www.nber.org/papers/w22208)

## Engineering verification: 2026-09-15

An offline fixture generated 5,000 deterministic hourly closes with alternating regimes, bounded noise, and occasional jumps. It mocked the verified-source boundary solely for engineering tests. These prices, fill counts, and timings are **not historical market performance**. Costs were explicit, with different buy/sell network fees, 0.3% swap fees, 0.5% slippage, and 12-hour fill cadence.

| Recipe | Full-study candidates | Full-study fills | Test-fold fills | Full study plus three folds | Standalone replay |
| --- | ---: | ---: | --- | ---: | ---: |
| trend | 4,999 | 202 | 20 / 23 / 4 | 2.13 s | 0.40 s |
| breakout | 4,999 | 235 | 21 / 29 / 3 | 2.86 s | 0.62 s |
| dip | 4,999 | 290 | 25 / 33 / 4 | 4.38 s | 1.01 s |
| quiet | 4,999 | 276 | 28 / 33 / 14 | 7.54 s | 1.89 s |

For every recipe, research and standalone accounting matched exactly, including all fill events, balances, and equity. The audit also checked next-close timing, cooldown, fresh fold portfolios, warm-up counts, source immutability, runtime future filtering, duplicate-close consumption, and exit precedence.

An eight-leaf group containing identical 200-return MAD conditions took median 1.31 ms and p95 1.40 ms per evaluation over 200 realistic-magnitude fixture windows after duplicate work was cached. The same duplicate-heavy configuration previously took median 9.86 ms. A deliberate parser-limit stress using 100-digit price strings took median 5.79 ms and maximum 7.34 ms over 20 windows after caching, versus median 47.19 ms before it. These are local Node 26.8.2 measurements, not browser frame-rate guarantees or an upper bound for eight distinct leaves. Research runs in its worker; complex configurations cost more than the simple recipes.

Fractions are reduced by greatest common divisor. MAD has a fixed number of fraction-combination stages and two bounded sorts; denominators do not multiply across the full historical series. Cost depends on at most eight leaves and windows of at most 200 returns, with up to 202 closes needed. A local cache reuses evidence for identical canonical leaf definitions within one evaluation only. It has at most eight entries and returns detached evidence objects; no values survive into the next observation.

Evidence and reproducible commands:

```sh
node .yarn/releases/yarn-4.10.3.cjs test:unit --project unit tests/unit/features/bot-trading/strategy-rules.spec.ts
node .yarn/releases/yarn-4.10.3.cjs tsx --tsconfig output/bots-composable-research/audit-tsconfig.json output/bots-composable-research/audit-rules.ts
node .yarn/releases/yarn-4.10.3.cjs tsx --tsconfig output/bots-composable-research/audit-tsconfig.json output/bots-composable-research/audit-extreme-decimals.ts
```

The pure module's 72 focused tests passed, including exact formulas, preceding-window exclusions, Type-7 interpolation, signed thresholds, constant ties, malformed configuration, decimal limits, chronology, all/any warm-up, immutable inputs, and detached per-observation caching. ESLint passed for the module and tests. Audit outputs are `output/bots-composable-research/runtime-audit.json` and `runtime-audit.log`; broader integration/build/browser evidence is recorded separately.

### Translation coverage

Short editor, condition, recipe, and walkthrough labels are localized. Some nuanced explanatory paragraphs retain the English fallback where translation service rate limits prevented completion. The language-drift threshold was not relaxed. All 13 translation checks passed after the catalogs settled, including key parity, placeholders, script constraints, and the existing drift limit. The scoped manual-label report for Arabic, Hebrew, Dutch, Polish, Czech, Italian, Ukrainian, and Serbian is `output/bots-composable-research/manual-rule-labels-report.json`; it records 65 labels per locale. Test evidence is `manual-rule-translation-tests.log` in the same directory.

## Shareable rules

The lab's share link encodes only the canonical public rule configuration as bounded base64url JSON in `#/bots/lab?rules=…`. It preserves the static IPFS path prefix and drops unrelated query/account/provider state. Opening a link mounts a draft; it does not start a study, create a funded bot, or grant trading authority. Existing `#/bots/backtesting`, `#/bots/lab`, and `#/bots/my-bots` routes remain directly addressable.
