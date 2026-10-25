# Portable offline SORA Nexus runtime fixtures

These files make exact-runtime tests reproducible from a clean checkout. They are test inputs, never application assets or deployment inputs. Tests execute the actual pinned public runtime binaries against invented state, without contacting a node, accessing a live wallet, or submitting a transaction.

Import `runtimeWasmFixturePath(130 | 131)` from `../runtime-artifacts.ts` to resolve a binary independently of the working directory. Runtime 130 is release 4.8.8; runtime 131 is release 4.8.9. `readRuntimeMetadataHex` and its synchronous equivalent read the separately retained metadata fixtures and remove only runtime 131's compact wrapper. `readRuntimeDispatchFixture` and `readRuntimeQuoteFeeFixture` return fresh copies of the invented state and exact-output oracles.

## Binary provenance

The binaries are exact copies of the locally retained public SORA Nexus runtime release artifacts used by the original offline tests. Their Blake2b-256 hashes match the pre-existing production catalog identities in `src/features/bot-trading/execution-codecs/runtime-catalog.ts`; runtime 131's SHA-256 also matches the production target host/model. No executable, metadata, expected output, or admission rule was rebuilt or changed.

| File                                  |     Bytes | SHA-256                                                            | Blake2b-256                                                        |
| ------------------------------------- | --------: | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `runtime-130.compact.compressed.wasm` | 3,037,507 | `0ac7b85d845d56d450df99ab7166014897be57a7a1f66437d92e6949b56f49c0` | `2b33b01ba3f9e58e269b0e9619d25bedf3f60cdd6ed0ec519dacc75259c85d1e` |
| `runtime-131.compact.compressed.wasm` | 3,055,506 | `db948406c5f22d4923b2760019de53bcd0ef756ed05accaf5156ca3041988447` | `f062ed07861255f5ec443930de9c5066d1e4133036126d48462c8e233a75f27e` |

## Invented state and expected outputs

`synthetic-state.json` retains only the 39 `key`/`value` declarations and the development-fixture `extrinsicHex` from `dispatch-130-kusd-xor-success.json` in the original September 21 synthetic episode. Source JSON SHA-256: `aa51c7832e32c6f1cebc0c4b7ea02d194c9d063aeea39782c4c2d60a12889f86`. It contains no private signing material or operator receipts. The extrinsic is an invented offline test vector and is never submitted.

`quote-fee-oracles.json` retains only quote inputs/results and fee inputs/results from the original runtime-131 `kusd-xor` and `xor-kusd` synthetic cases. These expected bytes remain unchanged and are compared against actual runtime execution; the test helper does not compute expected results using the implementation being tested. The full operator archive, market observations, logs, and personal paths are not included.

The retained source JSON hashes for the oracle extraction are:

| Source JSON                          | SHA-256                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `quote-131-kusd-xor.json`            | `2d5772579196690c43d89d2f36a12ae8d7f31eb8b4030b4d17c117f6c4d407e7` |
| `quote-131-xor-kusd.json`            | `f51c569a7380576dbc79b3a3804125f062757c1b4cd98b769ca5d7d2afd73935` |
| `dispatch-131-kusd-xor-success.json` | `7a83e1752beaf6a3947118d497175d27f4913ae2bddfe02a7f8b8793f1e169ed` |
| `dispatch-131-xor-kusd-success.json` | `fa11c7cf908c08cefb33d10374dbeb2cc3b3a6762f86e2534a8ea00af33feff9` |

These fixtures establish decoder and execution conformance for invented inputs. They do not establish market history, canonical finality, profitability, or authorization to trade.
