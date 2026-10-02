# Queryable historical coverage and new hourly data

20 September 2026. The indexer exposes `assetHourlyCoverage(assetId, start, end)` at `https://pi.soramitsu.io/graphql`. It reads the repository on every request and returns typed provenance, coverage counts and exact gap ranges for one canonical major asset over up to 2,160 completed UTC hours. Price and reserve observations remain available through the existing paginated `assetSnapshots` query. The coverage query contains no prices or reserves.

The supported assets are XOR, VAL, PSWAP, DAI, KUSD, LLD and LLM. A stored row alone no longer implies usable trading history: the API distinguishes missing rows, legacy rows, malformed proof, unknown direct-pool evidence, proven pool absence and zero reserves. `poolUsableHours` establishes structural per-asset coverage; pair consumers must still join matching canonical boundaries and validate current denomination and precision.

## Deployment and validation

Backend release `1049c02c410ce4bd506d68a6dc91ed6157546c6d` was built and tested locally and on the existing MOF host: 1,090 tests passed and 25 were explicitly skipped. Independent focused review passed 88 tests, including fresh inserts, all seven assets, actual GraphQL serialization, duplicate pagination and bounded query costs. A native checkpoint preceded activation. Existing environment bytes, local RPC, archive configuration and the single database writer were preserved. Public service verification reported running/ready, zero lag and no worker error.

## Public coverage before the older-pool backfill

The public metadata-only audit at 08:39–08:40 UTC covered June 22 08:00 through September 20 08:00 UTC. All seven assets had 2,160 canonical hourly boundary proofs and zero missing, legacy or invalid hours. Each asset had 1,966 older hours whose proof did not retain direct XOR-pool evidence. This is a data-completeness gap, not proof that those pools were absent.

The most recent 194 hours include direct-pool evidence. XOR has the expected self-reference status; VAL, PSWAP, DAI, KUSD and LLD have structurally usable pools. LLM records explicit absence of a direct XOR pool for those 194 hours, including the latest 24. The latest public completed boundary is 08:00 UTC, backed by closing block 27,711,964 and adjacent successor 27,711,965.

Fresh archive preparation completed for only the missing 1,966-hour prefix, ending September 12 at 06:00 UTC. The 9,491,643-byte artifact contains 13,762 canonical records, carries `xorPoolsComplete: true` for every hour and passed the full checksum/provenance validator. SHA-256: `98b39283c0ffa8fae7fb089c000a1831588e8cd6ed9886bb578eb7a2302efbf7`. Every token has 1,966 verified observations, with no malformed proof, unknown pool evidence, zero-reserve pool or identity mismatch. LLM has an explicitly absent direct pool in all 1,966 hours. Older USD-only artifacts were not relabelled as pool-complete. Database activation and post-activation readback are complete. Every one of the 13,762 canonical projections matched the artifact exactly through the public API, including matching per-asset hashes and no missing rows, duplicates or mismatches.

Evidence: [public coverage](../../output/go-history/indexer-query-audit-20260920/coverage-summary.json), [service state](../../output/go-history/indexer-query-audit-20260920/final-service-state.json). Executable historical and recent-data query examples are in the indexer repository's `docs/bot-history.md`.

The frontend consumer audit found a separate Advanced research issue: bundled archive rows took precedence over corrected indexed history, and the indexed tail used the USD-derived basis. The correction queries the full selected window using direct XOR-pool evidence, makes indexed rows authoritative, and uses same-basis archive/RPC evidence only for exact gaps. Incomplete responses are no longer cached. Every source is validated before merging, exact currency metadata is captured before awaits, and current chain/denomination is rechecked before returning history. GO already uses indexed direct-pool history for its fixed seven-day window; that contract is unchanged.


## Frontend release verification

The loader change passed 203 focused tests, independent review, scoped lint, all 7,373 unit tests (6,753 application plus 620 scripts), and 13 translation checks. The production loader has zero TypeScript diagnostics; the repository-wide compiler still fails on existing diagnostics and is not claimed clean. One equivalent mock assertion was rewritten after the build to fix an introduced test typing error; its focused rerun passed, and no production source changed. The immutable source manifests and exact test-only diff are retained.

Production CIDv1 `bafybeicct5qgwrs26re3l2vu2zzmrhkgpfas4apbo5t52k6v3hwbr5hfjy` contains this loader correction and the earlier pre-draft cost samples. Both DAGs are recursively pinned on MOF. Candidate root/JS/CSS and Swap/Bots chunks matched the build with status 200 and no redirects. Bunny's saved origin and host field were verified, the authorized full-zone purge completed, and the live root returned the exact new CID, HTML and expected CSP. Save/purge toasts were not captured. Local WebKit passed desktop Swap, desktop Bots and 320px Bots without console, page, request or HTTP errors. All 138 sequentially warmed assets matched the immutable build. Official WebKit and fresh desktop Swap, desktop Bots and 320px Bots checks passed with exact new roots, rendered titles, a connected node and zero console, page, request or HTTP errors. Screenshots were inspected. [Frontend deployment verification](../../output/go-history/deploy-indexed-history/verification.json).

These checks cover data retrieval and deployment. They do not establish a profitable trading strategy, authorize a transaction or constitute a successful trading recording.

After deployment, the existing connected Chrome tab loaded entry `index-ohfd5yH1.js` and was left at exactly 10 KUSD → XOR with GO enabled and the node connected. This final-release check did not start research, unlock the wallet or submit a transaction.

The live collector independently published the next 09:00 UTC completed hour for all seven assets, with common closing block 27,712,478. New records were retrieved through the typed public query without a manual history repair. [Fresh hourly boundary](../../output/go-history/indexer-query-audit-20260920/new-09utc-boundary.json).

An independent offline integration used the actual backend canonical-document builder and actual frontend indexed-pool decoder against only this older prefix, with current chain identity and precision from the retained 09:00 UTC metadata. VAL/PSWAP/DAI/KUSD/LLD → XOR and XOR → KUSD each decoded all 1,966 candles with zero missing. LLM → XOR decoded zero candles and 1,966 missing, exactly matching its proven absent pool. There were zero network attempts, out-of-scope observations or identity mismatches. No current suffix, GO holdout or frozen journal was read for this proof, and no prices, reserves or strategy results were displayed. [Frontend decoder integration](../../output/go-history/indexer-query-audit-20260920/frontend-decoder-integration.json).


## Completed production state

The post-repair rolling window ends September 20 at 09:00 UTC. All seven assets have 2,160/2,160 verified hourly observations with zero missing, legacy, invalid or unknown-pool hours. XOR (self-reference), VAL, PSWAP, DAI, KUSD and LLD each have 2,160 structurally usable hours. LLM has 2,160 explicitly absent direct-pool hours. These are provenance/coverage results, not a claim of executable liquidity or profitable strategy qualification.

The 194 recent hours recorded before repair retain identical metadata for all seven assets (1,358 observations). The fresh 09:00 boundary remains queryable. Repair settings were removed after successful readback, original environment bytes and mode 0600 were restored, and no extra cleanup restart was performed. Final verification found one database writer, running/ready status, zero lag and no worker error at indexed/finalized block 27,712,648. All five native checkpoints remain available. The separate frozen research sources and retained journal prefix also passed integrity verification; their observations were not inspected.

[Complete backend verification](../../output/go-history/indexer-query-audit-20260920/history-deployment-verification.json), [post-repair coverage](../../output/go-history/indexer-query-audit-20260920/post-prefix/coverage-summary.json), [exact public readback](../../output/go-history/indexer-query-audit-20260920/prefix-public-verification.json).

The historical-data and fresh-query work is complete. The wider trading goal remains open: no profitable strategy, finalized trade or successful-trade video is claimed.

At 10:40 UTC, a further public metadata-only query verified the newly completed 10:00 UTC boundary for all seven assets. It returned no missing, legacy, invalid or unknown-pool observations. XOR retained its self-reference status; VAL, PSWAP, DAI, KUSD and LLD had usable pool evidence; LLM retained explicit direct-pool absence. The service was running and ready with indexed/finalized block 27,713,322, zero lag and no worker error. This check made no chain RPC calls and retrieved no market values. [Latest-hour query receipt](../../output/go-history/indexer-query-audit-20260920/fresh-latest-hour-20260920T104031Z.json).

## Follow-up live GO check

At 09:27 UTC, the existing Chrome form was tested with the 10 KUSD maximum and XOR output. Corrected history loaded, but the opening training guard stopped the request before an AI draft: the displayed zero-fee lower bound was a 7.61% drawdown from September 13 10:00 to 11:00 UTC, above the unchanged 5% limit. No model context or held-out prices were read, and no strategy or transaction was submitted.

Independent source review found no calculation or timing defect under the documented next-close replay, and 126 focused tests passed. The displayed percentage was not independently recomputed from prices. This historical-model result is not a claim that live trading is impossible: live execution uses a fresh quote, while next-hour historical fills remain an approximation. No protocol, loss limit or qualification gate was relaxed. [Chrome outcome receipt](../../output/go-history/deploy-indexed-history/chrome-opening-check-20260920T0927.json).

The separate frozen development collector was independently confirmed running, with source and retained-prefix integrity intact at 255 records. Its last scheduled observation is September 21 01:00:23 UTC. It remains a separate, incomplete development dataset with retained failures, not GO qualification or a successful trading recording.
