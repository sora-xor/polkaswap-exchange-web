# Original valuation verification in the browser

`src/features/bot-trading/goal-bundle-market.ts` exports the synchronous
`verifyGoalBundleValuation(binding, {schemaBytes, stateBytes, valuationBytes})`.
It reads the original `market-schema-N.json`, `market-state-HEIGHT.json`, and
`valuation-CHECK.json` wrappers using the shared `goal-raw-envelope` parser. It
returns a deeply frozen `GoalEpisodeMarkEvidence` reconstructed from raw RPC
responses. There is no fetch, Node import, wallet access, or qualification
capability in this module.

The enclosing bundle reader pins each **file-byte SHA-256**. This verifier also
checks each original wrapper's **canonical value SHA-256**, request identity,
and logical name. The returned `evidenceSha256` is the original valuation value
digest. These hashes are different identities and cannot be substituted. The
original `requestedAt` and `completedAt` remain in the raw envelopes; the
verifier never runs a fresh acquisition or rewrites those timestamps.

`readGoalArchivedHeader`, `readGoalArchivedTimestamp`, and
`readGoalArchivedTimestampLayout` expose the same pure decoders for the metadata
and quote verifiers. They validate decoded original RPC results; a decoded header
alone conveys no canonicality, finality, or source authority.

`verifyGoalBundleOpening` and `verifyGoalBundleTerminal` share these joins but
require `opening.json` and `terminal.json`, respectively, in the binding's
`valuation` artifact field. Terminal verification additionally requires the
original accounting deadline and applies the 60-second age limit at that
deadline, preserving the later retrospective capture/receipt timestamps. The
original `verifyGoalBundleValuation` remains strict about in-episode names and
receipt-time age.

## Checked joins

- Exactly ten initial schema RPC receipts with their original methods, params,
  IDs, successful status, bounded response bodies, and exact body hashes.
- Mainnet genesis; finalized observation at or above the pinned finalized
  source; canonical source and schema-anchor hashes/heights; consistent repeated
  header identities and parent links whenever retained headers are adjacent.
- Exact SCALE V14 metadata, primitive `Timestamp.Now: u64`, its derived storage
  key, metadata hash, supported runtime version, transaction version, and exact
  declared code hash. The profile must appear in the caller's pinned profile list.
- Four state RPC receipts, with IDs tied to storage slot 1 through 64: selected
  canonical hash/header, unchanged runtime code hash, and exact u64 timestamp.
- One batch at that same block: all seven metadata-derived keys exactly once,
  including timestamp, denominator, both assets, DEX, pool properties and reserves.
  The real browser pool codec checks SCALE encodings, asset identities/decimals,
  denominator and pool shape. Missing or zero pool observations cannot yield marks.
- Complete equality of reconstructed schema context, decoded pool evidence,
  original state value, and valuation projection. The schema-to-state and
  state-to-valuation digests must match the exact expected wrappers. Recomputing
  a wrapper hash around a forged normalized field does not make it acceptable.
- The supplied selected block and modeled capture/receipt times, including
  capture after block time, receipt after capture, and a maximum 60-second state
  age. A cached state may serve another valuation with its own original digest.

Each original metadata response is bounded to 2 MiB, the supplied schema/state
metadata responses together to 12 MiB, and the storage batch to 128 KiB. The
shared envelope parser separately enforces the original 32 MiB wrapper and
bounded own-data graph. No claimed cumulative shard counters authorize omitted
records: this API verifies one state only.

Repeated legacy valuations reuse the timestamp layout and anchor pool decoder
only for the same privately owned, frozen schema snapshot and exact genesis,
anchor, metadata, code and runtime identity. Mutable schema bytes are rehashed
and their complete binding is checked on every call. Selected-block codecs,
storage values, context joins and returned market capabilities remain fresh;
the decoder cache grants no market or qualification authority.

Selected legacy blocks may reuse an unbound pool schema decoder owned by the
genuine anchor codec. Each selection still creates a fresh block binding and
decodes fresh raw storage. Copied prepared identities take the ordinary cold
validation path; copied or foreign anchor handles cannot prepare identities.
Execution and fee codecs retain their original block-bound registries.

## External trust and remaining integration

The caller must obtain the source manifest, request identity, fixed finalized
source/receipt identity, schema anchor, exact runtime profiles, wrapper identities,
and selected causal block/times from its independently verified bundle and causal
source. Passing attacker-chosen binding fields supplies no authority. The module
does not validate the contents of `finalizedSource.receiptSha256`, discover a
different anchor, or select a favorable valuation time.

Canonical hashes and finality remain the original **RPC-attested** claims. This
module checks their internal consistency and bindings; it does not recompute a
cryptographic header hash, verify GRANDPA signatures, or verify a storage-trie
proof. Integrity alone does not prove on-chain truth or strategy eligibility.

`goal-bundle-episode.ts` now composes these marks with raw history and quote/fee
verification, checks the original causal clock and complete source receipts, and
runs the unchanged episode evaluator. Its validation entrypoint requires an
owned completed-study selection. The study's complete qualification boundary,
live admission, and runtime-130-to-131 economic compatibility remain separate
checks. This module is not wired to default GO and grants no certificate or
JSON-based authority.

The focused test uses the real historical market reader with synthetic RPC
responses and real portable metadata to generate the original wrappers. It then
verifies their browser reconstruction and corruptions of raw and projected joins.
No external service or actual study outcomes are read.

```sh
yarn test:unit tests/unit/features/bot-trading/goal-bundle-market.spec.ts
```

The verifier also privately associates each actual returned mark with a frozen `GoalBundleVerifiedMarketState`. `getGoalBundleVerifiedMarketState(mark)` returns that owned capability; `assertGoalBundleVerifiedMarketState(capability)` rejects copies or matching JSON. It preserves authenticated source metadata and raw `PoolXYK.Properties` bytes, source/raw/request/manifest identities, block/mark/runtime/denomination and finalized-source provenance for subsequent fixed V3 quote replay. It adds no fields to the existing V2 mark and makes no claim beyond the original pinned RPC attestation (not a GRANDPA or trie proof).

## Explicit catalog source verification

`verifyGoalBundleCatalogValuation(binding, bytes, { catalog, metadata })` and `verifyGoalBundleCatalogOpening` accept `GoalBundleCatalogValuationBinding`, whose source contains the three canonical schema anchors. `verifyGoalBundleCatalogTerminal(binding, bytes, accountingAtMs, dependencies)` preserves the original deadline rule. These are separate entrypoints; the original constructors still reject catalog artifacts.

Both dependencies must be privately owned. The verifier joins the exact selected hash, height, parent and timestamp to the independently verified catalog metadata, then obtains that block's full authenticated profile. It replays the original twenty schema RPC receipts, including genuine metadata, code and runtime identity at each of the 128/129/130 anchors, then four block receipts and the original seven-key storage batch. The catalog pool codec is selected by that block's observed code hash. All source context, `blockProfiles`, `runtimeProfile`, `catalogBinding`, decoded state and mark fields must equal their original projections. Known profiles cannot be relabeled; repeated anchor/block hashes cannot carry contradictory code claims. Original RPC metadata hex casing is preserved while decoded bytes are compared exactly.

The returned mark keeps its existing schema. Its privately owned source capability additionally has `kind: 'catalog-verified-market-state-v1'`, the exact catalog/profile digests, and the full per-block association (including genesis identity). `getGoalBundleVerifiedMarketCatalog(state)` retrieves the actual catalog from private ownership; `assertGoalBundleVerifiedCatalogMarketState` rejects legacy or copied states. All source getters/assertions recheck the metadata lifetime, including caller abort and validation-selection revocation. Neither catalog metadata nor a caller-provided catalog object is serialized into the mark.

The new tests run the actual catalog market reader and actual metadata collector with genuine pinned schemas and invented headers/storage. They cover all historical profiles, a rollback, schema/sidecar/wire mutations, unchanged opening/deadline clocks, and revoked ownership. No network, live pool observations, historical study outcomes, qualification or default GO activation is involved.

Timestamp layout decoding is cached only by privately owned catalog entry after the original response's exact metadata-byte comparison. A shard may reuse the same `market-schema-N.json` byte object for up to 64 marks. Its deeply frozen decoded wrapper is cached by byte-object identity only after full envelope verification. Each use rehashes the current bytes and matches the request, name and value digest before using that parse; changed bytes or bindings go through full envelope verification again. State and valuation wrappers are parsed for every distinct mark. Every mark still checks the schema RPC IDs, methods, params, response hashes, metadata bytes, context and block/profile joins. The cache conveys no authority to copied catalog entries or marks. The legacy decoder path is unchanged.

Retained source-capability liveness checks are created in a separate module-level factory that captures only the owned catalog and metadata result. This prevents a returned mark from retaining the entire per-mark schema/RPC parsing environment through a shared JavaScript closure scope. Full-day replay still verifies every original envelope and retains each verified mark; it does not retain another multi-megabyte parsed schema for each mark. Revoking one metadata owner revokes all of its marks, including marks across runtime changes, without revoking independently verified owners.
