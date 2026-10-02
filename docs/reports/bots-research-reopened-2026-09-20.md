# Bots research reopened — 20 September 2026

The earlier rejection established an impossibility for the **current hourly replay**, not for every live trading policy. Research is active again. The best next experiment is a cost-aware, partial XOR inventory policy evaluated with separate signal and execution clocks. This report does not qualify a strategy, change production admission, or claim a profitable transaction.

## What the source review established

1. **Timing differs.** Historical research starts the allocation at close 0 and fills the first decision at close 1, one hour later in GO. The live controller can evaluate a current observation and request a quote in the same evaluation cycle. An interval controls later fills; it does not force a one-hour startup delay. Closed-hour indicators must still consume only completed hours. We must measure later execution observations after the decision, not pretend the signal's price was an available fill.
2. **Warmup differs.** Live indicators can read earlier completed history. Research already supports preceding fold warmup, but GO starts its top-level training indicators inside its allocation window. A separate prior warmup may fix initialization artifacts. It cannot shift funding time, invent an SMA crossing, or reset the opening exposure.
3. **Trade count is a heuristic.** Five fills per partition is a software screening choice, not the user's goal or statistical proof. Approximately 0.1 XOR per transaction makes frequent turnover expensive for 10 KUSD. The replacement needs an independently specified evidence protocol; simply deleting this gate would not establish an edge.
4. **We need retained-lot data.** The existing development collector quotes the reverse of each sample's new hypothetical buy minimum. Later reverse quotes therefore do not price the position acquired at an earlier sample. Backtesting exits with those varying amounts would be incorrect.

Exact source references and the indexer retention audit are in [the timing design](../../output/go-history/research-20260920/timing-design.md). Existing five-minute indexer snapshots have limited retention and do not carry the full finalized provenance of the verified hourly path. Executed trade history cannot substitute for every intervening pool state. No historical sub-hour prices have been interpolated or invented.

Faster execution is a hypothesis worth testing, not a solution by itself: over the already inspected opening hour, even an instantaneous **zero-cost 5 KUSD entry** still has **5.3486170603%** drawdown. The full idle allocation's 10.6972341207% bound remains correct for the existing next-hour replay.

## Three concrete hypotheses, in order

| Hypothesis | Proposed behavior | Evidence still required |
| --- | --- | --- |
| H4: Manage target XOR inventory on observed events | Use prior closed-hour signals; obtain a fresh executable quote after a decision; place a partial order when a declared inventory target changes enough to justify cost. Carry the original funding baseline, peak, reserve and remaining lifetime. | Provenance for prior warmup, separate decision/receipt timestamps, fixed-lot quotes, inclusion/failure assumptions and a fresh full-length evaluation. |
| H5: Add a cost-based no-trade band | Avoid repeatedly switching directions for small forecast changes. Keep the current position until a conservative predicted benefit exceeds actual route/network/impact costs and model uncertainty. Charge each acquired lot correctly. | A specified forecast and uncertainty model, a frozen band rule, exact cost accounting and evidence that reduced churn improves net results rather than just reducing activity. |
| H6: Accumulate XOR asymmetrically | Spend partial KUSD only when a declared net-XOR acquisition advantage is present. Retain acquired XOR unless a separately evidenced rotation can earn more XOR after both legs' costs. No mandatory sale or whole-budget swap. | A fixed comparison baseline, residual-KUSD risk, prospective entry/exit quotes and demonstrated net value growth. Receiving XOR in exchange for KUSD is not itself profit. |

These hypotheses share a practical design: the AI researches a policy; deterministic code evaluates fresh data, exact amounts, fees and limits. The current quote and protected XOR fee reserve remain authoritative. Waiting in KUSD is exposure when performance is measured in XOR. A risk check can reject an order; it cannot guarantee a continuous 5% loss cap during a price gap or unavailable browser.

## Relevant research available by 20 September 2026

- **Blomvall, Ekblom and Birge, published 4 September 2026:** approximate dynamic programming models predictable returns, heterogeneous proportional costs and portfolio constraints. Precomputed value approximations permit efficient subsequent decisions. Our inference is to separate policy research from fast deterministic execution. Their numerical results do not validate SORA's fixed fees, this pair or this budget. [Primary article](https://www.tandfonline.com/doi/full/10.1080/14697688.2026.2708220).
- **Ma and Smith, revised 17 December 2024:** a simplified single-asset model combines signal filtering and a no-trade region to reduce trading frequency for a return objective. It motivates H5; its unit long/short assumptions are not our long-only wallet constraints. [Primary paper](https://arxiv.org/abs/2411.07949).
- **Gençay, preprint 27 August 2026:** strategy discovery needs structural protection against future information and a record of all trials. Its evaluated LLM searches did not survive the paper's honest selection tests. This supports freezing policy and future evidence rather than repeatedly searching the same exposed window. It does not prove all AI strategies fail. [Primary paper](https://arxiv.org/abs/2608.27734).
- **Amaral, preprint 1 August 2026:** seconds-scale mean reversion assumes order-book dynamics and an observable efficient-price gap. Those inputs are absent here; replacing hourly candles with faster samples does not implement that model. [Primary paper](https://arxiv.org/abs/2608.00885).
- **He, Yang and Zhou, revised 9 September 2026:** DEX arbitrage involves fee competition, ordering, reversion and inventory risk. A favorable composed quote alone is insufficient evidence of executable arbitrage. The earlier exact-pair source audit found no independent direct route to justify that approach. [Primary paper](https://arxiv.org/abs/2507.08302).

## New experiment and reproducibility

Before opening the connection, the protocol fixed 21 observations, 30 seconds apart, using the approved MOF RPC and the direct DEX 0 XYK KUSD/XOR pool. Each forward quote is **5 KUSD**, within the **10 KUSD** allocation; the separate reserve is **1 XOR**. Slippage is 0.5%. The immutable manifest binds collector sources, exact amounts and the schedule. Every complete, failed or missed observation remains in the hash-chained journal. No wallet or broadcast interface is used.

The offline cost analysis uses integer amounts and exact rational arithmetic. Its indicative mark matches the live bot's impact-free quote mark, which embeds route fees; it is not gross pool spot or independently measured liquidation value. It debits the network fee once and does not double-charge route costs already in the quote minimum. Immediate cost feasibility is not profitability, a subsequent risk guarantee, or qualification.

A separate prefix diagnostic fixes funding at slot 0's receipt, a decision after that receipt, and only slot 1 as the candidate sampled execution. It requires a later request and advancing finalized block. It preserves the original peak and checks fresh pre-entry, successful-entry and failed-entry-fee branches. No search for a more favorable starting slot or execution slot is permitted. This is a timing diagnostic specified during development collection, not a preregistered profit test or untouched acceptance sample.

The collector records whole-snapshot latency, not individual quote freshness or actual transaction inclusion. Its 25-second deadline cannot establish the production admission requirement for a quote fresher than five seconds. Ten minutes cannot establish the 24-hour goal; later reverse quotes do not represent retained inventory. All results remain development evidence.

Artifacts: [frozen protocol](../../output/go-history/research-20260920/prospective-protocol.md), [manifest](../../output/go-history/research-20260920/execution-development/manifest.json), [cost analysis](../../output/go-history/research-20260920/analyze.py), [timing design](../../output/go-history/research-20260920/timing-design.md).

## Measured result of the 21-slot run

The frozen run completed **21 of 21 slots**, with **21 distinct finalized blocks**, no errors and no missed observations. Whole-snapshot collection took **9.493–19.418 seconds**. The pinned quote amounts were unchanged across the observations.

For the fixed 5 KUSD scenario:

| Quantity | Exact amount or result |
| --- | --- |
| Original indicative value: 10 KUSD plus reserve | 2.34096719694900217 XOR |
| Conservative acquired amount | 0.657937412825365695 XOR |
| Estimated transaction fee | 0.100020712589707326 XOR |
| Remaining KUSD | 5 KUSD |
| Total indicative value after entry and fee | 2.228400298710159454 XOR |
| Immediate decline | 4.8085636734% |
| Additional XOR price rise reaching the 5% floor, holding this inventory and mark convention fixed | 0.6728899745% |

This is a narrow entry-cost pass, with very little remaining risk headroom. It supports measuring timing properly; it does **not** support frequent trading or a profitable strategy claim. The fee alone is 4.2726234148% of opening indicative value. The causal prefix diagnostic admitted its one sampled entry on both success and fee-only failure branches and observed the same 4.80856% drawdown across its ten-minute path. Neither the target nor loss latch fired. No price movement or profitable edge was observed.

The existing collector's complete-journal resume check passed without collecting another sample. Its 35 frozen source files were archived and hash-verified before extending the collector. The offline prefix checks cover nine synthetic cases. [Exact cost results](../../output/go-history/research-20260920/timing-cost-results.json) and [prefix results](../../output/go-history/research-20260920/prefix-results.json) preserve the data limitations and exact rational values.

## Evidence improvements implemented

The read-only collector now accepts an explicit source dataset and slot, validates the existing journal, and freezes that exact acquisition minimum. Every later reverse quote must use the same amount. Separate quote/fee request intervals are retained. Source denomination and finalized block identity are bound to the manifest; changes, regressed state and equal-height hash conflicts become retained error rows. Complete records are checked again when saved or reopened. No wallet, signing or broadcast capability was added.

All **187 focused collector tests**, strict standalone TypeScript checking and scoped ESLint pass. Nine offline synthetic prefix checks pass. The first five-slot live transport smoke completed without gaps; its source context was independently checked, and its frozen sources were archived before adding the final automatic context guards. The final guarded collector completed **2 of 2 new live observations** and its unchanged-source, complete-journal resume check passed. Both retained the exact original lot, compatible denomination and later finalized state. [Verification](../../output/go-history/research-20260920/guarded-lot-verification.json). These are engineering checks, not profit tests. Usage is documented in [execution evidence](../bots-execution-evidence.md).

## Full-episode evaluator and prospective day

The maintained offline evaluator now compares idle, one partial seed entry and a different H6 hypothesis: enter once when fee-adjusted acquisition improves over its funding quote. Each decision can execute only on the following frozen slot, with a new finalized block, a sufficiently fresh quote and the original budget, fee reserve, price-impact and goal checks. It uses actual runtime accounting and marks exposed holdings even after the goal pauses. It distinguishes an unfinished prefix from a complete 24-hour sampled episode. It never declares strategy qualification. [Usage and assumptions](../bots-execution-episodes.md).

The original principal-based H6 hurdle conflicts with the profit latch under the measured fee scenario. Its conditional target-occlusion threshold is 0.05852417992372505425 XOR, below the observed fee of 0.100020712589707326 XOR. The revised hypothesis compares acquisition quotes; that comparison alone does not imply portfolio profit.

The guarded two-observation dataset permits the one seed scenario under the explicit receipt-timing test. Its exact runtime-marked drawdown is **4.8085636734060985%**; the fee-only scenario loses **4.2726234148032904%**. The revised acquisition rule makes no decision because its advantage never appears. These are prefixes, not a completed trading day or observed transactions. [Immutable report](../../output/go-history/research-20260920/guarded-episode-final.json).

Validation: **237 collector/evaluator/CLI tests and 109 strategy-rule tests pass**, with scoped ESLint and strict TypeScript checks. The type check exposed an existing ambiguous fallback in rule evaluation; naming the existing MAD branch explicitly restores narrowing without changing the supported rule set. No user-visible strings or trading permissions changed.

A separate prospective development day is frozen for **20 September 2026 00:58:23 UTC through 21 September 2026 01:00:23 UTC**, with 722 observations at two-minute cadence. All five fixed control/scenario combinations are retained; 46 collector, evaluator, dependency and runner sources are archived and hash-checked. The collector process runs public queries only. Completion requires examining the actual retained outcomes; a scheduled end is not evidence that collection succeeded. [Frozen protocol](../../output/go-history/research-20260920/day-001-protocol.json).

The first scheduled observation completed at finalized block **27,708,415**; the collector was confirmed running at 00:59 UTC. This verifies launch, not full-day completeness. The separate [economics review](../../output/go-history/research-20260920/economics-options.md) traces the dominant charge to the runtime fee path and separates frontend reliability improvements from protocol changes. At the retained quote, the network fee accounts for **88.85%** of the entry cost. Session signing does not reduce the charge; batching cannot combine decisions made at different times. No alternate liquid exact-pair route was established by the earlier availability screen. A lower supported swap tariff is the direct structural lever if repeated small trades are required; this research has not changed that tariff or assumed a subsidy.

H4/H5 still need declared forecasts, uncertainty models and prior signal warmup. Before any new production qualification method, specify separate future episode-based acceptance that addresses dependence, uncertainty and every tested variant. A low trade count can be economically appropriate; a short profitable episode is not adequate evidence by itself. Neither interpolation nor repeated tuning of these development observations supplies the missing evidence.

Production deployment and its rejection gates remain unchanged in this research step. No transaction or successful-trade video has been produced.

## Later investigation: exact fees and independently quoted partial sizes

The subsequent [exact-fee release](bots-exact-fee-deployment-2026-09-20.md) fixes the mismatch between cached preparation fees and call-specific execution fees, exact slippage encoding, and asynchronous context checks. It is deployed and verified. It does not reduce the actual runtime charge or qualify a strategy.

A separate read-only diagnostic froze six partial sizes before connecting, then obtained twelve complete forward/reverse quotes at finalized block **27,708,732**. All sizes used the same finalized context; runtime/metadata continuity and source hashes passed. Collection took 27.258 seconds with no failures, retries, interpolation or replacement funding state. The ongoing day-001 dataset and protocol were not changed.

| Independently quoted input | Immediate net-value deduction, including quoted minimum and fee |
| --- | --- |
| 5 KUSD | 4.8084% |
| 7.5 KUSD | 5.3649% |
| 8.5 KUSD | 5.6401% |
| 9 KUSD | 5.7889% |
| 9.5 KUSD | 5.9450% |
| 9.9 KUSD | 6.0753% |

Only the 5 KUSD quote fits the existing immediate 5% cost admission at this state. The larger partial orders increase price impact enough to exceed it. These are conservative quote scenarios, not observed fills or proof about every future market state. No whole-budget order was tested or submitted.

The new [cost/risk analysis and conditional H4/H5 protocol](../../output/go-history/research-20260920/h4-h5-protocol-proposal.md) derives a necessary condition for a one-entry/no-exit position to both beat idle and remain above the existing peak-loss floor: `C(a) < (a/B) * [V - 0.95H]`, where `C` includes the size-specific minimum-output deduction and network fee. All six fresh quotes fail that particular mechanism's test. Idle outperformance is a research comparator, not an additional user limit or production gate; failing it must not be described as mathematical impossibility of all net-positive trading.

At the observed 5 KUSD quote, that mechanism would require a network fee **strictly below 0.0459791803595098271 XOR**, holding all other observed terms fixed; the measured fee is **0.100020712589707326 XOR**. This is a conditional economic threshold, not a proposed frontend fee override or proof that lowering the fee creates profit. A supported protocol fee change or genuinely better execution quality would need its own engineering and governance review. The report specifies a causal, low-turnover forecasting experiment for a feasible cost region; fitting it to an empty region would not help.

Evidence: [frozen sizing protocol](../../output/go-history/research-20260920/partial-size-feasibility-protocol.json), [raw and exact analyzed results](../../output/go-history/research-20260920/partial-size-feasibility-results.json), [append-only observation journal](../../output/go-history/research-20260920/partial-size-feasibility-observations.jsonl). Nine offline exact-arithmetic assertions cover equality and one-atom boundaries, including amounts above JavaScript's safe integer range.

Separately, day-001 retained a timeout during final metadata continuity verification after both quotes and fees completed. Its missing observation prevents eventual complete, gap-free episode evidence under its frozen rules. The [diagnosis](../../output/go-history/research-20260920/day-001-timeout-diagnostic.md) identifies missing RPC-stage timing and connection setup overhead as concrete work for a new collector version; it does not replace the failed row or claim the underlying network delay has been proved. No actual transaction, qualified strategy or successful-trade recording exists.
