# Offline execution episodes

`yarn bots:replay:episode --dataset DIRECTORY --out NEW_REPORT_JSON` evaluates a retained public-quote journal without a wallet, network connection or model call. It verifies the entire manifest-bound record chain and writes a new immutable JSON report. The source journal is never modified. Reports include hashes of the evaluator and the actual runtime accounting dependencies.

This is a development instrument, not a production qualification path. `qualifiedStrategy` is always false and `actualTransactions` is always zero. A quoted minimum is not an observed fill. There is no claimed statistical confidence or profitability threshold.

## Frozen controls

All controls start at slot zero's validated receipt with 10 KUSD plus a separate 1 XOR fee reserve. Each may spend at most 5 KUSD once. This experimental order size is not a replacement for the user's 10 KUSD maximum allocation. The goal remains 5% growth in marked XOR value, 5% peak drawdown and 24 hours from funding. Slippage is 0.5%; absolute price impact is limited to the live controller default of 3%. No wallet settings are read.

The report always runs these policies together:

| Policy | Decision | Attempt |
| --- | --- | --- |
| Idle | None | None |
| Seed once | After the funding observation | Only the next frozen slot |
| Improved net acquisition once | First later observation whose minimum XOR minus its network fee strictly exceeds the same quantity at funding | Only the next frozen slot, with the advantage checked again |

Both entry policies have a quoted-minimum success scenario and a fee-only failure scenario. Each gets one decision and one attempt, with no retry search or exit. The acquisition comparison is not a profit claim: the remaining KUSD, original reserve, paid fees and still-held XOR remain in total goal value. Reports compare returns against idle and the same-scenario seed control.

The earlier proposed hurdle, acquiring more net XOR than the opening fee-free principal value, has a conditional conflict with the existing target. For half-allocation impact-free value `x0`, the idle portfolio reaches its 5% target before that hurdle when the transaction fee is at least `0.05*x0 + 0.025 XOR`, assuming nonnegative impact/slippage and unchanged fee. The report records this diagnostic using the funding fee. It does not assert that future fees are fixed. The improved-net-acquisition rule is a different hypothesis with a different reference.

## Clocks, costs and gaps

A decision can use only its current validated observation. Its sampled attempt requires the immediately following slot, a request after the decision and an advancing finalized block. Buy request start to validated whole-snapshot receipt must be less than five seconds. Waiting for the reverse quote and continuity checks makes this intentionally stricter than a forward-only live request; a rejected sample does not establish that a live request would fail. Individual timing is required for execution and full-episode evidence.

The evaluator uses the bot's actual amount, allocation, fee, admission and goal functions. It deducts the estimated network fee once; route fees, impact and slippage are already reflected in the quoted minimum. Both success and fee-only failure must satisfy pre-trade admission. The success scenario assumes the sampled minimum is available at receipt, with zero modeled inclusion delay. Actual inclusion/finalization and post-trade pool feedback are unmeasured. This cannot establish execution profitability.

Funding and peak value are never restarted. A terminal goal stops future entries, while separately calculated episode performance continues valuing exposed holdings. The impact-free quote mark includes route fees and is not liquidation value. No intraperiod prices are invented.

Missing observations are retained and disable further entry decisions. A missing next slot consumes the attempt; an unobserved future next slot remains pending. Extending a prefix cannot rewrite its prior events. Denomination changes, pool identity changes, regressing chronology and conflicting finalized hashes are rejected.

## Full-day evidence

Closing uses the first receipt at or after 24 hours from funding. No entry is allowed at the deadline. A missing scheduled closing slot makes the episode incomplete; the evaluator does not search later rows for a favorable close. Closing lag cannot exceed cadence plus the collector's fixed start and completion allowances. Every evaluated slot must be complete and individually timed for `fullEpisodeEvidence` to be true.

A prefix is reported as a prefix, with provisional return and drawdown, never as a completed day. A complete sampled day still omits between-sample losses and is not sufficient acceptance evidence. Observations inspected during policy design are development data.

For a new prospective day, 722 slots at 120,000 ms cadence span 24 hours and two minutes from scheduled start, allowing a closing observation after the funding receipt's 24-hour deadline. Freeze the collector and evaluator sources before connecting, retain all outcomes, and use a new dataset after code changes. Later strategy selection requires separate future evaluation and a record of every tested variant.

Unit tests: `tests/unit/scripts/bots/execution-replay.spec.ts` and `replay-execution-episode.spec.ts`. They use synthetic exact quote fixtures and temporary files without external services.
