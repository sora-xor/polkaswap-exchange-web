# Durable qualification study journal

`scripts/bots/goal-qualification-study-store.ts` supplies filesystem persistence for the existing
`GoalQualificationEvaluator` contract. It performs no network requests, strategy selection, economic
validation, wallet operation, or qualification authorization. The existing qualification boundary
remains responsible for validating the causal trace and recomputing its accounting and acceptance.

## Composition

```ts
const store = await openGoalQualificationStudyStore({ directory, sourceSha256 });
const evaluator: GoalQualificationEvaluator = {
  protocol: 'finalized-xyk-execution-validation-v1',
  sourceSha256,
  register: store.register,
  sealSelection: store.sealSelection,
  evaluate: (request, selection) => store.evaluate(request, selection, async (fixedRequest, sink) => {
    // The archive adapter must await raw retention before returning normalized data.
    return evaluateEpisode(fixedRequest, sink);
  }),
};
try {
  await createGoalQualificationBoundary(evaluator).qualify(plan);
} finally {
  await store.dispose();
}
```

The configured absolute directory's parent must already exist. Use one fixed, access-controlled root
for the deployment. An exclusive write-once `owner.json` permits only one cooperating process. A
stale lock is never stolen, and there is no automatic reset, lock recovery, evidence repair, overwrite,
or deletion API. Closing is idempotent, immediately stops admission, waits for active bookkeeping,
then removes only the matching owner's lock. Failed I/O closes admission for that instance.

## Ordering and immutable facts

Registration persists the complete validated plan and source identity before any producer can run.
The store reserves both study ID and validation partition. Across the authoritative root, a new plan
cannot reserve an overlapping half-open validation interval on the same genesis, even by renaming
its source or partition. Claims include the full source identity and actual interval; changing a hash
does not make previously claimed observations unseen. Disjoint intervals may be registered.

Earlier claims are inspected through a separate read-only metadata path. Each
stored v1/v2/v3 plan is checked against its own protocol and evaluator source digest,
its exact registration digest, the partition filename, and both mirrored
study-ID/validation claims. A new source or supported protocol can therefore
register a disjoint interval without pretending to execute the earlier study.
The normal registration/evaluation loader still requires the current instance's
exact protocol and source. V3 prior claims additionally require the exact source130
profile and independently pinned target131 execution model; they cannot be interpreted
as a v1/v2 registration or acquisition continuation.

When the original claim has a recorded acquisition continuation, this metadata
path checks the reciprocal child record, source-only plan change, lineage-bound
child registration, and original first-training access/failure metadata hashes.
It retains the original parent's claim. It neither opens raw training/validation
values or completion traces nor issues a replay/continuation capability. Raw
integrity remains mandatory when the actual execution/replay loader is used.

The interval check has a deliberately narrower scope than a full exposure audit:
it compares **new validation against prior claimed validation** on the same
genesis. It does not compare new training or its warmup against prior validation,
or new validation against prior training/warmup or operational ingestion. Source
manifests and a separate metadata/exposure audit must cover those facts before
registration. This fix preserves that scope rather than silently changing it.

The planned candidates run in fixed order, each with four consecutive training episodes. Selection
requires every planned training episode to be complete. It seals the exact candidate, registration,
validation partition, and `trainingSha256` once. That summary digest is supplied by the trusted
qualification boundary, which computes the episode summaries; the journal does not independently
rank candidates or compute that digest. Only the selected candidate's two ordered validation
episodes can run. Each request must exactly match its registered candidate, phase, partition,
episode index and fixed start/end times.

Before invoking the producer, a fsynced access record binds that request to registration and, for
validation, the persisted selection. A producer failure or raw-retention failure is terminal for the
attempt. A started access record with no complete record is also terminal; restarting cannot reopen
that request or continue its ordered episode sequence. An identical completed request returns its
detached immutable evidence without invoking the producer, after verifying the access binding,
completion digest, raw manifest and every retained raw file. Restoring a certificate or selection
requires exact corresponding persisted facts; supplied JSON cannot create missing registration or
selection records. A late completion after `dispose()` may be retained, but is not returned to the
disposed caller.

## Raw evidence sink

The producer receives `sink.retainEvidence(name, ownData)`. Names are request-scoped, unique, and
limited to 128 ASCII filename characters without separators. The value is copied synchronously
before awaits, validated as bounded plain own-data, and written once. The returned
`{ name, sha256, bytes }` is available only after durable publication. An escaped sink closes when
the producer completes; duplicate names or rejected retention poison the attempt even if caught by
the producer. All started writes settle before the completed or failed marker is written.

Raw SHA256 uses UTF-8 canonical JSON: recursively sorted own object keys, ordered arrays, and
`JSON.stringify` primitives, with no final newline. `bytes` counts those payload bytes only. This is
the same encoding as `goalQualificationDigest`; the raw copier permits longer metadata strings
within the overall byte bound. Accessors, sparse arrays, symbols, non-plain objects, undefined and
unsafe numeric values are rejected. Canonical raw wrappers also bind name and exact request digest.
The completed manifest includes the sorted receipt descriptors and their digest.

Bounds are 16,000 raw files and 512 MiB of canonical raw payload per episode; each raw wrapper is at
most 32 MiB (payload cap 32 MiB minus 1,024 wrapper bytes). Data remains subject to 800,000 nodes,
depth 24, arrays of at most 30,000 items and objects of at most 64 fields. Completed episode records
are at most 32 MiB, ordinary records at most 1 MiB, and a root holds at most 1,024 validation claims.
These are storage bounds, not archive RPC budgets; the transport adapter owns its independent limits.

Records are written to exclusive temporary files, fsynced, hard-linked atomically to final names
without replacement, and followed by directory fsync. Reads reject symlink files, oversized files,
invalid UTF-8, noncanonical encoding and incomplete records. Crash leftovers remain evidence and
are never silently repaired. This requires a local filesystem supporting hard links and directory
fsync and a single cooperating owner; it does not provide hostile-filesystem authentication.

Choosing a different root, deleting the authoritative root, rewriting all records and hashes, or
opening data outside the trusted producer are not prevented by this module. Deployment must enforce
the one-root policy and source access boundary. The journal is not a certificate authority and does
not by itself establish that any strategy is profitable or safe to execute.

## Offline verification

The focused suite uses temporary directories and invented data. It covers publication ordering,
exclusive ownership, overlap rejection, exact request/selection binding, durable failed and
interrupted attempts, raw tampering, metadata-size compatibility, late disposal, and replay through
the actual qualification boundary with a synthetic causal trace. It performs no real archive reads
or qualification study.

Additional synthetic tests cover disjoint mixed-source v1/v2/v3 claims, overlapping
renamed claims, damaged registration/source/plan/claim metadata, changed claim
filenames, mirrored-ID corruption and reciprocal continuation corruption. They
also show that preserving an earlier claim does not read its raw observations or
let a new execution instance load the earlier source's request.

`openGoalQualificationStudyStoreV2` uses the same authoritative directory and
persistence protections with explicitly versioned v2 plans/evidence. The original
constructor remains strict v1. Version mismatches fail before accepting a plan or
trace; no persisted v1 failure is upgraded. See [the v2 protocol](bots-goal-clock-v2.md).

## Explicit v3 source/target model

`openGoalQualificationStudyStoreV3({directory, sourceSha256})` uses the same fixed
authoritative root, write-once registration, ordered access and immutable validation
claims. Its plan requires `executionModel`, parsed by `readGoalTargetExecutionModel`:
the exact source130 and target131 metadata/code profiles, target compressed artifact
digest, host/state/quote implementation digests, hypothetical fill model, and a
positive declared live fee cap within the existing reserve limit. The plan's
`runtimeProfiles` must equal the single source130 profile. The target execution
profile is recorded separately in the model; an extra source or target profile in
`runtimeProfiles` is rejected. The configured evaluator source digest remains exact.

V3 accepts only `finalized-xyk-execution-validation-v3` evidence, including the same
explicit `deadlineCancellation` field as v2. The journal checks trace identity,
window and retained raw integrity; it does not execute target WASM, validate hypothetical
fills, choose the fee cap, or issue qualification. Those checks remain with the trusted
v3 producer and qualification boundary. V1/v2 constructors still reject v3 plans,
model fields and traces; old immutable records are never upgraded.

`openGoalQualificationStudyReplayV3({directory, sourceSha256})` opens an existing
v3 journal with the ordinary exclusive owner lock. It may temporarily create/remove
only that lock. Registration, selection, completed traces and every retained raw
envelope must already exist and match; replay never invokes a producer or creates
missing records. The existing `openGoalQualificationStudyReplayV2` retains its
separate v2 behavior. **There is no v3 acquisition-continuation API.**

Synthetic tests cover both-direction mixed-version claims, model/source-role
rejection, versioned evidence failures, full ordered training/selection/validation
journal replay, byte-preserved durable records, missing-record rejection, raw
tampering and malformed prior v3 metadata. Their invented implementation pins, fee
cap and traces are journal fixtures, not registered strategies or economic evidence.

## First-training acquisition continuation

`openGoalQualificationStudyContinuationV2(options, {preparation, completedReplay})`
is a separate opt-in constructor for the recorded first candidate's first training
episode failing during indexer acquisition. It requires an owned preparation from
[verified retained-prefix replay](bots-goal-acquisition-replay.md), including the
original registration, failed access, complete raw inventory and original HTTP
failure. Production callers use the [filesystem adapter](bots-goal-acquisition-replay-files.md)
to enumerate and verify all original files. A caller-supplied JSON lookalike is
insufficient.

The original failed invocation remains failed. This constructor appends exactly
one child, retaining the original study-ID and validation-partition claims. Only
`plan.source.evaluatorSha256` may change, to bind the new acquisition implementation;
all candidates, dates, runtime profiles, economic limits, source manifest and
modeled arrival assumptions must remain identical. A parent with any completed
episode, selection, later access or unrelated journal record is ineligible.

The child's registration binds identical immutable lineage records in both
directories. Competing children, partial publication and changed lineage fail
closed. First-episode completion additionally requires the private replay
completion capability; returning plausible episode JSON cannot bypass the prefix.
The caller captures that capability while the episode is active and returns it
through `completedReplay`. The normal training order, full training requirement,
selection seal, validation checks and terminal treatment of another failure still
apply. No ordinary constructor acquires retry permission through these changes.

This journal does not implement network recovery or establish profitability.
The trusted composition must retain retries, carry original request and response
costs into the transport budgets, and pass the actual qualification boundary.
Focused synthetic continuation tests cover unchanged claims, byte-preserved parent
records, one-child lineage, exact plan binding, owned replay completion and closed
validation access. They make no external requests or economic qualification claims.
