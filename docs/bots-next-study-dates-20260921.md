# Next study dates: chronology and exposure only

The repaired history alone does **not** contain an earlier fresh window for the unchanged full protocol. The single earliest candidate is retained below as **ineligible**. An additional **46 hours** of older hourly history would provide the required chronological space. This is a date proposal, not a registered study, availability check, backfill, or strategy evaluation.

## Existing-history candidate — ineligible

The retained [120-day repair report](reports/bots-indexer-120-days-2026-09-20.md) starts opening buckets at **23 May 2026 08:00 UTC**. The [original history-reader contract](bots-goal-qualification-history-reader.md) requires 200 previous closes plus the current completed close: 201 buckets. Thus the earliest first decision is **31 May 17:00**, with previous closes May 23 09:00–May 31 16:00.

Keeping the existing 116-hour training, two-hour embargo and 49-hour validation gives training **May 31 17:00–June 5 13:00**, then validation **June 5 15:00–June 7 16:00**. Its validation overlaps the failed study's already consumed training-context buckets beginning **June 5 19:00**, by 45 hours. It cannot be relabeled unexposed merely because those earlier observations were warmup rather than scored episode marks. This does not assert that every warmup close affected the candidates' 24-close indicators.

The boundary comes from the [frozen earlier protocol](../output/go-history/earlier-window-metadata-20260920/protocol.json), the [exact decoder warmup contract](../output/go-history/indexer-120days-20260920/frontend-decoder-integration.md), and retained training access records. This assessment inspected registration/access metadata only, not the completion traces or raw observations. The earlier [access audit](../output/go-history/earlier-window-metadata-20260920/earlier-study-access-audit.md) predates actual strategy evaluation; its original “no recorded strategy-selection use” disclosure must not be reused without the later training-context exposure described in [the study documentation](bots-earlier-goal-study.md).

## Deterministic history extension proposal

End validation one full hour before the first exposed training-context bucket: **June 5 18:00 UTC**. Subtract the unchanged partition durations and the original 201-bucket source requirement. All dates below are UTC; source and partition ranges use an exclusive end unless closes are explicitly listed.

| Component                         | Required dates                                          |
| --------------------------------- | ------------------------------------------------------- |
| Additional backfill only          | **May 21 10:00–May 23 08:00**: 46 hourly buckets        |
| Complete first history query      | May 21 10:00–May 29 19:00: 201 buckets                  |
| 200 previous completed closes     | May 21 11:00 through May 29 18:00, inclusive            |
| Training                          | May 29 19:00–June 3 15:00: 116 hours                    |
| Four scored training episodes     | Start May 29, 30, 31 and June 1 at 19:00; each 24 hours |
| Training tail                     | June 2 19:00–June 3 15:00: 20 hours                     |
| Embargo                           | June 3 15:00–17:00: two hours                           |
| Validation                        | June 3 17:00–June 5 18:00: 49 hours                     |
| Two scored validation episodes    | June 3 17:00–June 4 17:00 and June 4 17:00–June 5 17:00 |
| Validation tail                   | June 5 17:00–18:00: one hour                            |
| Separation from previous exposure | June 5 18:00–19:00: one hour                            |

For the seven priority assets, the incremental backfill represents **322 generated hourly documents**. This is arithmetic, not proof that every pair has a usable direct pool. Existing missing-pool semantics, including LLM, remain unchanged. The retained February 28 archive lower anchor precedes the proposed dates; that establishes a search bracket, not availability or runtime/schema compatibility at the new boundaries. No collector or request was started here.

The inspected workflow contains no recorded strategy evaluation on this proposed interval. Its May 23 onward portion was nevertheless operationally ingested, decoded and compared through the public API. Preserve that disclosure and the exact operational receipt hashes; do not call it globally unread or pristine. The May 21–23 extension still requires separately frozen acquisition bounds and verification. This bounded audit cannot prove non-exposure by every person or process.

## Registration boundary

Use `openGoalQualificationStudyStoreV2({ directory, sourceSha256 })` in [the durable store](../scripts/bots/goal-qualification-study-store.ts), with the same authoritative `output/go-history/qualification-studies` root. After a new exact plan/source/exposure manifest is frozen, `register(plan)` writes the registration and exclusive validation claim before any training producer. The unchanged qualification boundary calls `sealSelection(...)` only after training and before validation access. Do not use acquisition continuation to change candidates or dates; the failed study and its claim remain immutable.

The registry rejects overlapping prior validation claims, but it does **not** by itself prove that new validation avoids all prior training context or operational exposure. Bind this separate date/exposure audit into the new source manifest. Existing protected GO/day001 and the failed June 19–21 validation claim remain excluded. This task made no registration mutation and opened none of their observations.

The [machine-readable assessment](../output/go-history/next-study-date-metadata-20260921/assessment.json) pins the exact inspected documents, registration/access metadata and retained validation claim. Its date arithmetic checks passed: 200 previous closes; 116/2/49-hour partitions; one-hour separation; 46 additional buckets. No prices, returns or candidate performance selected these dates.
