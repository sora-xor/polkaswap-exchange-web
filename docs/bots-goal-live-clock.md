# Finalized callback goal scheduler

`src/features/bot-trading/goal-live-clock.ts` implements the scheduling part of
`goal-finalized-arrival-sliding-clock-v1`. It has no market, wallet, signing,
storage or broadcast API. It is not wired into the controller yet and does not
qualify a strategy or authorize a trade.

```ts
const clock = createGoalLiveClock({
  startedAtMs: now(), // This authorized scheduler instance's start.
  deadlineAtMs: fundedEpoch.endedAtMs, // Keep the original deadline on resume.
  now,
  isCurrent: () => currentCapability === capturedCapability,
  signal: capabilityAbort.signal,
  subscribeFinalizedHeads: (callback) => client.rpc.chain.subscribeFinalizedHeads(callback),
  onCheck: async (check, signal) => {
    // The caller supplies observation/admission work and retains its own evidence identity.
    return observe(check, signal); // 'complete' or 'missing-rpc-evidence'
  },
  onStop: (stop) => persistRevocation(stop),
});
await clock.ready;
```

The adapter uses the public SDK subscription and owns only its returned
unsubscribe function. It never disconnects the shared client, re-subscribes,
retries or falls back to polling. Cancellation is local: it aborts the supplied
operation signal and discards late completions. A subscription handle returned
after revocation is still unsubscribed. `ready` resolves after subscription
setup; malformed or rejected setup produces a stable diagnostic. Silent setup
is revoked by the same scheduler-gap watchdog. SDK error text is not exposed.

The caller must permanently revoke its capability for disconnect/reconnect,
client/runtime changes, cross-tab control revision changes and user controls.
Supply that revocation through `signal`; `isCurrent` is an additional synchronous
check at scheduler boundaries. An async guard is rejected. Sampling a guard
cannot detect an unreported change-and-restore between samples.

## Event identity and timing

The callback captures `arrivedAtMs` before decoding the SDK header or starting
work. Each immutable check retains that arrival and the callback's exact height,
hash and parent hash. `checkedAtMs` is the actual processing time. SDK headers
do not contain `Timestamp.Now`; this module creates no chain timestamp or price.

An independently captured provider head may be newer than the callback. Keep
its hash, height, timestamp and receipt times separately. Never relabel that
state with the callback's identity or arrival. The callback is a scheduling
trigger, not evidence that a later quote existed at its arrival time. Finality
and canonicality are attested by the connected SDK subscription; the scheduler
only rejects contradictions among its retained callback identities.

Eligible checks set their next due time to `checkedAtMs + 60_000` before work
starts. A check at 78 seconds therefore moves its next due time to 138 seconds.
There is no catch-up loop, minute/hour grid or timer-driven observation. Idle
new callbacks refresh the scheduler tick even when a check is not yet due.
Duplicate/older heights do not. While busy, only the newest higher callback is
queued, and arrival does not refresh that tick. Completion drains that callback
using the then-current processing time while preserving its original arrival.
Completion without a queue creates no scheduler tick.

The one-second watchdog only checks liveness and revokes. More than 60 seconds
since the last scheduler tick pauses, including while work is busy; exactly
60 seconds is allowed. A queued drain also checks the gap synchronously. A
canonical gap between blocks is distinct from browser/RPC delay; neither an
unchanged price nor a missing observation is invented. An operation returning
`missing-rpc-evidence`, throwing, rejecting or returning a malformed outcome
pauses with that evidence reason, separately from a scheduler gap.

The supplied clock must be safe, nonnegative and monotonic. The fixed deadline
wins at each valid active boundary, including cancellation and completion.
Every terminal transition drops queued work, aborts outstanding local work,
unsubscribes and removes the timer/abort listener. Late callbacks or completions
cannot resume it. A paused instance stays terminal; a separately authorized
resume must use the original funded deadline.

## Integration boundary

Call `clock.assertCurrent(check.id)` after awaits before further work; it checks
the deadline, scheduler gap and current operation without refreshing the tick.
It proves no price freshness, signature authority or financial admission. The
execution session/provider must still verify its original owned context, the
strictly-under-five-second context age, actual signed-byte fee, current consent,
qualification and exact ledger/control revision. Reserve and settlement remain
the storage/controller's responsibilities. Callback and stop handlers are
caller-owned; a failed stop notification cannot undo synchronous revocation.

This live scheduling surface matches the timing transitions declared by
`scripts/bots/historical-goal-event-clock.ts`; synthetic tests compare them.
The historical module additionally accepts supplied block timestamps and an
explicit chain-to-browser arrival assumption. A versioned bridge from actual
callback/processing/provider evidence into that historical model is still
needed before claiming live/replay equivalence. Existing frozen protocols,
collectors and replay results are unchanged.

Tests use only invented headers and fake timers: arrival versus processing,
18-second drift, coalescing, 60-second boundaries, missing evidence, deadline,
revocation, late setup/completion, immutable snapshots and public SDK types.
