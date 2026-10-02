# Offline native accumulation marks

`verifyAccumulationNativeMark(raw, trustedSource, registeredSlot)` reconstructs one KUSD-per-XOR mark from the seven raw storage values at one pinned canonical native state. It returns a detached, deeply frozen result recognized only by `isVerifiedAccumulationNativeMark` in the same process. A copied JSON result has no such ownership. There is no network, policy invocation, quote request, wallet operation or transaction in this module.

The source and slot arguments must come from the independently registered evidence owner, not fields extracted from the raw evidence. An unkeyed digest checks byte consistency, not server authenticity. This verifier relies on the owner's trusted RPC acquisition, finality anchors and timing registration. It does not verify consensus, browser arrival history, risk-state selection, complete schedule coverage, paid fees, fills or strategy qualification. The corresponding result flags remain false. The source permits only `https://ws.mof.sora.org/`; the historical block reader is not imported or invoked.

## Inputs and bindings

Raw evidence has exactly `kind: 'accumulation-native-mark-evidence-v1'`, `target: {hash,height}`, `contextRpc`, and `boundaryRpc`. The latter is null for risk and an original receipt transcript for opening/terminal. Each receipt has exactly `endpoint`, `requestBody`, `responseBody`, `responseSha256`, `requestedAtMs`, `completedAtMs`, `httpStatus`, and `failure`, using the existing `AccumulationRpcReceipt` structure. Original response bytes and clocks are retained, including in semantic failure errors.

The trusted source has `rawSha256`, `sourceRegistrationSha256`, `endpoint`, `finalizedSource: {hash,height}`, `boundaryFinalizedSource: null | {hash,height}`, `runtime: {specVersion,transactionVersion,metadataSha256,codeHash}`, and `denominator`. `rawSha256` is `accumulationNativeMarkDigest(raw)`: sorted compact JSON of the bounded data-only snapshot. Finality anchors for original context and later boundary proof are separate; an observed opening must not borrow a successor's later finality receipt as if it were available before opening.

The registered slot has `episodeId`, `slotId`, `role: 'opening'|'risk'|'terminal'`, `openingAtMs`, `deadlineMs`, `controlAtMs`, and `timing`. Opening is exactly on a UTC hour; the original deadline is opening plus 24 hours. Opening/terminal control equals opening/deadline; a risk control lies strictly between them. `timing` contains:

- `mode: 'observed-receipts'|'historical-modeled'` and a separately retained `registrationSha256`.
- `scenarioId`, null for observed receipts and an explicit bounded identifier for a registered historical timing assumption.
- `contextReceivedAtMs`, the original valuation receipt, and `boundaryConfirmedAtMs`, a separate later confirmation or null for risk.
- `receiptBindingSha256 = accumulationNativeMarkDigest({contextRpc, boundaryRpc})`, expected independently by the owner.

In observed mode, original receipt time equals the last context transport completion. Boundary confirmation equals the last boundary transport completion. In modeled mode, historical receipt and confirmation times are explicitly registered assumptions; the raw acquisition wall times stay unchanged and are never used as historical arrival. Merely setting these fields does not authenticate a source or timing registration.

## Exact transcripts

The context transcript has 16 calls in this order:

1. `chain_getBlockHash([0])` equals the fixed SORA genesis.
2. `chain_getBlockHash([finalizedSource.height])` equals its independent hash.
3. `chain_getFinalizedHead([])` then `chain_getHeader([returnedHash])`, with observed finalized height at least the registered anchor.
4. `chain_getHeader([finalizedSource.hash])` at the expected height.
5. `chain_getBlockHash([target.height])` then `chain_getHeader([target.hash])`.
6. `chain_getBlockHash([target.height-1])` then `chain_getHeader([parentHash])`, matching the target's parent and predecessor height.
7. For target, then parent: `state_getRuntimeVersion`, `state_getMetadata`, `state_getStorageHash(['0x3a636f6465', hash])`. Both complete runtime replies and metadata must match, and independently pinned versions, metadata SHA and runtime code are checked.
8. `state_queryStorageAt([Object.values(poolCodec.storageKeys()), target.hash])` with exactly one state and seven distinct expected keys, no omissions/defaults/duplicates.

The existing `createHistoricalExecutionPoolCodec` validates metadata and decodes asset identities, 18 decimals, denominator, XOR DEX and pool reserves. Missing, absent or zero pools are unusable. The exact reduced ratio is `kusdReserveCodec / xorReserveCodec`; no floating token arithmetic, stable-token peg, interpolation or execution inference is used. Target timestamp layout must be plain V14 `Timestamp.Now: u64`, with canonical exact eight-byte SCALE data and a safe positive millisecond value.

The boundary transcript has 11 calls: the same five-call genesis/finality-anchor prelude using `boundaryFinalizedSource`, canonical block hash/header for `target.height+1`, the three successor runtime/metadata/code calls, then a single-key `state_queryStorageAt` for successor `Timestamp.Now`. The successor header must point to target. Successor runtime/metadata/code must match the pinned target profile; cross-profile boundaries fail closed. No future reserve or price data is read. Its transport begins after original context transport completes.

All requests, parameters and RPC IDs match exactly; transport clocks are sequential, a call lasts at most 30 seconds, and response status must be 200 with no failure/error. Redirects, retries/extra records, duplicate JSON keys, imprecise numbers, changed response digests and mixed state are rejected. Bounds are 20 receipts per transcript, 128 KiB request, 2 MiB response, 16 MiB aggregate string data, 50,000 data/parser nodes and depth 24. This is offline bounded validation, not a transport implementation or wall-clock timeout guarantee.

## Causal role semantics

Opening and terminal use strict H-minus state selection: `target.native < H <= successor.native`. Exact-H target is rejected; exact-H successor is valid. The target is no more than 60 seconds old at H. The original opening receipt must be at/before H and less than five seconds old at H. Later successor confirmation must be at/after H and successor native time, and no earlier than the original receipt. It never refreshes the opening receipt or claims the boundary proof was known at H.

Terminal receipt is at/after its deadline and may be retrospective. This is terminal accounting evidence, not a retroactive trade or risk stop. Pure risk observations require `native <= original receipt <= control`, and native age at control at most 60 seconds, matching the sealed reducer. They do not gain an extra five-second gate; admission has its own stricter freshness requirement. A pinned mark does not prove it was the first/latest eligible state in a registered selection window. `selectionVerified` and `scheduleCompletenessVerified` stay false for the parent to address separately.

The result contains full `mark: {blockHash,blockNumber,observedAtMs,receivedAtMs,price}`, raw reserves, the exact ratio, source pins, original registered slot plus its digest, separate boundary confirmation, timing mode and retained raw evidence. `AccumulationNativeMarkError` has `status: 'incomplete'`, a bounded reason and retained detached evidence; it is never an owned usable mark. The parent must preserve failures and evidence, check ownership before projection, and pass only internally derived mark fields to journal replay. Passing verification does not authorize journal appending, policy execution or a transaction.

## Synthetic verification

`tests/unit/scripts/bots/fixtures/accumulation-native-mark-fixture.ts` exports invented SCALE/native receipts using real metadata codecs. `createAccumulationNativeMarkFixture(role, mode, {openingAtMs?,controlAtMs?,targetHeight?,nativeAtMs?})` supports an opening, later risk points and terminal on one original timeline. Fixture repinning is exclusively a test helper; it is not a production registration operation.

Run `node .yarn/releases/yarn-4.10.3.cjs exec vitest run --config vitest.config.mjs --project unit-scripts tests/unit/scripts/bots/accumulation-native-mark.spec.ts`. Tests cover exact H-minus boundaries, timing separation, modeled versus observed clocks, stale/future marks, deadline and hour alignment, source/runtime/state/denomination mismatches, missing/zero pools, strict RPC/JSON bounds, retained failures, frozen ownership, and advancing synthetic journal marks.
