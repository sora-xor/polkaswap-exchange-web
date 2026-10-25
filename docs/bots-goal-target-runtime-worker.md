# Terminable target runtime worker

`scripts/bots/goal-target-runtime-worker-client.ts` runs the exact runtime131 read-only host in the fixed `goal-target-runtime-worker.cjs` Node worker. It provides a real wall-clock stop for synchronous WASM, including compilation and initial runtime/metadata checks. It does not change runtime admission, qualification, historical evidence or trading permissions.

```ts
const worker = await createGoalTargetRuntimeWorker({
  compressedBytes: pinnedRuntimeBytes,
  signal: operationSignal,
});
try {
  const result = await worker.invoke(
    { api: 'LiquidityProxyAPI_quote', inputHex: encodedQuote, state: verifiedState },
    { signal: requestSignal, timeoutMs: 10000 }
  );
} finally {
  await worker.dispose();
}
```

The factory copies at most 4 MiB of compressed bytes and checks the fixed runtime SHA-256 **before** starting the worker or decompressing. Shared buffers are rejected. No caller can supply a file path, URL, script, worker constructor, arbitrary runtime, host implementation or limit override. The worker then runs the existing exact code-hash, metadata, version and decompressed-size checks. Its dependencies are fixed local application modules; neither wrapper reads data files or contacts a network.

Quote and fee calls require the actual frozen `GoalTargetRuntimeState` object owned by `createGoalTargetRuntimeStateCodec(...).verify(...)`. A copied, parsed or fabricated object fails before any worker message. Only its bounded `hostState` projection crosses the worker boundary. This preserves the verifier's RPC-attestation boundary; it does not turn state claims into cryptographic storage proofs. Core and metadata calls can omit state. The allowed exports remain `Core_version`, `Metadata_metadata`, `LiquidityProxyAPI_quote`, `TransactionPaymentApi_query_info`, and `TransactionPaymentApi_query_fee_details`; inputs remain limited to 4 KiB. The host's state, memory, call and result limits are unchanged.

`assertGoalTargetRuntimeWorker(value)` checks private factory ownership and the current lifecycle. Copied, fabricated, disposed, failed or cancelled instances fail. Composed quote adapters can check it before and after awaited work; the assertion establishes only that this is the live fixed worker, never a qualification or trading capability.

Readiness defaults to 20 seconds and each invocation to 10 seconds. Both accept explicit integer deadlines from 1 to 30,000 milliseconds. Invocation overrides change only that invocation. The parent thread enforces timers and checks a monotonic absolute deadline before accepting responses, so delayed timer delivery cannot turn a late response into success. A readiness timeout/abort, invocation timeout/abort, worker error, protocol failure or explicit disposal permanently closes the instance and terminates its worker. Successful calls are serial; concurrent calls are rejected rather than queued. Late replies and new work on a closed instance cannot be accepted. The factory's signal remains active for the returned instance's whole lifetime.

`dispose()` is idempotent and awaits the same termination promise; a termination failure is reported with a sanitized error and never reopens the worker. Timeout/abort rejection also waits for termination. Other lifecycle errors reveal only fixed error labels. A normal runtime trap retains the host's bounded diagnostic result, without granting admission. Returned profile and result objects are frozen. Results remain hypothetical quote/fee API outputs with zero storage writes and explicit `historicalFill:false`, `transactionExecution:false`, and `admissionGranted:false`.

The focused worker suite requires the already installed, hash-pinned131 binary. It executes the actual core, metadata, quote and both fee APIs with invented storage and compares full results against the synchronous host. Private test-only VM instrumentation substitutes the fixed worker constructor to exercise protocol failures and clocks, and to run genuinely infinite-loop worker threads. This injection seam is absent from the production API. The tests verify those actual blocked threads terminate on readiness and invocation deadlines; no network, original market data or wallet is used.

Run `yarn test:unit --project unit-scripts tests/unit/scripts/bots/goal-target-runtime-worker.spec.ts`.
