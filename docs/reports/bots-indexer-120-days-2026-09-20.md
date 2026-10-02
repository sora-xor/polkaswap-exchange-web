# Historical and newly indexed data — 20 September 2026

The public indexer at `https://pi.soramitsu.io/graphql` now serves a verified 120-day hourly base for XOR, VAL, PSWAP, DAI, KUSD, LLD and LLM, from 23 May 08:00 UTC through 20 September 08:00 UTC. Subsequently completed hours remain queryable; the post-import check verified the 15:00 UTC boundary for every token. The seven priority assets' hourly records are retained indefinitely. The 90-day limit applies to one coverage query, not record age.

The older 720-hour artifact was prepared from the approved archive and imported through the existing sole MOF database owner after a native RocksDB checkpoint. The backend release stayed `1049c02`. All 5,040 generated observations matched the artifact through the public API, including close values, denomination and full block/pool provenance. The checksum-specific repair receipt was present. Every previous 90-day metadata hash was unchanged; this preservation check did not inspect protected market values.

Across the disjoint 30-day and 90-day windows, all seven assets have 2,880 verified observations with no missing, legacy, invalid, unknown-pool or zero-reserve records. XOR is the reference asset. VAL, PSWAP, DAI, KUSD and LLD have usable direct XOR-pool evidence; LLM consistently records an absent direct XOR pool.

The actual Bots decoder accepted all 720 hours in both directions for the five supported direct pairs, with exact timestamp and boundary alignment. The earlier strategy warmup contains all 200 closes from 5 June 20:00 through 14 June 03:00 UTC. LLM's missing candles were retained as missing. This offline integration made no network calls and evaluated no strategy.

Validation passed: 1,095 backend tests, the backend TypeScript build, three public-comparator tests and six decoder tests. The backend suite explicitly skipped 25 tests. Preparation took 18m39s and made 28,763 RPC calls in 3,271 HTTP requests; the artifact is 3,452,667 bytes with SHA-256 `b6c6e6e6186bf320798f15dbf529d4340d6e955ec2162ea6352e1bd74e36d894`.

The one-time import settings were removed without another restart. Original environment bytes and mode 0600 were restored. Final verification at 15:29 UTC found one expected database writer, healthy readiness, indexed/finalized block 27,715,737, zero lag and no worker error. The frozen research sources and journal prefix also passed their separate integrity check.

[Production verification](../../output/go-history/indexer-120days-20260920/production-verification.json), [exact public readback](../../output/go-history/indexer-120days-20260920/prefix-public-verification.json), [coverage and preservation](../../output/go-history/indexer-120days-20260920/coverage-after/summary.json), [frontend decoder](../../output/go-history/indexer-120days-20260920/frontend-decoder-integration.json), [API examples](../indexer-history-api.md).

This completes the history extension and fresh-query verification. Trading qualification remains separate: this operation evaluated no strategy, moved no funds and recorded no successful trade.
