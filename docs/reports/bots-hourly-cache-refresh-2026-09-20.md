# Newly indexed hourly data — cache repair, 20 September 2026

An episode-qualified bot could request history just before the indexer published the latest hourly close. The controller rejected that incomplete history correctly but cached it until the next UTC hour. Restarting the bot could therefore reject the same cached response even after the missing close was queryable.

The controller now caches only denomination-verified history with a valid latest completed signal. An incomplete response still triggers the original rejection and session revocation, and consumes no signal or funds. An explicit restart fetches again. Valid history retains the existing hourly cache and once-per-hour signal protection. No strategy, loss limit, fee reserve, order size, route or signing rule changed.

The regression exercises initial missing data, rejection, publication of the close, explicit restart in the same hour, and a subsequent valid cache hit. All 136 controller tests passed. The full run passed 7,437 unit tests and 13 translation checks. Deployment built production CID `bafybeids3b4gm5yjgdecrihshlwg3phcqtdxhyik4bq5sgpa6ewtv2c4au`; both production and testnet DAGs were imported, recursively pinned and verified on MOF.

Bunny's saved origin was confirmed after reloading its settings, then the full `polkaswap` pull-zone purge was confirmed through its authenticated UI. The save/purge toasts were not captured; that limitation is recorded rather than inferred. Both public HTML paths serve exact release bytes with `no-cache`; the CSP matches the runbook. All 138 required warmed assets matched the build. The official WebKit check and desktop Swap, desktop Bots and 320-pixel Bots checks passed with zero request, page or console errors and the expected release root. The Swap title reached `Swap - Polkaswap`.

The user's Chrome tab loaded the new entry asset `index-D-X8rjd0.js`, retained the connected account, and was restored to 10 KUSD with XOR as output. No new study, wallet unlock, trading approval or transaction was performed. This repair does not establish a qualifying strategy or a successful trading recording.

[Deployment verification](../../output/go-history/deploy-hourly-cache-refresh/verification.json), [Bunny evidence](../../output/go-history/deploy-hourly-cache-refresh/cdn-save-purge.json), [Chrome form](../../output/go-history/deploy-hourly-cache-refresh/chrome-form.json).

Separately, a fresh metadata-only indexer check at 10:18 UTC verified the new 10:00 UTC completed boundary for XOR, VAL, PSWAP, DAI, KUSD, LLD and LLM. LLM's missing direct XOR pool remains explicitly `ABSENT`. The worker was healthy and one block behind finality, with no last error. [Latest-hour receipt](../../output/go-history/indexer-query-audit-20260920/fresh-latest-hour-20260920T101836Z.json).
