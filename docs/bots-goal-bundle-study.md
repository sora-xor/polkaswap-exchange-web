# Browser completed-study journal replay

`createGoalBundleStudy({ reader, evaluateEpisode, continuation?, acquisition?, signal? })` provides a read-only adapter around the unchanged `createGoalQualificationBoundaryV2`. The returned object exposes only `reverify()` and `dispose()`. It does not expose registration, episode-order mutation, selection creation or a new qualification policy. The fixed composition in `goal-bundle-verifier.ts` supplies the real pinned reader and causal episode evaluator.

`reader`, `evaluateEpisode` and the acquisition observers are **trusted application dependencies**, never values supplied by a page, AI tool or JSON bundle. In particular, calling this low-level adapter with an arbitrary callback does not establish that callback's raw evidence verification. The public fixed composition owns that choice. Tests use an explicitly invented trusted producer to isolate journal behavior; those fixtures make no claim about chain evidence, strategy returns or live eligibility.

The public protocol projection, original registration, study/validation claims and certificate are exact pinned canonical records. The adapter joins plan/source/manifest hashes and recomputes the original registration digest, including continuation lineage when applicable. The public protocol intentionally omits local paths and frozen source bodies, so its embedded original protocol digest is joined to the externally pinned index; it is not presented as a recomputed hash of the omitted original file.

The unchanged qualification boundary drives each candidate's four training episodes in original order. For each episode, the adapter requires the corresponding indexed request, original access marker, registration/selection binding, completion digest and sorted raw value receipts. Each raw wrapper is independently checked against its request/name/value digest and exact canonical value byte count as it is consumed. The pinned episode reader separately checks wrapper file hashes. After the causal producer returns, remaining acquisition provenance wrappers are verified, and the recomputed trace must equal the original full completion trace. The original trace is never substituted for recomputation.

Only after all training episodes have been recomputed does the unchanged boundary select the candidate and supply its complete training-summary digest. The adapter requires exact equality with the original selection record and seal. It then issues a privately owned `GoalBundleStudySelection`, bound to the index, plan, evaluator source, candidate and exactly two selected validation request hashes. `assertGoalBundleStudySelection` rejects JSON copies, wrong bindings and revoked capabilities.

The pinned reader's `readValidationRoot` and `openValidationEpisode`, the separate validation metadata verifier, and the guarded validation episode source require this same capability. Validation completion records and raw episode files therefore cannot be opened by the adapter before training selection succeeds. The two selected validation episodes are recomputed in order. The unchanged boundary then compares all training and validation summaries and the complete original certificate before returning its existing `GoalQualificationVerification`.

Acquisition continuations retain the original parent registration and exclusive claims. The child plan may differ only in its evaluator source hash. Parent access must be the first candidate's first training request with no selection, and its failed record must still exist. The adapter verifies the complete original inventory, every named parent wrapper/file-byte binding, both identical lineage records and the child's lineage-bound registration. It also requires the trusted pure continuation observer: `prepare` receives the pinned parent namespace, `observeChild` receives every independently parsed first-child wrapper, and `complete` must establish original prefix/use/retry joins before the first child episode can finish. Missing or malformed observers reject; there is no digest-only success path. The observer receives provenance in retained receipt order, so it joins the stored lane/sequence identities rather than treating callback order as historical arrival.

The same validated continuation lineage requires `acquisition` for **every later child episode**, including both selected validation episodes. Its `prepare({ request, signal })` returns the same streaming `observeChild`/`complete` interface. The fixed composition supplies `createGoalBundleAcquisition`, which verifies ordinary recorded retry groups and per-operation/episode limits without a parent failure surcharge. Completion must succeed after all semantic and provenance wrappers have been checked and before the next episode can open. This requirement cannot be bypassed by omitting a filename from the pinned source inventory. Ordinary studies without continuation lineage retain their original behavior and never invoke this additional observer. Validation still requires the live training-selected capability before opening any validation completion or raw episode.

The adapter writes no journal, starts no acquisition, creates no selection on disk and moves no funds. A study is attempted once per reader. Failure or caller cancellation closes the reader and revokes all issued capabilities; `dispose()` also revokes the existing qualification boundary. Pending validation reads cannot survive disposal. A returned configuration verification still requires the separate current-runtime, funding-consent and live execution checks; this module never enables default GO.

Tests use the actual durable journal, existing qualification boundary, exporter and browser readers over synthetic static files. They cover original record corruption, recomputed evidence mismatch, strict training/validation order, no validation opening before selection, live capability identity, cached validation metadata, direct lower-reader gates and revocation during an outstanding validation read. A separately invented continuation journal exercises first-prefix versus every-later-episode observer order, mandatory dependencies, malformed observers, failure before subsequent access, and unchanged legacy behavior; concrete retry semantics have their own observer tests. The helper lives in `tests/fixtures/bots/goal-bundle-study.ts`; Node-backed integration suites run under `tests/unit/scripts/bots` to retain real filesystem/crypto APIs. No real study or validation values are read.

## Explicit v3 studies

`createGoalBundleStudyV3({reader, evaluateEpisode, signal?})` uses the same private
versioned core, journal checks, selection WeakMap and revocation lifecycle. Its
`GoalBundleStudyV3Input` intentionally omits `continuation` and `acquisition`.
The original `createGoalBundleStudy` remains strict v2; both entrypoints reject a
plan or archive manifest for the other version before opening completion or
episode data.

V3 dispatches only to `createGoalQualificationBoundaryV3` with v3 evidence. That
boundary reparses the execution model, preserves source130 market provenance,
checks target131 execution identities, and recomputes hypothetical accounting at
the declared stress-fee cap while checking the retained raw fee quotes against
that cap. Neither the journal adapter nor its selection capability establishes
that an arbitrary callback has re-executed target WASM. A trusted v3 Node raw
replay composition must supply that callback; the existing fixed browser v2
composition is unchanged.

Only original v3 studies are supported. Continuation/acquisition dependency fields
are rejected before reader calls. A parent or lineage artifact in the index is
rejected before root record reads; `protocol.parent` must be null. Original
acquisition/continuation receipt namespaces are rejected before opening their
episode reader. No old failed study can be relabeled as v3 or gain continuation
permission. V2 prefix and retry observers keep their existing accounting and
lifetime checks.

`goal-bundle-study-v3.spec.ts` builds a fresh synthetic journal and certificate
using the actual v3 store and boundary, then serves exact original wrapper bytes
through the real pinned study/episode readers. It verifies reproducible summaries,
source/target separation, cap and raw-fee rejection, exact completion comparison,
strict cross-version rejection, withheld validation, forged selection rejection
and abort/disposal revocation. Its invented fills and implementation pins are
trusted-producer test fixtures, not real raw evidence or an approved strategy.
