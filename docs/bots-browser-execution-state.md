# Browser finalized-state reader

`src/features/bot-trading/execution-state.ts` is a read-only primitive for estimates at one finalized state. It does not activate trading, authorize funds, select an endpoint, inspect a wallet, sign with an account, or submit an extrinsic. Route admission and available balances remain the caller's responsibility.

## API

Create one provider for a connected SDK adapter:

```ts
const provider = createExecutionStateProvider({
  request: adapter.request,
  connection: () => ({ identity: connectionEpoch, connected: isConnected }),
  now: () => Date.now(),
});
const context = await provider.capture({ expectedDenominator }, signal);
const estimate = await provider.quote(
  context,
  {
    assetIn: kusdAddress,
    assetOut: xorAddress,
    amountInCodec: exactInputCodec,
  },
  signal
);
provider.assertCurrent(context); // Also recheck after serializing a prepared estimate.
```

`identity` is an opaque, stable object unique to a connection epoch. Replace it whenever the underlying connection changes or reconnects. It is kept privately and never appears in returned records. Only a context returned by this provider is accepted; copied, restored and cross-provider contexts are rejected. A caller must still recheck its wallet, account, network and final intent separately before any future execution integration.

`capture` uses at most eight raw JSON RPC requests. It reads the genesis and finalized head, then the selected header, post-state runtime version, metadata and runtime `:code` hash. It verifies the canonical hash at the returned height and queries exactly seven metadata-derived keys in one `state_queryStorageAt` call: timestamp, denomination, KUSD metadata, XOR metadata, DEX 0 metadata, direct pool properties and direct pool reserves. Every state request is pinned to the same hash. Returned storage key order, identities, 18-decimal precision, direct-pool structure and caller-supplied denomination must agree. A missing reserve value remains missing rather than becoming a storage default.

The context contains the immutable pool observation, metadata/runtime/code binding and the connected node's canonical-finalized attestation. This is an RPC attestation, not an independently verified storage proof. Its block timestamp is separate from the operation's `checkedAtMs` and successful `receivedAtMs`. Cached reserve ratios describe valuation observations; they do not imply executable prices or fills.

`quote` accepts a positive exact u128 amount in codec units for KUSD→XOR or XOR→KUSD. It requests DEX 0, `XYKPool`, `AllowSelected`, and desired input at the captured hash. It preserves raw decimal `amount_without_impact`, checks route and native XOR pool-fee denomination, and uses an integer-floor 0.5% minimum. It does not reject an estimate merely for exceeding an impact or profitability limit; later admission must perform those checks.

For an available quote it makes two same-state runtime calls for `query_info` and `query_fee_details`. Both use the portable bounded estimation envelope: native XOR, zero tip, mortal period 64, maximum u32 nonce and longest supported signature encoding. Exact SCALE fee details, including the explicit tip, must match query-info. This placeholder envelope has no signing authority. Its fee remains an estimate, with `feeAdequacyVerified: false`; it does not establish account eligibility, actual fill, or final execution fee. Raw quote/info/details and the encoded envelope remain in the returned immutable estimate for later binding. Native network fees are reported separately from pool fees already represented in quote output.

`estimateEnvelopeFee(context, { assetIn, assetOut, amountInCodec, quotedAmountOutCodec, envelopeHex }, signal)` checks a supplied serialized envelope against the exact reviewed call. It requires zero tip, mortal64, a supported signature layout, a u32 nonce and a byte length within the estimation bound. `quotedAmountOutCodec` is the original reviewed output used to derive the signed 0.5% minimum; it must not be replaced with a newer quote. The two runtime calls use the supplied bytes plus their actual complete SCALE byte length, at the context's hash. Shorter supported envelopes are not padded or replaced with the maximum-length placeholder.

The returned immutable estimate retains both raw fee results, the inspected bytes, exact request and structural inspection. It does not verify cryptographic signatures, signer authority, nonce freshness, mortality checkpoint or account-specific fee eligibility. Those checks, a fresh executable quote, fee-ceiling comparison, admission and final receipts remain the live executor's responsibility. This method exposes no send capability and does not turn a supplied envelope into permission to trade.

## Bounds and failures

`EXECUTION_STATE_POLICY` is part of every context. Capture, quote and envelope-fee estimation each have a five-second deadline covering their complete operation, including all awaits. A context must be strictly younger than five seconds at each estimate's start and successful completion. All operations and the synchronous recheck reject finalized blocks older than 60 seconds and any future block timestamp; there is no inferred clock-skew allowance. `assertCurrent` synchronously rechecks ownership, connection and both age limits without RPC. Both estimate methods also recheck after copying and freezing the final result, so serialization time cannot silently extend their validity. RPC limits are eight for capture, three for a quote and two for a supplied envelope's fees.

An abort, changed/disconnected epoch, timeout or stale context retires the operation. The provider stops waiting and ignores late results even if the adapter ignores cancellation. It never disconnects the shared socket, retries a call, changes amount/state/source, or supplies a fallback. Parsing accepts only bounded plain own-data JSON; accessors, sparse arrays, unsupported prototypes and oversized results fail closed. The primitive bounds parsed response characters and structure, not transport bytes already received by the SDK.

A null quote and an absent, missing-reserve or zero-reserve pool produce an explicit unavailable result and no fee queries. Malformed evidence, RPC failure or inconsistent fees produce `ExecutionStateError` with a bounded reason, never an arbitrary provider error message. No unavailable result is a trading approval. Nothing here claims profit, risk qualification or transaction submission.

The unit suite uses invented metadata/storage and mocked RPCs only. It covers successful forward/reverse lots, immutable evidence, exact fee/minimum amounts, unavailable pools, conflicting state evidence, connection changes, strict freshness boundaries, ignored cancellation, response bounds and hostile descriptors.
