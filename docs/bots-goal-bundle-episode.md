# Original episode replay in the browser

`goal-bundle-episode.ts` composes the raw metadata, history, market and quote
verifiers into the existing `GoalEpisodeEvidenceSource`. Its
`evaluateGoalBundleTrainingEpisode(input, dependencies)` runs the unchanged
`createGoalEpisodeEvaluatorV2` over the reverified evidence. The result is an
episode trace, not qualification or permission to trade. This module has no
Node imports, network acquisition, wallet access or default GO wiring.

The shared mechanics are implemented once in `goal-bundle-episode-core.ts`.
These public browser entrypoints remain strictly V2. The separate fixed Node
[V3 entrypoints](bots-goal-target-bundle-episode.md) reuse that internal core
and independently replay exact target-runtime API evidence; callers cannot
enable V3 or replace quote verification through the V2 dependency object.

The input contains the pinned plan, archive manifest, original registration and
evaluation request, the original completion receipt list, and an **owned** result
from `verifyGoalBundleMetadata`. JSON serialization cannot preserve that private
metadata authority. The ordinary entrypoint accepts training only.

`createGoalBundleValidationSource` and `evaluateGoalBundleValidationEpisode`
require a separate `{selection, binding}` admission issued by the completed-study
adapter after the unchanged qualification boundary recomputes training and the
original selection. The binding includes the exact index, plan, evaluator source,
candidate and validation request hashes. Its private selection is checked before
any reads and throughout replay; a JSON copy or revoked study fails closed. The
owned validation metadata must have been admitted by that same selection and
candidate. Its partition reconstruction can be reused for the two selected
validation requests. The original frozen selection seal is supplied to the
unchanged evaluator and must match `source.json` exactly.

The supplied `readArtifact(name, signal)` resolves only the named original raw
wrapper. A surrounding pinned bundle reader must validate its exact file bytes.
The completion receipt's `{name, sha256, bytes}` instead describes the canonical
**value** inside the wrapper. The source checks both the value digest and byte
count and preserves the original value digest in returned evidence. It never
reacquires responses or substitutes current wall timestamps.

## Reconstructed source behavior

- The metadata capability must match the pinned block-list and verification
  identities, source anchor and genesis. The shared v2 callback builder receives
  the exact metadata slice, including its predecessor and successor. The full
  original `source.json`, including the full clock-builder result and original
  registration, must match before the opening pool is read.
- Opening, valuation and terminal blocks use the original causal `asof` rules.
  The original modeled finality, callback, history-publication and capture delays
  are preserved. Terminal state age is measured at the original deadline while
  its retrospective capture and receipt retain their original later times.
- The source reproduces the original publication wait without reading history
  prematurely. Available history passes the raw history verifier, including the
  201-hour window and joins to owned metadata where that collection has coverage.
  Older warmup rows remain original indexer attestations.
- Each new mark verifies the original ten-request schema, four-request block
  evidence, one storage batch and projected mark through the actual browser
  codecs. Schemas rotate after 64 new marks. A repeated block reuses the verified
  state while independently checking its original timed projection and digest.
- Quotes bind the exact evaluator-supplied pending amount, direction, valuation,
  signal hour and fixed fee policy. Original quote and fee RPC evidence is
  decoded again. Price-impact admission remains in the existing evaluator.
- A stage crossing the deadline must have the exact original cancellation
  receipt. It cannot acquire later semantic evidence. The terminal successor and
  all completed valuations must agree with the original clock and deadline.
- `complete-source.json` is recomputed from consumed logical RPC requests, exact
  retained response-body bytes, unique marks, quotes and terminal successor.
  Every semantic receipt must be consumed exactly once. Acquisition receipts
  (`composition-metadata`, cache binding/use and acquisition retry/prefix records)
  remain the surrounding study reader's responsibility; they are not extra
  economic observations or physical requests in these logical source totals.

Reads are lazy and serialized. A stage error closes the source; repeated or
concurrent stages reject. Each artifact read has a 30-second cancellation bound,
including a reader that ignores its signal. Caller cancellation is forwarded
without changing the caller's controller. Receipt retention is bounded to 16,000
entries and 512 MiB, with 32 MiB per wrapper, and the pinned original source
request/response limits are enforced independently.

## Trust and verification limits

This composition checks the original evidence's internal joins and causal
execution. Original canonicality/finality claims remain RPC attestations; the
market verifier does not introduce GRANDPA or storage-trie proof verification.
Modeled callbacks remain modeled callbacks, and minimum-output execution remains
the existing conservative simulation. No observed historical wallet fill is
invented. A pinned JSON certificate cannot replace this computation.

The surrounding completed-study adapter must verify registration and access
history, exact file pins, acquisition lineage and completion records, run all
training episodes and the existing selection boundary, and only then authorize
validation reads. Live runtime compatibility and live admission remain separate.

The integration fixture generates original evidence using the real archive
source, historical readers, portable metadata codecs and unchanged evaluator,
with synthetic RPC/indexer responses. Browser replay must reproduce the complete
original trace digest. Tests also corrupt source, receipt and completion joins,
reject copied metadata and premature validation, exercise cancellation, and
verify an original deadline-cancelled episode. They make no network calls and
read no actual study outcomes.

```sh
yarn test:unit tests/unit/features/bot-trading/goal-bundle-episode.spec.ts tests/unit/scripts/bots/goal-bundle-validation-episode.spec.ts
```

The validation integration test obtains a real live selection through the
synthetic original store, exporter, browser reader and unchanged boundary. It
checks full original-source trace parity under that exact validation request and
selection, then copied, mismatched and revoked admission. The harness's separate
trusted evaluator double exists only to exercise selection ownership; it does
not qualify the original-source oracle trace or claim real profitability.
