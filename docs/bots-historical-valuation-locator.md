# Historical valuation block locator

`scripts/bots/historical-valuation-locator.ts` finds the first block at or after an explicit valuation target. It is a metadata-only helper; it does not fetch prices, alter a schedule, submit transactions, or qualify a strategy.

Call `locateHistoricalValuationBlock({ targetAtMs, maximumLagMs, lower, upper }, readBlock)` with independently canonical, finalized anchors satisfying `lower.timestampMs < targetAtMs <= upper.timestampMs`. The callback must return exact block metadata for the requested height or `null`, bound its own transport, and attest canonical finality and strictly increasing timestamps. An existing canonical reader cache may serve the callback.

The helper copies the input before awaiting, re-reads both anchors, makes one integer interpolation guess, checks its neighboring block, and bisects any remaining bracket. Every observed identity, timestamp ordering, and known parent relation must agree. At most 64 distinct heights are requested; there are no retries or replacement targets. The immutable result includes adjacent `previous` and `block` metadata, exact lag, and ordered read provenance. Sparse observations do not independently prove unseen ancestry, historical arrival time, or trading execution.

Lag is tested only after identifying the first block. A `HistoricalValuationLocateError` with `diagnostic.reason === 'lag-exceeded'` retains the unchanged request, reads, and proved adjacent pair in `diagnostic.location`. A collector can retain that target as unavailable without shifting it. Other failures distinguish invalid input, contradictory observations, missing blocks, transport failure, and exhausted read bounds.

This forward policy can value a scheduled observation at a later real block time within the explicit lag limit. Terminal valuation uses the separate as-of policy in `historical-goal-terminal.ts`; do not use a future block to value the end of an episode.

Offline coverage is in `tests/unit/scripts/bots/historical-valuation-locator.spec.ts`, including exact and irregular timing, inclusive lag, failed reads, identity and parent contradictions, input mutation, and safe-integer bounds.
