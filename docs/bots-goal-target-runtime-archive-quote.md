# Archive state to target-runtime estimates

`scripts/bots/goal-target-runtime-archive-quote.ts` exports
`createGoalTargetRuntimeArchiveQuote({ compressedBytes, signal?, timeoutMs? })`.
It owns one reusable asynchronous, fixed-path target131 worker. The returned
`quote(request, { signal?, timeoutMs? })` acquires and verifies declared source130
state, then executes the existing hypothetical quote and fee adapter. Call
`dispose()` when the archive producer finishes, including failed episodes.

The request contains `sourceBlock: { hash, height }`, `sourceMetadataHex`,
`sourcePropertiesHex`, the canonical KUSD/XOR input and output asset IDs,
`amountInCodec`, and required `fetch` and `retain` functions. There is no default
network dependency, alternate endpoint, retry, host injection or signing path.
Inputs are copied from own data fields before the first await. Amounts are
canonical positive u128 strings; the existing adapter supplies the exact 0.5%
minimum-output rule and at-most-215-byte dummy fee envelope.

The existing archive market reader must authenticate the block, genesis,
finality, source profile and its retained Properties value. This helper pins both
metadata versions, derives the seven point keys from that Properties value,
acquires the complete bounded XST prefix and genuine global successor, and uses
the owned state codec. It additionally requires the acquired Properties bytes
to equal the supplied authenticated bytes. RPC attestations are not storage
proofs; this helper does not independently authenticate the supplied block.

`retain` has the raw transport's `GoalTargetStateRpcReceipt` signature. Every
successful or failed RPC receipt is offered to it before another request or a
target API invocation. Retention must resolve only after durable storage; a
retention failure stops the session. The caller remains responsible for retaining
the returned aggregate `{ state, receipts, estimate }` in its archive evidence
sink. A genuine unavailable route is returned with its state and API evidence,
so it can be retained without inventing an executable fill.

Each quote has one monotonic deadline spanning acquisition, retention, state
verification and worker execution (default 20 seconds, maximum 30 seconds).
Remaining time is passed to the worker; a later API does not reset the operation
deadline. The transport's existing bounded failure-journal cleanup can finish
after expiry, but no subsequent request or estimate is permitted. Caller abort,
parent abort, timeout or disposal closes the session and worker. Concurrent
quotes are rejected without interrupting the active quote.

`GoalTargetRuntimeQuoteError` retains completed public API receipts through
cancellation and timeout. Even cancellation after the adapter delivers its
estimate preserves those receipts in a typed error. The archive producer must
retain that diagnostic alongside already retained raw storage receipts.

The asynchronous adapter also exposes readonly `metadataHex`, directly from the
owned fixed worker, for state reconstruction. Source130 block/profile identities
remain distinct from target131 API identities. Observed fills, fee adequacy,
economic equivalence, qualification and runtime admission are not established.

Tests use the installed hash-pinned target131 binary, retained metadata and
invented storage only, under OS network denial. They cover empty/nonempty prefix
closure, both directions and partial inputs, unavailable routes, Properties
consistency, required explicit dependencies, mutation, retention failure,
cancellation, one operation deadline, receipt preservation and session reuse.
