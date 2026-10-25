# Connected execution-state sessions

`src/features/agent-trading/goal-execution-session.ts` composes the restricted public SDK raw adapter and the browser finalized-state provider. It exposes only `capture`, `quote`, `estimateEnvelopeFee`, `assertCurrent`, and `dispose`. It does not expose a new public agent API, prepare an executable intent, read a wallet, sign, or submit.

Create a session around the exact current SDK client:

```ts
const client = walletApi.api;
const session = createGoalExecutionSession({
  client,
  isCurrent: () => walletApi.api === client && applicationContextStillMatches(),
  now: () => Date.now(),
});
try {
  const context = await session.capture({ expectedDenominator });
  const estimate = await session.quote(context, { assetIn, assetOut, amountInCodec });
  session.assertCurrent(context);
  // An estimate is read-only evidence, not an instruction or authority to trade.
} finally {
  session.dispose();
}
```

The caller guard must compare the current SDK client with the captured client and include any additional application context it owns. The session also captures the public runtime-version object and its full SCALE bytes, the runtime-metadata object, and genesis hash. Metadata is compared by object identity; it is not repeatedly serialized. These checks run before and after raw reads and public operations. Any observed mismatch permanently revokes the session, even if the caller later restores the old values.

The session accepts the installed `ApiPromise` public type directly. Its RPC surface is treated as unknown at this boundary because bare SDK declarations omit SORA's custom methods. `createGoalRpc` validates and captures all required public `.raw` methods before the session is returned; missing methods fail construction and remove its listeners.

The session listens only to public `connected` and `disconnected` events. Either event permanently revokes it and aborts local pending waits. Thus a disconnect followed by reconnect cannot restore authority merely because the SDK object and visible connected flag are unchanged when a response arrives. A new session is required after reconnect. Public SDK event/getter behavior is defined in the installed `@polkadot/api/base/Events` and `Getters` implementations.

`dispose()` is idempotent, aborts local waits, and unregisters only the two handlers owned by this session. It never disconnects the shared socket or removes another component's listeners. The underlying SDK request may continue after local cancellation; its late response is discarded. A caller's individual abort signal cancels only that operation. Failure to remove a listener in a broken SDK cannot restore a revoked session.

Finalized-state ownership, freshness, quote validation, structural envelope inspection, two pinned native-fee queries, and operation deadlines remain the provider's responsibility. An envelope fee estimate is not signature verification, account authorization, a guaranteed fee, or evidence of execution. No executable preparation or legacy `goal-episodes-v2` behavior is changed here.

Synthetic integration tests compose the actual raw adapter and provider with invented metadata/storage. They cover successful capture/quote/envelope estimates, runtime/client changes before and during reads, reconnect ABA, disposal, cancellation, freshness, listener isolation, and construction cleanup. They perform no network or wallet operations.
