# Earlier history and new-hour queryability — 21 September 2026

The production indexer now serves the additional **46 hours from May 21 10:00 through May 23 08:00 UTC** for XOR, VAL, PSWAP, DAI, KUSD, LLD and LLM. All **322 generated records** matched the prepared archive artifact exactly through the public `assetSnapshots` API. The previous 120 days' metadata hashes are unchanged.

The combined coverage checks establish **2,947 consecutive hourly records per asset**, from May 21 10:00 through **September 21 05:00 UTC**, the latest completed hour at verification. The first newly completed hour after the import was checked once per schema per asset; all seven assets returned it through both `assetHourlyCoverage` and the actual `assetSnapshots` observations query. The active unfinished hour is excluded. Hourly data continues to be retained automatically after the successor block finalizes and is indexed.

VAL, PSWAP, DAI, KUSD and LLD have usable direct XOR-pool evidence; XOR is the reference asset. LLM retains an explicit absent-direct-pool record for the added and latest windows. Missing pool evidence is not replaced with invented trading candles.

The existing sole worker applied the checksum-pinned artifact after an exclusive native RocksDB checkpoint. The release remained `release-2026-09-21.tonswap-burn.1049c02.trust-exclusion`; no deployment, endpoint switch, second database writer or chain checkpoint reset occurred. Only the verified indexer service was stopped and restarted. Its combined API/worker deployment briefly lost its listener during maintenance. Final verification found the same release, one expected database owner, original environment bytes and mode `0600` restored without another restart, healthy worker, zero block lag and no worker error.

The preparation used unchanged tested backend source: 23 backfill/startup tests, six transport-guard tests and three public-comparator tests passed. Acquisition completed in 121.375 seconds with 2,410 physical RPC elements, 259 HTTP starts and 35,639,674 decoded response-body bytes. The artifact is 220,308 bytes, SHA-256 `e0e81f3075a270032e00e09e434916d1a75e84eb81d1805158ba9dfe1a3919fb`.

This was operational data ingestion, not strategy evaluation or trading qualification. Raw historical fields were compared privately; prices, reserves and strategy returns were not displayed. Any later study must disclose this ingestion. Existing research records and protected validation claims remain unchanged.

## Query the repaired range and new data

POST to `https://pi.soramitsu.io/graphql` without an API key. This is the actual coverage schema:

```graphql
query Coverage($assetId: String!, $start: Int!, $end: Int!) {
  assetHourlyCoverage(assetId: $assetId, start: $start, end: $end) {
    expectedHours
    verifiedHours
    missingHours
    poolUsableHours
    absentPoolHours
    latestCompletedAt
  }
}
```

For the newly added KUSD range, use:

```json
{
  "assetId": "0x02000c0000000000000000000000000000000000000000000000000000000000",
  "start": 1779357600,
  "end": 1779523200
}
```

This returns 46 verified hours and zero missing hours. To check newly completed data, calculate `end = Math.floor(Date.now() / 3600000) * 3600` and `start = end - 3600`, then query the same schema. An hour appears after finalized indexing, so a just-crossed UTC boundary can briefly be pending. Retrieve actual records with the [documented `assetSnapshots` schema and cursor rules](../indexer-history-api.md#retrieve-observations); the verification used that same API for both historical records and the latest hour. Coverage queries accept at most 2,160 hours, so split longer periods into adjacent windows.

Retained evidence: [final production receipt](../../output/go-history/indexer-46hours-20260921/production-verification.json), [exact public comparison](../../output/go-history/indexer-46hours-20260921/prefix-public-verification.json), [coverage and preservation](../../output/go-history/indexer-46hours-20260921/coverage-after/summary.json), [latest observations](../../output/go-history/indexer-46hours-20260921/latest-snapshots.json), [final owner and readiness](../../output/go-history/indexer-46hours-20260921/history-final-service-state.json).

The initial import verification retained the 04:00 UTC boundary. A subsequent compound diagnostic request for 05:00 returned GraphQL errors and was not used as data evidence. Its query/failure record remains separate; the original error response body was not retained, so no exact rejection reason is claimed. Reusing the already validated per-asset query strings then verified 05:00 coverage and observation identity for all seven assets in 14 requests, with no polling. See the [freshness supplement](../../output/go-history/indexer-46hours-20260921/post-import-freshness-verification.json) and [complete corrected metadata responses](../../output/go-history/indexer-46hours-20260921/next-hour-0500-corrected.json).
