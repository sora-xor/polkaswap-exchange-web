# Historical SORA pool observations

`sora-mainnet-hourly-2026-03-01.json` contains actual archived SORA mainnet state,
beginning with the completed hour ending March 1, 2026 at 01:00 UTC. The
requested period and extraction time are embedded in the file. It is a static
asset and works under the app's IPFS prefix.

These are **historical pool spot prices**, not records of executed trades.
The bot workspace calculates hypothetical trade decisions from these observations
and applies its separately shown network fee, swap fee and slippage assumptions.

For every hourly boundary, the extractor locates the final block strictly before
the boundary and records the immediately following block. Their timestamps prove
that no later state was used. Each row retains both block heights and hashes, the
historical cumulative denomination, exact u128 PoolXYK reserves, and asset symbols
and precision read from the same block. XOR, VAL, PSWAP, DAI, ETH, XSTUSD and XST
are included when their pools and asset metadata exist. Cross-token spot ratios
use the common XOR valuation at that identical state. A chain halt with no block
inside an hour leaves that bucket missing; prices are never interpolated.

The source is the existing approved OVH archive at `https://mof2.sora.org/`.
The extractor checks the SORA mainnet genesis and the historical March 1 anchor.
At use time, the app checks all rows, requires the currently connected mainnet
identity and denomination, validates asset precision, and reports actual coverage.
The app can append verified recent indexer candles after the bundled last candle.
When the combined series has at most 24 missing hours, it can recover those exact
observations from the approved archive using finalized adjacent-block timestamp
proofs and the same reserve, metadata and denomination checks. A genuinely halted
hour remains missing. The browser never interpolates prices or changes network
selection to perform this read-only repair.
The current indexer retains only eight days of hourly snapshots, so it cannot
supply the March period by itself.

Run the read-only extractor from the repository root:

```sh
node scripts/bots/extract-archive-history.mjs
```

It reads only public JSON-RPC methods, batches at most 32 block requests per
batch, limits HTTP request rate, retries bounded transient failures, and saves a
resumable cache at `output/bot-history/archive-hours.jsonl`. It publishes the JSON
atomically after each completed batch. It never changes RPC/indexer configuration,
opens infrastructure credentials, or submits a transaction. An optional
`--end=2026-09-14T01:00:00Z` fixes the final completed hourly boundary. Rebuild the
static app after extraction finishes; a running preview contains the dataset from
its most recent build.

Validation:

```sh
node .yarn/releases/yarn-4.10.3.cjs test:unit tests/unit/features/bot-trading/archive-history.spec.ts tests/unit/features/bot-trading/archive-history-data.spec.ts tests/unit/scripts/bots/extract-archive-history.spec.ts
```

The data test validates all shipped observations and precise XOR/VAL, reverse,
and VAL/PSWAP pricing without network calls. This data does not reconstruct
historical liquidity routing, execution price impact, or historical fee changes.
