# Goal research episodes

Implementation reference, 2026-09-20. Protocol: `goal-episodes-v2`; aggregation: `mean-net-return`.

The simple AI flow evaluates repeated, independently funded 24-hour goals before offering a live review. A budget such as 10 KUSD is the maximum starting input allocation. The strategy selects a smaller recurring order; selecting XOR as the output does not swap the budget. An external XOR fee reserve is included once in starting portfolio value, and fees reduce performance. When the input is XOR, the reserve is part of the input allocation.

This document describes code and its tests. It does not establish that a current market strategy is profitable, that any wallet has traded, or that this implementation has been deployed. Six historical scenarios provide descriptive evidence, not statistical confidence or a return guarantee.

## Fixed observations and partitions

`autopilot.ts` requests seven days of verified hourly history and requires 168 contiguous observations with matching chain and denomination identity. Protocol v2 uses indexed `closeEvidence.xorPool` reserve evidence through `basis: 'xor-pool'`; prices come from the selected token pools and the XOR valuation path, never a ratio of independently sourced USD marks. GO has no archival RPC or alternative-price fallback. Missing exact pool evidence remains unavailable or incomplete. Number the observations from 0 through 167. The first 70%, rounded down, supply training; one observation separates training from validation.

| Partition           | Observation indices | Full 24-hour episodes     | Unused trailing observations  |
| ------------------- | ------------------- | ------------------------- | ----------------------------- |
| Training            | 0–116               | 0→24, 24→48, 48→72, 72→96 | 97–116: 20                    |
| Purge               | 117                 | None                      | Excluded from episode scoring |
| Held-out validation | 118–167             | 118→142, 142→166          | 167: 1                        |

Each full episode needs 25 hourly marks, from funding through the exact 24-hour endpoint. Adjacent episodes share an endpoint/funding mark but share no inventory, fees, cooldown, goal progress, or trading profit. Starts are predetermined; losing and idle episodes remain in the results. Trailing observations remain recorded in partition metadata and cannot become selectively shortened episodes.

The AI drafts from training observations only. The bounded search compares at most three partial order sizes, ranks qualifying training candidates by mean net return minus worst drawdown, then freezes one winner before validation. A failed validation ends that study; the same holdout is not searched for another winner. Earlier observations, including the purge observation, may initialize indicators for a later episode. This is past indicator context, not an additional scored trade or fitted parameter.

## Funding, signals, and stop behavior

`research.ts` accepts an optional copied `goal`, at most 200 contiguous earlier `warmupCandles`, and a positive `outputTradeLimitCodec`. Goal replay requires `validation: 'none'`, `optimize: false`, and an exact, complete, hourly-aligned duration. Autopilot provides the partitions externally rather than nesting another optimizer inside each episode.

The first close funds a fresh virtual allocation and initializes the goal baseline. Warmup ends exactly one hour before funding and supplies only past observations. In a fresh goal episode, it does not seed SMA `previousSignal`: the first funded observation establishes that signal state, matching a fresh live start. Legacy fold replay retains its existing indicator-state handoff. Signals use completed observations; proposed fills occur at the next hourly close. A proposal cannot execute at or after the goal deadline.

Replay applies the runtime's financial rules: signal and cooldown, available funds and fee reserve, input/output order ceilings, fee budget, direction-specific price impact, observed goal completion, and pretrade goal-cost admission. Price impact must be at or below the bound live policy limit. Goal-cost admission checks both the proposed minimum-success outcome and the fee-only failure outcome against the same loss limit. A rejected hypothetical fill changes neither holdings nor fees.

Target, loss, and expiry outcomes latch. Further fills stop, while the actual remaining inventory continues to be marked through the original endpoint. A target does not invent a liquidation, lock in a return, or freeze equity. Later exposure can increase the reported worst drawdown and disqualify an episode even after trading stopped. Hourly marks cannot prove what happened between closes, and a loss threshold cannot guarantee a maximum realized loss.

The output order ceiling is frozen from the first training close and reused across every candidate episode, held-out episode, and proposed live bot. It is a policy limit, not acquired inventory; sells still need available output above the remaining fee reserve. The live handoff rebuilds only the original funded allocation, never simulated gains or terminal goal state.

Episode-qualified live bots request the same `xor-pool` history basis and evaluate each completed hourly observation once, including DCA and threshold strategies. Legacy and advanced studies retain their existing history selection. The consumed hour is persisted before requesting an execution quote and survives pause/restart. Fresh quotes still update the live goal between hourly signals; actual finalized trade times determine cooldown. Missing, future, or insufficient contiguous completed observations stop execution. Live execution uses its fresh quote, so historical next-close fills remain a price approximation rather than an assertion of identical fills.

Only denomination-verified history with a valid latest completed signal is cached for that UTC hour. If the indexer has not published the latest close yet, the existing stale-history rejection and session revocation still apply, but the incomplete response is discarded. An explicit restart can fetch the newly published close immediately instead of reusing an incomplete response until the next hour. Valid history keeps the existing hourly cache and consumed-signal protection.

## Costs, valuation, and qualification

Network fees, pool fees, price impact, and slippage are applied separately, once each. Buy and sell costs are directional. Fee observations are dated finalized-chain scenarios for the exact sampled order size, not evidence of historical executable quotes. The reverse fee sample uses expected forward output; a real trade must still obtain a fresh executable quote. AI provider charges are outside these trading-return calculations.

Every assistant transport exposes the authoritative `constraints.maxPriceImpactPercent` beside order ceilings and slippage, including desktop/native tools, the portable form, API providers, and Jev. This is the hard execution limit from `bot.policy`, distinct from sampled `costs.buy/sell.priceImpactPercent`; changing order size requires a new quote and does not relax the limit. The field contains no current price, forecast, or held-out observation.

Before drafting, GO collects three initial size-specific cost samples: the existing partial reference, one quarter of spendable input, and one half of spendable input. It may add up to two exact adaptive midpoint quotes when observed sizes straddle the first-buy fee or impact limit, for at most five samples total. The second midpoint narrows a bracket only when the first has a valid quote that fails solely on price impact; an unavailable quote does not establish a failing size. Amounts are rounded down to token base units, deduplicated and required to remain strictly below the budget. Each available `costSamples` entry carries its exact input amount, finalized block/time and separate buy/sell network fees, pool fees and price impact. A probe with no usable quote is explicitly unavailable, never a zero-cost sample. This includes the loader's generic quote rejection, timeout or normalization failure and does not establish absent liquidity. Missing or invalid returned evidence and stale observations stop setup; all available samples are rechecked immediately before drafting. Samples may come from different finalized blocks and are not a continuous cost curve or evidence that unsampled amounts are feasible.

An available sample may also include `openingFeeScenario`, which applies that sample's observed current first-buy network fee to only the first two training marks. Each mark independently starts from the untouched allocation and deducts the fee once; the second mark also reflects that allocation's price movement. The descriptor reports timestamps, fee-only loss percentages and exact reaches-limit flags in the selected goal valuation and loss metric. It exposes no additional prices or held-out observations. Current fee provenance remains on the cost sample: these scenarios are not fees observed or paid at those historical marks. If the fee cannot be funded from the protected reserve, the descriptor is omitted. `laterOpportunity: 'not-assessed'` makes no claim about later trades. The diagnostic neither admits nor rejects a draft, qualifies a strategy, nor authorizes trading; execution and qualification retain their existing checks, including when a reaches-limit flag is true.

The reference `costs` object remains bound to `sizing.feeSampleAmountCodec`. This preserves older integrations while Codex, portable desktop assistants, API providers and Jev receive the same additional size evidence. The model is not asked to call a quote tool it does not have. Candidate selection still tests at most three partial sizes, using each candidate's own verified observation; a fresh pre-draft sample is reused only when amount and cadence match. Candidate screening applies the first-buy fee and impact limits. It retains the observed reverse costs for replay, which applies the sell fee and impact gates to proposed sell fills. Live execution still re-quotes and applies the unchanged budget, reserve, price-impact and loss checks. Extra samples do not change qualification or create a profitable opportunity.

The replay result remains denominated in the input token. Autopilot converts every equity and idle-holding point into the chosen goal asset at that point's exact historical close before measuring returns and drawdown. This includes the fee reserve in both strategy and idle valuations.

For each episode, with starting value `I`, final marked value `F`, and the unchanged starting holdings' final marked value `H`:

- Net return is `100 × (F − I) / I`.
- Excess over idle is `100 × (F − H) / I`.
- Absolute net change is `F − I`, in the chosen goal asset.
- Absolute excess change is `F − H`, in the chosen goal asset.
- Drawdown is the largest observed decline from a running peak, including exposure after a latched stop.

Training and validation must each have complete coverage, at least one executed simulated fill across the partition, strictly positive means for all four return/change measures above, and worst episode drawdown at or below the user's loss limit. Absolute change checks prevent positive average percentages from concealing a negative average gain in the goal token when episode starting valuations differ. Abstention episodes count in every mean. Qualification does not require every episode to hit its target and does not change the target or loss threshold used by the live goal.

Episode returns receive equal weight. Independently reset equity curves are never concatenated or compounded. The main display, “Average 24-hour return,” summarizes all six episode returns; the qualification summary separately records the two held-out episodes. These are observed scenario averages, not forecasts, annualized yields, confidence intervals, or evidence that the target is attainable now.

## Evidence and handoff

`goal-research.ts` defines and validates the compact protocol evidence. It rejects `goal-episodes-v1` snapshots: those studies used an incompatible USD-derived history basis and cannot authorize v2 execution. Run a fresh study from corrected observations; stored results are never upgraded by changing their protocol label. It retains every episode's exact times, starting/final/idle values, recomputed return, drawdown, trade count, coverage, and latched outcome. Partition counts and tails are fixed. Live binding covers token identity and precision, original capital, fee reserve, both order limits, slippage, price-impact ceiling, deterministic strategy, goal, and directional cost assumptions. Snapshot statistics are recomputed from the episode rows rather than accepted as independent totals.

The replay's `goalEvaluation` additionally carries a copied goal, funding and ending timestamps, the actual latched goal state, and detached warmup/output-limit inputs when supplied. Experiment and worker handoffs preserve these inputs for provenance. Goal and price-impact checks appear only in opted-in replay progress, preserving legacy study shapes.

When no training candidate qualifies, GO preserves an observed `priceImpact` or `goalTradeCost` execution block alongside its aggregate failure reasons. These categories require an actual signalled decision whose other execution gates passed; hypothetical hold bars, unavailable balances, cooldowns and already-ended goals do not establish those causes. They appear in the existing collapsed "Why it stopped" section and desktop status without prices or per-decision metrics. Candidate selection still uses the original qualification rules. Held-out failures expose only the existing aggregate categories and never trigger a replacement search.

Historical qualification grants no signing authority. Preparing a live review preserves the bound output ceiling and rechecks account, network, denomination, and funding through the existing controller. The user still authorizes the trading session; live quotes, balances, limits, and session state are checked during execution.

Implementation: [autopilot](../src/features/bot-trading/autopilot.ts), [replay](../src/features/bot-trading/research.ts), [evidence](../src/features/bot-trading/goal-research.ts), and [live handoff](../src/features/bot-trading/controller.ts). Focused regressions live in [research-goal.spec.ts](../tests/unit/features/bot-trading/research-goal.spec.ts), [goal-research.spec.ts](../tests/unit/features/bot-trading/goal-research.spec.ts), and the existing autopilot, experiment, streaming, and controller suites. Synthetic unit fixtures verify behavior; they are not market or profit evidence.
