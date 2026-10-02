# Goal transaction signing

The goal-only production signer in `src/features/bot-trading/live.ts` lazily loads
`goal-signing.ts`. Legacy bot signing keeps its existing SDK path and return
shape. The goal adapter also returns the original signed extrinsic; it does not
broadcast, change the shared SDK signer, or persist a key.

The adapter passes a private per-request `Signer` to the SDK's
`signAsync(account, { nonce, era: 64, signer })`. This makes both the internal
cloned key and an existing external wallet sign the actual `SignerPayloadJSON`
selected by the SDK, including its checkpoint block hash and number. Sampling a
block before `signAsync` is insufficient: the SDK may select a different header.
An internal clone signs the captured `ExtrinsicPayload`; an external wallet
receives a detached JSON copy, or the SDK-identical raw payload for a raw-only
signer. Call replacement and returned signed-transaction replacement are disabled.

`goal-mortality.ts` validates the captured payload against an independently
constructed supported SORA metadata registry. It checks the account, genesis,
call, runtime, native zero-tip extensions, u32 nonce, and exact 64-block mortal
era. The captured checkpoint must equal that era's birth block. Getters,
unknown fields, unsupported fee extensions, and a second callback are rejected
before requesting a signature. The production adapter checks its private
session, client, runtime, metadata and genesis again before exposing the payload
to the signer.

After signing, the module decodes the exact returned bytes and compares account,
call, era, nonce and tip. It then verifies the signature against the captured
payload, using the exact MultiSignature variant and the SDK's rule to hash
payloads longer than 256 bytes. This cryptographic check matters because the
checkpoint hash is signed additional data and is absent from the serialized
extrinsic. An era with the same phase in another cycle is not equivalent.

`readGoalSignedMortality(signed)` returns a frozen, privately owned fact for the
same returned object and exact current bytes, or `undefined`. The fact includes
checkpoint hash/height, birth/death, actual nonce, account, network, call, payload
SHA-256, transaction hash and signed-envelope digest. Copies of the object cannot
acquire this capability. Invalid returned signatures and signatures that arrive
after Stop still return to the executor as facts to retain; invalid signatures
receive no mortality evidence. Signing never resumes merely to recover an order.

`exportGoalPersistedSigning(signed)` exports only an owned verified capture. The
live executor persists its actual payload, signed envelope and supported signing
metadata with the order, including when Stop wins the signing await. Metadata is
bounded and divided into 60,000-character chunks to fit the existing storage
limits. No private key or password is included. `goal-signing-record.ts` performs
lightweight bounded parsing; parsing alone grants no authority.

After reload, `verifyGoalPersistedSigning` reconstructs the independent registry
and repeats signature/envelope verification. The canonical checkpoint and complete
signed lifetime are then verified by `goal-expiry.ts` before atomic recovery.
The signing fact's `checkpointCanonicality` remains `not-yet-checked`: signature
verification alone cannot prove expiry or non-inclusion. Older records without
this actual capture cannot infer lifetime from `signedAtBlock`.

The focused offline suites use invented metadata and disposable test keys, and
exercise actual SDK encoding and ed25519, sr25519 and ECDSA verification. They
cover changed checkpoint, envelope, signature, long payload hashing, external and
internal paths, production dispatch, Stop, and runtime/client changes during the
nonce read. No test connects to a wallet, RPC provider or market service.
