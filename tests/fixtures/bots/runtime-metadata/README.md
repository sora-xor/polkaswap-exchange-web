# Offline SORA Nexus metadata fixtures

These four public SCALE exports make the owned runtime catalog unit suite independent of ignored `output/` files and of the current working directory. Each `.scale.gz` file decompresses to the exact retained export bytes. Runtime 131 retains its original compact `Bytes` wrapper; the test removes it with the same `compactStripLength` call used before this fixture move.

Test helpers and suites can import `readRuntimeMetadataExport` from `tests/fixtures/bots/runtime-metadata.ts`. This asynchronous test-only loader resolves the gzip files relative to its own module and returns the original export hex. Sources 128–130 are raw metadata; runtime 131 still includes its compact `Bytes` wrapper. Consumers retain their existing `compactStripLength` or SDK `Bytes` decoding before constructing a catalog:

```ts
const targetExport = await readRuntimeMetadataExport(131);
const target131MetadataHex = u8aToHex(compactStripLength(hexToU8a(targetExport))[1]);
```

The production catalog still verifies the complete metadata SHA-256 before decoding, then verifies all thirteen semantic layouts and derived storage keys. Compression changes no metadata pins, assertions, runtime admission, market evidence, or trading rules. These are metadata-only decoder fixtures; they do not attest canonical finality, historical state, economic equivalence, or profitability. No network request is needed.

Gzip files were generated with `gzip.compress(export_bytes, mtime=0)` from the retained JSON exports listed below. The original evidence files remain in their original locations.

| Runtime | Retained source                                                                                             | Source JSON SHA-256                                                | Decompressed export SHA-256                                        | Catalog metadata SHA-256                                           |
| ------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 128     | `output/go-history/partial-target-window-metadata-20260921/source-schemas/source128-unverified-schema.json` | `8a10874f6ae744269f4627d6c41fe9524e0553a27cc7d6c090807694652a7a12` | `fdc915c28363daeb74b1b0524731ed6cd61163610e021c67d44a20d0fc809fb7` | `fdc915c28363daeb74b1b0524731ed6cd61163610e021c67d44a20d0fc809fb7` |
| 129     | `output/go-history/partial-target-window-metadata-20260921/source-schemas/source129-unverified-schema.json` | `bb3659c8208dcc7f54234c1f105b5689538f0f738feab9b168324bb8363a9064` | `e5298fe292dac733548b53173ae5f29728f65d3eff798298fe5608864308c1f0` | `e5298fe292dac733548b53173ae5f29728f65d3eff798298fe5608864308c1f0` |
| 130     | `output/go-history/partial-target-window-metadata-20260921/source-schemas/source130-unverified-schema.json` | `74a480b6b9918bd01a67a2826e0e9939a0a53ca0c6e29f2a109da906beaf7179` | `726c0dcdc748164be3ed3cc65c149e936e08380ef99c1b3991a0db6c1d7d127b` | `726c0dcdc748164be3ed3cc65c149e936e08380ef99c1b3991a0db6c1d7d127b` |
| 131     | `output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/metadata-131.json`               | `9f95209c7a1bb778113ae703b6f723f49ad8361647de429ee97309b8240a53cf` | `1fec522b58c4d590e800455aaf2af3b2b9a4cf0d193c92fd63905ddc2debd448` | `18aedaf96860e55c96ac6ad1d26f77cb2dc877ea822edf3242fdbe4f58bdd824` |
