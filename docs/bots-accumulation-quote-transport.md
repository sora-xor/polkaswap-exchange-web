# Prospective quote request recorder

`scripts/bots/accumulation-quote-transport.ts` consumes only descriptors issued by
`createAccumulationQuoteRequests` by default. An explicit `profile:'bootstrap'`
accepts only descriptors from `accumulation-bootstrap-requests.ts` instead. It does not call an old archive reader. Both
`fetch` and `retain(name, exactUtf8JsonWithLF)` are required; the sole HTTP origin
is `https://ws.mof.sora.org/`. There are no retries, redirects, credentials,
ambient fetch defaults, wallet methods or signing/submission methods.

Create one recorder per externally registered collection attempt. Set explicit
`maximumRequests` (1–28), `maximumTotalResponseBytes` (up to 28 × 65536), and
`timeoutMs` (1–15000). The default `profile:'quote'` keeps these limits. The explicit
bootstrap profile permits at most 16 requests and 6 MiB total response bytes;
only its original `state_getMetadata` descriptors receive a 2 MiB per-response
limit. All other bootstrap responses remain capped at 64 KiB. The two descriptor
families cannot be interchanged. `maximumInFlight` defaults to 1; quote callers
may explicitly allow up to 9, while bootstrap remains capped at 3. Nine quote
lanes allow one dependent quote→info→details chain per candidate, preserving
original individual HTTP bodies and the shared request/byte budgets. This does
not relax the existing five-second decision freshness limit. Capacity exhaustion
rejects immediately, without queuing. The caller owns each quote→fee dependency
and any concurrency policy. A descriptor's exact request digest is usable once
per recorder; an original JSON-RPC ID cannot be reused for different bytes either.
Separate recorders are not a globally enforced exactly-once system.

Before dispatch, the recorder requires a durable acknowledgement for
`rpc-N-start.json`. Before exposing an outcome, it requires another for
`rpc-N-outcome.json`. An acknowledgement is `{sha256, bytes}` of the exact supplied
UTF-8 string, including final LF. The injected retainer must actually persist the
bytes, use an exclusive attempt namespace and preserve uncertainty on crashes;
a matching acknowledgement alone is not independent evidence of durability.
`retentionTimeoutMs` is bounded to 15000, default 5000. Failed or timed-out
retention poisons the instance and aborts active peers. The thrown
`AccumulationQuoteRetentionError` carries completed outcome evidence when available.

`request(descriptor)` returns `{receipt, raw, result}`. `receipt` is the existing
`AccumulationRpcReceipt` projection accepted by `feeRequestsForQuote`. `raw`
retains exact request/response bytes as base64, actual wall receipt times,
monotonic elapsed nanoseconds, actual fetch-start status, full observed byte count,
bounded retained byte count and stream completeness. Timing starts after the
intent acknowledgement immediately before attempted fetch. Failed UTF-8 is never
invented as text. HTTP errors, JSON-RPC errors, malformed bodies, cancellations
and incomplete bodies remain failures even when their raw stream is complete.
An authentic `result:null` with no failure remains a null-route response.

Transport success checks the strict JSON-RPC envelope and exact original ID.
It does not decode storage, quote semantics, fees or consensus: the producer and
sealed bridge perform those checks. Responses use the method-specific caps above; the entire
observed overflowing chunk is charged, while only its bounded prefix is retained.
Shared total-byte exhaustion cancels active peers and closes the recorder. The
sum of all retained prefixes also stays inside the total response-byte budget.
Timeout/abort settles independently of cooperative fetch/stream behavior; late
results cannot mutate a sealed receipt. `close()` initiates cancellation; await
the original request promises to establish their retained outcomes.

This is not a full collector: the quote producer supports its seven-key context
request, nine KUSD→XOR sizes and the corresponding two bound fee requests; the
separate bootstrap planner constructs original discovery/finality/parent/metadata calls.
Completed-hour publication receipts,
independent source registration, schedule completeness, durable goal journal,
admission, qualification and execution remain caller work. Do not manufacture a
seven-key request/response by editing an existing 22-key transcript, and never
replace original receipt clocks with later persistence or decision timestamps.
