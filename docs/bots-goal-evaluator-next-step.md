# Execution-aware evaluator: engineering result and next steps

Updated 21 September 2026. The initial 20 September source/metadata audit is retained below. The separate, already-exposed 29–30 June engineering episode has now completed and passed independent offline integrity/accounting verification. Its unchanged baseline lost value after fees and underperformed holding. It is not a qualification or a live trading result. Protected current GO/day-001 and earlier validation observations were not opened for this engineering run.

The trusted archive adapter, causal evaluator and durable study journal are implemented, with explicit v2 deadline-cancellation and history-availability semantics. The engineering wrapper exercises their actual readers and reducers but deliberately has no study registration or qualification authority. The production boundary still requires the fixed training/selection/validation corridor and all four percentage/absolute return gates. The [release publisher](bots-goal-releases.md) now performs full raw replay once; GO loads a small manifest with pins shipped in trusted application configuration. This explicit publisher trust replaces per-user raw replay. A caller-selected certificate or digest is insufficient.

## Reuse and missing integration

| Existing component                                                    | Completed engineering work                                                                                         | Remaining qualification/integration work                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Canonical block reader and callback collector                         | Full fixed engineering callback sequence and original receipts independently verified                              | Keep the earlier study's own metadata, source and access bindings distinct from this exposed run  |
| Archive market, quote and bounded native-fee readers; portable codecs | Same-state marks, fixed pending inputs, exact quotes and fee agreement exercised over the completed episode        | Run only requests authorized by the sealed study; preserve unavailable or failed observations     |
| Indexed-history reader and canonical hourly decoder                   | Required 201-hour prefix and completed-hour availability joined to the actual clock                                | Preserve the predetermined earlier warmup and partition-access rules                              |
| `goal-episode-evaluator.ts`, signals, exact ledger and v2 clock       | Complete ordered loop, hourly consumption, partial deadline cancellation and original-deadline valuation exercised | Keep the same policy and source versions bound before study access                                |
| `goal-qualification.ts` and durable study store                       | Synthetic coverage of registration, training selection, sealed validation and owned capability; actual study completed training and failed | Preserve that failure; a different candidate requires separately declared research                 |
| Browser codecs, funding service, goal runtime and controller routing  | Portable raw replay, small pinned releases and the application funding/runtime factory exist                       | Finish public GO wiring and enable only an actually qualified release                            |

The old fixed-grid `historical-goal-day-collector.ts` / `historical-goal-replay.ts` and inverse-price sell sizing in `historical-goal-signals.ts` are **not** the new evaluator. Reuse their read-only artifact sinks, throttling and exact-state cache patterns, not their scheduling/sizing policy. The June 22 development day remains an engineering fixture. Its metadata receipt records 14 unavailable minute targets and no calculated strategy return. It is neither validation nor a reason to change the earlier protocol.

The evaluator must persist a write-once plan before training access, seal the exact training-selected candidate before validation, and mark validation access durably before returning any validation record. Failed validation ends that study. A resume may replay the same sealed bytes; it cannot change candidates, time windows, model delays, fee scenario or missing-data policy. Original raw evidence supports full release-time replay by the same trusted pure joins. Only the small manifest's independently shipped pins and strict certificate checks can establish browser authority under the publisher trust model; an arbitrary imported certificate cannot.

## Outcome-independent earlier-window option

Inspected metadata establishes the old 90-day archive beginning **21 June 2026 04:00 UTC**, with the first 1,512 observations designated for development/training. Its nominal tail overlaps later GO research. The prior H3 protocol expressly says that the overlapping old tail cannot become pristine validation. Correcting USD provenance to direct reserves does not erase exposure to the same underlying market period. The day-001 exposure receipt is separate and must not be relabeled untouched. No inspected metadata proves an existing complete clean validation partition.

A concrete new option is to put the whole study, including warmup, **before** that earliest retained archive, with the final close one full hour earlier. These dates come solely from that exclusion rule, not price or return outcomes:

| Component                      | UTC boundaries                                                               |
| ------------------------------ | ---------------------------------------------------------------------------- |
| Earlier-only warmup            | 200 hourly closes, 5 June 2026 20:00 through 14 June 2026 03:00 inclusive    |
| Training                       | 14 June 2026 04:00 through 19 June 2026 00:00 (116h)                         |
| Four scored training episodes  | Starts 14, 15, 16 and 17 June at 04:00; each exactly24h                      |
| Training tail                  | 18 June 04:00 through 19 June 00:00; retained, not scored as a short episode |
| Embargo                        | 19 June 00:00 through 02:00                                                  |
| Validation                     | 19 June 02:00 through 21 June 03:00 (49h)                                    |
| Two scored validation episodes | 19 June 02:00–20 June 02:00 and 20 June 02:00–21 June 02:00                  |
| Validation tail                | 21 June 02:00–03:00; retained, not scored as a short episode                 |

This option is outside the earlier dated research exposures found in the inspected protocols. At the initial metadata-gate stage, its pool/quote data had not been opened by that gate. The later operational 720-hour backfill overlaps the entire proposed study: it ingested reserves/derived prices, ran the actual frontend candle decoder and verified public values programmatically. It must therefore **not** be called globally unread or unconditionally pristine. The [dated access audit](../output/go-history/earlier-window-metadata-20260920/earlier-study-access-audit.md) records no model-visible earlier prices/returns or strategy-selection use, while disclosing operational ingestion and visible availability/timing metadata. The new study seal must bind those exact receipts and preserve validation protection against strategy evaluation/selection; the dates remain unchanged.

The parent-authorized metadata-only gate completed successfully. Its frozen [protocol](../output/go-history/earlier-window-metadata-20260920/protocol.json) binds the exact dates above before any request (SHA-256 `9d000054c7abf40c49bee2ef205127f3afde8783241b0793c3f465470e153ae1`). The [verification](../output/go-history/earlier-window-metadata-20260920/verification.json) retains canonical hashes, exact historical timestamps and runtime/code metadata for every named boundary and adjacent parent. The transport explicitly rejects pool, asset, balance, quote, fee, event and transaction requests.

The pinned lower anchor height **25,059,555**, hash `0x959ac28650702a446bd3ad1963ed60a8aec4ec4f86b1cfe90c4564c38f831203`, is at **28 February 2026 23:59:54 UTC**, before the warmup. All six boundary checks use supported runtime130/transaction130, metadata SHA-256 `726c0dcdc748164be3ed3cc65c149e936e08380ef99c1b3991a0db6c1d7d127b` and runtime code hash `0x2b33b01ba3f9e58e269b0e9619d25bedf3f60cdd6ed0ec519dacc75259c85d1e`. Parent code hashes match their pinned reader schema. This proves sampled source/schema readiness, not every intervening block or pool state.

The gate made332 metadata RPCs in286 HTTP requests, used42 cached search probes, retained13,662,186 bytes, and verified unchanged source hashes. There was no alternative date, retry, market value, quote, strategy outcome or protected-data read. The [as-of summary](../output/go-history/earlier-window-metadata-20260920/asof-boundary-metadata.json) keeps exact milliseconds separately from the indexer search's second resolution: all six last-at-or-before states are0–6,000ms old. For example, the first state _after_ training start is12,018ms later; the legitimate funding mark is the preceding state5,999ms before funding. The new evaluator must use that truthful as-of distinction.

That initial metadata gate established sampled archive/runtime readiness only. The later engineering run below establishes working joins on its own exposed interval. It does not establish pool/quote availability or qualification outcomes for the earlier study, nor erase that study’s disclosed operational ingestion.

Before any pool/quote data read, freeze a new manifest containing those fixed dates and canonical boundary identities, source/decoder/evaluator hashes, genesis and denomination, exact runtime/code profiles, the explicit nonnegative modeled arrival/check/capture-availability rule, at most three exact strategy+lot candidates, the bounded native-fee policy, minimum-output scenario, complete evidence budgets and the training/validation access seal. It must say **modeled historical arrivals**, never actual past browser receipts. The delay values and source availability are unresolved preregistration inputs here; this document does not silently choose them or claim a ready study.

The initial callback-collector sizing required a new explicit budget, subsequently frozen for each separate collection. At a nominal six-second block cadence there are about14,400 headers per24h, versus the old8,192-block/day cap; six scored episodes would need about86,400 canonical block identities before quote/mark reads. Existing block readers make four RPCs per newly attested height and rotate after64. Exact counts must come from the metadata-only boundary-height probe before freezing budgets. At the existing eight HTTP-starts/second limit, uncached serial per-height attestation is hours of preparation, not six future days of waiting. Cache reuse must be uniformly declared by exact state/source key before outcomes; never retry a failed target with another state.

The causal loop, actual archive/indexer reader and durable study journal have synthetic integration coverage. The separately manifested real engineering run described below is now complete. The frozen June22 baseline remains unchanged. A full200-hour history request for that day would overlap the earlier validation interval, so it must not be used for the new adapter's engineering run. The old archive starts with the21June04:00 opening bucket (its first completed close is05:00). The new adapter needs200 prior closes plus its current completed close: a201-hour query. Therefore the earliest full-prefix24-hour engineering episode is29June13:00–30June13:00, with its first query spanning21June04:00–29June13:00 and200 prior closes at21June05:00–29June12:00. This one-hour correction was made from source timestamp semantics before any new market access. This date follows only from the exclusion boundary and required prefix length, before any new prices or outcomes. It is a separate development run, never a replacement study or validation interval. Its source/exposure metadata was checked and its own acquisition manifest retained before execution. The fixed earlier training/validation dates above remain unchanged, and validation remains inaccessible to selection until the candidate seal exists.

## Engineering evidence on 21 September

The full fixed engineering callback interval is now independently verified:
11,796 canonical blocks, 185 shards and 49,034 original logical RPC receipts.
The verifier replayed the actual block reader with no network or market reads.
See [the immutable receipt](../output/go-history/goal-archive-engineering-20260920/collector-complete-verification.json).
The original collector exit handle was unavailable; independent terminal
observations and the complete persisted output establish completion. Its exit
code remains explicitly unknown, while the offline verifier exited successfully.

The first full episode preparation retained its failure before market access:
the fixed 30-second check beginning 23 seconds before the deadline extends seven
seconds beyond it. The v1 clock rejects that entire day. Dates and delay values
have not been adjusted to fit. The additive v2 implementation preserves the cancelled
check and any genuinely completed stage prefix, then values the actual original
deadline. The original [v1 preparation failure](../output/go-history/goal-archive-engineering-20260920/episode-v1/preparation-failed.json) remains unchanged; no cancelled read is represented as an early completion.

A separately recorded, already-exposed opening-state preflight has succeeded at
block 26,729,748, selected solely as the last canonical state available at the
same predetermined opening capture. The actual pool reader, exact 2.5 KUSD quote,
and bounded native-fee reader agree at that state. It made 22 physical requests,
retained 14 verified metadata-cache receipts and checked all 53 executed source
files unchanged. Both fee decoders agree on `100021312589707326` XOR codec units.
At this archived reserve ratio, that fee is about 24.13% of the order; the
minimum-output fill would immediately reduce the complete initial portfolio
(10 KUSD plus 1 XOR reserve) by about 4.08% at unchanged reserves. This is one
historical cost observation, not a current quote or a return forecast.

The [preflight evidence](../output/go-history/goal-archive-engineering-20260920/opening-preflight-v1/verification.json)
and [exact cost fractions](../output/go-history/goal-archive-engineering-20260920/opening-preflight-v1/cost-diagnostic.json)
do not qualify a strategy, authorize a transaction, or replace the full causal
episode. No protected current GO, day001 or earlier validation observations were
read. The earlier study dates and June22 baseline remain unchanged.

The explicit [v2 clock and evaluator](bots-goal-clock-v2.md) are implemented and
tested. A metadata-only check of the same complete engineering interval produces
1,369 due checks. The last starts at 30 June 12:59:37 UTC; its planned completion
remains 13:00:07, while cancellation stays at the original 13:00:00 deadline.
That check has no completed timestamp. This check read no pool values and created
no operational study or trading authority.

The separate `episode-v2` run has now completed successfully using the same
29 June 13:00–30 June 13:00 UTC interval, 2.5 KUSD DCA lot every six hours,
10 KUSD starting allocation, separate 1 XOR fee reserve and fixed modeled delays.
The [recorded protocol](../output/go-history/goal-archive-engineering-20260920/episode-v2/protocol.json)
binds the prior v1 failure, exposed opening preflight and all 121 executed source
files. The [completion receipt](../output/go-history/goal-archive-engineering-20260920/episode-v2/complete.json)
records 1,369 valuations, 24 consumed hours and two hypothetical minimum-output
fills, using 1,788 physical requests. No dates, candidates or delays were changed
in response to those outcomes.

The independent [offline verification](../output/go-history/goal-archive-engineering-20260920/episode-v2/verification.json)
checked all 121 source hashes, the frozen inputs and access bindings, all 8,540
retained raw files, the rebuilt callback clock and trace digest, then replayed
the actual exact-ledger functions alongside the untouched-inventory benchmark.
It made no network requests. Its scope is file integrity and exact accounting;
it does not rerun every raw RPC decoder or establish independent cryptographic
chain finality. [Verifier documentation](bots-goal-engineering-verifier.md) and
[validation receipt](../output/go-history/goal-archive-engineering-20260920/verifier-validation.json)
record the method and 15 passing synthetic tests.

The baseline's net return was approximately **−1.7506%**, with **−12.1617%**
benchmark-excess return and **4.5043%** maximum observed drawdown. It expired with
5 KUSD and 1.644153561654938642 XOR after 0.200042625179414652 XOR in modeled fees.
Exact fractions and the benchmark are retained in the verification artifact.
These are hypothetical fills at recorded minimum outputs, with no simulated
market feedback. The result is explicitly `qualificationEligible: false` and
`actualTransactions: 0`: working data and execution joins do not make this
baseline profitable or authorize a wallet.

## Concrete unresolved work

The [fixed earlier study](bots-earlier-goal-study.md) was sealed and started on
21 September. Its [protocol](../output/go-history/earlier-goal-study-20260921/protocol.json)
binds 125 isolated source/config files and two bidirectional candidates: 24-close
deviation and 24-observation momentum, with untuned ±25% bands, fixed 5 KUSD /
1 XOR lots and a six-hour cooldown. The original dates, modeled delays, limits,
operational-ingestion disclosure and selection gates remain unchanged. All six
metadata-only clocks passed before acquisition. The actual study journal now
owns registration and per-episode access; cached metadata receipts share each
episode's sink with its raw market evidence. The invocation subsequently failed
during its first training episode: the indexer returned HTTP 502 for XOR hourly
history after three successful KUSD pages. The journal preserves that failure
without retry; no validation was opened and no qualification or transaction
resulted. See the [failure and exposure disclosure](bots-earlier-goal-study.md).

1. Repair and verify indexer availability independently of strategy outcomes.
   Preserve the failed invocation and its original dates, candidates and evidence.
   Only a completed training corridor with a passing selection can open validation;
   none exists from this run. Production now reports runtime/transaction version
   131 while the archived study binds 130. Preserve exact runtime admission until
   an explicit compatibility assessment supports a current-runtime path.
   The confirmed failure was a brief deployment listener gap, so useful recovery
   work is acquisition continuity, not strategy retuning. The existing store
   deliberately cannot resume failed requests. An additive continuation would
   need to retain the failed invocation and original validation claim, replay
   the exact successful raw prefix, and declare bounded recorded retries for
   only the missing read. It must bind its new executed sources, count all old
   and new attempts/bytes, and refuse economic failure or already-opened
   validation. The additive journal, verified prefix, filesystem inventory and
   recorded retry components now have synthetic tests. Their isolated
   [continuation runner](bots-goal-acquisition-continuation.md) passed the exact
   retained-reader preflight and completed the one permitted child acquisition;
   creating a new study ID cannot substitute for this lineage. The frozen failed
   invocation remains unchanged. The child did not establish qualification.
   The original child process subsequently finished with all eight training
   episodes complete, zero acquisition failures, no candidate selection and no
   validation access. Both candidates made zero fills and paid zero fees. Their
   wide entry conditions did not fire before the funded portfolio's target or
   drawdown stop; neither outperformed unchanged holdings. The original frozen accounting
   functions reproduce that result, and all 129 frozen source hashes still match.
   See the [training result and exact diagnostic](reports/bots-earlier-training-result-2026-09-21.md).
   Do not restart the same invocation or describe this as an ongoing acquisition.
2. Finish public GO wiring to the approved-funding service and qualified goal
   runtime. Portable full replay and the [small release loader](bots-goal-releases.md)
   are implemented: the publisher replays raw evidence, then shipped manifest
   pins establish browser authority. This avoids downloading multi-gigabyte
   study archives for every user. An AI-supplied certificate cannot select its
   own pins or grant an in-memory capability. Include exact-ledger progress display,
   interrupted-session recovery and deadline closure in that integration.
   The training-byte reader and original raw-envelope, history, metadata, pool,
   quote and fee verifiers are implemented and tested. The
   [episode source](bots-goal-bundle-episode.md) reproduces the original causal
   evaluator's entire trace in an invented-data integration test; its training,
   owned-validation and market/quote regression tests total 133 passing tests. The
   [study exporter](bots-goal-study-bundle.md) now includes the full metadata
   archive and passes 20 synthetic tests, including a real completed
   continuation; its read-only store has 48 passing
   store/continuation/replay regression tests. It has not exported the failed
   real study, which did not qualify. The guarded selection/validation adapter,
   phase-specific raw source replay and [browser composition](bots-goal-bundle-verifier.md)
   are now implemented. The root export/read/clock/composition checks pass 101
   tests; the study adapter passes 21 tests, and retry/prefix acquisition checks
   pass 86 tests. The final composition builds with the production Vite browser
   configuration. Scoped type checks report zero errors in these modules and
   five pre-existing liquidity-proxy errors. These checks cover the component
   boundaries; they do not constitute a complete successful raw six-episode
   production study or a public GO integration. Passing byte checks or synthetic
   integration tests alone cannot qualify the failed real candidates.
3. Validate that composed flow with synthetic I/O. Any new candidate needs a
   separate declared research protocol and suitable untouched evaluation data;
   preserve the failed study and its original validation claim. Then complete deployment and
   a user-authorized live partial-order demonstration only when actual
   qualification and session requirements are satisfied. A successful live
   transaction recording is still outstanding; this archived engineering run
   cannot substitute for it.

The separate [synthetic reachability harness](bots-synthetic-reachability.md)
uses the unchanged exact ledger on ten invented paths. It demonstrates that a
fixed 5 KUSD partial entry can pass the existing risk checks, and also retains
paths where costs cause a loss or a portfolio stop occurs before the first
decision. Its eight tests, lint and scoped type check pass. It does not establish
predictive value, repeated profitable cycles or a qualified replacement strategy.
No real data, original study or protected validation data was used to select its
paths. The [research notes](bots-partial-inventory-research-20260921.md) describe
candidate mechanisms that would need a separate declared empirical study.
