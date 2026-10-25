# Two unregistered partial-order research candidates

**These are executable rule hypotheses, not profitable or qualified strategies.**
The [exact configurations](bots-partial-candidates-20260921.json) contain two
candidates and no study registration, runtime profile or final date window.
No market, validation or current-GO data was read for this proposal. The window
length and sign boundaries below were chosen from the declared 24-hour horizon
and model structure, not fitted to observations. No parameter grid is proposed.

The [chronological date proposal](bots-next-study-dates-20260921.md) describes
May 29–June 3 training and June 3–5 validation. It is **not the final study route**:
the coordinating runtime audit identifies the May/June historical profile as
130, whereas current execution requires 131. A passing 130 certificate cannot
authorize 131. Resolve a supported runtime and exposure route before any new
economic acquisition. The completed 46-hour operational history extension is
disclosed in [its report](reports/bots-indexer-46-hours-2026-09-21.md); it neither
registers this proposal nor supplies strategy results.

## Common execution semantics

Both configurations use existing `StrategyConfig` and the unchanged v2 exact
goal path: **10 KUSD**, **separate protected 1 XOR fee reserve**, **24 hours**,
**5% target and 5% peak drawdown**, completed-hour signals, and **six hours after
a successful fill** before another permitted fill. Buy up to **5 KUSD** and sell
up to **1 XOR**, capped to actual spendable inventory. Native fees consume the
reserve; the reserved XOR cannot fund a sell. The sell amount is the exact goal
path's XOR lot, not the legacy engine's price-sized sell amount.

No order converts all 10 KUSD. Two buys may nevertheless spend both halves; the
current strategy language cannot maintain a permanent 50% KUSD sleeve. A 1 XOR
sell may unwind only a small portion of a 5 KUSD buy. At most four successful
fills fit the 24-hour/six-hour schedule; failed transactions do not reset that
cooldown and can charge fees on later completed hours. No same-hour retry is
allowed. These facts make turnover and residual inventory material.

The shared policy still applies 50 bps minimum-output slippage, the 1% impact
limit, the frozen conservative native-fee policy, fee budget and both exact
success/failure drawdown checks. A minute valuation can latch the goal before
the first signal, or before any later exit. Latching stops orders and preserves
the peak; it does not liquidate holdings. Stopped holdings remain valued until
the original deadline. No candidate changes these controller semantics.

**Existing cost admission is not an expected-profit test.** Neither ruleset can
compare a forecast cycle gain with fees, reference an entry cost basis, require
enough time for a later exit, seed only once, or trade toward an inventory target.
They have no fitted predictor, dynamic fee band or hidden sizing override. The
unused common fields `threshold`, `direction`, `fastWindow` and `slowWindow` are
serialized for the existing contract; only `rules` supplies the indicators.

## Candidate 1: partial level trend, 24 closes

Let `C` be KUSD per XOR and `A24` the arithmetic mean of the latest 24 completed
closes, **including the current close**. Buy when `C > A24`; sell when `C < A24`;
hold on equality. After cooldown, the same level predicate may propose another
fixed lot. This requires 24 closes and no new crossover, so it can enter at the
first eligible observation when XOR is already strengthening.

Hypothesis: persistence over the subsequent holding interval is sufficient to
offset implementation costs, and later reversals sometimes allow a profitable
partial sale. Earlier XOR exposure may also reduce the passive KUSD allocation's
XOR-denominated drawdown. That risk effect is **not** evidence of alpha: an
immediate sole buy cannot finish with both positive net and positive excess,
as shown below. Flat/noisy crossings can pay costs repeatedly; the six-hour
cooldown limits successful turnover but supplies no expected-return edge.

[Moskowitz, Ooi and Pedersen (2012)](https://pages.stern.nyu.edu/~lpederse/papers/TimeSeriesMomentum.pdf)
report persistence at **one-to-twelve-month** horizons in diversified futures.
That primary evidence motivates a directional hypothesis, not an hourly
Polkaswap claim. [Gârleanu and Pedersen (2013)](https://pages.stern.nyu.edu/~lpederse/papers/DynamicTrading.pdf)
connect costly partial adjustment with forecast persistence under their model;
this simple rule does not implement their optimal policy.

## Candidate 2: restoring-regime pullback, 24 prior pairs

Use the same `C` and `A24`. On the preceding 24 adjacent hourly pairs, excluding
the latest return, the existing `restoring` leaf fits
`ΔC = intercept + beta × C + residual` and reports `r = −100 × beta`.
Buy only when **`C < A24` and `0 < r < 100`**. Sell when **`C > A24`, `r < 0`,
or `r > 100`**. All comparisons are strict. At exactly 0 or 100, the coefficient
alone neither enters nor exits; the price exit can still pass. A missing fit or
zero regressor variance makes the whole ruleset unready, including its exit:
it holds and the unchanged portfolio controller still applies. There is no
forced liquidation on an unavailable model.

This needs 26 closes and retains the OLS intercept. `0 < r < 100` corresponds to
an estimated level autoregression slope `0 < 1 + beta < 1`; it excludes explosive
and oscillatory fitted slopes. It is **not** a stationarity test or a confidence
interval. The mean used for the price rule is `A24`, not the fitted OLS equilibrium.
The stated hypothesis is modest: a below-mean completed close in a locally
restoring regime may recover sufficiently within the remaining episode to
cover a later 1 XOR sale and both legs' costs. The window may be too short,
the fit unstable, and the six-hour wait or target latch may prevent that sale.

[Leung and Li (2015)](https://arxiv.org/abs/1411.5062v3) solve joint entry/exit
timing with transaction costs and a stop for an assumed mean-reverting spread.
This proposal borrows the requirement to assess an entire cycle; it neither
implements their stopping solution nor establishes that a raw token price is
their spread process. Its coefficient bounds are structural, not learned from
the failed candidates or protected observations.

## Necessary fee economics, independently of the indicator

Use XOR per KUSD `P = 1/C`, initial KUSD `K = 10`, reserve `R = 1` and initial
equity `V0 = K P0 + R`. A sole buy spends `q < K` at mark `B`, receives `y` XOR
and pays native fee `F`. Its total XOR implementation cost is
`c = q B − y + F`. The quoted minimum already includes pool/slippage effects;
do not subtract them a second time. Take `y` as the conservative minimum for
research admission, or the exact actual output for realized accounting.

With no other fills or charges and terminal mark `T`,

```text
net change    = (K − q) T + q B − c − K P0
excess change = q (B − T) − c
```

For both changes to be positive, the permissible terminal interval is

```text
(K P0 − q B + c) / (K − q) < T < B − c/q,
which is nonempty only if q (B − P0) > c.
```

An immediate sole buy (`B = P0`) with positive cost cannot meet both criteria.
Before a first buy, the unlatch requirement also gives
`K (B − P0) < 0.05 V0`. Thus a buy no larger than half the initial KUSD requires
`c < 0.025 V0`. If that cost floor is at least 2.5% of opening XOR equity, the
one-buy/no-sale shape is impossible under these assumptions. This is a
necessary condition, not sufficient feasibility: the actual path, goal peak,
fee reserve and receipt timing impose additional constraints. It is not a
global impossibility result for staged buys or genuine cycles, nor a claim
about the qualification gate's averages across multiple episodes.

For one buy and a later partial sale of `s <= y` XOR producing `z` KUSD, with
native fees `Fbuy` and `Fsell`, exact terminal excess over unchanged funding is
`(z − q) T + y − s − Fbuy − Fsell`. Do not pretend a 1 XOR sale closes all `y`.
Every proposed leg also needs current strict headroom
`Vsuccess > 0.95 × peak` and `Vfee-only-failure > 0.95 × peak`, and the remaining
fee budget. A later sale's price, fee and chance of execution are unknown at
entry. No current price or fee was sampled in this task, so neither candidate's
economic feasibility is established.

There is deliberately no third immediate-conversion/DCA predictive candidate.
DCA can spend 5 KUSD initially and the other half after six hours but has no
sell predicate. It is a useful allocation/cost comparator, not a demonstrated
forecast. The [completed synthetic reachability experiment](bots-synthetic-reachability.md)
already separates risk reduction from profitable trading. A true risk-target
baseline requires policy/state absent from `StrategyConfig`.

[Lobo, Fazel and Boyd (2007)](https://stanford.edu/~boyd/papers/portfolio.html)
motivate treating fixed transaction charges explicitly.
[Boyd et al. (2017)](https://web.stanford.edu/~boyd/papers/cvx_portfolio.html)
separate cost/risk optimization from the forecasts it consumes. Neither source
supplies the missing hourly edge or validates these exact configurations.

## Next bounded decision

After resolving a runtime-compatible, exposure-eligible route, freeze these
two exact configurations, sources, chronology and unchanged economics **before
any strategy acquisition**. Then use the existing complete four-episode
training boundary, with no threshold retuning or extra candidate variants.
Report first decision/fill/latch, every rejected order, successes/failures,
fees, sale amounts and residual inventory; classify one-buy shapes separately
using the algebra above. Require the existing positive net and excess means,
actual fills and every per-episode drawdown gate. No training pass means no
selection and no validation access. Any selected candidate then needs both
sealed validation episodes and current-runtime execution compatibility.

The offline configuration checks use only declared synthetic decimals and the
actual parsers/rule evaluator. They establish expressibility and exact branch
semantics, not profitability, funding approval or qualification. This proposal
does not change production strategy, fees, risk limits, registry or failed-study
artifacts.

Run the focused checks with:

```sh
yarn vitest run --config vitest.config.mjs --project unit-scripts tests/unit/scripts/bots/goal-proposed-candidates.spec.ts
```

The inspected contracts are [StrategyConfig](../src/features/bot-trading/types.ts),
[strict rule evaluation](../src/features/bot-trading/strategy-rules.ts),
[signal cadence](../src/features/bot-trading/engine.ts),
[exact inventory sizing](../src/features/bot-trading/goal-signals.ts),
[cost and stop admission](../src/features/bot-trading/goal-exact-ledger.ts), and
[qualification binding and eligibility](../src/features/bot-trading/goal-qualification.ts).
