# Pinned historical bounded-fee reader

`scripts/bots/historical-goal-bound-fee-reader.ts` obtains fee evidence for an existing archived quote. It does not discover prices, choose an amount or state, filter opportunities for profitability, connect a wallet, sign, or submit a transaction.

```ts
const result = await readHistoricalGoalBoundFee(source, { signal });
const ready = applyHistoricalGoalBoundFee(prepared, source, result.receipt);
```

`source` is `HistoricalGoalBoundFeeSource`: the original archived quote evidence plus its explicit historical metadata identity, block number and exact request. The shared `prepareHistoricalGoalBoundFeeSource` validator checks and freezes the state, output, route, legacy envelope and fee binding before any asynchronous work. The reader uses that unchanged request to build the separately versioned bounded fee envelope. Canonicality, finality and original RPC provenance remain the upstream archive reader's responsibility; results explicitly report `actualCanonicalFinalityVerifiedHere: false`.

Success performs exactly two sequential HTTP JSON-RPC `state_call` requests to `https://mof2.sora.org/`: `TransactionPaymentApi_query_info` followed by `TransactionPaymentApi_query_fee_details`. Both carry the same bounded envelope plus encoded length and the original state hash. The returned raw SCALE values are decoded with the historical codec and must agree on native XOR fees with zero tip. No fee ceiling or profitability acceptance test runs here. The separate offline join applies the original admission checks and changes only the native fee estimate in a ready fill.

Every read has a deadline covering fetch and streamed body consumption: 20 seconds by default, with an explicit integer override from 1 through 30 seconds. Each response retains at most 64 KiB (128 KiB for the entire two-call operation); a maximum of 65,537 stream reads also bounds empty-chunk streams. Redirects, credentials, retries, fallback endpoints and extra calls are unavailable. The optional injected `fetch` supports offline tests and an upstream global HTTP pacing gate.

The frozen result includes the join-compatible `receipt`, decoded `info`/`details`, original source binding and raw `rpcEvidence`. Each response retains its byte hash, byte counts and completeness flag. Valid UTF-8 is retained as `responseBody`; invalid UTF-8 uses `responseBodyBase64`. For incomplete or oversized bodies, `responseSha256` identifies only the bounded retained prefix; `responseComplete: false` distinguishes it from a complete response. Store these artifacts without printing fee or quote values.

`HistoricalGoalBoundFeeReadError.diagnostic` retains the stage, a bounded reason and immutable partial RPC evidence. A transport error stops immediately. External cancellation and timeouts cover uncooperative fetch/body promises; late responses are canceled and cannot mutate the returned diagnostic. Invalid inputs fail before transport. A fee decode mismatch retains both complete raw responses. The reader logs nothing and provides no strategy qualification or live fee adequacy claim.

The focused unit suite uses invented metadata and fee values with mocked fetch. It covers unchanged forward/reverse calls, offline join compatibility, mutation resistance, bad JSON-RPC/status/redirect responses, partial and oversized bodies, UTF-8, empty chunks, deadlines, aborts and late completion. No network or market dataset is used.
