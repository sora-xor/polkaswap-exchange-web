# Burn data during delayed finality — 2026-09-21

The time-based submission pause described in this historical release note was
superseded by the user's subsequent instruction to always allow burning. The
current [campaign behavior](tonswap-burn.md) keeps reward data advisory and
does not require the indexer or a recent finalized block to submit a burn.

The repeated retry state was caused by the campaign API rejecting an old
finalized checkpoint. Independent checks of the configured primary and archive
RPCs found the same finalized block, 27,725,827, with timestamp 11:37:54 UTC,
while the best block had reached 27,725,920. The indexer had processed the
finalized block and reported zero finalized lag. Neither a cache problem nor
missing burn evidence explained the outage. No node endpoints or validator
settings were changed.

The API now distinguishes certified historical data from a fresh signing quote.
Its optional `allowStale: true` mode returns a complete finalized snapshot with
an explicit `fresh` boolean, retaining chain identity, checkpoint coherence,
coverage, ordering, and pagination checks. The default API still requires
freshness. Missing or incomplete coverage remains an error in both modes.

The frontend requests this display mode, preserving the curve, totals and
transaction history while finality or the indexer is delayed. A persistent
padded status panel identifies the verified block, explains the pause, and
offers a stable refresh control. Polling does not remove or dim that control on
each request. A stale snapshot never enables burning. Immediately before
submission, the page explicitly requests a fresh snapshot; a stale response or
failed request aborts signing. New finalized data restores the normal state
automatically.

All reward, cap and account-exclusion rules are unchanged. This repair does not
treat best-chain inclusion as finalized reward entitlement or force network
finality. A transaction awaiting finality retains its pending receipt.

## Validation and deployment

Validation covered 160 focused frontend tests (the final campaign suite has
67 cases), 13 translation checks, 215 compatible indexer tests, and 219 tests
against the maintained indexer source. Both indexer builds and the production
and testnet static builds passed. Chrome and WebKit checks at 360, 390 and
1440 pixels covered retained totals/history, a cold load of certified older
data, stable polling, recovery, and a real pointer attempt on the disabled burn
button. No wallet transaction was sent.

The API was deployed as
`release-2026-09-21.tonswap-burn.1049c02.finality-display`, cloning the existing
Trust-exclusion release and replacing only the two GraphQL source files and
their compiled JavaScript. The incremental source change is retained in
`tonswap-indexer-finality-display.patch`. Exact file hashes and Node 24 syntax
were checked before activating the existing indexer launchd service. Its
worker returned to running with no error and zero finalized-block lag.

The deployed display API returned all 23 burns across two pages, through block
27,725,827, explicitly marked `fresh: false`. The strict signing query continued
to reject the old checkpoint. The eligible total was 9,886.4 XOR and the
independently calculated marginal rate was 49.746265021897993… TS/XOR.

Production CIDv1:
`bafybeieuvkynak6l4mul2h4k5ncw2bzlavukyhc4r56ysdcj5ykxezjpsq`.
Testnet CIDv1:
`bafybeigubamhesotgo53bmuobyr5kk5trm2xiyyazhhu4vajwbzkzeegly`.
Both DAGs were imported and recursively pinned at the dedicated MOF origin;
all 132 retained pins passed integrity verification. Origin HTML, entry
JavaScript, CSS and burn chunk were byte-identical to the build, without
redirects. Bunny origin settings and required edge rules were verified, the
new origin saved, and the full Polkaswap zone purged.

The local Bunny edge initially continued fetching the prior CID despite the
saved configuration and successful purge. Read-only checks excluded origin
shield, Perma-Cache and a root/asset edge-rule override. The same intended
origin was saved again; no alternate origin or traffic routing was introduced.
Ireland and Japan subsequently both returned the new CID on cache misses.
The exact cause of that regional configuration delay was not established.

All 95 entry and required swap/burn assets were warmed sequentially and checked
against the build. The official production WebKit check passed. The additional
strict WebKit run passed the real swap page at 1440 pixels and burn page at
1440 and 390 pixels: expected CID, real page titles, zero failed requests,
zero console or GraphQL errors, complete historical data, and independently
matching reward totals, rate and curve position. During 30 seconds of polling,
148 mobile and 149 desktop samples retained the same status panel, refresh
button and curve without flashing or layout changes. The production mobile
screenshot was visually reviewed.

At final verification, chain finality was still at 27,725,827. This deployment
repairs data availability and feedback; it does not resolve the network's
finality stall. New TS burns remain paused until a complete fresh snapshot is
available, with automatic recovery already covered by browser and unit tests.

Evidence is stored in `output/tonswap-retry-fix` and
`output/tonswap-freshness-diagnosis`.
