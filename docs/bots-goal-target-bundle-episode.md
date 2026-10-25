# Node V3 raw episode replay

`scripts/bots/goal-target-bundle-episode.ts` exports
`evaluateGoalTargetBundleTrainingEpisode(input, dependencies)` and
`evaluateGoalTargetBundleValidationEpisode(input, dependencies, admission)`.
Dependencies contain only `readArtifact`, the exact pinned public
`compressedBytes`, and optional `signal`. The validation admission is the existing
owned live study selection, bound to independently owned validation metadata;
serialized selection objects do not grant access.

The original episode mechanics now live once in the internal
`src/features/bot-trading/goal-bundle-episode-core.ts`. Existing browser V2
entrypoints in `goal-bundle-episode.ts` retain their names and strict V2 behavior.
The internal programmatic driver is installed only by this fixed Node module;
public dependency objects cannot replace the quote verifier, target host, or
admission checks. Type-only references to Node verification types do not put
worker or filesystem code into the V2 browser runtime.

V3 requires its exact protocol, policy and source130/target131 execution model.
The shared engine continues to verify the original metadata ownership, selection,
clock, source manifest, registration, histories, finality waits, marks, cached
projections, signal order, deadlines and terminal successor. It passes the owned
market state of the original verified mark to the fixed target quote verifier,
even when the current valuation is a retimed cached projection.

Every `target-rpc-<check>-<id>.json` is a separately pinned semantic artifact.
Check IDs must exist in the declared clock; RPC IDs are bounded to the transport's
269-request limit. The engine consumes each wrapper once. The fixed quote
verifier joins those wrappers against the embedded original receipts and executes
the exact target binary again. It returns physical request and byte counts, which
the episode adds once rather than counting the embedded copies a second time.
The original `complete-source.json` must match all reconstructed counters and
every semantic artifact must have been consumed.

Executable estimates require their exact fee artifact. An unavailable route has
no fee artifact and produces neither an invented fill nor an invented fee. The
existing V3 evaluator applies its declared fee-cap stress policy; raw API fees
and source130 identities are retained unchanged. Abort, failed joins and incomplete
evidence cannot return a partial successful trace.

The optional exact-target mode of the shared test fixture uses retained public
metadata, the exact installed target131 binary, and invented pool/account values.
It runs the original V3 archive producer before testing raw episode replay. This
proves a synthetic episode can be reconstructed; it does not claim any actual
historical study passed qualification or that a strategy is profitable.
