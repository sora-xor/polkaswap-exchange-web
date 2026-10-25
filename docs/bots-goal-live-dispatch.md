# Explicit finalized goal live dispatch

`createBotLiveExecutor` in `src/features/bot-trading/live.ts` accepts an optional
application-owned dependency:

```ts
const executor = createBotLiveExecutor(storage, agent, {
  goal: {
    qualification: (bot) => qualificationForThisFundedGoal(bot),
    // Optional: defaults to the existing shared public wallet SDK client.
    client: () => connectedClient,
  },
});
```

A bot with any goal execution marker must pass `readGoalExecutionBot` and use
`GoalEnabledBotStorage`. The application must supply the private qualification
verification accepted by `goal-live.ts`; a persisted digest is not authority.
Malformed markers, absent configuration and stripped markers on stored records
never fall through to legacy signing, quotes or receipt accounting.

The dispatcher snapshots the validated bot and exact proposal before any lazy
import await, without invoking supplied data accessors. It imports `goal-live.ts` and the internal `goal-preparation.ts`
factory only when a marked operation is requested. It forwards allocation
preview, authorization, execution and candidate-block reconciliation, reusing
the existing signer, SCALE call builder, balances, account Web Lock and clock
adapters. Owned preparation retains the original execution session and provider
context. The new executor owns exact route, admission, signing, finality and
settlement checks; the dispatcher does not resize a proposal or authorize one.
`reconcile(bot, candidateBlockHash)` forwards the explicit candidate only to the
new executor and never uses the legacy absence/expiry receipt behavior.

`stop(botId)` immediately revokes in-memory signing and returns a durable pause
promise for a known goal. With goal dispatch configured it also resolves a
previously unseen stored ID and pauses it if marked. Await that promise before
reporting durable completion. Ordinary configurations retain synchronous legacy
stop behavior. Every stop increments the dispatch generation before awaiting
storage, so an import or operation completing afterward cannot authorize a
session or report success. A later explicit authorization is a new attempt.

Disposal and `pagehide` invalidate pending dispatches. Only owned listeners,
subscriptions, preparations and signers are removed; the shared SDK connection
is never disconnected. A late import cannot construct a disposed/revoked
executor. Disposal performs best-effort durable pauses; explicit `stop` exposes
persistence failures to its caller. Preview-only or not-yet-loaded goals are
paused by the dispatcher; the loaded executor owns session cleanup and pause.

The legacy methods and stored-marker guards remain intact. This module does
not wire the controller, grant a qualification or activate the public GO flow.
The focused dispatcher tests use invented records and mock only the executor
boundary; its own integration suite validates the guarded transaction process.
