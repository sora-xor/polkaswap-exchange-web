# Gap-aware causal calibration acquisition

The [new runner](../scripts/bots/run-causal-gap-calibration.ts) implements the
[separate protocol](../output/go-history/tc1-causal-gap-calibration-20260926/protocol.md).
It does not restart or change the failed strict-window study. Dates, all three
candidates, funding and financial limits remain fixed. This timing model was
defined after observing the earlier failure and remains exposed calibration.

The [gap-aware replay](../scripts/bots/causal-goal-calibration-gap-replay.ts)
retains native millisecond timestamps. It keeps genuine older closes in hourly
accounting, skips new signals on stale closes, and expires a pending order when
its first canonical execution block exceeds the unchanged 12-second execution
window. No replacement execution state is chosen. The protocol defines the
complete ordering and gap limits; invalid evidence remains incomplete.

## Offline prior-evidence verification

[causal-gap-reuse.ts](../scripts/bots/causal-gap-reuse.ts) verifies the fixed failed
study's registration, source snapshots, raw responses, block and runtime
identities, decoded storage, quote envelopes and fee evidence. It rebuilds
projections with existing codecs. It never feeds cached responses to a fake
network transport. The original public receipts are unkeyed observations, not
independent consensus proofs or authenticated browser-arrival records.

Before registration, this command performs only offline validation and prints
manifest metadata, not market values:

```sh
node .yarn/releases/yarn-4.10.3.cjs tsx -e 'import {verifyCausalGapPriorEvidence} from "./scripts/bots/run-causal-gap-calibration.ts"; verifyCausalGapPriorEvidence().then(x=>process.stdout.write(JSON.stringify({priorRegistration:x.priorRegistrationSha256,manifest:x.sha256,files:x.files.length})+"\n"))'
```

## Prepare and execute once

After source, tests, protocol and offline verification are reviewed, replace
`NEW_OUTPUT_DIRECTORY` with a new absolute directory whose parent exists:

```sh
node .yarn/releases/yarn-4.10.3.cjs tsx scripts/bots/run-causal-gap-calibration.ts prepare NEW_OUTPUT_DIRECTORY
node .yarn/releases/yarn-4.10.3.cjs tsx scripts/bots/run-causal-gap-calibration.ts run NEW_OUTPUT_DIRECTORY > NEW_OUTPUT_DIRECTORY/process.log 2>&1
```

Preparation makes no network requests. It binds current source dependencies,
tests, protocol, configuration, Node executable, calibration hash and the exact
prior-evidence manifest. Original prior files are copied unchanged under
`reuse/prior/` and verified again before registration is written. Keep all bound
files unchanged. The runner rechecks them before acquisition and after completion.

The start marker is exclusive and forbids restart. All three candidates must
complete episode zero before the remaining 27 episodes are collected unchanged.
Missing or inconsistent evidence stops the run and retains diagnostics. Never
delete markers or recreate a directory to hide a failed attempt.

## Reuse and fresh-request accounting

Complete verified warmup, blocks, marks and identical amount/state quote and fee
observations are reused. A registered cached key with invalid or incomplete
provenance is fatal. A genuinely absent key may be acquired once through the
bounded real reader. Reuse never changes original receipt timestamps.

If a verified prior block has no complete pool mark, the existing bounded market
reader must recheck its hash/header/runtime/timestamp before obtaining the missing
pool state. These genuine identity rechecks are permitted and recorded separately;
their actual RPC calls remain in the fresh transport count. The new block must
exactly match all retained identity fields, including native milliseconds, before
its market mark is published. Recheck summaries count completed matching proofs;
partial failed attempts remain in raw evidence and actual request counts. No cached response is
presented as a fresh network request.

- `reuse/inventory/`: each reused identity, its original file hashes and prior
  registration/manifest references. `reuseCounts` distinguish reuse from fresh
  transport requests.
- `reuse/identity-rechecks/`: prior block identities needing genuine reader
  revalidation because their complete market projection was absent.
- `raw/` and `market/`: newly obtained evidence and projections only.
- `episodes/`, `first-episode-complete.json`, `complete.json`, `failed.json`:
  immutable replay results, gate, successful coverage or terminal failure.
  Completion/failure receipts retain fresh counts, reuse counts and identity
  recheck counts separately.

An interruption can leave only partial receipts and the start marker. Completion
means full accounting coverage with explicit skipped opportunities, not a
profitable strategy or uninterrupted tradability. Episodes are independently
funded and must not be compounded. The run has no wallet, signing or transaction
authority; it cannot qualify a live strategy or prove realized/future profit.
