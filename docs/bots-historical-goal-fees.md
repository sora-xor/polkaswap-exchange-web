# Historical goal fee envelopes

`scripts/bots/historical-goal-fee-codec.ts` is an offline codec for a separately versioned fee-estimation policy. It does not replace the existing nonce-zero/immortal historical codec, change live trading, qualify research, contact a wallet, or submit a transaction.

```ts
const codec = createHistoricalGoalFeeCodec(identity);
const bound = codec.buildBoundSwapEnvelope(
  { assetIn, assetOut, amountInCodec, quotedAmountOutCodec },
  { blockNumber }
);
```

`identity` has the same exact fields as `createHistoricalExecutionCodec`: genesis hash, state block hash, metadata bytes and runtime version. The caller must verify that the supplied block height and hash identify the same canonical finalized state, and that the metadata/runtime are applicable to it. The codec composes the existing metadata, signed-extension and direct KUSD/XOR call checks. It never obtains current metadata or selects another route.

The fixed policy is `native-xor-mortal64-u32-multisignature-length-v1`:

- Extrinsic v4, an untagged 32-byte AccountId, native XOR fees, zero tip and `ChargeTransactionPayment`.
- DEX 0, direct KUSD/XOR in either direction, XYK only, `AllowSelected`, exact input, and the existing 0.5% minimum rounded down in integer units.
- Mortal era with period 64. The hypothetical checkpoint is the supplied state block; its phase comes from the supplied height.
- Nonce range 0 through 4,294,967,295, encoded as `Compact<u32>`.
- Allowed live-SDK signature layouts: Ed25519, Sr25519 and Ecdsa. Runtime metadata also declares Eth; its exact declaration is checked, but Eth envelopes are outside this policy because the current SDK does not support that variant.

The bound encodes an actual SCALE envelope using a public placeholder account, Ecdsa's 65-byte placeholder signature plus its discriminant, the maximum u32 nonce, mortal64 and tip zero. No cryptographic signature is produced. The full encoded length includes the outer compact length prefix. Nonce widths are measured at 1/2/4/5 bytes; the selected signature occupies 66 bytes, the account 32 bytes and the mortal era 2 bytes. No fee surcharge or byte-count delta is guessed.

`policySha256` hashes the UTF-8 `JSON.stringify` representation of the exported immutable policy. The result also retains the metadata hash, runtime/genesis/state identity, exact call and minimum, envelope hash, encoded length, and hypothetical checkpoint/payload. `feeQueryDataHex` is the entire encoded extrinsic followed by the SCALE u32 encoded length, suitable for both transaction-payment runtime fee queries. A separate reader must call `TransactionPaymentApi_query_info` and `TransactionPaymentApi_query_fee_details` at the retained state hash and validate their agreement with `assertHistoricalFeeDetailsMatchesQueryInfo`. Native fees enter the ledger once; pool fees are already included in the quoted output.

```ts
const inspection = codec.inspectSwapEnvelope(request, { blockNumber }, envelopeHex);
// inspection.kind === 'structural-length-compatible'
```

The inspection checks the exact call, allowed signature encoding, nonce range, zero tip, mortal64 and actual length against the bound. It rejects unsupported signatures, malformed/trailing bytes and different calls. Different AccountId32 values and mortal64 phases are allowed because they do not increase encoding length. Its reported identity is the decoding context; an extrinsic does not contain its signing checkpoint hash or runtime version. The inspection does not verify the signature, signer authority, nonce freshness, checkpoint, canonicality or fee adequacy.

A future live integration must check the exact returned signed bytes and fee details at a fresh pinned state before broadcast, enforce the reserved fee ceiling and goal admission, and settle only finalized fee events. Length compatibility alone does not guarantee a fee amount or future fee multiplier. Existing historical fee receipts cannot be relabelled as this policy: research using it needs newly bound fee evidence and qualification.

The focused synthetic tests exercise both supported runtime profiles, exact amounts, nonce boundaries, all allowed signature widths, mortality, malformed metadata/envelopes and immutable evidence. They contain invented metadata and amounts and perform no RPC or wallet calls.
