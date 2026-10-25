# Purchase swap receipt recovery

Swap receipt observation leaves fresh purchases idle without reading SDK
metadata. Saved drafts and transaction references stay intact and unavailable
while the node or API metadata is initializing. Receipt reads wait for the
captured API's readiness, then recheck the current connection, node state,
purchase, account and mainnet genesis before using it. The existing node-state
watcher resumes observation when connection readiness changes; a replacement
connection or stale completion cannot establish receipt evidence.

The shared Buy XOR / Get TS progress reader verifies the submitted DAI→XOR hash against a canonical finalized SORA block, the current signer, the exact call, and that extrinsic's success/failure, `liquidityProxy.Exchange`, and `xorFee.FeeWithdrawn` events. A wallet balance or saved history status never completes the purchase.

The live MOF node prunes historical state. On 25 September 2026, a read-only check at finalized height 27,773,709 found that `state_getStorage` and Polkadot's decoded `chain_getBlock` for height 27,772,709 both failed with `4003: State already discarded`. The decoded block call also needs historical runtime state. Its canonical hash remained `0x068e3af04c33db0edfe0e4c411f6aa404f041d875471c1f3986e386e3332c36b`.

`getTsSwapArchive.ts` handles only that explicit pruning condition. It reads the same exact block and event storage from the existing approved archive, `https://mof2.sora.org/`, without changing the selected live RPC or signing anything. The live node first proves canonical finality. The archive must return mainnet genesis, the same canonical height/hash, and parent/block runtime versions matching the live registry. The decoded header is checked again, and the existing exact extrinsic/event verifier runs unchanged. Runtime upgrades or mismatches fail closed rather than guessing a SCALE layout. This is validation against chain RPC sources, not an independently verified trie or GRANDPA proof.

HTTP is limited to two small JSON-RPC batches for the one requested block, a 15-second abort, a 4 MiB streamed response bound, no credentials and no redirects. Ordinary network errors, wrong signers, forks and invalid receipts never trigger a general RPC fallback. The archive read-only check returned the matching canonical hash, runtime 131, and retained event bytes for the pruned block above. Production runtime metadata also confirmed the receipt decoder's Exchange output at field 5 and two-field FeeWithdrawn event. The XOR existential deposit was zero; the ordinary output-funded swap fee path remains unchanged.

At 11:40:47 UTC, an archive OPTIONS request with `Origin: https://polkaswap.io`, requested method POST and requested header content-type returned 200 with `access-control-allow-origin: *`, allowed methods `*` and allowed headers `*`. A JSON-RPC POST with the same origin returned 200 `application/json` and allow-origin `*`. These checks cover browser CORS for the credential-free reader; they do not claim a signed transaction was tested.

Within one mounted journey, an already chain-verified terminal receipt is retained in memory so later pruning cannot undo the displayed result. Hash, account, purpose, block locator, connection or network context changes invalidate that cache. Reloaded progress revalidates the receipt through the live/archive path; completion is never persisted as a trusted flag.

Guided swaps now save a reviewed draft before signing, using the SDK's existing caller-supplied history ID (`purchase-swap:<ts|xor>:<UUID>`). The bounded purpose-specific session plan stores that ID, the canonical DAI amount, and a digest binding the mainnet, account and DAI→XOR pair. It contains no raw account or trusted completion status. Signing is blocked if the draft cannot be persisted or an unresolved draft already exists. A restored unsigned or ambiguous draft requires checking history; reload never silently submits again. A definite wallet rejection before a row exists may remove that draft. An explicit retry after a verified failed receipt creates a new reviewed draft.

Only that exact SDK row can provide its eventual signed transaction hash. Notifications for another operation cannot bind the purchase. The progress observer rereads SDK storage on each refresh, so a delayed hash or finalized block locator is found even before Pinia history updates. The app's bundled SDK preserves the **signed** hash for these strict guided IDs if sending fails after signing; ordinary swap retry behavior is unchanged. Such a row remains an error/ambiguous submission, and only the canonical receipt verifier may classify it as received or failed.

Unit coverage exercises state-pruning-only recovery, wrong network/fork/runtime/header, response bounds and duplicate IDs, abort/context changes, exact-event rejection and account/purpose cache invalidation. No test sends a financial transaction or requires a network service.
