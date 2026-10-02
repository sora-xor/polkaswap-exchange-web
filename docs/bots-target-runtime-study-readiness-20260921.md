# V3 replay readiness — 21 September 2026

The historical indexer is live; [its query guide](indexer-history-api.md) covers
retained history and newly completed hours for the seven priority assets. The
engineering connection from the V3 archive producer through raw episode replay,
study control, portable export and fixed Node release publication is implemented.
No new economic study or release has been registered or enabled.

## Completed verification

| Component | Passing tests | Evidence |
| --- | ---: | --- |
| V2/V3 study controller | 37 | [Receipt](../output/go-history/goal-bundle-study-v3-20260921/validation.json) |
| Owned market state and target quote joins | 172 | [Receipt](../output/go-history/goal-target-bundle-quote-20260921/validation.json) |
| V2/V3 raw episode replay | 19 | [Receipt](../output/go-history/goal-target-bundle-episode-20260921/validation.json) |
| Fixed study composition and publication | 73 | [Receipt](../output/go-history/goal-target-study-publication-20260921/validation.json) |

The complete raw V3 episode test used invented observations, the actual pinned
runtime binary, and the original archive producer. With networking denied, the
fixed Node replay reproduced its entire trace, consumed every retained artifact,
and matched completion counters. It exercised 24 signals and at least one
hypothetical KUSD-to-XOR fill, including actual quote and fee API execution.
Exact fill and quote totals were not retained; no larger count is asserted.

The full-study controller and publication checks use separate invented qualifying
journals. They establish the software contracts, not one real study's profitability
or a complete raw real-world qualification. All component lint checks passed.
Scoped TypeScript checks have no errors in the changed code; five existing
liquidity-proxy diagnostics remain. No funds moved and no production release was
changed in this engineering phase.

## Next research run

Use a fresh run and the ordinary V3 evaluator, not the failed study's continuation.
Keep the two [proposed partial-order strategies](bots-partial-candidates-20260921.json)
unchanged. The proposed May 29–June 5 dates remain unregistered. The historical
46-hour extension is complete, but fresh block-callback metadata for this window
must be collected and independently verified. Preserve the operational-ingestion
and prior training-context exposure disclosures.

Before any training acquisition, deliberately choose and freeze the positive
per-transaction `maximumLiveFeeCodec` (at most the separate 1 XOR fee reserve).
There is no research default. The synthetic fixture's 0.002 XOR cap is not that
decision. Keep the 10 KUSD initial budget, partial lots, 24-hour horizon and
existing target, drawdown, slippage and impact constraints.

Start from `output/go-history/earlier-goal-study-20260921/run-study.mts` and use
`openGoalQualificationArchiveEvaluatorV3` with `targetCompressedBytes`, followed
by `createGoalQualificationBoundaryV3(evaluator).qualify(plan)`. Pin new finite
acquisition budgets. Do not carry the failed continuation's request starts,
parent records or prefix replay. Use the same authoritative
`output/go-history/qualification-studies` registry.

Freeze the entire final TypeScript source graph, aliases, package manifest and
lockfile into a new isolated source tree. Also explicitly copy/hash
`goal-target-runtime-worker.cjs` and `goal-target-runtime-host.cjs`: their dynamic
loads are absent from the TypeScript graph. Independently pin the compressed
WASM input. The execution model's host/state/quote hashes must identify the
actual frozen copies, with all local import paths confined to that tree.

Register the sealed protocol before its first training producer. Source runtime
profiles remain 130; the distinct execution model pins target131. A selected
candidate still requires untouched validation, full portable raw replay and
fixed release publication before application activation. Failed qualification
does not authorize a trade or justify weakening the original limits.
