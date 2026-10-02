# Joining bounded native-fee evidence

`scripts/bots/historical-goal-bound-fee.ts` validates a retained fee receipt and changes only the native fee of an already prepared hypothetical minimum-output fill. It does not query RPC, select an order, change a route, qualify research, or authorize trading. The envelope policy is documented in [Historical goal fee envelopes](bots-historical-goal-fees.md).

```ts
const source = {
  identity, // HistoricalExecutionIdentity: metadata, runtime, genesis and state hash
  blockNumber,
  request, // HistoricalSwapRequest, including the original quotedAmountOutCodec
  quoteEvidence, // original normalized archive-reader projection
};
const validated = prepareHistoricalGoalBoundFeeSource(source);
const result = applyHistoricalGoalBoundFee(preparedJoin, source, receipt);
```

The shared source validator reconstructs the original and bounded envelopes. It checks the original quote's exact input, output, direction, direct DEX 0/XYK route, 0.5% minimum, state hash/height/time, denomination, metadata/runtime binding and original fee details. Its frozen result includes detached identity/request/state, both reconstructed envelopes and the original native fee. A reader can retain this snapshot before asynchronous requests. The source validator checks output/no-impact consistency but does not filter by impact; the 1% admission limit is enforced only when joining an already ready fill.

`receipt` has this exact shape:

```ts
{
  version: 1,
  kind: 'historical-goal-bound-fee-receipt',
  envelope: validated.bound, // complete buildBoundSwapEnvelope result
  feeAssetAddress: XOR,
  queries: {
    info: {
      method: 'state_call',
      params: ['TransactionPaymentApi_query_info', dataHex, stateHash],
      resultHex: rawInfoScale,
    },
    details: {
      method: 'state_call',
      params: ['TransactionPaymentApi_query_fee_details', dataHex, stateHash],
      resultHex: rawDetailsScale,
    },
  },
}
```

Both `dataHex` values must equal the reconstructed `feeQueryDataHex`, and both state hashes must match the archived quote. The entire receipt envelope must equal the reconstructed envelope, including its policy fingerprint, bytes, call, minimum, byte length and hashes. Raw results are decoded again with the stable `RuntimeDispatchInfo` and `FeeDetails` codecs. Their native XOR totals must agree, include an inclusion fee and have zero tip. Missing, malformed or mismatched receipts fail; there is no fallback to the old fee or a cached amount.

For a ready input, every `fill` field except `feeCodec` remains identical. The result retains the same mark, clock, scenario and non-observed/non-submitted labels, replaces `feeEnvelopePolicy`, and adds `feePolicy`, `feePolicySha256`, `feeEvidenceDigest`, `feeEvidenceHashEncoding` and `feeAdequacyVerified: false`. The digest is SHA-256 of canonical UTF-8 JSON with recursively sorted object keys; it binds the codec identity, height, exact original request, prepared result and complete receipt. It is an integrity reference, not authentication.

Recognized `pool-unavailable`, `quote-unavailable` and `impact-limit` inputs return detached frozen evidence unchanged, without reading the supplied source or receipt. They acquire neither a fill nor fee evidence. Accessors, class instances, malformed outcomes and an already converted ready result are rejected.

Upstream code remains responsible for authentic raw RPC receipts, applicable metadata/runtime, canonical finality, pool evidence and causal scheduling. The joined amount estimates the declared bounded envelope at that state; it does not prove actual wallet fees, future fee adequacy or a live fill. Both hypothetical success and fee-only-failure scenarios must use this native estimate once. Pool fees remain included in the original quoted output, and no input resizing or second slippage deduction occurs.

Tests use the shared invented fixture in `tests/unit/scripts/bots/fixtures/historical-goal-bound-fee-fixture.ts`. It contains synthetic metadata, blocks, amounts, reserves and fee responses; no operational market dataset or wallet is read.
