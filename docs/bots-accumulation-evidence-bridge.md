# Offline native evidence bridge

`scripts/bots/accumulation-evidence-bridge.ts` reconstructs one complete nine-size KUSD→XOR decision packet. It makes no network calls, invokes no policy, opens no market dataset, and has no wallet or transaction interface. Its new synthetic fixture uses invented storage and metadata with the existing real SCALE codecs.

Call `verifyAccumulationDecisionPacket(rawPacket, trustedSource)` from the trusted evidence owner. `trustedSource` must come from the separately registered immutable acquisition manifest and retain the expected packet digest, source registration, approved endpoint, canonical finalized anchor, runtime/code/metadata pins and denominator. **Do not derive these expected pins from claims inside the packet being checked.** The unkeyed source receipts and local hashes establish internal reconstruction under that trusted RPC source, not independent consensus or cryptographic proof that an operator acquired the bytes from the claimed server.

The raw packet has `block`, `contextReceivedAtMs`, `decisionAtMs`, `contextRpc`, `closeRowsJson` and exactly nine `candidates` in order 1–9. Each candidate contains `inputKusd`, `quoteReceivedAtMs`, `feeReceivedAtMs`, `expiresAtMs` and its original raw `rpc` receipts. Each receipt preserves endpoint, exact request/response bodies, response SHA-256, request/completion times, HTTP status and failure. The transport times describe the retained acquisition; separately supplied historical arrival fields must come from actual observed arrivals or a predeclared timing model. This verifier cannot prove historical browser receipt times.

## What is reconstructed

The common transcript binds genesis, the registered finalized anchor, the observed finalized head, canonical current/parent headers, equal parent/current runtime and metadata, pinned runtime code, and all seven same-state storage values. `createHistoricalExecutionPoolCodec` decodes token identities/decimals, denominator, DEX and pool state. The exact native KUSD-per-XOR ratio is derived from decoded reserves, never a claimed price or KUSD/USD peg.

Each size transcript must request the exact integer input at that same native block, direct DEX0 `XYKPool` / `AllowSelected`. The bridge derives the original 0.5% minimum, reconstructs the supported mortal64 maximal-length fee envelope, requires both exact `TransactionPaymentApi_query_info` and `query_fee_details` calls on that envelope/state, and checks the real SCALE fee decodes agree. Pool fees already affect quote output. The fee is an **estimate**, never an actual paid fee. The resulting impact is an exact reduced ratio from quote output and output-without-impact.

Successful quotes exceeding 1% impact retain their authenticated fees and receive `rejected-impact`; they still reach the frozen policy for its own rejection. An explicit native null route is `unavailable` with no invented quote or zero fee. Transport errors, JSON-RPC errors, malformed data, missing required evidence and extra/unconsumed requests are failures. The complete nine-size result remains incomplete whenever any candidate fails; favorable survivors cannot trigger a policy call. Full detached raw evidence remains in the result or `AccumulationEvidenceError` for durable retention.

## Completed close and independent clocks

A runnable result also requires a separately trusted `completedClose` binding: `timestampMs`, `availableAtMs`, `rawRowsSha256` and `sourceReceiptSha256`. The expected raw rows digest/publication provenance must come from the trusted indexed-history evidence owner, not a hash supplied by the packet. `closeRowsJson` maps the canonical KUSD and XOR asset IDs to their original indexed rows. The existing `parseIndexedPoolHistoryWithEvidence` derives the price and requires matching same-hour closing/successor evidence for both assets. The bridge checks the boundary against the actual decision hour, publication after the successor's second-resolution upper bound, and compatibility with the native decision block. Without this external provenance binding, the result is incomplete and cannot obtain runnable ownership. This is indexed evidence under a trusted source, not an independent native storage proof for every historical closing block.

The completed close seeds forecasting; current pool reserves value present holdings. They remain separate values. Original context receipt age and original quote receipt age must each be strictly below five seconds at decision time. The finalized block may be at most 60 seconds old. Fee receipt must follow quote receipt and precede/equal the actual decision, but **never refreshes** either clock. Expiry is exclusive. These checks do not select delays or convert current acquisition wall time into historical availability.

## Runner handoff

The output `packet` contains the canonical fields agreed with the separate Python runner: `status`, `packetSha256`, `genesisHash`, `denominator`, native `block`, original context/decision times, exact `currentPrice`, `latestCompletedClose` and nine candidate records. Money uses unsigned codec strings; prices and impact use reduced `{numerator, denominator}` strings. Every quote carries both original quote and fee receipt times.

`isVerifiedAccumulationDecisionPacket(result)` accepts only a successfully verified object owned by this module in the same process. JSON serialization, a matching claimed hash, or a cloned object does not retain that ownership. Only the trusted parent may combine it with an independently reconstructed untouched episode journal and invoke the frozen Python policy. This bridge does not authenticate the journal's portfolio/peak or load a model. The Python child validates structural math inputs; it does not gain raw-RPC provenance from JSON alone.

All results explicitly retain `independentConsensusVerified:false`, `historicalBrowserArrivalVerified:false`, and `actualPaidFeeVerified:false`. A verified packet is neither a fill nor a qualification. Collection, timing registration, the live approval path and later execution/failure-fee semantics remain separate. Earlier sealed sources and their one-quote-per-check contracts are unchanged.

Run synthetic verification with:

```sh
yarn vitest run --project unit-scripts tests/unit/scripts/bots/accumulation-evidence-bridge.spec.ts
```

The suite also passes actual verifier projections to a bounded test-only Python harness with separately pinned, invented model bytes and an invented untouched journal. It checks native-null unavailability, whole-packet failure without a policy call, and over-impact quote retention. The production runner CLI gains no model override. Raw JSON rejects duplicate decoded keys, fractional/exponent numeric tokens and unsafe integer tokens before normal parsing.
