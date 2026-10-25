# Offline target-runtime quote adapter

`scripts/bots/goal-target-runtime-quote.ts` composes the [pinned read-only host](bots-goal-target-runtime-host.md) with an owned `GoalTargetRuntimeState` and the existing execution/maximum-envelope fee codecs. It performs no acquisition, wallet access, cryptographic signing, transaction submission, or qualification.

```ts
const adapter = await createGoalTargetRuntimeAsyncQuoteAdapter({
  compressedBytes: exactCompressedRuntimeBytes,
  signal: operationSignal,
  readinessTimeoutMs: 20000,
  invocationTimeoutMs: 10000,
});
try {
  const estimate = await adapter.quote({
    state: verifiedState,
    assetIn: KUSD,
    assetOut: XOR,
    amountInCodec: '2500000000000000000',
  }, { signal: requestSignal, timeoutMs: 10000 });
} finally {
  await adapter.dispose();
}
```

`state` must be the actual owned result of `createGoalTargetRuntimeStateCodec(...).verify(...)`; a serialized copy must be verified again. Requests use exact own data fields, one native KUSD/XOR direction, and a positive canonical decimal `u128` string. The adapter snapshots those fields, supports partial amounts, and does not infer a funded allocation, resize a request, or set strategy lots.

The adapter uses the existing API-v3 SDK types to encode DEX0, desired input, `XYKPool`, and `AllowSelected`. It decodes the entire SCALE result and requires the exact two-asset route, one native XOR fee, no rewards, positive output, and output no greater than the value without price impact. The minimum is exactly `floor(output × 9950 / 10000)` and must remain positive. A valid `None` result returns `kind: 'target-runtime-route-unavailable'` and makes no fee calls. Traps, malformed results and unsupported output shapes fail; they are not mislabeled as an unavailable route.

For a usable quote, the existing bounded fee codec builds a structurally checked, fake-placeholder ECDSA envelope with the maximum `u32` nonce, mortal64 era, zero tip, and exact call/minimum. The complete envelope must be at most 215 bytes. Both target-runtime fee APIs receive the identical envelope and encoded length. Existing decoders require complete SCALE bytes, inclusion fees, zero tip, and agreement between `query_info.partialFee` and `query_fee_details`. No fee floor, inflation, actual payer, valid signature, fresh nonce, or inclusion claim is added.

Every result separates `source.runtimeProfile` (130) and its block/state/receipt hashes from `target.profile` (the exact pinned131 code, metadata and compressed binary). The envelope's source block hash/height is only an explicitly labeled decoding/era context for the hypothetical target codec. It does not relabel that historical block as runtime 131. Successful results retain all three API inputs, complete outputs in their host receipts, the quote, envelope, decoded fees, and a digest of the complete result body. Returned data is frozen. `GoalTargetRuntimeQuoteError` retains completed raw API receipts and the failed stage without logging their contents.

Fee basis is expressly `target131-api-over-source130-multiplier`: the target implementation executes against the original declared multiplier. That is a hypothetical historical-state API result, not an observed runtime131 fee at that historical block or a ceiling on future fees. Any conservative economic policy is a separate preregistered contract. Source runtime/genesis/denomination/finality authentication remains upstream of the storage verifier. No result grants admission or asserts economic eligibility.

Production orchestration uses `createGoalTargetRuntimeAsyncQuoteAdapter`. It creates the fixed worker internally and requires its private ownership/current-lifecycle assertion before and after asynchronous calls. The caller cannot inject a host, worker, or API function. Factory options match the worker client; readiness defaults to 20 seconds. `quote` accepts a per-call signal and one timeout spanning input preparation, quote, fee-info, fee-details, and local decoding. The default quote timeout is the factory's `invocationTimeoutMs` (10 seconds if absent); each bound is 1–30,000 ms. Subsequent API calls receive only the remaining original budget. Overlapping quotes reject without cancelling the first operation. Parent/call abort, timeout, invalid evidence, and explicit disposal close the owned worker; no interrupted estimate is returned. `dispose()` waits for thread termination. Received API receipts are retained before the post-await cancellation check. Cancellation errors distinguish `cancelled`, `timeout`, and `worker-unavailable` from malformed evidence.

The synchronous `createGoalTargetRuntimeQuoteAdapter(bytes)` remains available for offline tools. Its private quote program and receipt parsers are shared with the async driver, so the two paths produce identical evidence. Do not call the synchronous adapter in a production main thread. Neither path changes historical economic qualification, release pins, or live wallet guards.

Focused tests use the already retained invented state and exact local runtime131 binary. They exercise both directions at full and partial amounts, genuine unavailable routes, exact input/minimum/envelope binding, request mutation, forged state ownership, invalid amounts, and malformed/contradictory quote/fee outputs. Actual worker tests compare the complete synchronous and asynchronous evidence for both directions, prove no synchronous main-thread host call occurs, cover in-flight cancellation/disposal, and verify decreasing per-API remaining deadlines. Run `yarn test:unit --project unit-scripts tests/unit/scripts/bots/goal-target-runtime-quote.spec.ts`. There are no network or market reads.
