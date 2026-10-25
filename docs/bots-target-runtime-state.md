# Historical state for target-runtime quote and fee simulation

This is an offline engineering component for a separately declared hypothetical
execution model. It does not approve a strategy, change runtime admission, or
reinterpret a runtime130 historical certificate as runtime131 evidence.

The existing historical evaluator already uses a same-block quote, conservative
minimum output and fee-method agreement, followed by hypothetical success or
fee-only failure accounting. It does not dispatch a historical signed transaction
against evolving account state. Running the exact target131 quote and fee APIs on
genuine source130 state can retain that class of simulation fidelity. It does not
require proving whole-runtime equivalence or simulating BlockBuilder dispatch,
payer balances/nonces, referrals, or historical event effects.

This route still needs its own frozen source/target model, causal history and mark
joins, explicit conservative cost scenario, untouched out-of-sample evaluation and
live fee cap. Actual live131 signed transaction validity, inclusion and fee/fill
receipts remain the live execution system's responsibility. No admission code or
old study was changed here.

## Observed quote/fee read closure

The original retained synthetic execution receipts are listed with exact file
hashes in
`output/go-history/goal-target-runtime-state-20260921/closure.json`.
They are:

- `output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/quote-131-kusd-xor.json`
- `output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/quote-131-xor-kusd.json`
- `output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/dispatch-131-kusd-xor-success.json`
- `output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/dispatch-131-xor-kusd-success.json`
- `metadata-130.json` and `metadata-131.json` in that same directory.

Only the last two dispatch files' `feeMethods.info` / `feeMethods.details` host
traces contribute to this closure; dispatch-only accesses are excluded.

| Storage | Quote, each direction | Each fee API, each direction |
| --- | --- | --- |
| `DEXManager.DEXInfos(0)` | get ×6, exists ×1 | get ×2, exists ×1 |
| `DEXAPI.EnabledSourceTypes` | get ×1 | get ×1 |
| `TradingPair.LockedLiquiditySources` | get ×1 | get ×1 |
| `PoolXYK.Properties(XOR,KUSD)` | exists ×1 | exists ×1 |
| `System.Account(pool)` | get ×2 | — |
| `Tokens.Accounts(pool,KUSD)` | get ×2 | — |
| `XorFee.Multiplier` | — | get ×1 |
| `XSTPool.EnabledSynthetics` | next-key ×1 in original empty fixture | next-key ×1 in original empty fixture |

The six original API traces contain zero storage writes. `TradingPair.EnabledSources`
was declared in the fixture but was not read. `PoolXYK.Reserves` is not the quote
input: the actual pool account balances are read. The two account keys in the
closure receipt belong to the invented fixture. They are never reusable as genuine
pool identities.

Fixed raw keys, derived independently from both pinned metadata blobs:

```text
DEXInfos(0)
0xa1bd2c8b755a708aa525cd47c8e225fd49e90400771bdeb88bf8ecd95a3c447db4def25cfda6ef3a00000000
EnabledSourceTypes
0xf0440e0b42c8a54c0d4e6592058cacfec31e032726b1806c722148c15479a4dd
LockedLiquiditySources
0xf61d0276af90e372e9c7d5aad5fd728b4b78a6cc9a7e4f4c2b19eb0fb346e441
Properties(XOR,KUSD)
0x7c2f67164deafeedd91e34da0331ade4a436740684271e6e2985d7bb452fdf999d7224862f5243be3cf3be5853f2c8100200000000000000000000000000000000000000000000000000000000000000b04089446073f7b5be51c3a35172fdc302000c0000000000000000000000000000000000000000000000000000000000
Multiplier
0xc9283f367dbf74c668ae6ee5f45c97b0c301f7fd14cfae58594ab1d1b631fe93
EnabledSynthetics prefix
0x94106571e04fc4fb4133da54a111ec64f0f8da9ca61ee022314c44009224fe9a
```

The empty fixture establishes a seed closure, not a universal claim about every
state. The complete actual XST map is required. Unknown reads or traversal beyond
the declared range fail in the read-only host. A new branch requiring more state
must be reviewed explicitly; it cannot silently receive zero/default/absent state.

## Codec and retained evidence contract

`scripts/bots/goal-target-runtime-state.ts` exports:

```ts
const codec = createGoalTargetRuntimeStateCodec({ sourceMetadataHex, targetMetadataHex });
const pool = codec.derivePoolKeys(originalPropertiesHex);
// Acquire codec.fixedKeys plus pool.poolXor/pool.poolKusd at the same source block.
const verified = codec.verify({ sourceBlock: { hash, height }, receipts });
assertGoalTargetRuntimeState(verified);
const result = targetHost.invoke({ api, inputHex, state: verified.hostState });
```

The metadata pins are exact 130
`726c0dcdc748164be3ed3cc65c149e936e08380ef99c1b3991a0db6c1d7d127b`
and exact 131
`18aedaf96860e55c96ac6ad1d26f77cb2dc877ea822edf3242fdbe4f58bdd824`.
Their code/genesis/spec/transaction identities are recorded in
`GOAL_TARGET_STATE_PROFILES`. The factory resolves portable type references and
compares all eight storage layouts, including names, hashers, modifiers and raw
fallback declarations. Lookup ID equality is not assumed. Every supplied non-null
value must round-trip exactly under both registries, with no trailing bytes.
Fallback declarations are compared but never inserted into the source map.

Receipts use the transport's original `{id, method, params, requestBody,
requestedAt, completedAt, httpStatus, responseBody, responseSha256}` shape.
The verifier checks exact own-data fields, successful HTTP and JSON-RPC identities,
wire digest, method, parameters, block hash and monotonic request timestamps. It
rejects failure receipts, missing points, extra points and duplicate IDs/keys.
Only an explicitly supplied JSON-RPC `result:null` becomes declared absent state.
An absent pool is unsupported because no real account can be derived.

The XST inventory requires up to five `state_getKeysPaged` pages of count 64,
at most 256 members, strictly increasing complete cursors, and an explicit final
empty page. Every returned key must reconstruct from the metadata hasher and asset
bytes and have an exact non-null value receipt. A final global query
`state_getKeysPaged(null,1,lastMemberOrPrefix,blockHash)` supplies the actual first
outside-prefix key, or an explicitly empty result attesting global exhaustion.
Known present points cannot contradict that successor; an explicit absent point
cannot be the successor. No successor or empty-map result is synthesized.

Limits are 269 receipts, 4 KiB per decoded value, 1 KiB per key, 2 MiB storage bytes,
1 MiB per response and 8 MiB aggregate request/response bytes. Unsupported larger
maps or partial traversals fail; no prefix is truncated and labelled complete.

The returned object is deeply frozen and privately owned. Reloaded JSON has no
ownership: rerun verification. Its `hostState` is a sorted explicit seven-point map
and complete prefix map, suitable for the separately hash-pinned host. Ownership
means this parser actually ran; it does not mean the RPC statements are true.

## Verified joins and remaining trust

Verified here: metadata byte pins and SCALE, storage schema agreement, exact
metadata-derived point/map keys, genuine supplied Properties-to-account key join,
same-block request joins, original response byte digests, complete RPC-claimed
pagination and global successor, exact dual-registry value consumption, and all
declared bounds. Tests use invented state, original metadata and the actual pinned
target 131 WASM for both directions' quote and fee APIs, including a nonempty map.
An end-to-end test runs the actual bounded transport with an injected invented RPC
provider, verifies its original receipts, and invokes all three target APIs in both
directions. The release test run passed with operating-system networking denied.

External duties: canonical/finalized header and source runtime/code/metadata
binding, truthful historical storage RPC responses or cryptographic trie proofs,
and retention of the complete raw acquisition. `sourceBlock.height` is a caller
context claim, not inferred from storage RPCs. This module neither verifies
GRANDPA/trie proofs nor grants qualification, signing or funding authority. The
separate provenance-bound evidence source must enforce these duties before study
or admission use. Equal storage layouts are not equal economic behavior.

## Explicit catalog-backed source128/129/130 constructor

`createGoalCatalogTargetRuntimeStateCodec({ catalog, sourceCodeHash })` is an
additive constructor. `catalog` must be the privately owned result of
`createGoalRuntimeCatalog`; an arbitrary object or JSON copy cannot stand in for
it. The observed `:code` hash selects the catalog's exact historical source128,
source129, or source130 metadata/profile. Unknown hashes and the target131 entry
are rejected before storage receipt parsing. Caller-supplied replacement metadata
is not an option. The original `createGoalTargetRuntimeStateCodec` remains pinned
to source130, with the same returned object fields, property order, receipt hash,
and host-state hash.

Both constructors use one private verification implementation: the same eight
finite storage layouts are compared to pinned target131; all point keys, exact
SCALE roundtrips, request/response hashes, missing-versus-null checks, derived pool
account keys, complete XST pagination and genuine global successor checks remain
mandatory. No storage value is filled in from a default.

The new result has kind `verified-catalog-source-target131-storage-v1` and
provenance `catalog-bound-rpc-storage-claims-only`. `profiles.source` records the
actual selected historical profile; `profiles.target` stays target131.
`catalogSha256` identifies the checked finite catalog. `sourceBindingSha256` is
SHA-256 of the UTF-8 `JSON.stringify` object containing, in this order, `kind`,
`catalogSha256`, `profiles`, `sourceBlock`, `receiptSha256`, `stateSha256`, and
`provenance`. This additional digest binds the source identity without changing
`stateSha256 = SHA256(JSON.stringify(hostState))` or the original exact receipt
hash semantics used by the host and worker. Identical state bytes decoded under
different genuine historical profiles therefore keep the same host-state digest
but have different source-binding digests.

The caller remains responsible for authenticating that the observed code hash
belongs to the supplied source block, along with genesis, height, canonicality,
finality and raw RPC provenance. The seven storage points themselves do not prove
`:code`. Catalog ownership authenticates the decoder identity, not the truth of a
network response. The returned owned state supplies a hypothetical read-only
execution model; it grants no strategy qualification, wallet access, signing, or
runtime admission. No historical certificate or existing study is reclassified.
