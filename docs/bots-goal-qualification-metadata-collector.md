# Qualification callback metadata collector

`collectGoalQualificationMetadata` in `scripts/bots/goal-qualification-metadata-collector.ts` collects only canonical height/hash/parent/timestamp rows. The existing historical block reader attests the fixed genesis, finalized source, historical timestamp schema/runtime, and runtime code identity. No asset, reserve, pool, quote, fee, account, transaction, or market-outcome method is allowed. RPC attestations and file digests are provenance/integrity evidence, not independent cryptographic finality or observed past browser arrival times.

The caller freezes the source, schema, source hashes and inclusive height ranges before fetching. Each range starts at the independently located canonical last block at or before `partitionStart − 60,001ms` and ends at the first block strictly after the partition end. Every intervening height is retained; timestamps and parent links must be strictly consecutive and coherent across shard boundaries. Warmup market evidence is a separate strategy-access requirement. Earlier operational indexer ingestion is disclosed in the [access audit](../output/go-history/earlier-window-metadata-20260920/earlier-study-access-audit.md); this is not a claim that those values have never been processed programmatically.

A trusted evaluator can later explicitly slice these rows in modeled arrival space for `buildGoalQualificationClock`. That builder requires the immediate modeled predecessor/successor and all intervening callbacks. Neither this collector nor its metadata establishes strategy qualification or opens validation market observations.

## Transport and limits

Up to 32 independent readers each consume at most 64 blocks, sequentially within that reader. One physical HTTP batch is in flight at a time, with at most 32 logical requests and at least 125ms between starts. Exact identical method/params within a batch share one wire RPC; original response bytes, request mapping and restored individual request IDs are retained before any reader receives a projection. The transport does not combine distinct states or change requested heights.

The frozen range determines the total logical RPC budget: `4 × blockCount + 10 × shardCount`. Physical HTTP starts are bounded by `min(logicalRpcBudget, 532 × ceil(shardCount / 32))`; this allows limited scheduling skew and does not guarantee eventual completion. Exceeding a budget is unavailable evidence, not permission to increase it. Each wire batch is at most 8 MiB, each projected response at most 2 MiB, and total wire bytes at most `2 MiB × shardCount`. Projected raw receipts are additionally limited to 2 MiB per shard. Body reads and fetches have bounded abort-aware deadlines; a late or noncooperative response cannot revive a stopped batch.

Current fixed earlier study bounds are 82,392 blocks, 1,288 shards, 342,448 logical RPCs, at most 21,812 HTTP starts, and 2,701,131,776 wire bytes. At synchronized full occupancy, 41 groups require approximately 10,906 batches, a minimum pacing time of 22m43s. The maximum-start budget alone spans 45m26s; network latency, metadata decoding and durable writes add time. These are request-derived estimates, not a completion promise. Raw wire and per-reader projection artifacts require additional disk space beyond the wire-byte limit.

## Durable resume

The artifact store must create files atomically and refuse overwrite. The runner uses temporary-file fsync followed by an exclusive hard link, then fsyncs the containing directory. It takes a single-owner lock and writes the protocol before the first network call.

A `.started` marker is durable for every member before a group opens the network. Original batch records precede projected shard receipts. A complete group records its physical request/byte counters and each batch digest; complete shard records bind that group, source/schema, exact range, canonical rows and per-reader RPC receipts. Resume verifies these records and global HTTP pacing across groups. All cached batches and shards must still exist and match their digests.

Only completed shards resume. A recorded failure or a started shard without a matching completed receipt remains unavailable and is never retried. One member failure aborts the group; partial observations remain raw evidence and are not published as accepted rows or completed counts. A controlled shard cap yields only after a complete group and may resume without changing the protocol. SIGINT/SIGTERM during a read is an uncertain failed group, not a clean resumable boundary. A failure lock is deliberately not deleted automatically.

## Fixed runner

The prepared runner is `output/go-history/earlier-window-metadata-20260920/collect-callbacks.mts`. `--prepare` creates a new `callback-collection` directory and immutable source/range manifest without any network. `--collect --maximum-new-shards=N` requires that exact manifest and unchanged sources; omitted `N` uses the whole fixed range. Console output contains counts and status only. The study uses the complete 116-hour training and 49-hour validation partitions, with fixed tails. It must be coordinated with other approved archive jobs before launch.

No collection is launched by importing these modules or by the unit tests. Tests use synthetic canonical blocks, mocked RPC, a fake clock and in-memory durable stores. They cover batch mapping/deduplication, global pacing, abort/late response behavior, malformed limits, immutable resume, failed-group rollback and canonical continuity.


## Completed fixed metadata acquisition — 20 September 2026

The fixed collection completed at 16:05:07 UTC with 82,392 blocks, 1,288 shards, 342,448 logical RPCs, 329,978 wire RPCs, 10,906 HTTP starts and 120,033,609 response bytes. All eight source hashes remained unchanged. No failed shard or unresolved owner lock remained.

The approved offline verifier then joined every retained logical receipt to its original batch response/mapping, replayed all 342,448 receipts through the actual historical block reader, and matched all 82,392 normalized blocks and their schema. It made **zero network attempts**. The [complete verification receipt](../output/go-history/earlier-window-metadata-20260920/collector-complete-verification.json) binds the source manifest, original collection result and exported partitions. It is metadata/provenance evidence only; no market data or qualification results were opened.

The canonical exports `callback-training-blocks.json` (58,033 rows) and `callback-validation-blocks.json` (24,359 rows) retain the fixed startup and terminal tails. Their receipt hashes are SHA-256 over UTF-8 `JSON.stringify(blocks)` in canonical height order, with no appended newline. Exports and the receipt use fsynced, atomic, no-clobber publication. A later evaluator must explicitly slice each modeled episode and keep the unchanged study-access seal; collection completeness alone does not grant qualification.
