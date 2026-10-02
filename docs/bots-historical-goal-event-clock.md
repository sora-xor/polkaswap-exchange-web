# Explicit event-time development clock

`scripts/bots/historical-goal-event-clock.ts` models the goal controller's sliding
60-second checks in **finalized-callbacks-only** mode. It has no network, price,
fund, wallet, signature or trading API. Its actions describe scheduling, never
permission to trade. Existing fixed-grid schedules, collectors and replays are
unchanged; evidence cannot be relabelled as passing this new protocol.

```ts
const state = createHistoricalGoalEventClock({
  version: 1,
  purpose: 'development',
  mode: 'finalized-callbacks-only',
  arrivalAssumption: 'nonnegative-chain-to-browser-delay',
  startedAtMs,
  deadlineAtMs,
});
const next = advanceHistoricalGoalEventClock(state, {
  kind: 'finalized-arrival',
  arrivedAtMs, // Explicit browser arrival evidence or a declared simulation assumption.
  processedAtMs, // When this callback is handled.
  block: { height, hash, parentHash, timestampMs },
});
```

The policy requires `timestampMs <= arrivedAtMs <= processedAtMs`, under its
explicit nonnegative chain-to-browser delay assumption. These remain distinct
clocks; block timestamps do not prove historical browser arrival or finality.
Durations are bounded to 24 hours. Inputs must be exact plain own-data records;
returned nested records are detached and immutable. JSON-restored states are
validated, but the caller must retain the event journal and consume each state
once: an old immutable state can intentionally be replayed into another branch.

An eligible check sets `checkedAtMs` before work starts and sets its next due
time to `checkedAtMs + 60_000`. A check delayed from 00:01:00 to 00:01:18 moves
the next due time to 00:02:18. There is no catch-up loop or fixed minute grid.
Busy arrivals only replace the queued callback with the newest canonical height;
they do not update the last scheduler tick. A matching `complete` event drains
that callback using its **completion processing time**, preserving the original
arrival and block times. Completing with no queue creates no scheduler tick.
`complete` describes finished work only; it does not certify a usable quote.

Explicit `watchdog` events pause when more than 60 seconds have elapsed since
the last scheduler tick, including while work is busy. Exactly 60 seconds is
permitted. A watchdog does not refresh that timestamp. An idle callback or queued
drain updates the scheduler timestamp before applying its own gap check. Pauses
discard queued work and cannot be rearmed by later arrivals or completions.
`cancel` models external revocation. A `complete` event with
`outcome: 'missing-rpc-evidence'` pauses distinctly from a scheduler gap. Known
stale completion IDs are ignored; unknown IDs are rejected while active. The
fixed deadline wins over all valid events, including cancellation and completion.

Keep these cases separate:

- An adjacent canonical block pair can show that no intervening chain state
  exists. Its timestamp interval is not evidence of browser silence. This module
  does basic identity consistency checks, not canonical/finality verification.
- Missing required RPC state is unresolved evidence, not an invented unchanged
  price. Its pause reason survives in the event result; retain that result in
  the journal even when the later deadline expires the session.
- Browser arrival, processing and watchdog gaps control scheduling. The caller
  must supply watchdog events; this pure module does not run a timer.

Polling fallback, event-loop busy-duration estimation and RPC latency inference
are outside this version. A simulation must fix its explicit arrivals and
processing assumptions before reading outcomes. A delayed callback may schedule
a check; the downstream provider and admission guard still require an observation
younger than 5 seconds, fresh executable quotes, current fee admission and the
unchanged goal limits. No market observations, peaks, fees or holdings are created
here, and no missing-evidence episode is made complete by this scheduler.
