# Bots history lookback deployment — 21 September 2026

Production now requests the complete-hour history required by the selected
strategy, plus one hour for publication lag. The previous fixed 201-hour
request could starve a restoring-force strategy with a 200-sample window,
which needs 202 closes. A 500-sample SMA also needs its own larger request.
Insufficient or discontinuous indicator history still fails validation.

The indexer historical backfill and continuing data queries are described in
[the data report](bots-indexer-46-hours-2026-09-21.md) and
[the history API notes](../indexer-history-api.md). This frontend correction
uses that data; it does not change archived studies or their warmup contracts.

The deployment passed 213 focused unit tests, lint, source-scoped type checks
and unchanged-protected-file checks. The broader type check retains 653
existing diagnostics. No user-facing strings changed.

Production CIDv1:
`bafybeifjmdsi2yq5nzzhik5ln4od6qdc5zup7uksevviyrh7rj5e6wfjl4`.
Both production and testnet DAGs were imported and recursively pinned at the
dedicated MOF origin. Bunny's production origin was saved and its cache
purged. All 102 static requests passed exact-byte, MIME and redirect checks.
The official WebKit check reported zero failed requests and console errors;
separate checks reached `Swap - Polkaswap` and `Bots - Polkaswap` with real UI
and the new root CID. The user's connected Chrome page was reloaded and left
with a 10 KUSD budget, XOR output, 5% target, 5% peak drawdown limit and separate
1 XOR fee budget.

Evidence is retained in
`output/go-history/goal-history-span-deployment-20260921/deployment.json`
(SHA-256 `9c1d5a16040621f256c959fcfc294763544329d5c677ef47fdee123933cac4c9`).
The separate target-runtime research adapters remain inactive. No strategy
has qualified, no release was admitted, and this deployment submitted no
financial transaction.
