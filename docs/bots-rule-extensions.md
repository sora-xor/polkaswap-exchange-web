# Close-only strategy filters

The Bots rule composer accepts the following additional threshold leaves. Each uses the existing shape
`{ kind, window, direction, threshold }`, with an integer `window` from 2 to 200, `direction` equal to
`above` or `below`, and an ordinary decimal string for `threshold`. Comparisons are strict: equality
does not pass. These transparent historical filters do not estimate an expected profit.

Let `C[t]` be the most recent **completed** close supplied for a decision. Callers must exclude all
future observations. Prices must be positive, timestamps must increase strictly, and calculations
use exact bigint fractions. Displayed evidence truncates to 36 decimal places after the comparison.

| Kind         | Measure                                                                                   | Threshold range | Required closes |
| ------------ | ----------------------------------------------------------------------------------------- | --------------- | --------------- |
| `efficiency` | `100 * abs(C[t] - C[t-N]) / sum(abs(C[i] - C[i-1]))` for the last N changes               | 0 to 100        | N + 1           |
| `rsi`        | `100 * sum(gains) / (sum(gains) + sum(losses))` for the last N changes                    | 0 to 100        | N + 1           |
| `drawdown`   | `100 * (C[t] / max(C[t-N+1], ..., C[t]) - 1)`                                             | -100 to 0       | N               |
| `restoring`  | `-100 * b`, fitting `change = intercept + b * laggedClose` to the preceding N transitions | 0 to 100        | N + 2           |

## Path efficiency

Efficiency measures how directly the price traveled from its starting point to its latest close.
A steadily rising or falling path has value 100; a path returning to its starting point has value 0.
A completely flat path also has value 0. The score is unsigned, so combine it with a trend or momentum
condition to select a direction. For example, an `all` group can require momentum above zero and
efficiency above 50. Neither observation alone predicts that a trend will continue.

## Simple-window RSI

Gains and losses are absolute price changes, with losses accumulated as positive magnitudes. This
implementation uses a finite simple window, **without Wilder smoothing** or recursive state. An
all-gain path is 100, an all-loss path is 0, and a flat path is neutral at 50. Users can combine RSI
below a selected threshold with a positive momentum condition to express an oversold recovery
hypothesis. An oversold observation alone is not evidence that prices have bottomed.

## Rolling drawdown

The current close participates in the rolling peak, so a new or repeated window high has value 0.
A close 25% below its window peak has value -25. An `above -10` condition requires the current
drawdown to be less severe than 10%; a `below -10` condition requires it to exceed 10%. This is
drawdown of close prices from a rolling price peak, not portfolio drawdown, maximum historical
drawdown, or a position-dependent trailing stop. The peak can fall when an older high leaves the
window. Positive closes cannot reach -100, although -100 is an accepted threshold boundary.

## Restoring-strength estimate

The spring-inspired filter fits a first-order, overdamped mean-reversion heuristic. The prior sample
contains closes `C[t-N-1]` through `C[t-1]`; the current close and current transition are excluded from
the regression. For each of the N pairs, set `x = laggedClose` and `y = nextClose - laggedClose`.
Compute the OLS slope with an intercept:

```text
b = (N * sum(x*y) - sum(x) * sum(y)) / (N * sum(x*x) - sum(x)^2)
restoring = -100 * b
```

For the exact process `nextClose = 50 + 0.5 * laggedClose`, the score is 50. Negative estimates
describe divergent fitted dynamics; estimates above 100 describe a negative fitted AR(1)
coefficient. The evidence may be outside the accepted threshold range. Two leaves, `restoring above
0` and `restoring below 100`, can bound the estimate to a non-oscillatory mean-reversion hypothesis.
That pair can be combined in an `all` group with deviation below -2 and two-observation momentum
above zero, preserving the four-leaf limit.

Every timestamp in the required N + 2 close tail, including the decision observation, must have the
same spacing. A gap or zero variance among the lagged prices produces unavailable evidence rather
than a fabricated zero. Other leaf kinds retain their existing chronological validation and do not
require equal spacing. Missing evidence prevents either group from authorizing a signal, even when
another leaf in an `any` group passes.

This dimensionless, per-observation estimate is not a physical spring constant, a continuous-time
OU parameter, or a stationarity test. Small windows and changing regimes can produce unstable
estimates. Validate composed hypotheses chronologically, reserve held-out periods, and include
fees and slippage in evaluation; do not interpret the fit as proof of a trading edge.

## Illustrative lesson

Before historical candles are supplied, the animated rule lesson uses authored hourly prices. A
rule set containing `restoring` selects a bounded repeating dip-and-recovery path, with closes from
95 to 103. That path lets the unmodified spring recipe demonstrate separate entry and exit matches.
Each marker still comes from the actual evaluator over its preceding history; extending the sample
does not change earlier closes. Custom conditions may remain unmatched. The authored path is labeled
illustrative and never supplies historical backtest or research performance data.

## Validation

Run `yarn test:unit tests/unit/features/bot-trading/strategy-rules.spec.ts`. The suite covers exact
decimal comparisons, threshold bounds and strict ties, gain/loss edge cases, lagged restoring fits,
cadence gaps, flat regression samples, warm-up boundaries, trailing history, and frozen inputs.
The `engine.spec.ts` and `rule-flow.spec.ts` suites also cover the maximum 202-close restoring warmup,
future-observation filtering, cadence recovery, percentage labels, and next-close spring buy/sell fills.
