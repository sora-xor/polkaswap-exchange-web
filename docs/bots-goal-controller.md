# Explicit goal routing in the bot controller

`createBotTradingController` accepts an optional `goalRuntime` dependency
with `start`, `stop`, `active` and `dispose`. A trusted application composition
must provide this runtime with the private qualification producer, owned
execution sessions and exact storage. The default `useBotTrading()` composition
does not supply it, so adding this route does not activate live goal trading.

Records carrying any exact-goal marker are recognized before legacy policy,
goal checks, history, market reads or authorization. An explicit Start validates
the exact record and connected account/network, then delegates to the runtime.
Reload and selection never authorize it. Goal IDs are tracked as soon as the
record is loaded, including while wallet readiness or runtime Start is pending.
Pause, Stop, page exit, offline and disposal revoke that pending operation;
late completion cannot restore its controller session.

The runtime owns finalized callbacks, signal consumption and valuation.
Goal sessions are separate from the controller's legacy polling set. Selecting
a goal does not request a legacy chart quote, and legacy timer gaps do not
drive its clock. The controller reflects runtime liveness and refreshes
persisted records without writing synthetic goal valuations or signal state.

Pause and Stop invoke the runtime's synchronous revocation and await its durable
pause promise. They never call generic `saveBot` or `stopBot` for marked records,
so Stop does not release exact allocations or erase unresolved transaction
facts. When no runtime is available, Stop remains usable: the controller calls
`storage.goals.pause` using the current goal ID and control revision. This
recovery operation does not need qualification. Start without the runtime
continues to reject.

User-requested stop failures are returned through the existing controller
error flow. Event cleanup explicitly observes rejected pause promises, including
the optional asynchronous stop return from the live dispatcher. Malformed
markers cannot fall through into legacy execution, and existing generic storage
mutation guards remain in place.

`controller-goal.spec.ts` covers explicit routing, reload/selection, interrupted
Start, synchronous revocation, durable fallback pause, allocation preservation
and asynchronous rejection handling. The legacy controller suite runs alongside
it unchanged. These tests use synthetic runtime/agent boundaries and real exact
storage; they do not fund a bot, sign a transaction, qualify a strategy or claim
a live trading result.
