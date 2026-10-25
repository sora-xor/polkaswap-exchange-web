# Partial-inventory design review — 21 September 2026

**Recommendation:** first test whether a permitted partial inventory change can
be made before a goal latch, at the actual fee floor. Then evaluate a small,
preregistered strategy family. A smaller entry band alone does not repair the
inventory and controller mismatch.

Scope: code and primary literature available by this date; no new study, market
read, parameter selection or validation access. The failed study stays immutable.
The coordinating diagnostic reported zero fills, fees and excess return for both
candidates; mean net return was 0.5063% from passive inventory. Their per-episode
XOR-denominated portfolio drawdowns were 5.47%, 14.59%, 17.95% and 6.47%. Episodes
0/2 latched target and 1/3 latched loss. Those are supplied diagnostic results,
not independently reread data in this review.

## What the existing code does

`goal-exact-ledger.ts` starts with the funded KUSD plus a protected 1 XOR fee
reserve. It values the **whole allocation from funding** in XOR:

`V = k × P + x`, where `P = pool XOR reserves / pool KUSD reserves`.

Consequently, idle KUSD is exposed in the goal's numeraire. A rise in the KUSD
price of XOR reduces the XOR value of KUSD. The reserved XOR cannot be sold as
an initial trading position. `pool-history.ts` supplies the inverse price,
KUSD per XOR, to the strategy; `strategy-rules.ts` measures deviation from a
moving average. Its ±25% indicator bands and the 5% portfolio drawdown are
**different quantities**, not interchangeable percentages.

`goal-episode-evaluator.ts` records a fresh minute valuation before admitting a
trade. `observed` latches +5% target or 5% peak drawdown even without a fill;
`assessGoalExactFill` rejects further orders once latched. Hourly entry rules can
therefore wait until the trading window has already closed. The outcome remains
latched, but holdings continue to be marked until the fixed deadline. Stopping
orders does not liquidate holdings or guarantee that subsequent drawdown stays
below 5%. This is the declared `stoppedHoldings` policy, not an indexer fault or
proof that transaction fees prevented the zero-fill candidates.

Preserve the 10 KUSD funding ceiling, protected fee reserve, partial fixed lots,
5% limits, hourly signals, quote/impact/fee checks and fixed deadline. Disabling
the latch until the first trade, resetting its peak, resuming after stop, or
calling a passive gain trading alpha would change the result incorrectly.

## Three hypotheses worth separating

| Approach | Testable hypothesis and partial-inventory behavior | Costs and limitations |
| --- | --- | --- |
| **1. Goal-numeraire inventory target with a cost band** | A predetermined, risk-constrained XOR/KUSD target, reached through permitted lots from the first eligible decision, may reduce exposure to passive KUSD drawdown before a distant price entry. Rebalance only when the deviation is material. Treat this first as a risk-control baseline, not an alpha model. | Evaluate hold and the existing fixed-lot buy/sell actions under the same exact fee and drawdown gates. Fixed per-transaction fees create a minimum economical adjustment; arbitrarily small slices are unsuitable. It can underperform passive KUSD when XOR weakens, and gaps may defeat every permitted action. |
| **2. Stop- and deadline-aware mean reversion on a bounded trading sleeve** | Keep a separately bounded tradable sleeve above the fee reserve. Enter only when a causally estimated reversion opportunity can complete within the remaining horizon and before the existing goal barrier. Couple entry, exit and risk headroom instead of choosing independent wide bands. | Require estimated cycle advantage to exceed both execution legs, native fees and uncertainty. A rolling average does not prove that KUSD/XOR is stationary; reject the hypothesis if reversion speed or direction is unstable. The model may correctly produce no feasible trade. |
| **3. Slow predictive signal with partial movement toward a target** | A persistent trend or other independently supported predictor can change a target inventory at the first eligible observation; it need not wait for a new crossover or a 25% displacement. Trade one allowed lot toward that target, then reassess on later completed hours. | Slow signals may amortize fees over a longer holding interval; hysteresis limits whipsaw turnover. Fast signal decay or a 24-hour horizon can eliminate that benefit. Predictability must be demonstrated independently; an optimizer cannot supply it. |

These are proposed adaptations, not profitability findings. Boyd et al.'s
[multi-period trading framework (2017)](https://web.stanford.edu/~boyd/papers/cvx_portfolio.html)
supports explicitly trading off forecasts, risk and costs while executing only
the first planned action; it does not establish predictive signals. Lobo, Fazel
and Boyd's [fixed-cost portfolio formulation (2007)](https://stanford.edu/~boyd/papers/portfolio.html)
also explains why linear-cost optimization alone cannot represent native fees.

Leung and Li's [stop-loss mean-reversion model (2015)](https://arxiv.org/abs/1411.5062v3)
jointly derives entry and exit regions with costs and a stop; Kitapbayev and
Leung's [finite-deadline model (2018 revision)](https://arxiv.org/abs/1707.03498v3)
makes remaining entry/exit time explicit. Their assumed price processes and
position-level stops are not this portfolio's trailing drawdown rule; transfer
the joint-design principle, not their thresholds.

Gârleanu and Pedersen's [dynamic trading model (2013)](https://pages.stern.nyu.edu/~lpederse/papers/DynamicTrading.pdf)
motivates partial adjustment and consideration of signal persistence. Its
return/cost assumptions and commodity-futures results do not establish a
Polkaswap edge. Here the target must remain unlevered and actions must obey the
existing fixed codec lots; adaptive sizing would need a separately specified
policy, not an implicit execution-time resize.

## Fee feasibility before forecasting

Let the current peak be `M` and remaining drawdown headroom be
`H = V − 0.95M`. For a buy of `q` KUSD, minimum output `y` XOR and conservative
native fee `F` XOR, the existing exact gate must check both:

`Vsuccess = (k − q)P + x + y − F > 0.95M`

`Vfailure = kP + x − F > 0.95M`.

The quoted minimum already includes the route's trading costs and the declared
slippage margin; do not subtract those again. Native fee is separate. For a
hypothetical later sale yielding `q'` KUSD, cycle excess over keeping the original
inventory, at the same terminal mark, is `(q' − q)P_terminal − total_native_fees`.
For retained XOR after a single buy it is `y − qP_terminal − F`. Positive passive
return is not positive excess. A future sale/mark is uncertain, so neither formula
turns a present quote into guaranteed profit.

With an explicitly declared adverse next-observation move `P' = P(1−d)`, the
remaining KUSD exposure adds `(k−q)Pd` to prospective loss. This provides a
synthetic reachability test, not a guaranteed market bound. If no permitted lot
fits fee headroom and the declared scenario before the latch, changing the
indicator cannot make the allocation feasible under those assumptions.

## Next bounded engineering experiment

Build an offline **synthetic** reachability harness around the unchanged exact
ledger, completed-hour signal and episode evaluator. Compare passive inventory,
the existing delayed-entry shape, and approach 1 using only hold or existing
inventory-capped fixed lots. Use declared rational paths covering flat prices,
both monotone directions, reversal, a jump before the first completed hour,
publication delay and fee-only failure. Sweep structural boundary cases around
the unchanged target/drawdown conditions; select no threshold from study prices.

Record first eligible decision, first proposal/fill, target/loss latch, rejection
reason, fees, residual exposure and deadline excess. Required assertions: no full
budget swap, no reserve spending, no post-latch trading, no peak reset, and both
success/failure cost checks. The experiment succeeds by proving when actions
are reachable and when they are infeasible—not by manufacturing positive PnL.
Adding minute-level defensive orders or post-stop liquidation would alter v2
controller semantics and needs separate specification; neither is part of this
experiment. No new qualification run is started here.

Only after this engineering check: preregister at most three fully specified
candidates on fresh eligible training data and a separately sealed untouched
out-of-sample partition. Preserve the failed study and its unopened validation;
do not recycle that validation for tuning. Recompute same-state reserves,
denomination, completed-hour history, modeled/observed timing, both fee APIs and
conservative fill effects; report all rejected/no-trade periods and compare
against the identical passive allocation. Require positive net **and excess**
results with actual fills and every existing drawdown criterion, then independent
replication across regimes. Current runtime 131 needs its own exact fee/execution
compatibility evidence; historical runtime-130 results cannot authorize it.
