# Historical runtime decoder catalog

`src/features/bot-trading/execution-codecs/runtime-catalog.ts` verifies the exact original metadata exports for observed SORA source runtimes 128, 129 and 130, alongside execution target 131. It is a browser-safe, offline decoder foundation. It does not change an existing reader, runtime gate, strategy, study, or trading authorization.

```ts
const catalog = createGoalRuntimeCatalog({
  source128MetadataHex,
  source129MetadataHex,
  source130MetadataHex,
  target131MetadataHex,
});
const source = lookupGoalRuntimeCatalogEntry(catalog, authenticatedBlockCodeHash);
assertGoalRuntimeCatalogEntry(source, catalog);
```

Each entry contains its distinct role, complete genesis/spec/transaction/code/metadata identity, original metadata hex, thirteen derived storage descriptors and XST prefix. `GOAL_RUNTIME_CATALOG_PROFILES` exposes the fixed identities for comparison, without conferring ownership. Selection requires the exact lowercase 32-byte `:code` hash. A numeric version is insufficient; unknown code is refused. Consumers requiring historical source data must also require `role === 'historical-source'`.

The factory checks all four complete metadata hashes before decoding any schema, requires original V14 SCALE roundtrip, and compares exact keys and complete semantic portable layouts against target131. Comparisons resolve portable IDs and preserve paths, primitive types, tuples, arrays, sequences, compact types, composite field names/type names, enum names/indices/fields, map hashers/key/value types, storage modifiers and fallbacks. Bounds are four own enumerable string inputs, 2 MiB per metadata export, depth 24 and 100,000 resolved type nodes per schema. No SDK registry or mutable codec escapes.

The audited domains are DexManager.DEXInfos(0), DEXAPI.EnabledSourceTypes, TradingPair.LockedLiquiditySources, PoolXYK.Properties(XOR,KUSD), System.Account, Tokens.Accounts(KUSD), XorFee.Multiplier, XSTPool.EnabledSynthetics(XOR), Timestamp.Now, Denomination.Denominator, Assets.AssetInfosV2(KUSD), Assets.AssetInfosV2(XOR), and PoolXYK.Reserves(XOR,KUSD). Account-key comparison uses the explicitly invented account `0x11…11`. Consumers must still derive actual pool accounts from authenticated Properties and verify the complete original storage receipts, including absent entries and complete prefix coverage.

Catalogs and entries are deeply frozen and privately owned. Copies, serialized records and entries from another catalog instance are refused. `catalogSha256` hashes the deterministic constructed identity/layout projection (JSON.stringify followed by SHA-256); metadata hashes bind the original byte strings separately. The digest records provenance, not authority.

The source pins come from `output/go-history/partial-target-window-metadata-20260921/source-schemas/` and the target export from `output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/metadata-131.json`. The independent metadata-only audit in `output/go-history/partial-target-exposure-20260921/runtime-layout-verification.json` found all thirteen layouts and derived keys equal. This says nothing about economic/dispatch equivalence, source values, full interval runtime coverage, canonical finality, profitability, or qualification. Every historical block's genesis, runtime version, `:code` hash and causal state still require authentication upstream. Sparse observed anchors cannot rule out an intraday upgrade or rollback.

The focused unit suite uses these genuine metadata bytes and private SDK instrumentation to test pin failures, swapped epochs, altered derived keys/layouts, missing domains, malformed/accessor inputs, immutable output, unknown code, and copied/cross-instance ownership. It makes no network calls and reads no historical market values.
