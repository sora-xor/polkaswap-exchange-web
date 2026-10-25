# Catalog historical block reader

`createCatalogHistoricalExecutionBlockReader` in `scripts/bots/historical-execution-block-reader.ts` adds an explicit metadata-only path across the three pinned historical runtimes. The existing `createHistoricalExecutionBlockReader` stays strict 130/131, with its original single schema, initialization order, RPC receipts, bounds and error shape.

```ts
const source = {
  kind: 'catalog-source-v1',
  finalizedSource: { hash, height, receiptSha256 },
  schemaAnchors: [
    { specVersion: 128, hash: hash128, height: height128 },
    { specVersion: 129, hash: hash129, height: height129 },
    { specVersion: 130, hash: hash130, height: height130 },
  ],
} as const;
const reader = await createCatalogHistoricalExecutionBlockReader(source, { catalog, fetch, signal });
const block = await reader.readBlock(requestedHeight);
const rpcEvidence = reader.evidence();
const blockProfiles = reader.blockProfiles();
```

The catalog must be the privately owned result of `createGoalRuntimeCatalog`. A copied or serialized catalog cannot authorize decoding. Source data is snapshotted before the first await; anchors must be exactly 128/129/130 in that order, have distinct hashes/heights, and not exceed the fixed finalized source. The caller supplies the source receipt identity; this reader does not read or cryptographically validate that separate receipt.

Initialization makes five shared genesis/finality RPCs and five RPCs per anchor: canonical hash, full header, runtime version, code hash and original metadata. Every anchor must match the owned catalog's complete profile and exact metadata bytes. The timestamp layout is independently derived as the fixed plain `u64` key. Target 131 requires no chain anchor and cannot be selected as historical source state.

Context is exactly `{endpoint,genesisHash,source,finalizedObservation,catalogSha256,profiles,observedFill:false}`. Each profile entry contains `{profileSha256,profile,schemaAnchor,timestampLayout}`. `profile` is the complete catalog profile including genesis hash; `schemaAnchor` retains the supplied version/hash/height. `historicalCatalogProfileSha256` computes SHA256 of **sorted-key JSON of the full profile**. This digest records an identity and does not create ownership. `timestampLayout` contains `{key,type:'u64',unit:'milliseconds',metadataSha256}`.

Each block uses the unchanged four RPCs: canonical hash, full header, `:code` hash and exact timestamp storage. Its code must identify one of the three authenticated source profiles. Unknown code, target 131, contradictory anchor code and a repeated block with a different code are refused. There is no date-based profile inference, monotonic-version assumption, reconstructed response or substitution of missing state. Full canonical header identity and adjacent parent joins remain enforced.

The returned `HistoricalClockBlock` remains `{hash,parentHash,height,timestampMs}`. The separate `blockProfiles()` snapshot records `{height,hash,codeHash,profileSha256}` once per successful read in read order. Failed/in-flight reads create no association; catalog failure diagnostics retain earlier successful associations alongside original raw RPC receipts. Both snapshot arrays and their elements are immutable. A collector must preserve and verify a one-for-one join with its completed blocks; this reader does not make that later assertion on behalf of a caller.

`CATALOG_HISTORICAL_BLOCK_READER_LIMITS` declares 20 initialization calls, four calls/block, 64 reads and 276 total RPC calls. Each response stays capped at 2 MiB and the reader total at 12 MiB; default per-RPC timeout is 20 seconds, maximum 30 seconds, covering streamed bodies. The legacy 272 RPC bound is unchanged. There are no retries or alternate endpoints. Both constructors share the bounded transport and abort cleanup.

Tests combine genuine public catalog metadata with invented headers/timestamps, exercising both upgrades, exact digests and association snapshots, full 64-read budget, forged/accessor inputs, mismatched anchors, unknown/target/relabelled code, canonical conflicts, abort/timeout and legacy behavior. They make no network calls and read no pool, price, balance, quote, fee, wallet or transaction values. Canonicality/finality remain RPC attestations, not GRANDPA/storage-trie proofs; this path alone grants no strategy qualification or live execution permission.

Timestamp layout decoding is cached by the exact privately owned immutable catalog entry. Every reader still requests and retains all three original metadata responses and compares their exact decoded bytes before using the cache. A different metadata response for a warmed entry fails with its original receipt retained. No registry, arbitrary entry or source observation is cached, and the legacy path is unchanged.
