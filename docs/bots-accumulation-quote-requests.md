# Prospective native quote request construction

`scripts/bots/accumulation-quote-requests.ts` is an offline request producer. It has no network, schedule, wallet, model, signing or submission operation. It does not grant permission to collect another observation or expand a registered research partition.

Call `createAccumulationQuoteRequests({ identity, blockNumber, denominator, rpcIdStart })` with the original target metadata and independently bound chain/runtime identity. The factory checks the existing supported V14 runtime/call/storage profile using `createHistoricalExecutionPoolCodec` and `createHistoricalGoalFeeCodec`. It does not establish that supplied metadata, height or denominator came from that block. Source authentication remains the collection owner's responsibility.

The returned `contextRequest` is one original `state_queryStorageAt` request for exactly seven keys, ordered timestamp, denominator, KUSD, XOR, DEX0, pool properties and reserves. A retained 22-key response must never be rewritten to look like this request. The caller must actually issue and retain the seven-key request when collecting for the existing accumulation bridge.

`candidates` contains nine fixed, exact input lots of 1 through 9 KUSD. `binding.expectedTokenDecimals: 18` is an assumption of this fixed profile, not verification of the current asset records: the factory has no storage values. The context decoder/bridge must verify actual KUSD and XOR asset precision before any request plan is used as financial evidence. Lots are integer codec amounts; the retained denomination expectation does not divide or rescale KUSD amounts. Every quote uses DEX0, the KUSD→XOR route, `WithDesiredInput`, `XYKPool`, `AllowSelected`, and the same original target hash.

Each descriptor contains `endpoint`, `id`, `method`, `params`, exact UTF-8 `requestBody` and its `requestSha256`. The only endpoint is `https://ws.mof.sora.org/`. The factory reserves 28 IDs: the context ID, followed by quote/info/details IDs for each lot. Choose a starting ID that does not overlap the other original context RPCs. `isAccumulationQuoteRequestDescriptor` recognizes only same-process factory descriptors; serialized copies lose ownership. This checks construction provenance, not transport or source authority.

After recording an original quote receipt, call `feeRequestsForQuote(inputKusd, receipt)`. It requires the exact generated request bytes, endpoint, response ID and original response-byte digest. It rejects ambiguous JSON keys, inexact JSON numbers, invalid amounts/routes, changed request identity and failed transport. A null result returns `unavailable`; ordinary transport/RPC/quote failures return `failed`. Both retain detached original receipt data and produce no fee requests. Malformed non-data objects or unsupported factory inputs throw. No retries or fallback requests are generated.

For an available quote, the method derives the original 0.5% minimum output and two `state_call` descriptors from `createHistoricalGoalFeeCodec.buildBoundSwapEnvelope`: `TransactionPaymentApi_query_info` and `TransactionPaymentApi_query_fee_details`. Both bind the exact amount, original output, target hash, and complete outer-length-prefixed envelope. Over-impact quotes still produce fee requests so the bridge retains all nine outcomes. The bridge, rather than this producer, applies the impact cap and checks the returned payment results.

The envelope uses the existing fake estimation signature, maximum supported nonce/signature encoding and mortal64 policy. It must never be signed or submitted. The bound is an encoding-length bound, not proof of a future fee, paid fee, successful fill or profitability. A caller can fabricate a mutually consistent receipt and digest; this helper does not authenticate acquisition merely by hashing JSON.

All returned inputs, descriptors and outcomes are detached and deeply frozen. Actual HTTP collection must separately enforce a bounded transport, original request/response retention, source and schedule registration, real receipt clocks, no redirects/retries/fallbacks, and storage capacity. The existing bridge additionally requires canonical target/parent/finality/runtime evidence, completed-hour provenance and decision-time freshness. This module supplies none of those missing receipts and does not project browser provider output into historical evidence.

Run the synthetic unit test with:

```sh
node .yarn/releases/yarn-4.10.3.cjs exec vitest run --config vitest.config.mjs --project unit-scripts tests/unit/scripts/bots/accumulation-quote-requests.spec.ts
```

For a standalone caller, use the existing `scripts/bots/tsconfig.accumulation.json` with Node + tsx so the checked SORA library aliases resolve. The tests use invented metadata and amounts only; no model, market observation or network is read.
