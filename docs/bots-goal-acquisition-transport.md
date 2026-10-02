# Recorded indexer acquisition retries

`scripts/bots/goal-acquisition-transport.ts` is a separate, opt-in transport for a
newly declared acquisition or audited continuation. It is **not integrated** into
the existing study runner. It does not modify an earlier no-retry protocol,
resume a failed study, release a validation claim, or grant trading authority.

`createGoalAcquisitionTransport(options)` returns `fetch` and `dispose`. It
accepts only the existing `GoalQualificationPoolHistory` query sent to
`https://pi.soramitsu.io/graphql`: KUSD or XOR, HOUR data, the existing fixed
fields and page size, and an unchanged timestamp range/cursor. POST parameters
are copied once from plain own-data properties. Credentials, authorization
headers, redirect following, alternative endpoints, mutations and extra fetch
options are rejected before a physical request starts.

The fixed policy is at most **three physical attempts** for HTTP **502, 503 or
504**, with **1-second and 3-second** backoffs. A complete final HTTP error is
returned unchanged for the actual history reader to reject. The transport does
not parse or repair a successful response: HTTP 200 with malformed JSON, GraphQL
errors or invalid history is never retried here. Neither are network exceptions,
truncated/failed bodies, budget failures, cancellation or failed retention.

One instance represents one new child reader operation, including its pages. The
mandatory `operationDeadlineAtMs` is that operation's original absolute deadline,
at most 30 seconds ahead when constructed. A continuation declares a new
acquisition operation; it does not pretend to resume the old invocation's
expired wallclock deadline. Old timestamps remain immutable audit evidence.
Neither a new page nor a retry renews the child's deadline. The caller's
request signal, operation signal and `dispose()` also cancel local work. At
most eight distinct page requests are admitted; repeating an identical request
cannot reset its three-attempt cap. Concurrent requests on one instance are
rejected; independent operations share the same aggregate budget callbacks.

## Budget and evidence wiring

Both callbacks are mandatory:

- `budget.beforeAttempt(context)` reserves/charges **every physical start**,
  including a successful first attempt, before the supplied fetch is invoked.
  It can enforce shared request spacing. If cancelled while awaiting that
  callback, its reservation can remain conservatively charged, but no fetch
  starts afterward.
- `budget.consumeResponseBytes(bytes)` synchronously charges every received
  body chunk, including HTTP error bodies and an over-limit final chunk. It
  must throw before permitting further work if an aggregate limit is exceeded.

The existing archive reader counts logical fetch invocations. Those counters
alone cannot account for this adapter's physical retries. A future caller must
bind these callbacks to its **aggregate old-plus-new physical request and byte
budgets**. Nesting this transport under `marketFetch` without that accounting is
not a valid integration. This adapter covers indexer history only, not archive
RPC or metadata-cache traffic.

The optional `carriedAttempt: {requestSha256, attempts: 1 | 2}` imports already
retained failures for exactly one request. `goalAcquisitionRequestSha256(url,
init)` computes the same strict request binding without I/O. The owning
continuation must authenticate the original failed receipts before providing
that option; the adapter cannot authenticate old files on its own. The carried
request starts at overall attempt2 or3, so the **total stays at most three**.
The first new start waits the corresponding backoff:1second after one carried
failure,3seconds after two. Other bodies or cursors start at attempt1. Every new
record includes `carriedAttempts` and the overall `attemptIndex`, and repeating
the same request on one instance cannot reset the count. Invalid carried
bindings/counts are rejected. Shared byte/start budgets must still include all
old costs; importing failures does not refund their consumed resources.

`retainAttempt(attempt)` must resolve only after durable, write-once retention.
Its acknowledgement is `{sha256, bytes}` for the canonical attempt object:
object keys sorted lexically, arrays in order, JSON scalar encoding, no final
newline. This matches the existing study evidence sink's value digest and byte
count. Use the declared unique `operationId`, `requestIndex` and `attemptIndex`
to name records. For example, a caller can delegate to
`sink.retainEvidence(name, attempt)` without inventing a second hash format.

Each record binds the policy, exact request and digest, original deadline,
attempt number, actual acquisition start/completion times, HTTP metadata, exact
raw body as base64, bytes observed/retained, body SHA-256 and completeness. The
transport verifies the durable acknowledgement **before returning a successful
response or retrying**. Returned response metadata is the retained snapshot.
Acquisition timestamps are not simulated browser arrivals or economic timestamps.

Body overflow retains only the bounded prefix and explicitly records the larger
observed byte count and `complete:false`. Network failure has `response:null`.
Neither permits retry. The sink is invoked for cancellation/failure receipts
too. If cancellation wins while an uncooperative sink is writing, that write may
finish as audit evidence; it cannot authorize a response or another request.
The owning store must drain its pending evidence writes before disposal, as the
existing store does. A transport cannot promise durable evidence when the sink
itself fails. Late fetch responses are cancelled, and no late budget or retention
completion revives aborted work.

Synthetic unit tests cover transient recovery, exhausted attempts, exact cursor
continuity, complete and partial raw evidence, shared budgets, retention failure,
malformed-success nonretry, original deadlines, cancellation, late completions,
unsafe properties/options and response metadata snapshots. They make no network
calls. The historical failed invocation stays unchanged.
