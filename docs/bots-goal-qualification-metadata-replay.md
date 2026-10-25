# Archived metadata replay for pool marks

`createGoalMetadataReplayTransport` in
`scripts/bots/goal-qualification-metadata-replay.ts` reuses verified canonical
block metadata for the archive **pool-mark reader**. It avoids repeated schema
and block RPC calls when reading many marks. This transport grants no trading
or qualification authority, and cached responses are not observations of past
browser arrival times.

The input pins the prepared collection file, completed verification receipt,
raw-file manifest, canonical block export, partition, and initialization shard.
The initialization shard is chosen before reading market data. All source,
finality and schema calls replay that exact shard's original responses; later
block calls use the shard owning the requested canonical height/hash. A missing
call is an error, never a network fallback.

The raw-file manifest is created with
`buildGoalMetadataReplayRawManifest({ manifestSha256, verificationSha256 }, entries)`.
Each entry contains `name`, `sha256` and `bytes` for the **exact UTF-8 file bytes**,
including any trailing newline. The helper sorts entries and validates the
logical names; it does not read files or attest their contents. Hash the exact
serialized manifest file separately for `rawManifestSha256`.

The supplied `readArtifact(name, signal)` adapter maps only these logical names
to already retained files:

- `run-protocol`, `verification`, `raw-manifest`
- `blocks-training`, `blocks-validation`, or `blocks-development`
- `shard-NNNNN.complete`
- `group-NNNNN.complete` and `group-NNNNN.batch-NNNNN`

The factory verifies the selected block export and immutable file bindings.
Loaded shards must join every logical response to its original batch request,
mapping and raw response bytes, and must replay successfully through the actual
`createHistoricalExecutionBlockReader`. Conflicting blocks, schema, RPC results,
raw hashes, or missing files fail closed. Original receipts retain acquisition
timestamps separately from the current cache request time. Only the JSON-RPC ID
is changed when returning an exact cached result to its current caller.

`retainEvidence(receipt)` is mandatory and must durably persist the immutable
cache-use receipt before resolving. A cached response is released only after
this sink completes. Each receipt binds the cache policy and input, owning shard,
original logical response, compatible original wire mappings, and returned
projection. The caller must also retain the original immutable artifacts and
bind the replay implementation hash and policy in its prerecorded run manifest.
Checksums do not independently prove that an arbitrary supplied verifier is
trustworthy.

Only `state_queryStorageAt` with the exact seven keys derived by the actual
historical pool codec, in their expected order and at a hash in the selected
partition, may reach `liveFetch`. That call still goes through the ordinary pool
reader's response decoding and evidence retention. Quote, fee, history,
transaction and account methods are never delegated. Runtime metadata at a new
hash is not fabricated from an anchor, even if the runtime code hash matches.
Use the separate archive `marketFetch` option for this transport; keep quote,
fee and indexer history reads on their ordinary transport.

The returned object supplies `fetch`, immutable `binding`/`bindingSha256`,
`evidence()` and `counts()`. The fixed policy bounds calls, artifact reads/bytes,
operation duration and cache entries. Access is sequential. Any request,
artifact, abort or sink failure permanently stops that instance. It does not
retry or choose a different shard, partition, amount, source or study window.
The caller's outer archive HTTP/byte limits continue to apply to both cached
responses and live pool calls.

Tests in `tests/unit/scripts/bots/goal-qualification-metadata-replay.spec.ts`
generate synthetic metadata with the actual collector and replay it through the
real block and pool readers. They include a complete pool-mark read, raw-byte
and wire-join tampering, canonical contradictions, exact seven-key delegation,
missing lazy shards, out-of-range requests, sink ordering/failure, immutable
options and uncooperative-read cancellation. They perform no network requests
and read no real market data.

## Catalog metadata v2

`createGoalCatalogMetadataReplayTransport(input, { catalog, ...options })` is the explicit alternative for `qualification-callback-metadata-catalog-v2` collections. Its input policy is `GOAL_CATALOG_METADATA_REPLAY_POLICY.id` (`verified-canonical-catalog-metadata-cache-v2`). The original constructor and v1 policy continue to reject v2 archives. An actual privately owned `GoalRuntimeCatalog` is required before any artifact read; copied catalogs cannot authorize replay.

The v2 protocol declares all three source anchors and the catalog identity. Each completed shard carries `blockProfiles`, exactly one association per canonical clock block. The shared replay verifies original file hashes, batch-to-logical receipt joins, the exact twenty initialization calls, and four calls per block through `createCatalogHistoricalExecutionBlockReader`. It compares the returned profile associations with the retained shard. Per-block code lookup permits observed 128/129/130 transitions, including a return to an earlier known code, without assuming that numeric versions increase. It never creates a `state_getMetadata` or runtime-version response for another block: only the exact originally requested anchor parameters are cacheable.

`await replay.profileForBlock(hash, height)` verifies the owning shard and returns a frozen `GoalCatalogMetadataBlockProfile`: the actual profile, code/profile hashes, catalog and replay binding hashes, and original shard identity. `assertGoalCatalogMetadataBlockProfile(value, { catalog, bindingSha256 })` can enforce the exact issuing scope. Copies, mismatched hash/height pairs and stale capabilities after failure or parent cancellation are rejected. This is RPC-attested metadata provenance, not cryptographic finality or qualification.

Before delegating a seven-key `state_queryStorageAt`, v2 verifies that block's association and derives the exact keys from its owned catalog entry, in the existing order: timestamp, denominator, KUSD asset, XOR asset, DEX0, Properties, reserves. Missing or contradictory raw metadata stops before the live storage call. The immutable catalog proves these keys agree across its source profiles; no market value is used to choose a profile. Every returned metadata RPC response still waits for the durable evidence sink, retaining original acquisition timestamps and exact wire matches.

V2 retains the original 2 MiB per-response reader limit and 8 MiB raw-file limit. Its collector budget uses `responseBytes = 6291456` as the **sum of logical response bytes per completed shard**, since the three genuine metadata responses alone exceed the old 2 MiB shard budget. Initialization is twenty calls, groups allow at most 552 batches, and cumulative replay artifact reads have a finite 12 GiB byte cap. V1 keeps its original ten initialization calls, 532-batch bound and 4 GiB cap. Both keep bounded eight-shard/two-group caches, the 30-second operation limit and no metadata network fallback.

The synthetic v2 tests execute the actual collector and catalog reader with genuine pinned metadata, invented headers/timestamps and no network. They cover cross-runtime and rollback associations, lazy shard verification, immutable provenance, exact delegation, raw-profile corruption, old/new policy separation, retention failure and cancellation. No market observations or study outcomes are read.
