# Indexed signals and finalized goal scheduling

`createGoalRuntime` joins an already funded goal, its private qualification,
the finalized callback clock, indexed completed-hour signals and the live
executor. `start` is an explicit user-authorized action; loading stored records
does not authorize signing. The caller supplies the existing wallet connection,
`fetchIndexedBotHistoryWithEvidence` and a finalized-head subscription.

The indexed reader accepts `signal` alongside `startAt` and `endAt`. A runtime
adapter should forward its supplied `AbortSignal` explicitly. Cancellation
immediately rejects the local wait, ignores late responses, and prevents further
pagination or denomination reads. A private operation signal also cancels sibling
reads when any asset fails; the caller's signal is never aborted. Listeners are
removed on success, failure and cancellation. An already-running shared-client
request may finish its internal retries; the reader never disconnects the shared
wallet or indexer. This loader support
does not itself install the new goal runtime into the default Bots flow.

Each due callback loads authoritative storage and reconciles retained receipts.
It queries history only when a completed hour has not yet been consumed, records
the actual response receipt time, then captures fresh owned execution state.
The provider block may be newer than the callback; its original identity and
timestamp remain unchanged. Runtime qualification is checked before accounting.

`storage.goals.recordSignal` atomically persists the exact mark, strategy state
and `goalSignal.completedAtMs` before a trade can be quoted. Both the accounting
revision and previous consumed boundary participate in the compare-and-swap.
The signal timestamp is separate from the actual decision timestamp and from
receipt-owned `lastTradeAt`. Held and rejected trade decisions remain consumed
after reload. Orders use qualified fixed codec lots capped once at signal time;
the executor cannot resize an order to make it pass admission.

When an hour is already consumed, the next due callback still records a fresh
valuation. Target, loss, expiry, invalid context, missing evidence, a scheduler
gap or execution failure revokes signing. A stopped clock does not invent a
terminal valuation or transaction result. Pending transactions remain governed
by [receipt recovery](bots-goal-live.md#recovery-and-limits).

Stop invalidates pending starts and reads synchronously. A retained per-goal
stop promise fences replacement starts until durable pause completes. Generation
tickets reject late or superseded starts; stale cleanup cannot stop a newer run.
Subscription cancellation aborts the local work and removes only its owned
listeners. It does not disconnect the shared wallet node.

The runtime does not create a qualification or select research data. Production
activation requires the trusted evaluator described in
[qualification](bots-goal-qualification.md), an explicit funded-goal constructor
and user consent. Existing historical results do not qualify this new protocol.

## Deadline settlement

`close` revokes signing, obtains the canonical finalized state at the original
deadline, then discovers actual receipts without applying a current-price mark.
`storage.goals.terminal` reads every order in one transaction. Reserved, signed,
submitted or otherwise unresolved orders prevent closure without partial writes.
Canonical predeadline receipts are applied to the original deadline ledger.

Actual inclusion after the deadline is stored in `goalPostDeadline`, an exact
effects journal bound to the goal, immutable deadline state hash and retained
terminal evidence hash/block. It records actual attributed-funds holdings,
deficits, fees and successful/failed fills in canonical block/index order. It
does not claim the wallet's total balance or provide a current valuation. The
original deadline value, outcome, fees, peak, drawdown and timestamps stay fixed.
Actual later fee or minimum-output breaches remain recorded even when they
exceed admission limits; no synthetic mark or inclusion time is assigned.

Both ledgers and every accounted order commit atomically. Later orders use phase
`accounted-after-deadline`, accounting marker `applied-after-deadline` and the
journal hash. Reload recomputes the complete journal against the boundary derived
from `goalTerminal`; `assertGoalOrderAccounting` requires a one-for-one match to
the complete order snapshot, including on a closed runtime retry. Missing orders,
altered boundary/amounts and inconsistent portfolio mirrors are rejected.

Portfolio allocation checks use the actual later holdings and deficits. Closed
goals retain their capital allocation under the existing policy; settling a
receipt does not release capital or authorize another signer. The progress UI
labels the fixed deadline value separately from later fees and holdings. Pause
and Stop preserve attention arising from either the deadline ledger or later
effects; they do not clear an actual settlement breach.

`goal-runtime.spec.ts` combines the actual clock, exact ledger, storage and
signal evaluator with invented external I/O. It exercises durable consumption,
fresh valuation, reload, missing history, late responses and concurrent
Start/Stop. IndexedDB cross-tab behavior is checked separately in
`bot-exact-goal-storage-browser.spec.ts` in Chromium and WebKit.
