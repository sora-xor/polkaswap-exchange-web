# Historical and new hourly data

POST GraphQL queries to `https://mof.sora.org/graphql`. The same API serves repaired history and newly finalized hours. No API key is required.

The maintained MOF route was verified through normal public DNS on 1 October 2026: strict TLS, Polkaswap CORS, zero worker lag, and the existing RPC WebSocket upgrade passed. The [endpoint completion receipt](../output/go-history/bots-completion-audit-20260930/mof-graphql-public-verification-20261001T0654Z/completion.json) records that check. Production config supplies the endpoint to the live Bots indexer client and TONSWAP snapshots; finalized close evidence is supported at MOF. Owned-indexer HTTP query behavior remains unchanged. The historical data receipts below retain their original dates and source bindings.

On **1 October 2026**, the unchanged app parser accepted **369/369 XOR/KUSD hours through 07:00 UTC** from MOF, with zero gaps. Genesis and the finalized denomination came from separate RPC reads. All 368 overlapping hours per asset matched the preceding metadata check. The [full history receipt](../output/go-history/bots-completion-audit-20260930/full-public-mof-close-evidence-20261001T0706Z/final-terminal.json) records actual requests, parser execution and source hashes. This verifies fetched history usability; it does not establish strategy qualification or independently attest historical reserves.

**Retained verification: 22 September 2026, 02:42 UTC.** All seven priority assets returned **168/168 verified completed hours** through **02:00 UTC**, including the newly completed hour since the previous check. Both `assetHourlyCoverage` and `assetSnapshots` returned that hour for every asset. Historical spot records from May 21 and both KUSD pagination pages remained unchanged. All **33 requests succeeded** without retries. See the [retained verification receipt](../output/go-history/indexer-queryability-followup-20260922T0242/verification.json).

| Requirement       | Public API behavior                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Historical data   | Retained hourly records from May 21, with cursor pagination.                                                                                         |
| New data          | Completed hours are added after their successor block finalizes and is indexed. No manual backfill or frontend deployment is needed.                 |
| Supported tokens  | XOR, VAL, PSWAP, DAI, KUSD, LLD and LLM.                                                                                                             |
| Trading usability | XOR, VAL, PSWAP, DAI, KUSD and LLD have usable pool/reference evidence. LLM explicitly reports `ABSENT_POOL`; an observation is not a tradable pool. |

The [previous 01:46 UTC check](../output/go-history/indexer-queryability-168h-20260922/verification.json) ended at 01:00 UTC. The later result proves the next hour became publicly queryable while the historical rows and pagination were preserved. Neither check selected held-out prices or reserves.

The live Chrome Bots flow also loaded the indexed KUSD/XOR window and reached **Waiting for strategy**, exposing 117 training candles and declaring 50 reserved validation candles. No strategy or transaction was submitted during this data-availability check. [Browser observation](../output/go-history/indexer-queryability-168h-20260922/chrome-history-consumption.json).

The worker collects completed hours during both live indexing and catch-up, committing them with the finalized-block checkpoint. A finality stall with continued block production is recovered from those actual blocks when finality resumes. A block-production halt can leave real hourly gaps; the service does not synthesize observations to hide them. Coverage queries are uncached; repeated identical observation queries may use the service's short response cache described below. A focused review of collection, startup, historical valuation, coverage and GraphQL behavior passed 93 unit tests on September 22.

The historical baseline contains 2,947 verified consecutive hours per asset from 21 May 2026 10:00 UTC through 21 September 2026 05:00 UTC for XOR, VAL, PSWAP, DAI, KUSD, LLD and LLM. The indexer also retains newly completed hours. VAL, PSWAP, DAI, KUSD and LLD have direct XOR-pool evidence; XOR is the reference asset. LLM records an absent direct XOR pool, so it must not be treated as usable XOR-pool trading history.

At **12:47 UTC on 21 September 2026**, the latest hour completed by the finalized chain, ending at **11:00 UTC**, was queryable through both `assetHourlyCoverage` and `assetSnapshots` for all seven assets. All 14 metadata-only requests returned HTTP 200, with seven verified boundaries, seven observation rows, and zero missing or invalid records. The closing block timestamp was 10:59:54 UTC; LLM retained its explicit absent-pool status. No prices or reserves were selected and no requests were retried. See the [11:00 verification and raw requests/responses](../output/go-history/indexer-current-hour-regression-20260921/finalized-hour11/verification.json). This records availability at the check time, not a guarantee about future requests.

The hour ending at **12:00 UTC was not yet finalized**. Both approved chain endpoints reported finalized block 27,725,827 with chain timestamp 11:37:54 UTC, and the indexer had processed that exact height. A newer, unfinalized block had timestamp 12:43:30 UTC. The 11:00–12:00 bucket therefore remained a legacy observation without closing proof; no finalized successor existed to certify it. Public health reported `last-success-stale` with zero indexing lag. This was upstream finality staleness, not evidence that historical records had been lost. The [diagnosis](../output/go-history/indexer-current-hour-regression-20260921/diagnosis.json) retains the heads, health response and compiled worker comparison; the [original 12:00 check](../output/go-history/indexer-freshness-20260921/completed-hour-20260921T124030Z/verification.json) remains unchanged.

At **13:15 UTC**, a separate startup correction was deployed: derived snapshot maintenance now uses its finalized block's chain timestamp instead of the host wall clock. The release preserves TONSWAP and finality-display changes, the existing database, and the environment. The [deployment receipt](../output/go-history/indexer-startup-timestamp-deployment-20260921/deployment-verification.json) binds the tested source and runtime files, activation, and readback. The full indexer suite passed 1,124 tests (25 skipped), the build passed, and all 255 inventoried release files matched the expected two-file change. The post-start check found one database owner and no error-matching log lines in the bounded startup log.

The **13:22 UTC public verification** again found all seven assets' latest finalized hour, ending at 11:00 UTC, queryable with verified closing evidence. All seven sampled historical coverage records from 21 May were unchanged, as were two KUSD observation pages and their cursors. LLM still reported `ABSENT_POOL`. The [public receipt](../output/go-history/indexer-startup-timestamp-public-verification-20260921/stale-finality-continuation/verification.json) records 25 HTTP 200 metadata requests, 15,802 response bytes and no retries. An earlier HTTP 200 health response was reused, bringing the total to 26 requests; the [original failed verifier guard](../output/go-history/indexer-startup-timestamp-public-verification-20260921/verification.json) remains intact. The worker had completed startup and was running with no error and zero lag, but `ok` and `workerReady` remained false with `last-success-stale`: indexed and finalized height were still 27,725,827, with chain time 11:37:54 UTC. This verifies the deployed service and sampled data availability; it does not claim that upstream finality resumed or that future wall-clock-hour rows were exhaustively checked. No prices or reserves were queried.

| Token | Canonical asset ID                                                   |
| ----- | -------------------------------------------------------------------- |
| XOR   | `0x0200000000000000000000000000000000000000000000000000000000000000` |
| VAL   | `0x0200040000000000000000000000000000000000000000000000000000000000` |
| PSWAP | `0x0200050000000000000000000000000000000000000000000000000000000000` |
| DAI   | `0x0200060000000000000000000000000000000000000000000000000000000000` |
| KUSD  | `0x02000c0000000000000000000000000000000000000000000000000000000000` |
| LLD   | `0x00513be65493a7fc3e2128d4230061a530acf40478a4affa20bbba27a310673e` |
| LLM   | `0x00073edd278e1bd6a7f9d0b27d4f3e93b73c8f0832b58a4df13c69611a99f156` |

## Check coverage and freshness

Use UTC-aligned Unix seconds: `start = end - hours * 3600`. Choose 1–2,160 hours per request. Keep `end` fixed for a reproducible historical window; it is exclusive. For a freshness check, first determine the latest indexed chain timestamp as shown below. A wall-clock boundary (`Math.floor(Date.now() / 3_600_000) * 3600`) can be newer than the finalized chain and must not be assumed to have closing evidence.

```graphql
query HourlyCoverage($assetId: String!, $start: Int!, $end: Int!) {
  assetHourlyCoverage(assetId: $assetId, start: $start, end: $end) {
    assetId
    symbol
    expectedHours
    observedHours
    verifiedHours
    poolUsableHours
    missingHours
    legacyHours
    invalidHours
    unknownPoolHours
    absentPoolHours
    zeroReserveHours
    latestCompletedAt
    latestObservedCompletedAt
    latestUsableCompletedAt
    gaps {
      start
      end
      hours
      status
    }
  }
}
```

This query reads current repository state without resolver caching. Within the requested window, `latestCompletedAt` is the latest verified boundary; `latestUsableCompletedAt` also requires usable pool evidence. These fields are not the asset's all-time latest boundary unless the requested window includes it. A stored row or a verified boundary alone does not establish a usable pool. The active, unfinished hour is excluded. A newly ended hour becomes queryable after its adjacent successor block finalizes and the indexer commits that block's processing; the UTC boundary alone does not guarantee that processing has already finished.

### Distinguish finality staleness from missing history

The existing public schema supports these two bounded, metadata-only requests. First read the worker's heights and readiness:

```graphql
{
  _health {
    workerLatestFinalizedBlock
    workerLatestIndexedBlock
    workerLag
    workerLastSuccessfulIndexTimestamp
    workerReadinessReason
  }
}
```

Then substitute the returned indexed height into `block-<height>` and fetch that exact block's timestamp. This example was tested against the production API:

```graphql
{
  networkSnapshots(first: 1, filter: { id: { equalTo: "block-27725827" }, type: { equalTo: BLOCK } }) {
    nodes {
      id
      type
      timestamp
    }
    pageInfo {
      hasNextPage
    }
  }
}
```

The [tested response](../output/go-history/indexer-current-hour-regression-20260921/api-finalized-time-availability.json) returned timestamp `1789990674` (11:37:54 UTC). For a present, matching `BLOCK` row, compute `end = Math.floor(timestamp / 3600) * 3600`, then query hourly coverage up to that boundary. Coverage still decides whether each hour has genuine closing proof; this calculation does not create evidence or fill chain halts.

When indexed and finalized heights agree, that row gives the latest indexed finalized chain time. If indexing lags, report catch-up separately. A missing block row, null height, or query error leaves freshness unknown. `workerLastSuccessfulIndexTimestamp` measures processing wall time, not block time, so it cannot replace the snapshot timestamp. The public API has no explicit finalized-chain timestamp field; these two reads are not an atomic snapshot and should be repeated if their state is inconsistent. They distinguish data recency from historical coverage, but do not alone prove upstream polling is healthy. The matching independent RPC observations establish the finality stall in the retained incident diagnosis.

## Retrieve observations

```graphql
query HourlyObservations($filter: AssetSnapshotFilter!, $after: Cursor) {
  assetSnapshots(first: 100, after: $after, orderBy: [TIMESTAMP_ASC], filter: $filter) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        id
        assetId
        type
        timestamp
        priceUSD
        denominator
        closeEvidence
      }
    }
  }
}
```

Pass `filter` with `assetId: { equalTo: assetId }`, `type: { equalTo: "HOUR" }`, and `timestamp: { greaterThanOrEqualTo: start, lessThan: end }`. Start with `after: null`; use each `endCursor` until `hasNextPage` is false. Reject GraphQL errors, non-advancing cursors and partial pagination. The observations query's default resolver cache is two seconds and can be configured by the service.

The snapshot's `timestamp` is its actual closing block time within that hour;
do not require it to equal the hour's opening boundary. Use the verified
`closeEvidence` boundary when assigning a completed signal hour.

Keep amount, reserve and denomination strings exact. `closeEvidence` retains the canonical closing block, adjacent successor and direct-pool evidence. Pair consumers must join matching boundaries and validate genesis, block hashes, denomination and decimals before deriving a reserve ratio. Do not substitute a global USD chart price for an XOR-pool quote. Hourly history supplies signals; executable quotes and transaction fees require separate, current chain reads.

The seven priority assets' `HOUR` rows are retained indefinitely. The 2,160-hour bound limits one coverage request, not the age of queryable history. For a larger interval, split coverage checks into adjacent windows; use normal cursor pagination for observations. Neither query substitutes current prices into old gaps.

## Retained verification

Historical repair, deployment, exact public readback and preservation of earlier records are documented in the [initial production report](reports/bots-indexer-coverage-2026-09-20.md), [120-day extension report](reports/bots-indexer-120-days-2026-09-20.md), and [46-hour extension report](reports/bots-indexer-46-hours-2026-09-21.md). The last extension added 322 records across the seven assets from May 21 10:00 through May 23 08:00 UTC; earlier metadata hashes stayed unchanged.

Older history pagination was independently verified: a two-hour KUSD window returned two rows across two distinct cursor pages, selecting only identity, timestamp and denomination. The [queryability receipt](../output/go-history/indexer-queryability-metadata-20260920/verification.json) retains that evidence. Earlier completed-hour checks remain in the [freshness receipt directory](../output/go-history/indexer-freshness-20260921/); they were not repeated for the latest check.

The earlier [09:01 UTC check](../output/go-history/indexer-freshness-20260921/completed-hour-20260921T090100Z/verification.json) verified all seven assets for the hour ending at 09:00 UTC, through 14 successful metadata-only requests. Its closing block timestamp was 08:59:54 UTC. This earlier point-in-time receipt remains intact alongside the later 11:00 verification and 12:00 finality diagnosis.

A service deployment briefly interrupted the API with HTTP 502 on 21 September; the [retained diagnosis](../output/go-history/indexer-502-diagnostic-20260921/remote-error-metadata-utc-aligned.json) and [subsequent metadata query](../output/go-history/earlier-goal-study-20260921/indexer-post-502-metadata-probe.json) distinguish temporary unavailability from missing history. Consumers must reject GraphQL errors even when partial `data` is present, and retain transport failures as unavailable data. Never convert an error into an empty page or invent a candle.

At **2026-09-21 14:06 UTC**, the [bounded follow-up check](../output/go-history/indexer-queryability-followup-20260921-1404/combined-verification.json) confirmed that latest finalized-hour metadata and May 21 historical spot checks passed for XOR, VAL, PSWAP, DAI, KUSD, LLD and LLM; the two-page KUSD historical pagination also remained unchanged. The indexer had zero lag and no worker error, matching both approved RPCs at finalized block **27,725,827**, chain time **11:37:54 UTC**. The newest verified hour still ended at **11:00 UTC** because chain finality had not advanced. LLM correctly retained `ABSENT_POOL` coverage rather than usable direct-pool evidence. The check read metadata only and made no service changes.
