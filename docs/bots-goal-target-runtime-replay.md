# Offline target estimate replay

`scripts/bots/goal-target-runtime-replay.ts` verifies a retained target-runtime quote acquisition by reconstructing its storage evidence and rerunning the actual pinned runtime131 quote and fee APIs. It performs no network or data-file reads, signing, funding or transaction execution, and issues no qualification capability.

```ts
const recomputed = await replayGoalTargetRuntimeEstimate({
  compressedBytes: exactPinnedRuntimeBytes,
  sourceBlock: authenticatedSourceBlock,
  sourceMetadataHex: originalSource130Metadata,
  receipts: originalStorageRpcReceipts,
  estimate: retainedCompleteEstimate,
  signal: operationSignal,
  timeoutMs: 20000,
});
```

The input is an exact plain data object; only `signal` and `timeoutMs` are optional. There are no caller-supplied worker paths, filesystem paths, transport, decoder or API-result hooks. The helper snapshots the source block, original receipts and complete saved estimate before its first await. It validates the saved request's exact native KUSD/XOR pair, positive canonical u128 input amount, DEX0, XYK source, selected-source filter and 50-basis-point slippage. Success and route-unavailable artifacts have separate exact outer schemas. Other saved fields supply no authority: they must equal the independently recomputed result.

The source metadata bytes must match the fixed130 metadata SHA. The actual fixed worker checks/copies the compressed131 binary before heavy work, verifies its runtime and metadata, and supplies its own target metadata bytes. `createGoalTargetRuntimeStateCodec` then rechecks both metadata pins/layouts and **every original storage envelope**, including request/response identities and body hashes, explicit absent values, point coverage, ordered prefix pages, trailing empty page and genuine global successor. This produces new owned state; no serialized ownership flag or normalized state projection is accepted.

The async quote adapter executes that owned state through the terminable worker. The helper compares both SHA-256 and exact bytes of sorted-key canonical JSON for the **entire** recomputed and retained estimate. Object property ordering is insignificant; raw request/response strings, arrays and API traces remain byte/order-sensitive. The comparison includes the original evidence digest, source block/profile, state and receipt digests, target profile, request, quote, pool fee, both raw fee API results, fake fee envelope, host traces and every false authority flag. Recalculating a saved digest after tampering does not make it valid. A real unavailable route is replayed as unavailable with its actual quote API receipt and no fabricated fee calls. Runtime traps or malformed evidence fail rather than become an unavailable-route success.

Original acquisition timestamps remain in the receipt digest. They are not replaced with the time of replay. The helper does not authenticate the caller's chosen block, network/finality evidence, acquisition timestamps, or immutable outer study/file envelope. The enclosing causal source must pin those originals and establish genesis, runtime and block identity before using the result. Reverification proves exact consistency with the supplied RPC claims and pinned hypothetical execution model; it is not a storage proof, historical fill, performance claim or admission to trade.

One monotonic deadline covers snapshots, worker readiness, metadata/state verification, quote/fee execution, whole-result comparison and final cleanup. It defaults to 20 seconds and accepts 1–30,000 milliseconds. Each worker stage receives only the remaining budget. Cancellation propagates to the worker; its disposal runs in `finally`, and the helper checks cancellation/deadline again after termination before returning. Synchronous parsing is bounded by fixed metadata pins, 16 MiB per detached JSON value, depth24, 200,000 nodes, 4,096 array elements and 128 fields per object; the state codec imposes its own tighter receipt/storage limits. These are offline processing bounds, not modeled market-arrival times.

The tests use only installed pinned runtime/metadata plus invented storage. They exercise both native quote directions, genuine route unavailability, exact full re-execution, preserved raw times, caller mutation, malformed receipts, re-sealed estimate tampering, input/accessor bounds, cancellation and delayed-timer checks through final cleanup. Run `yarn test:unit --project unit-scripts tests/unit/scripts/bots/goal-target-runtime-replay.spec.ts`.
