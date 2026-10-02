# Catalog-model V3 study replay and publication

The existing `reverifyGoalStudyBundleV3` entry point supports two explicitly parsed
models. The original source130 model still requires metadata cache policy v1.
The source128/129/130 catalog model requires catalog cache policy v2 on both
partitions. An unknown model, mixed policy, or policy/model mismatch fails before
episode replay. Neither caller-supplied catalogs nor replaceable verifiers are
accepted by this public composition.

For the catalog model, `createGoalStudyBundleCatalog` reads the pinned collection
protocol and raw inventory, derives the first **training** shard from the declared
ranges, and reads only that shard. It checks its original three metadata responses
against the declared source anchors. A fixed worker loads the hash-pinned target131
WASM and returns its actual metadata. The normal private catalog constructor then
checks all four exact profiles and the finite storage layouts. The worker is
always disposed. Bootstrap reads are bounded by artifact sizes and a 30-second
per-artifact distribution timeout, plus caller cancellation; historical timing is
unchanged.

This bootstrap establishes schema ownership only. The fixed composition next runs
`verifyGoalBundleCatalogMetadata` against the original complete wire archive.
A catalog reconstructed from valid metadata cannot authenticate altered block
profiles or other callback evidence. Validation uses the separate guarded catalog
metadata entry point with the original privately owned training selection. Both
phases retain the same catalog instance; episode and quote composition obtain it
through the privately owned verified metadata/market capabilities.

`exportGoalStudyBundleV3` and `exportGoalStudyReleaseV3` keep their public inputs.
The exporter preserves exact original catalog cache bytes and binds policy v2 only
to the explicit catalog model. The old exporter still rejects V3 plans. The study
index reader accepts exact matching v1 or v2 metadata policies, but it creates no
catalog, callback verification, qualification, or validation selection. The v2
metadata inventory limit follows its declared 12 GiB ceiling; the existing stricter
8 GiB whole-export/distribution limit remains unchanged.

Before registration, an operational runner must reserve space for the complete
metadata inventory, public protocol, root records, every possible episode's raw
files and completion record, episode manifests, and final index. Source files and
target WASM are checked as inputs but are not copied into this bundle; their
source hash map is part of the public protocol. Original block files may share an
object across root and metadata references; counting them twice is conservative.

`openGoalQualificationArchiveEvaluatorV3` forwards the optional
`maximumRawEvidenceBytesPerEpisode` to `openGoalQualificationStudyStoreV3`.
This must be a positive safe integer no larger than 512 MiB, declared before
acquisition. It counts each exact frozen canonical raw envelope **including its
final newline**, rather than only its value. The common sink reserves bytes
synchronously before any write, including composition, cache and source evidence.
Crossing the limit prevents that write and makes the episode durably failed even
if the producer catches the rejection. The allowance resets for the next episode;
omitting it preserves prior behavior, and V1/V2 constructors reject the option.
Changing a protocol's descriptive byte allowance alone does not enforce this
limit. This acquisition capacity rule does not change timing, fees, strategies or
qualification criteria.

Release publication still requires complete fixed raw replay before encoding an
owned result. No release is automatically enabled, and no runtime is added to an
old certificate. Caller abort, failed raw verification, incomplete records, changed
bytes, or revoked selection cannot return publication success.

Focused checks distinguish their evidence: bootstrap tests use the actual target
worker and genuine metadata with invented headers; dispatch tests use explicit
controller spies; export/release tests use synthetic accounting journals through
the actual durable store and qualification boundary. They establish no empirical
profitability or successful real study. No market data, wallet, or network is used.
