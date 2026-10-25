# Fixed-day development evidence collection

`scripts/bots/historical-goal-day-collector.ts` collects one already selected 24-hour
day. It does not choose a date, inspect a strategy, retrieve quotes, estimate profit,
authorize trades or claim an observed fill. The caller freezes the source receipt,
historical schema/code fingerprint, denomination, 24 hourly boundary proofs and
complete schedule before calling it.

`collectHistoricalGoalDay(input, options)` accepts the fixed market-reader source,
schedule, terminal policy, terminal observed/successor proof and schema fingerprint.
The schedule must contain 1,441 minute requests. Funding is exactly at the opening
timestamp. The separate `goal-terminal-asof-v1-development` policy fixes terminal
accounting at the original deadline and allows its final observed mark to be at
most 12 seconds old. The successor proves that no later pre-deadline block exists;
its pool values never provide terminal valuation.

Four independent serial lanes take the 24 predetermined hours. Each minute uses
the first canonical block at or after its target, within its declared lag. Each
hourly boundary uses the already supplied adjacent pair as its search bracket.
Other requests use that hour's closing block and the following hour's successor
(the terminal successor for the last hour). Execution targets must remain inside
their signal's hour; this collector fails preflight for an unsupported schedule.
The 24 execution clocks collect metadata only, independently of whether a later
strategy would trade.

All lanes share immutable canonical metadata and one global HTTP gate. Starts are
spaced by at least 125 milliseconds, including every shard's initialization RPCs.
The fixed global ceilings are 8,192 block attestations, 160 reader shards and 1,441
pool requests. A shard accepts at most 64 distinct blocks. A mark reattested in a
new shard counts again even if its metadata exists in the global cache. Rotation
happens only at the shard budget; a failed read never causes a replacement shard.
All shards must match the same source, schema, code hash and denomination.

The async `sink` receives uniquely indexed shard evidence, every valuation row,
every execution-clock row, and a bounded failure record if the run aborts. Raw
archived responses and normalized pool values belong only in these retained
artifacts. `progress(counts)` contains metadata counters, without market values.
The caller must preserve the artifacts immutably and provide any credentials-free
filesystem storage policy. The module logs nothing. An injected `readerFactory`
and `fetch` are offline-test seams, not endpoint-selection features.

Lag violations and explicitly absent, missing-reserve or zero-reserve pools retain
their original target as unavailable. Network errors, conflicting identity/schema,
budget exhaustion and malformed evidence abort the run while retaining completed
artifacts. Neither missing evidence nor a failed target is retried with a new date,
block or provider. The result contains 1,440 nonterminal `valuations`, one separate
`terminal` row, all 24 `executions`, counts and diagnostics. This matches the ordered
development replay input; availability is not strategy qualification.

Provider canonicality remains an RPC attestation, not a cryptographic state proof
or evidence of historical browser arrival. Same-state reserve ratios are retained
as valuation inputs; they are not executable quotes. The later replay must still
use its fixed hypothetical fill scenario, exact execution-state quotes and fees,
and original financial limits.
