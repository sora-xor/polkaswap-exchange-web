# Accumulation completed-hour source

`scripts/bots/accumulation-close-source.ts` performs one bounded prospective read of the explicit completed UTC boundary supplied by its caller. It only reads `https://pi.soramitsu.io/graphql`. The request uses two aliases of the existing `assetSnapshots` query: KUSD and XOR, `type: HOUR`, timestamps in `[boundary − 1 hour, boundary)`, `first: 2`, and the original `closeEvidence` field. The schema comes from `scripts/bots/goal-qualification-history-reader.ts`; the metadata-only `assetHourlyCoverage` query cannot provide the pool evidence this bridge needs.

```ts
const source = createAccumulationCloseSource({
  fetch: registeredFetcher,
  retain: (name, bytes) => durableExclusiveWrite(`source-${name}`, bytes),
  timeoutMs: 15_000,
  retentionTimeoutMs: 5_000,
  signal: operationAbort.signal,
});
const result = await source.collect({ boundaryUtcMs });
if (isAccumulationCloseSourceResult(result)) {
  // Use result.closeRowsJson and result.completedClose in the separately owned bridge input.
}
```

The required injected recorder receives `close-<boundary>-start.json` before any dispatch and `close-<boundary>-outcome.json` before a result is returned. Each UTF-8 JSON document has a final LF; acknowledgment must match its exact SHA-256 and byte count. The caller must implement exclusive durable storage and a trusted registration. The collector cannot establish those facts from an acknowledgment. Recorder failures throw `AccumulationCloseRetentionError`, retaining a captured receipt when one exists. There is no retry, pagination, redirect, endpoint fallback, environment credential loading or implicit global fetch.

The response cap is 65,536 retained bytes. Requests take at most the supplied 1–15,000 ms transport budget; each acknowledgment has its separate 1–15,000 ms bound. An external abort or `close()` cancels this instance's request only. A reader/fetch/cancellation promise that never resolves cannot prevent a failed receipt being returned. Each instance permits at most one attempted request. The caller is responsible for its enclosing operation deadline and exclusive artifact namespace.

Successful parsing requires exactly one KUSD row and one XOR row, no next page, correct asset/hour IDs and the same completed boundary. `parseIndexedPoolHistoryWithEvidence` checks the original mainnet identities, denomination, asset decimals, positive exact pool reserves and matching adjacent closing/successor evidence. Missing, malformed, duplicated, partial, errored, future or oversized observations remain failed receipts. JSON scanning rejects duplicate decoded keys, unsafe or noninteger numeric tokens, malformed UTF-8 and excess depth. No missing data is filled.

`closeRowsJson` constructs only the two asset-key arrays; each row is an exact original response substring, including its original `closeEvidence` and whitespace. The whole original response and request are retained as base64 with hashes, actual wall clocks, monotonic elapsed time, HTTP status, observed/retained byte counts and completion/failure facts. The close publication `availableAtMs` is the original end-of-response wall clock, never its timestamp, a requested boundary or the later durability acknowledgment time. The sealed bridge's conservative successor-second-plus-999 ms publication bound is also enforced. The receipt digest is SHA-256 of the exact retained outcome JSON including LF. Interrupted or regressing clocks are retained rather than corrected.

`status: complete` means that this public-source response contains one semantically valid paired close; it is not independent consensus verification, proof of historical browser arrival, admission or trading authority. The in-process ownership predicate rejects copied JSON and all failed results. The caller must bind source registration separately, obtain native runtime/state evidence and run the sealed bridge, which checks the close against the actual decision and native state. The source should be acquired before the native quote/context stage so this read does not consume their five-second receipt lifetime. This module does not run a model, obtain native quotes, query broad history, sign, transact or alter any live goal.
