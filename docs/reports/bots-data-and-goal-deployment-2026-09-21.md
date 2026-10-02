# Bots data and goal recovery deployment — 21 September 2026

The indexer now exposes 2,947 consecutive verified hourly boundaries per
priority asset, from 21 May 10:00 UTC through 21 September 05:00 UTC. The new
05:00 boundary was returned by both coverage and observations queries after
the import and restart, demonstrating that ongoing indexing is queryable.
See [the API guide](../indexer-history-api.md) and
[the import report](bots-indexer-46-hours-2026-09-21.md).

XOR is the reference asset. VAL, PSWAP, DAI, KUSD and LLD have direct XOR-pool
evidence; LLM explicitly reports an absent direct pool. An absent-pool record
is not a tradable candle. All seven priority assets' hourly rows are retained
indefinitely, and observation results support cursor pagination.

## Frontend changes

- Reject GraphQL responses containing errors instead of consuming a partial
  historical page as complete.
- Preserve a valid strategy settings day preset while requesting the explicit
  interval needed for indicator warmup.
- Add bounded, pinned qualification-release loading and restore existing goal
  reviews after reload without resetting the original allocation or deadline.
- Release an account lock correctly when cancellation races its acquisition.

The configured qualification-release list remains empty. This deployment does
not supply a qualified profitable strategy, execute a transaction, or establish
that the 10 KUSD goal will make a profit. Genuine qualification and the user's
trading approval remain required.

## Validation

The full unit run passed 8,172 tests and identified one stale source assertion:
it required adjacent route selectors and failed when the existing Burn route
was inserted. The assertion now checks membership of the actual desktop
layout group; all 13 tests in that suite pass. Final goal recovery and
cancellation tests passed 247 cases in five suites. Translation checks passed
13 tests. Targeted lint passed. Scoped type checking retains 653 existing
adapter-graph diagnostics, with no new diagnostics in the changed code.

## Deployment

- Production CID: `Qmb56GxovcdQfNUUc8igbRSSSs1d1wjyQrJMrWeKPuKKbq`
- Production CIDv1: `bafybeif5fofzg76zdlkila6bkvzqqccdbcttqhb76u6rtcitvpdk6vrchq`
- Testnet CID: `QmbopbsFwt7c5V8YVzFjRaYyvts63Jp47LonVxzzxpjziy`
- Testnet CIDv1: `bafybeigidxgbwiihstraiizn64thprdo65rkk2gmpaalzput7pjjhfhkey`
- Origin: `https://mof.sora.org/ipfs/bafybeif5fofzg76zdlkila6bkvzqqccdbcttqhb76u6rtcitvpdk6vrchq`
- Host header: `mof.sora.org`

Both DAGs were imported and recursively pinned on MOF; all 126 retained pins
passed integrity verification. Origin root, entry JavaScript/CSS and
Swap/Bots chunks returned HTTP 200 with exact built bytes and correct content
types, without redirects. Bunny displayed the saved-origin and full-purge
success messages. The live root serves the new CID and exact built HTML.
Both HTML paths retain `Cache-Control: no-cache`.

All 102 sequential warm requests passed exact-byte checks for 101 static
files and both HTML paths. Official WebKit verification passed. Separate
WebKit checks reached `Swap - Polkaswap` and `Bots - Polkaswap` with real UI,
the expected root CID and zero failed requests, HTTP errors, console errors
or page errors. The connected Chrome tab was refreshed and restored to
10 KUSD → XOR, a 5% target, 5% peak-loss limit and 1 XOR fee budget. GO was
not clicked, and no wallet approval or transaction was performed.

See the completed [deployment receipt](../../output/go-history/goal-deployment-20260921/deployment.json).
