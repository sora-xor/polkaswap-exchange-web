# Execution-aware goal accounting components

20 September 2026. The deployed Bots qualification remains `goal-episodes-v2`. This change adds the data and accounting components for a separate execution-aware development replay; it does not change production qualification, route selection, valuation policy or signing authority.

## Implemented and reviewed

- `fetchIndexedBotHistoryWithEvidence` returns one immutable, aligned snapshot of hourly candles and their accepted source boundaries. It preserves gaps, performs fresh queries, and pins chain identity plus the actual indexer explorer/client across asynchronous pagination and denomination reads. Existing history APIs retain their behavior. Focused and legacy history checks passed 110 tests, scoped TypeScript and lint, with independent review.
- `planHistoricalGoalSchedule` preserves all 24 hourly signal opportunities and every predetermined valuation target in a fixed 24-hour episode. A one-minute cadence yields 1,441 marks, including exact funding and terminal endpoints. Missing endpoints cannot shift the episode. The consumer must resolve actual canonical block times and merge those times before replay; planned target ordering alone is insufficient.
- The immutable historical goal ledger uses exact rational XOR valuation from same-state KUSD/XOR reserves. It preserves the 10 KUSD maximum starting allocation, separate 1 XOR reserve, partial orders, existing per-asset ceilings, 5% target/drawdown, 1% impact policy and 0.5% slippage. Admission checks both minimum-output success and fee-only failure. Native fees debit once; outputs cannot pay their own input or fee. Stops retain holdings and the original goal peak, while independent performance valuation continues through the endpoint. Fresh strategy state and exact opening time are required. Schedule and ledger passed 38 independently rerun tests, TypeScript and lint.
- `isExactInputQuoteWithinImpactLimit` compares raw output quantities using exact integer multiplication. Both quantities already include pool-fee deduction. Its eight tests cover exact boundaries, one-atom differences, malformed inputs and actual SDK display rounding. The initially suspected live rounding bypass was disproved: default signed rounding maps 1.004% to −1.01%. No live-policy correction is claimed.
- `prepareHistoricalGoalFill` joins a frozen directional input, causal clock proof, verified archived quote/fee projection and same-state pool projection. It validates exact state, denomination, runtime, metadata identity, DEX 0/XYK route, 0.5% minimum, redecoded fee evidence and 1% impact. Missing states stay unavailable; contradictory unavailable labels fail. A ready result is a hypothetical minimum-output fill and reserve mark, not an executed trade. Its 26 tests include integration with the exact ledger. Independent review caught and fixed missing envelope runtime/version comparisons and inconsistent unavailable-state payload handling.

## Existing archived evidence integration

The additive signal reducer also passed 16 focused tests and a combined 54-test signal/schedule/ledger run, lint and scoped TypeScript. It binds all 24 opportunities, freezes each exact order before quoting, preserves actual successful-fill cooldown and consumes stopped or rejected signals once. Its 200-hour warmup cap leaves longer lookbacks honestly unready. See [signal usage](../bots-historical-goal-signals.md).

At 11:06 UTC, the new quote-to-ledger adapter processed the already retained June 22 09:03 archived state, block 26,641,356. This was the original fixed 2.5 KUSD request, with its original quote, pool, fee and clock evidence. The protocol, runner, dependency and evidence hashes were checked before composition and retained in a new manifest. No new RPC requests, alternative amounts, states, strategies or market-value acceptance filters were used.

The adapter returned `ready`: the original quote satisfied the exact 1% impact cap, minimum-output calculation and same-state fee/identity checks. Output amounts were not printed. This does **not** establish admission from a funded opening baseline, 24-hour performance, profitable strategy qualification or a real fill. The integration ran no ledger episode and submitted no transaction. [Offline composition receipt](../../output/go-history/goal-execution-components-20260920/retained-quote-verification.json).

Independent offline reproduction verified all ten composition-source hashes, the 36 dependencies of the original probe, both runners, and all original evidence hashes. It produced the identical result digest without a network request.

## Complete-day clock preparation

The next bounded read fixed the first 24 hourly opportunities in the previously selected development prefix: June 22 at 09:00 UTC through June 23 at 09:00 UTC. The protocol and source hashes were saved before querying. Forty-nine canonical block reads (206 read-only RPC calls) verified the indexed boundaries and produced all 24 signal plans and 1,441 valuation targets. No price, reserve, fee or quote values were retrieved.

The opening has a block exactly at its timestamp; the closing does not. The metadata read succeeded, but this does not meet the original schedule's exact endpoint valuation requirement. No alternative day or later endpoint was selected, and no complete valuation dataset is claimed. [Clock receipt](../../output/go-history/goal-execution-components-20260920/day-clock-verification.json).

Independent review identified exact timestamp equality as an artificial requirement. An additive, separately labelled terminal policy now verifies the last canonical state at/before the unchanged deadline, with adjacent-successor proof and a maximum age fixed before further reads. The development policy uses 12 seconds, matching the existing valuation tolerance. Separate ledger finalization retains the actual block timestamp and accounts at the original deadline; it preserves earlier stops and holdings without inventing an earlier stop from terminal-only data.

At 11:22 UTC, 18 metadata-only RPC reads verified the same day's terminal pair. Block 26,653,658 is six seconds before the deadline; its adjacent successor is after the deadline. The new clock proof passed. No terminal market values, alternate states, day changes or performance outcomes were used. This establishes terminal timing, not a complete replay. [Terminal receipt](../../output/go-history/goal-execution-components-20260920/terminal-clock-verification.json).

## Validation

The full offline unit suites passed 7,612 tests across 940 files; translation checks passed all 13 tests. All 13 captured component and test source hashes were unchanged after the run. Focused TypeScript, lint and independent component reviews were clean. [Validation receipt](../../output/go-history/goal-execution-components-20260920/independent-validation-result.json).

Subsequent additive signal and terminal work passed an independent 53-test ledger/signal/terminal run, scoped TypeScript and lint. The ledger's earlier source was archived under its original SHA-256 before adding finalization. All 35 original top-level statements remain byte-identical; the earlier full-run and quote-composition receipts continue to refer to their recorded earlier source, not the new revision. [Finalization validation](../../output/go-history/historical-goal-terminal-accounting-20260920/validation.json).

The final script suite then passed all 853 tests across 45 files. The earlier browser suite had passed 6,795 tests and was not rerun for these script-only additions. Frozen collector integrity passed again at 313 records, with no market observations read. [Final validation receipt](../../output/go-history/goal-execution-components-20260920/final-validation.json).

## Work still required

The ordered replay driver must connect the signal reducer to canonical evidence, merge actual valuation/execution timestamps, retain missing evidence, cancel pending execution after a stop and value the untouched benchmark through the original endpoint. Exact sell lots must be quoted independently from the sequential inventory.

Before production, the new protocol must reconcile and bind routing, portfolio valuation, fee-envelope assumptions and clocks to the live controller. The current archive helper uses DEX 0/XYK and reserve marks; live uses best-route quotes and impact-free-quote marks. The historical nonce-zero immortal fee envelope differs from live mortal signing. A bounded browser/indexer evidence provider, complete predetermined training/validation episodes and a separately versioned qualification certificate are also required. Existing v2 evidence cannot be relabelled as v3, and no current GO holdout has been inspected for this work.

The separate frozen collector was confirmed alive during this turn; its sources and retained prefix passed integrity verification at 304 records. Its market observations were not read. No production deployment or new GO request occurred in this turn.

The indexer independently published the 11:00 UTC completed boundary for all seven requested assets. Public metadata verification passed with zero lag, running/ready service and no worker error at finalized/indexed block 27,713,484. LLM retained its explicitly absent direct XOR pool. [Fresh-hour receipt](../../output/go-history/indexer-query-audit-20260920/fresh-latest-hour-20260920T110231Z.json).
