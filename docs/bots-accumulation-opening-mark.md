# Available-finalized opening, v2

`scripts/bots/accumulation-opening-mark.ts` verifies one originally selected finalized snapshot as an opening valuation at a preregistered UTC hour H. Its original storage receipt must arrive in `(H−5000ms, H]`; the native timestamp must be strictly before H, no later than that receipt, and at most 60 seconds old at H. The fixed deadline is H+24 hours.

This is an explicit new valuation convention. It does **not** require the selected block to be the last block before H or require a boundary successor. It does not change sealed v1 code, reinterpret v1 evidence, shift a v1 risk slot to impersonate opening, refit a model, or relax any funding/risk limit. Its owned result is a different kind and is deliberately rejected by the old native-mark ownership predicate. The existing financial ledger still must enforce the user's capital, separate fee reserve, drawdown, impact and execution limits.

Use `verifyAccumulationOpeningMark(raw, trusted, slot)`:

- `raw`: exact `{kind:'accumulation-opening-mark-evidence-v2', discoveryRpc, bootstrapRpc, poolRpc}`. Discovery contains the two original receipts with IDs1–2; bootstrap contains the fourteen original receipts with IDs3–16; `poolRpc` is the original single seven-key receipt with ID1000.
- `trusted`: exact `{rawSha256, sourceRegistrationSha256, endpoint, runtime, denominator}`. Endpoint is `https://ws.mof.sora.org/`; runtime contains `specVersion`, `transactionVersion`, `metadataSha256`, and `codeHash`. These pins and registration identity must come from the registered owner independently of the observed raw claims.
- `slot`: exact `{episodeId, slotId, openingAtMs, deadlineMs}`. Opening must be a UTC hour; deadline is exactly 24 hours later. `accumulationOpeningMarkDigest` uses the existing sorted compact data-digest convention for raw and slot bindings.

The verifier reuses the actual bootstrap discovery and fourteen-call prefix validators. The discovered target is the sole target/finality anchor supplied to bootstrap replay. It requires sequential original receipt clocks across all three phases, exact independently pinned runtime/metadata/code, exact generated seven-key request at that target, seven unique same-state values and a positive direct KUSD/XOR pool. The existing native codec verifies assets, decimals, denomination, DEX and pool layouts. Valuation uses the exact reduced reserve ratio, never a rounded token price or invented stable-token peg.

Only the fixed compact JSON storage-response encoding is supported: the original body must equal its exact JSON parse/stringify roundtrip. Noncanonical numbers, duplicate/escaped aliases and unsupported whitespace fail explicitly; original receipts are retained, never normalized or rewritten. The response is capped at 64KiB. Its response ID is exactly1000; remaining storage data must satisfy the exact string/null native codec schema. Bootstrap keeps its own stricter original JSON/receipt validation and bounds. No second general-purpose JSON parser or synthetic transcript is introduced.

Successful `AccumulationOpeningMarkResult` contains `mark` (full block hash/height/native time/original receipt time/exact price tuple), `selectedTarget`, `registeredSlot`, its digest, runtime/denominator pins, raw reserve amounts, and `retainedEvidence`. Everything is detached and frozen. `isVerifiedAccumulationOpeningMark` recognizes only same-process results; copying JSON does not preserve ownership. `AccumulationOpeningMarkError` retains safely detached evidence and has status `incomplete`.

This proves consistency under the supplied bindings, not actual acquisition provenance or hidden-attempt absence. `sourceAcquisitionVerified`, `selectionVerified`, `scheduleCompletenessVerified`, `independentConsensusVerified`, `qualificationAuthority`, and `financialAuthority` remain false. A fresh future collection registration and durable owner must enforce the single original selection, physical pre-H phase windows, trusted endpoint/receipt-clock provenance, monotonic safeguards and retention. No model, network call, quote, fee estimate, order or transaction is performed here. A result verified or persisted after H does not claim it was ready then; only the original receipt is tested against H.

Run the invented-metadata tests with:

```sh
node .yarn/releases/yarn-4.10.3.cjs exec vitest run --config vitest.config.mjs --project unit-scripts tests/unit/scripts/bots/accumulation-opening-mark.spec.ts
```
