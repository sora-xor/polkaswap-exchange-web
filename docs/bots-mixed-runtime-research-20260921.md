# Historical runtime transitions and current fee evidence

The new metadata probe corrected an earlier assumption: the proposed May 29–
June 5 study window spans source runtimes **128, 129 and 130**, not only 130.
The existing single-schema collector rejected the first128 block before any
economic study access. Its failure, bounded sparse version audit and three
original metadata exports are retained under
`output/go-history/partial-target-window-metadata-20260921`.

The [schema receipt](../output/go-history/partial-target-window-metadata-20260921/source-schemas/verification.json)
pins the genuine bytes. An independent offline comparison found all13 required
storage keys and semantic layouts equal for each of128,129,130 against target131
(39 comparisons), with no relevant swap/extrinsic schema differences:
[comparison receipt](../output/go-history/partial-target-exposure-20260921/runtime-layout-verification.json).
This is finite layout evidence. It does not establish uniform runtime coverage,
matching economic behavior, or the presence of historical storage values.

## Required integration

Keep existing single-schema readers strict. A versioned catalog path must
authenticate each profile's metadata anchor and bind every block's retained
`:code` hash to its actual128/129/130 profile. Preserve that association through
callback collection, raw metadata replay, market marks and target execution.
The four-field clock block can remain unchanged; the profile association must
be independently pinned and joined by exact block hash and height.

A64-mark cache can cross a runtime upgrade. Select codecs by authenticated
metadata identity for each block, not by the first schema in the cache. Use a
distinct execution-model discriminator for the finite mixed-source catalog;
do not relabel old blocks130 or change the existing source130 model's meaning.
The catalog and target-state foundation are being implemented separately from
collector/market admission. No numerical version guard is a substitute for
those joins.

## Explicit fee decision before training

A separate production probe used one finalized runtime131 block, four partial
trade envelopes, and both native-fee APIs. All eight fee results agreed at
**0.100021312589707326 XOR**, with matching chain identity, runtime, metadata,
code hash and denomination. It made17 read-only requests and read no quotes,
pool prices or wallet information. [Verified observations](../output/go-history/partial-target-current-fees-20260921/verification.json).

The next study's declared stress cap is **0.21 XOR per transaction**: twice that
maximum estimate, rounded upward to0.01 XOR. This margin rule was stated in the
probe before its requests. Four charges at the cap fit the separate1 XOR fee
reserve, leaving0.16 XOR. Failed transactions also consume the reserve; this
does not promise four successful trades or a future network fee ceiling.

Accepted hypothetical fills must charge the full cap. Original fee results must
agree and fit it, and live execution must independently recheck current fees.
Actual finalized fees remain authoritative. The decision changes no enabled
live policy and uses no candidate performance data:
[frozen fee decision](../output/go-history/partial-target-study-20260921-v3/fee-decision.json).

The [fresh exposure audit](../output/go-history/partial-target-exposure-20260921/audit.json)
found no recorded chronological conflict with existing claims and disclosed
operational ingestion. The new study is still unregistered. The existing
failed study, protected validation, exact budgets and qualification gates remain
unchanged.

## Implemented metadata path

The catalog now verifies the exact four metadata identities and all required
storage layouts. `createCatalogHistoricalExecutionBlockReader` authenticates
three source anchors, then records the observed code hash and profile digest
beside each canonical block. Unknown runtimes and contradictory observations
for the same block stop the reader.

`collectGoalQualificationCatalogMetadata` writes version 2 shards containing
those associations and the original RPC responses. It checks the association
against the block's actual `:code` response and the original wire batch mapping,
both during collection and when resuming a saved shard. Altering a runtime label
and its projected response together cannot hide a conflicting original reply.
The original single-schema protocol remains version 1. Three source metadata
responses require a six-MiB logical shard limit; individual reader responses
remain limited to two MiB. The batch transport only permits the larger total
budget under its explicit version 2 metadata policy.

The corresponding catalog replay checks the original wire batches and runs
the real block reader over their exact retained responses. It does not invent
metadata calls at a different block. The Node collection and replay path is implemented. Browser bundle verification,
market decoding, the mixed-source execution model, economic study registration
and qualification remain separate work.

The first live catalog-aware boundary probe passed all four fixed lookups:
188 read-only RPCs,14,967,367 response bytes, and unchanged implementation
hashes. It retained original128/129/130 identity at every observed block.
[Original responses and verification](../output/go-history/partial-target-catalog-metadata-20260921/verification.json).
This establishes the padded collection bounds, not full block coverage. The
resulting93,504-block collection, economic study and qualification have not run.
