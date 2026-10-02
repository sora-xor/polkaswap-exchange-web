# Historical runtime upgrades in goal studies

The explicit catalog execution model accepts the three pinned historical SORA
runtimes 128, 129 and 130. Each block retains its observed runtime code hash;
the quote and fee simulation executes the pinned runtime 131 binary. Historical
pool observations and modeled execution retain separate identities.

`createGoalQualificationArchiveSourceV3` accepts an owned `GoalRuntimeCatalog`
only for the catalog model. It checks the model, manifest source, catalog and
implementation hashes before opening the data source. Each market shard keeps
the original three schema responses, per-block code observations and seven pool
storage values. Its per-block profile determines the quote source metadata.

The evaluator rejects missing or copied catalogs and mismatched partition source
kinds before opening the study journal. Invalid capabilities cannot consume a
one-shot study registration.

`createGoalCatalogTargetRuntimeArchiveQuote` acquires the bounded historical
storage and executes the target quote and fee APIs. The independently invoked
`replayGoalCatalogTargetRuntimeEstimate` reconstructs the same estimate from
the retained responses. Neither API signs or submits transactions.

The fixed Node episode composition in `goal-target-bundle-episode.ts` requires
owned catalog metadata for the catalog model. It reconstructs market evidence
against the independently verified block/profile associations and passes the
owned market state to the fixed quote verifier. Copies of metadata and market
states cannot substitute for these verified objects. Validation continues to
require the separately sealed study selection.

The original single-source 130 model and version 2 constructors retain their
existing shapes. A catalog source cannot enter those paths by changing a numeric
runtime version or reusing a legacy metadata policy.

The unit fixture `createGoalBundleEpisodeFixture(false, undefined, true, true)`
uses genuine schema bytes and the actual target binary with invented blocks,
history and reserves. It covers a full 24-hour chronology across both upgrades,
original production, raw replay, exact fee-cap charges, and rejection of copied
metadata or mismatched models. Its output is engineering evidence only; it is
not an economic study or a profitability result.

The catalog fixture uses a balanced pool of one million units per token in both
the historical reserve mark and the runtime's pool account balances. This keeps
its invented history consistent and allows positive fill coverage with the
0.21 XOR fee cap and unchanged 5% drawdown limit. The legacy fixture retains its
existing values. The full 24-hour catalog replay passes with network access
denied; production strategy qualification still requires separate market data.

Before registering a real study, `calculateGoalStudyExportCapacity` counts the
completed metadata archive and reserves space for every possible episode,
journal and export manifest under the existing 8 GiB bundle limit. The catalog
read allowance also covers bootstrap rereads and a collection group shared by
the two independently verified partitions, preserving the reader's 8 GiB limit.
Its returned
per-episode ceiling applies to actual retained raw envelopes, including the
trailing newline. Preparation rejects insufficient capacity before registration;
this storage allocation does not change strategy parameters or acceptance tests.

See [the model contract](bots-goal-catalog-execution-model.md),
[the catalog market reader](bots-catalog-market-reader.md), and
[the historical data API](indexer-history-api.md) for the corresponding inputs.
