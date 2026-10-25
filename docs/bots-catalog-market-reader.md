# Catalog-bound historical pool observations

`createCatalogHistoricalExecutionPoolCodec({ catalog, sourceCodeHash, blockHash })` in
`src/features/bot-trading/execution-codecs/catalog-pool.ts` is a browser-safe, offline
pool decoder. It requires the privately owned four-profile runtime catalog and selects
only an exact historical source profile (128, 129 or 130) by its observed code hash.
The original pool and execution codecs retain their strict runtime behavior.

The decoder derives and checks exactly seven keys against the catalog: timestamp,
denominator, KUSD and XOR asset definitions, DEX 0, XOR/KUSD pool properties and
reserves. Every present value must round-trip through the selected genuine SCALE
schema. Assets must have the expected symbols and 18 decimals, the denominator
must be positive u128, and DEX 0 must use XOR. Missing properties, missing reserves
and zero reserves are explicit states; none supplies a price. Positive reserves
produce exact reciprocal integer ratios, without floating-point token math.

Returned `runtimeProfile` contains the four qualification profile fields:
`specVersion`, `transactionVersion`, `metadataSha256`, and `codeHash`.
`catalogBinding` contains `catalogSha256` and `profileSha256`; the latter hashes the
canonical **full** catalog profile, including genesis, exactly as the catalog block
reader does. The distinct `catalog-pool-state-v1` binding retains the actual source
block/profile. This API exposes no call encoding, signature, execution, quote, or
qualification capability. It authenticates a schema, not caller-supplied chain values.

Metadata-derived registry internals and storage keys are cached privately by the
owned catalog entry. Each invocation creates a fresh block binding; each decode
creates fresh immutable observations. Market values and block identity are never
shared through the schema cache.

## Node transport composition

`createCatalogHistoricalGoalMarketReader({ source, expectedDenominator },
{ catalog, fetch, signal, timeoutMs })` in `scripts/bots/historical-goal-market-reader.ts`
uses the real catalog block reader and the existing bounded seven-key storage
transport. Its context protocol is
`historical-goal-market-catalog-shard-v1-development`; the context retains the
catalog, all authenticated source profiles/anchors, and the actual finalized source.
A shard may cross runtime upgrades: every new mark joins its canonical block to that
block's retained `:code` association before selecting its decoder. It also requires
the pool timestamp to match the canonical block and the denominator to equal the
predeclared value.

`readMark(height)` returns `{ block, poolEvidence, mark?, runtimeProfile,
catalogBinding }`. The last two fields are required, even for an absent pool.
`evidence()` retains the original initialization/block RPC rows, the separate raw
storage rows, and `blockProfiles`. Repeated block/mark reads reuse immutable results.
The legacy constructor shares the storage implementation but retains its original
context, return shape, initialization policy, and strict single-runtime behavior.

Catalog initialization costs 20 RPC reads. Each unique mark adds four canonical
block RPC reads and one seven-key `state_queryStorageAt`; at most 64 blocks/marks
are allowed per shard (276 metadata RPC rows plus 64 pool responses). Storage keeps
the existing 128 KiB per-response and 8 MiB shard limits, caller cancellation and
bounded request deadlines. There are no retries or endpoint fallbacks. A failure
latches the shard and preserves the collected raw evidence.

Focused tests use the genuine retained metadata, invented headers and pool values,
and mocked HTTP under OS network denial. They exercise both upgrades within one
shard, exact runtime 130 regression, 64-mark limits, ownership, absent/invalid data,
raw response hashes, cancellation, and cache isolation. These tests establish no
historical prices, returns, fills, or trading eligibility.
