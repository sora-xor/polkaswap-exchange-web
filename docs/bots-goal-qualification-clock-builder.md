# Offline modeled callback trace builder

`scripts/bots/goal-qualification-clock-builder.ts` turns a complete canonical
metadata sequence into the modeled event trace consumed by
`verifyGoalQualificationClock`. It reads no files, RPC, prices, balances or
strategies, and grants no qualification or trading authority.

```ts
const built = buildGoalQualificationClock({
  episode: { startAtMs, endAtMs }, // Exact fixed 24-hour interval.
  model: preregisteredPlan.arrivalModel, // Must be the modeled fixed-delay variant.
  source: {
    sourceId,
    genesisHash,
    manifestSha256,
    preregistrationSha256,
  },
  blocks: canonicalEpisodeSlice,
});
// The shared production verifier has already accepted this exact trace.
const trace = built.trace;
const dueChecks = built.checks;
```

The trusted evaluator must compare the model and registration identity with its
frozen plan and verify the raw collector manifest before calling this module.
Source hashes and mainnet identity are structural bindings, not cryptographic
proofs of canonicality, finality or preregistration. The builder retains the
source identity, normalized input-block digest, boundary blocks, builder policy
and its digest, trace digest and check digest. All successful outputs and error
diagnostics are detached and immutable; raw collector receipts stay upstream.

## Complete boundary coverage

Supply exactly one immediate predecessor, every in-episode callback block and
one immediate successor, in consecutive canonical height order. Adjacent parent
hashes must match, hashes must be unique, and timestamps must strictly increase.
The collector may retain a larger range; the evaluator explicitly selects this
metadata slice before calling the builder.

Coverage is measured in **modeled callback arrival time**:

- `arrival = chain timestamp + finality delay + callback delay`.
- The predecessor arrives strictly before the fixed episode start.
- Every middle block arrives in `[start, end)`.
- The immediate successor arrives at or after the fixed end.

No supplied middle row is dropped. Extra boundary rows, missing heights, wrong
parents, inconsistent hashes, missing predecessor/successor coverage and unsafe
integer arithmetic reject the build. At most 30,002 source blocks and 30,000
trace events are supported. These are bounded evidence limits, not replacements
for missing observations.

## Explicit modeled event ordering

`processedAt = arrival + processing delay`, and each started check completes at
its actual modeled start plus the fixed check duration. The next due time is
that check start plus 60 seconds. Busy callbacks are retained in the trace and
coalesced to the newest canonical height for the scheduler. Completion drains
the queued callback at completion time, preserving the original arrival.

The versioned builder policy resolves equal times deterministically:

- A completion at exactly the next callback's arrival runs first.
- If a callback arrived earlier and processing ends at the completion instant,
  that callback runs first, then the completion.
- The fixed deadline has precedence. A callback or check that crosses or lands
  on it is rejected as incomplete qualification coverage; the endpoint is never
  moved and the operation is never silently dropped.

A callback arriving inside an earlier callback's synchronous processing, or a
fixed completion strictly inside callback processing, is unsupported. The
builder rejects those interleavings instead of inventing event-loop retiming.
The existing verifier remains the final gate for sliding scheduling, coalescing,
60-second liveness, fixed model correspondence and complete terminal coverage.
Exactly 60 seconds between scheduler ticks is allowed; a longer gap rejects.

These times are hypothetical consequences of the declared model, never observed
browser receipts. The startup assumption includes **block-generated callbacks
only**, with no fabricated immediate subscription replay of the current head.
A live recording or another startup/event-ordering model requires separate
preregistration and verification; this builder cannot relabel it as this model.
Its policy/source hashes must be included in the evaluator's frozen provenance.

The shared qualification verifier requires all checks to finish before the
terminal event. That is stricter evidence coverage than the live clock's safe
behavior of revoking an outstanding check at the deadline. A rejected modeled
trace remains unavailable; it must not be rerun with adjusted delays or a moved
window to seek a passing result.

Focused synthetic tests cover distinct chain/arrival/processing times, 18-second
sliding drift, busy callbacks, both tie rules, exact boundaries, no accessor
execution, immutable provenance and incomplete/overlapping/oversized inputs.
