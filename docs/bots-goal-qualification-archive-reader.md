# Qualification archive source

`scripts/bots/goal-qualification-archive-reader.ts` connects the causal episode evaluator to the actual indexed hourly decoder, canonical archived pool reader, exact-input XYK quote reader and bounded native-fee codec/reader. It is read-only Node tooling. It does not install a browser runtime, qualify a strategy, create a wallet session or submit a transaction.

Create one source per evaluation request, **inside** the durable study store's request producer, with its request-scoped evidence sink. The source manifest must already be included in the registered plan. It binds genesis and denomination, the fixed 200 prior hourly closes plus the current completed close (201 observations), exact metadata partition and receipt hashes, exposure/operational-ingestion disclosures, timing assumptions and HTTP/byte budgets. The caller must verify the raw metadata collection before exporting its block array; an array checksum alone cannot prove archive authenticity. The study root must remain the same across restarts and studies.

The source copies plain input before awaiting, verifies consecutive block heights/parents/timestamps and builds the existing finalized-callback clock. It selects the last canonical state available under the declared finality delay. Funding captures finish at the exact start; each due valuation captures after the hourly history becomes available. History availability uses the latest successor's second-resolution upper bound (`seconds * 1000 + 999`), finality delay and separately declared publication delay. Capture and quote durations are fixed, preregistered assumptions. Actual RPC acquisition timestamps remain in the raw receipts and are never called historical browser receipt times.

Each signal requests only its frozen codec amount. The quote remains pinned to the valuation's exact canonical block, pool, denomination and runtime profile. The existing reader verifies historical call encoding and original fee decoding; the separate bounded-envelope reader queries the declared mortal64/u32/signature-length envelope. Both fee RPCs must agree, minimum output uses exact integer rounding, and pool fees are already included in quoted output. Price-impact and ledger admission decisions remain in the shared evaluator. An unavailable quote, missing pool, changed runtime or inconsistent proof makes the episode incomplete. There is no alternate amount, later state or retry.

Every raw schema, pool-state delta, history page, quote and bounded-fee response is retained before its projection returns. Evidence hashes use the journal's recursive sorted-key JSON UTF-8 encoding. The metadata partition array hash separately uses its exact height-ordered `JSON.stringify` encoding. Market readers rotate at 64 unique marks; cached exact states reuse their immutable raw proof. Independent acquisition timeouts remain bounded, and the source also enforces at most 10,000 HTTP requests and 256 MiB response bytes per episode. The manifest may select smaller limits. A source failure is sticky; its bounded diagnostic is retained where storage remains available.

The optional `marketFetch` transport applies only to the canonical market reader's
metadata and pool storage calls. It can replay verified metadata while forwarding
the reader's exact pool storage requests. Historical quotes, bounded fees and
indexed history always use the ordinary `fetch` transport. Both functions are
snapshotted at construction and share the same cumulative request/response-byte
budgets and cancellation state. Cached responses still consume those budgets.
An aborted late response is cancelled before its bytes or value can be admitted.
If `marketFetch` is omitted, both lanes use ordinary `fetch`. A supplied cache must
retain its original-response provenance and have its policy, binding and executed
source covered by the protocol fixed before access; the transport option alone
does not verify cache authenticity or authorize a new data source.

Terminal accounting uses the true canonical state at or before the original deadline, plus its immediate successor strictly after that deadline. This is retrospective proof; its receipt may occur later. The state-age rule applies at the deadline. All due valuations must already exist, including those after a target or loss stop.

The unit tests use invented blocks, mocked raw readers and real execution/fee codecs. They establish deterministic state selection, causal order, fixed partial amounts in both directions, exact envelope joins, bounded shard rotation, immutable input and failure handling. They provide no evidence of market profitability or an actual trade.

## Already-exposed engineering data

Use `createGoalArchiveDevelopmentSource` for a diagnostic run over already-exposed
data. It invokes the same private state-selection, raw retention, quote and fee
pipeline as the strict qualification constructor. Its input replaces `registration`
with an exact `engineeringReceipt`:

```ts
{
  kind: 'already-exposed-engineering-run-v1',
  planSha256,
  requestSha256,
  manifestSha256,
  exposureAuditSha256,
  protocolRecordedBeforeRunSha256,
}
```

Every binding must match the immutable plan, request, manifest and exposure audit.
The caller must durably record the engineering protocol and access before creating
the source, and supply the same write-once raw-evidence sink. Hash equality does not
prove that upstream persistence happened. The existing plan/request structure is
reused for accounting compatibility, with `phase: 'training'` required; it does not
make this an eligible training or validation dataset. Any selection is rejected.
The qualification constructor still requires its original registration and rejects
engineering input or an engineering receipt substituted for registration.

Engineering `source.json` explicitly records `qualificationEligible: false`,
`exposure: 'already-exposed'` and the engineering receipt. It contains no registration
or selection field. The shared clock builder's existing `preregistrationSha256`
field binds the engineering parameters recorded before this particular run; it
never attests that historical data was unopened. Its source record distinguishes
that meaning explicitly.

`evaluateGoalArchiveEngineeringEpisode(input, options)` runs the actual shared
causal episode loop and returns a frozen `{kind: 'goal-archive-engineering-result-v1',
qualificationEligible: false, exposure: 'already-exposed', engineeringReceipt,
trace, traceSha256}`. The nested trace retains the shared accounting schema. The
outer result is not `GoalQualificationEvaluator`, provides no registration or
selection method, and cannot issue a qualification certificate. The operational
runner must separately retain this final result and its completed raw manifest;
this helper does not create a generic journal or use the qualification study store.

Synthetic tests cover constructor separation, all receipt bindings, no fabricated
registration, forbidden validation/selection, unchanged pinned quote/fee joins in
both directions, and a complete 1,440-valuation/24-signal engineering loop.

The explicit v2 entry points add retained deadline-cancelled stage prefixes and
metadata-only hourly publication waiting. The original entry points remain strict
v1. See [the v2 protocol](bots-goal-clock-v2.md) for version binding, evidence and
fixed-deadline accounting rules.

### Explicit target execution (v3)

`createGoalQualificationArchiveSourceV3` accepts only a v3 plan and source
manifest, plus the pinned public runtime binary in `targetCompressedBytes`.
It verifies the model's host, state-codec and quote-codec hashes before external
reads. The source, state metadata and original pool Properties remain runtime130;
the normal market reader verifies canonical blocks, genesis, finality, code,
metadata and denominator. The target quote worker independently reads the full
required account state at that same hash and checks Properties against the
original mark's exact raw storage response. Cached pool reserves are never used
as the worker's account balances.

Raw target RPC responses are durably retained as `target-rpc-CHECK-ID.json`
before the next request or API invocation. The quote artifact contains those
receipts, the original market artifact digest and the complete target API
estimate. Successful estimates also retain a joined fee artifact. A genuine
runtime `None` quote retains an unavailable result and no fee artifact; the
causal evaluator records a rejected order without a fill or fee. A transport,
malformed data or worker failure remains an acquisition failure. Completed API
failure receipts are retained in `failure.json` when available.

One owned worker serves an episode, starts only if a quote is requested, and
terminates on terminal completion, acquisition failure or the enclosing episode
abort. Whole-quote deadlines span storage acquisition and API execution. V1/V2
entry points reject the v3 model and binary option and retain their old behavior.
All capture times remain the preregistered timing model, not historical arrival
observations. These estimates do not establish profitability or grant trading
authority.
