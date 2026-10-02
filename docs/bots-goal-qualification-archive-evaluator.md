# Filesystem archive evaluator

`openGoalQualificationArchiveEvaluator` in
`scripts/bots/goal-qualification-archive-evaluator.ts` installs the real durable
study store, archive evidence source and causal episode evaluator. It implements
`GoalQualificationEvaluator` and adds an asynchronous, idempotent `dispose()`.
It is a Node-only read-only research component; it grants no browser, wallet,
signing or trading authority.

```ts
const evaluator = await openGoalQualificationArchiveEvaluator({
  directory: absoluteAuthoritativeStudyDirectory,
  plan: frozenPlan,
  manifest: frozenArchiveManifest,
  metadataPaths: {
    training: absoluteTrainingMetadataJson,
    validation: absoluteValidationMetadataJson,
  },
  sourceSha256: verifiedExecutedSourceManifestSha256,
});
try {
  // Supply this evaluator to the existing qualification boundary.
  // Its register/evaluate/sealSelection calls retain the existing ordered protocol.
} finally {
  await evaluator.dispose();
}
```

The caller must verify and freeze the executed source manifest before registration.
`sourceSha256` must equal `plan.source.evaluatorSha256`; checking this equality
alone does not attest installed source code. The wrapper snapshots the plan,
manifest and paths before its first await and binds the manifest digest/source ID
and both partition identities. Only the supplied plan can be registered; restored
records must also match the durable store. Path configuration and the authoritative
study directory are trusted operational inputs, never tool or browser payloads.

Construction and registration do not open either metadata file. Each new
`evaluate` passes through the store's synced access record first. Only its owned
producer opens the requested phase's file; validation remains inaccessible before
complete ordered training and a durable selection seal. The file must be a regular
file opened with `O_NOFOLLOW | O_NONBLOCK`, at most 32 MiB, containing a UTF-8 JSON
array of 3–100,000 exact `{height, hash, parentHash, timestampMs}` records. Reads are
bounded, file size/identity/change metadata are checked again, and the array is
frozen. Leaf symlinks and special files are rejected; trusted parent path components
must be controlled by the operator. The archive source verifies canonical sequence,
coverage and SHA-256 of `JSON.stringify(blocks)` against the registered partition.
Field order in that retained JSON projection must therefore remain unchanged.

A request-scoped file receipt retains the exact file hash, projected blocks hash,
byte count, row count and partition identity. The actual archive source retains its
raw RPC/history/schema/clock evidence through the same durable sink. Completed
traces replay from the store, including raw-evidence hash verification, without
opening metadata or constructing the producer again. Missing, malformed, changed
or hash-mismatched metadata produces a retained failed access; repairing a file
does not silently retry that episode or substitute another source.

Optional `fetch`, `marketFetch`, `signal` and `timeoutMs` are passed to the actual
archive source. The snapshotted `marketFetch` is used only by canonical pool/mark
reads; history, quotes and bounded fee reads continue through ordinary `fetch`.
Omitting `marketFetch` shares ordinary `fetch` for both lanes. The source counts
both lanes against one request/response-byte budget and cancellation state. Any
metadata replay policy and original-response evidence must be frozen and verified
upstream, with its source included in the executed-source manifest.

For a cache that must retain evidence in the current episode, trusted operational
code can instead supply `episodeMarketFetch({ request, sink, signal })`. It is
mutually exclusive with `marketFetch`; neither function belongs in plan JSON.
The factory receives the frozen exact request, the actual request-scoped durable
sink, and an owned episode signal. It runs only after the synced access marker,
metadata file checks and registered partition hash comparison. Completed replay
does not invoke it. Prepare the replay transport there and await its cache-binding
receipt through `sink`; every later cache-use receipt must use the same sink.
Only the returned fetch handles canonical market reads; history, quote and fee
traffic remains on ordinary `fetch` and both lanes retain the source's shared
request/byte limits.

Factory readiness is bounded by `timeoutMs`. Throwing, returning a non-function,
timeout or disposal fails the already-started episode without retry. The episode
signal aborts on readiness failure, disposal and completion; a late factory result
cannot begin source reads or reopen the evidence sink. The factory must honor its
signal and refrain from live acquisition until its returned fetch is invoked.
Ignoring cancellation can leave its own work running; the composition fences that
work rather than claiming to physically stop arbitrary trusted code.

Timeout is 1–30 seconds per underlying read (20 seconds by default); file byte limits
do not claim a filesystem wall-clock bound. Disposal revokes new calls immediately,
aborts owned read waits and waits for durable journal cleanup before releasing only
its own lock. External abort also latches cancellation; the owner must still call
`dispose()` to close the store. Neither path disconnects any shared SDK socket.
Historical arrival/capture times remain explicitly modeled, and fills hypothetical.

The focused composition tests use real filesystem/store/source/clock/signal/ledger
code with invented lower-reader responses. They exercise 1,440 due valuations,
24 consumed hours, receipt registration binding, completed replay after metadata
removal, unopened validation, descriptor safety, failed-access persistence,
symlink/size/schema/hash rejection and cancellation cleanup. No network or retained
market dataset is read by these tests.

`openGoalQualificationArchiveEvaluatorV2` explicitly installs the v2 source,
evaluator and journal. It requires the matching v2 plan and archive manifest;
`openGoalQualificationArchiveEvaluator` remains strict v1. See
[the v2 protocol](bots-goal-clock-v2.md).

For a declared acquisition continuation, use
`openGoalQualificationArchiveContinuationV2(options, continuation)`. This explicit
entry point requires `options.episodeFetch` and passes the trusted
`GoalStudyAcquisitionContinuation` to the continuation store, which verifies its
owned preparation and completed replay. It never falls back to the ordinary v2
store when that dependency is absent or invalid. Ordinary v1 and v2 constructors
keep their existing registration and no-retry behavior.

`episodeFetch({ request, sink, signal })` returns exactly `{ fetch, marketFetch }`
or a native promise of that pair. The ordinary lane handles history, quotes and
fees; the market lane handles canonical pool/mark reads. Both own enumerable
properties must be functions; getters, inherited fields and extra properties are
rejected without invoking them. The detached function pair is frozen. This
factory is mutually exclusive with `marketFetch` and `episodeMarketFetch` and is
also available to ordinary constructors. It shares the existing post-access,
metadata-check, sink ownership, readiness timeout and episode cancellation rules.
Completed durable trace replay skips it entirely.

Construct the owned two-lane prefix replay inside this factory, and permit new
acquisition only at the exact retained failure boundary. The store separately
requires replay completion before accepting the episode. The factory does not
itself certify continuity or authorize retry, and must not perform live reads
during readiness. Recorded retry transport needs its own aggregate physical
attempt/byte accounting in addition to the source's logical read counters; see
[the bounded acquisition transport](bots-goal-acquisition-transport.md). This
additive constructor changes no strategy, dates, price decoding or economic
evaluation, grants no trading authority and does not modify sealed source snapshots.

### V3 composition

`openGoalQualificationArchiveEvaluatorV3` installs the strict v3 journal,
source130/target131 archive source and causal evaluator. It requires the pinned
public `targetCompressedBytes`, copies them before the first await, and passes
only that owned copy to each episode. Registration and its durable access marker
still precede opening partition files or starting market reads. Worker lifetime
is bounded by the existing episode controller; disposal aborts that controller
and closes the journal. There is no v3 acquisition-continuation entry point.
