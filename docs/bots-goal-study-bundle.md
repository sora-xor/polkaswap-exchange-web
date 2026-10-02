# Exporting retained goal study evidence

`scripts/bots/goal-study-bundle-export.ts` copies a completed v2 study into
content-addressed static files. It has no network, wallet or signing dependency.
It neither starts an unfinished study nor issues a browser qualification grant.

Pass `exportGoalStudyBundle` canonical absolute paths for `studyRoot`,
`runDirectory`, a new `outputDirectory`, and the independently retained
`protocolSha256`. The run directory must already contain its frozen
`protocol.json`, source files and `certificate.json`. An optional `signal`
cancels the work. Existing output is never replaced.

The exporter verifies the sealed protocol, frozen source inventory, source
manifest and metadata block hashes. Under the authoritative store's owner
lock, it requires every access/completion record, registration, selection and
original claim. The existing qualification boundary recomputes the retained
traces' accounting, candidate ranking and validation eligibility, and compares
the entire certificate. The replay-only store rejects missing records before
any journal write; there is no producer or new data acquisition path.

For an acquisition continuation, the original failed prefix is rechecked with
the existing owned replay preparer. Both parent and child lineage, the original
failed record, inventory and every original response remain in the export.
They do not become a new validation partition. The temporary inventory is kept
outside the publication directory and removed on completion.

The published layout is:

```text
index.json
objects/<file-sha256>.bin
episodes/<request-sha256>/manifest.json
episodes/<request-sha256>/objects/<file-sha256>.bin
```

`index.json` links the public protocol projection, certificate, registration,
selection, claims, metadata block arrays, access/completion records, ordered
episode manifests and optional parent evidence. If the study used the metadata
cache, `metadata` also contains the exact collection protocol, verification
receipt, raw manifest, both original block arrays, and every original group,
wire batch and logical shard. Each source file must match the already sealed
inventory; missing or changed responses prevent publication. These are block
metadata records, not additional market observations. The public protocol projection
contains source hashes, not source file contents or `protocol.files` local
paths. Raw objects are the original canonical journal wrapper plus its newline.
The object SHA covers those exact file bytes. The completion receipt's SHA
covers the canonical **value inside** the wrapper. Both bindings are checked;
they are different hashes and cannot be substituted for each other.

All input files are bounded regular files through real, non-symlink paths.
Their identities, sizes, timestamps and hashes are rechecked before publishing
the index. Each file is limited to 32 MiB, each episode to 16,000 raw artifacts
and 512 MiB including wrapper overhead, the metadata archive to 4 GiB plus its
five input files, the index to 8 MiB and the whole export to 8 GiB.
Objects are written once and synced. The index is written last. An error can
leave an incomplete output directory, but produces no successful index result;
do not publish a partial directory or automatically reuse it.

`createGoalStudyBundleReader` opens the independently pinned index, validates
artifact namespaces and ordered episode identities, and supplies exact root,
metadata and parent bytes. It also opens training episodes through the
[browser bundle reader](bots-goal-bundle-reader.md), checking each manifest
against the study identity. Both readers share the same bounded, credential-free
static transport. Disposing a study aborts its child readers. Certificate bytes
are data, not authority. Validation completion records and raw episodes require
the privately owned selection from the completed-study adapter, bound to the
exact index, plan, source, candidate and request. Plain JSON cannot unlock them.
The [history verifier](bots-goal-bundle-history.md) and
[valuation verifier](bots-goal-bundle-market.md) recheck their respective
original raw inputs.

This export is a distribution layer. It does not independently prove RPC
truth, finality, historical non-exposure, or the original strategy evaluator's
implementation. It now includes the original metadata archive required by
browser clock verification. The [metadata verifier](bots-goal-bundle-metadata.md),
[quote/fee verifier](bots-goal-bundle-quote.md), and
[training episode replay](bots-goal-bundle-episode.md) now verify those original
joins. Owned selection/qualification, current-runtime acceptance and live
execution composition remain separate requirements. A certificate or a
successful export alone must never enable GO or wallet signing.

Tests use invented data with the actual durable store and qualification
boundary. They verify exact bytes through the actual browser reader, rejected
corruption, incomplete records, active ownership, cancellation, immutable
output and the original failed prefix in a successful synthetic continuation.
No real study outcome or wallet is used.
