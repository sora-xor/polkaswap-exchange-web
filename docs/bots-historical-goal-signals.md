# Historical goal signals

`scripts/bots/historical-goal-signals.ts` consumes deterministic completed-hour
signals for one fixed development episode. It performs no network requests,
quote retrieval, wallet operation, ledger mutation or strategy qualification.

Create the fresh ledger and fixed schedule first, then call
`createHistoricalGoalSignalState(ledger, schedule, warmup)`. Warmup contains at
most 200 contiguous hourly candles ending one hour before funding. It initializes
the available indicator data without evaluating a pre-funding strategy or
inventing a prior SMA crossover. Longer lookbacks honestly remain unready until
enough funded closes arrive; a large lookback can remain unready for the entire
24-hour episode. AI and live-price strategies are unsupported here.

Call `consumeHistoricalGoalSignal(state, ledger, candle)` once for each of the
24 scheduled hours, in order. Carry its returned `state` forward even when the
proposal holds, lacks allocation, exceeds a trade ceiling, or its later quote is
rejected. Missing, duplicate, reordered and future hours fail instead of being
substituted. Stopped goals consume the supplied hour without producing another
pending order. Keep using the immutable ledger's actual `lastTradeAt` for
cooldown; a rejected quote does not invent a successful fill.

A pending order contains the selected plan, decision and execution targets,
asset direction and exact `amountInCodec`. Sells are floored to token precision
using the completed signal close and capped at acquired XOR above the remaining
fee reserve. Orders exceeding a fixed policy ceiling become holds; the module
does not clip or rescale them. The execution driver must request that exact
input amount and retain it unchanged through quote validation.

The driver remains responsible for canonical data and ledger lineage, dataset
denomination, valuation cadence, observation availability, merging actual event
timestamps, checking the quote's exact input/state/minimum/impact, and resolving
or cancelling each pending attempt once. This module binds stable strategy,
policy, allocation, goal, episode and opening-value settings across detached
ledger transitions, but does not authenticate their provenance. It rejects a
ledger observation from after the decision or a regression in observed
timestamp, paid fees or successful trade state.

Signal states and returned orders are deeply frozen. They can be serialized
for evidence; deserializing a signal state does not make it resumable. There is
currently no restore API. The driver continues portfolio valuation through the
fixed endpoint even after signal generation stops.
