# Interrupted training acquisition replay

`scripts/bots/goal-acquisition-replay.ts` supplies an additive, read-only prefix replay. It does not change the study store, archive readers, evaluator, default transport, or qualification policy. It is restricted to the failed **first training request, candidate 0 / episode 0**, under the v2 protocol, with an original complete HTTP 502 history receipt. It never opens validation data or submits a transaction.

## Preparation and immutable files

`buildGoalAcquisitionReplayManifest(requestSha256, files)` builds a metadata-only inventory. Each file has a logical `name`, exact UTF-8 `sha256`, and byte length, including any original newline. The trusted filesystem adapter must enumerate the complete original directory and reject additional accesses/episodes, symlinks, missing files and concurrent mutation. This module deliberately accepts a read-only adapter rather than filesystem paths.

Logical names are `registration`, `access`, `failed`, and `raw/<original receipt.name>`. For example, logical `raw/market-state-20.json` maps to the original `market-state-20.json.json` file. The manifest itself is read as `manifest`. Unknown evidence kinds fail closed; this version supports the actual prequote history/metadata/pool prefix and does not pretend that a later quote or fee acquisition has been covered.

Call `prepareGoalAcquisitionReplay({requestSha256, rawManifestSha256}, {readArtifact, signal})`. It checks the exact manifest and every file, every canonical raw-envelope value digest, original registration/access/failure bindings, and first-training identity. Preparation is bounded to 30 seconds, 16,003 files, 32 MiB per file and 512 MiB overall. Original market bodies stay inside its closure; public `inspection` contains counts and hashes only. Its failed-request digest is SHA-256 of the exact retained request body.

`bindings.accessSha256` and `failedRecordSha256` are canonical JSON store digests **without** the file newline, matching the existing journal. Manifest file digests independently cover exact bytes including newlines. Parent plan/source identities are derived from the original registration. `assertGoalAcquisitionReplayPreparation` requires the actual privately owned object; a copied JSON summary or a matching digest cannot replace it.

## Exact lanes and the failed-request boundary

`createGoalAcquisitionReplay(preparation, {retainEvidence, acquireFailedRequest, signal})` claims a preparation once and returns `fetch` for indexed history and `marketFetch` for metadata/pool reads. Each lane must consume its original request sequence, including exact URL, JSON request bytes and IDs. Any wrong lane, order, body, URL, missing record, abort or retention failure permanently closes that instance. There is no early live fallback.

The original raw store has no global append ordinal, so this module does not invent one. Metadata order follows the original contiguous cache sequence and each shard's original RPC IDs. Each pool read follows its four metadata calls, with contiguous storage IDs and complete earlier 64-mark shards. Cache-use receipts are joined to the original returned block-response bytes by ID, method, params, binding and response digest; the cache's missing body is never fabricated. History receipts retain their original ordered groups, pages, cursors and raw bytes. Original total requests and response bytes must agree with the failure diagnostic.

Every response requires a durable `retainEvidence` callback first. Replay-use receipts identify the original envelope/value digest, lane/sequence, exact request and response hashes, and cache receipt name. They do not claim that current replay time was a historical browser arrival.

Only after **both** successful lanes are exhausted can the exact original failed history request reach `acquireFailedRequest(url, init, preparation)`. The callback should use the separate recorded acquisition transport and the root continuation's shared budget/deadline. The old 502 remains immutable; a new successful response is separate evidence. The callback is never used for a divergent request or any subsequent request.

`completion()` is available only after the callback returns a valid same-origin 200 and that response body completes. `assertGoalAcquisitionReplayCompletion(proof, expectedBindings)` checks privately owned completion and exact parent bindings. Clean disposal preserves an already completed proof; failure or divergence invalidates it. A trusted continuation composition may deliberately choose its normal recorded transport after this boundary. This module never makes that switch itself and never treats acquisition completion as strategy/economic qualification.

## Tests

The reusable `goal-acquisition-replay-fixture.ts` builds invented raw envelopes and accepts actual synthetic study-store registration/access/failed records for integration tests. Tests cover exact bytes, ownership, both-lane barriers, failure preservation, retained evidence, corruption, missing joins, wrong requests, invalid scope, and aborts without external services. Preparation was also checked programmatically against the original failed training directory using only count/hash output; no bodies, prices, outcomes or validation data were printed.
