# Hashi outgoing transfer recovery

SORA-to-Ethereum transfers require a SORA transfer and a separate Ethereum claim.
`ApprovalsReady` confirms the bridge peers signed the claim; it does not mean
the recipient has received funds on Ethereum.

Open an existing transfer from Bridge history, connect its destination Ethereum
account, and select Ethereum Mainnet. The transaction page offers **Change network
in wallet** when required, followed by **Confirm transaction**. Restoring history
and retrying a claim retain the original SORA transaction and bridge request hashes.

The approved request is authoritative for the Ethereum currency, integer amount,
recipient, request hash, and signatures. `signEthBridgeOutgoingEvm` reconciles the
displayed destination amount from that proof before preparing wallet confirmation.
It must not derive a claim amount from a current denomination multiplier or stale
local `amount2`. Asset-ID proofs, including current XOR requests, use the shared
bridge's `receiveBySidechainAssetId`; legacy token-address proofs retain their
appropriate contract route. Mismatched currency, recipient, or request identifiers
are rejected before submission.

`getOutgoingClaimStatus` reads the configured Ethereum chain through the connected
wallet without requesting a signature. It checks `used(requestHash)` on the
configured bridge contracts and compares mined and pending account nonces using
uncached JSON-RPC. An unclaimed request with no pending account transaction can
reach confirmation even when the explorer is unavailable. Consumed or pending
state cannot be overridden by an empty or stale explorer result. Inconclusive
reads fall back to transaction discovery; persistent discovery errors expose Retry
while preserving the original SORA evidence.

Persisted Ethereum submission fingerprints take precedence over this shortcut.
They continue read-only discovery after an ambiguous wallet response. Known
Ethereum transaction hashes are not erased by missing explorer records, and fresh
history searches prefer a successful claim over failed duplicate attempts. The
existing submission lock serializes wallet broadcasts across tabs.

Regression coverage lives in `tests/unit/utils/bridge/eth`,
`tests/unit/lib/substrate/sdk/bridgeProxy/eth`, `tests/unit/stores/bridge/index.spec.ts`,
and the BridgeTransaction page suites. Unit tests mock wallet, chain, and explorer
responses; they never submit financial transactions or depend on network services.
