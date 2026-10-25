# Pure admission result validation

`validateAccumulationAdmissionResult(inputBytes, receipt, trustedBindings)` validates one offline admission worker response. It returns a detached, deeply frozen `ValidatedAccumulationAdmissionResult`; `isValidatedAccumulationAdmissionResult` recognizes only instances produced by this module in the same process. Copies serialized to JSON are not owned results. Ownership establishes checked byte consistency under external pins, not independent proof that a child process ran.

This module does not spawn a process, read the model or source files, fetch data, invoke the policy, append a journal, freeze an order or transact. It accepts the existing `AccumulationSubprocessReceipt` only under independently retained parent bindings. The raw request, receipt, output and failures still belong in the parent's durable evidence store. Validation failure throws `AccumulationAdmissionResultError` with a bounded reason; it never becomes a wait, retry, quote refresh or replacement goal.

## External trust contract

The trust argument has exactly:

- `repositoryRoot`, `pythonExecutable`, `registrationSha256`, `pythonSha256` and `sourceBindings`.
- `modelSha256`, `expectedInputSha256` and `expectedPacketSha256`.
- `expectedEpisode: {episodeId,journalPrefixSha256,journalRevision,projectionSha256}`.
- `limits: {timeoutMs,maxInputBytes,maxStdoutBytes,maxStderrBytes}`.

The parent derives `expectedInputSha256` from the immutable exact bytes it originally authorized, not from the returned receipt. The validator independently hashes the supplied input bytes and compares all three references. `projectionSha256` is SHA-256 of `canonicalAccumulationJournalJson(originalEpisode)` without a trailing newline. It binds the complete independently reconstructed episode, including original funding, deadline, peak and stop state. Packet source ownership and journal provenance must already be established before the parent creates these bindings; arbitrary matching hashes are not authentication.

This validator is fixed to the currently sealed admission runner (`25de2ff4…`), policy (`899d6648…`), model implementation (`26f2d6bc…`) and model file digest `59c55ea8eb27b9efcf6e14cff95f3a56f73f2e65d9e66c82bad7b1a5b5fff355`. There is no model/dependency override or discovery from current disk files. The trusted source list must contain exactly these three paths and hashes. The Python executable has its separately registered path and digest.

## Transport and output

The receipt must describe the admission runner with exact isolated arguments `['-I','-S','-B', <root>/scripts/bots/accumulation_admission_runner.py]`, canonical absolute root/interpreter paths, exact registration, exact limits and environment `{LANG:'C',LC_ALL:'C',TZ:'UTC'}`. The before and after lists must each contain four distinct matching path/expected/actual checks: interpreter plus the three source files. Ordering of that set is immaterial; duplicates, omissions, unexpected paths or mismatches fail.

A usable transport result requires observed spawn, positive PID, completed stdin with exact input length/hash, observed exit zero and close, no signal, timeout, unknown/unconfirmed outcome, termination request or error. Both streams must have canonical base64, equal retained/observed byte counts and SHA-256, and no truncation. Stderr must be exactly empty. The stdout body is one exact canonical ASCII JSON line with a final LF. Unknown/duplicate keys, imprecise numeric JSON values, malformed UTF-8 and extra or missing bytes fail.

Actual `started`, `spawned` and `finished` wall clocks are safe nonnegative integers in order. Monotonic clocks are canonical bounded unsigned strings in order; `elapsedNs` must equal finish minus start exactly. Returned clocks are preserved without substituting request decision time. The subprocess timeout flag is checked, but its timer covers the child run, not all file checks before/after that run; this validator does not claim a whole-invocation timeout.

Input and stdout are capped at 256 KiB; stderr's declared cap is at most 64 KiB; timeout at most 60 seconds. Existing canonical data snapshot limits additionally cap receipt/trust objects at 384 KiB, depth 24 and 20,000 nodes. Raw JSON parsing is bounded to 50,000 nodes/depth 24. Source and interpreter identity are checks of the supplied receipt claims under parent trust, not fresh filesystem verification or process attestation.

## Request and decision preservation

The input request follows the sealed runner schema: exact `kind`, `packet`, and `episode`. Full packet identity, original journal projection, untouched opening allocation, separate fee reserve, durable peak and stop, original 24-hour timeline, full mark binding, completed-close availability, and all nine ordered candidate outcomes are validated. The same native denominator, 18-decimal u128 amounts and reduced exact ratios as the runner are required.

Each original candidate retains its amount, primitive status, reason, evidence digests and quote or explicit absence. For present quotes, output/minimum/fee are canonical u128 values, the minimum equals floor(output × 9950 / 10000), impact status agrees with the exact 1% cap, and original context/quote/fee/expiry clocks remain ordered. Any failed quote requires an incomplete packet. The output `candidateOutcomes` must equal all nine originals exactly, including every original fee, minimum and failed/unavailable outcome.

Output identity binds exact input/model/packet/journal references and the two dependency hashes emitted by the worker. Status and `policyCalled` are strict primitives. An incomplete packet must have `status: 'incomplete'`, `policyCalled: false` and a null decision; it is never promoted into a free wait. An evaluated packet has the complete exact decision schema.

The decision validator checks early wait reasons against original state, ordered active candidate identities, the fixed seed and scenario count, path-count bounds, rejection shape, and selected input consistency. Immediate entry and failed-attempt values are rederived with integer rational arithmetic from the original quote minimum, fee, capital, reserve, price and peak. Pre-scenario size/fee/impact/age/expiry and drawdown rejections must retain the corresponding exact diagnostics. An admitted candidate must have no rejection reasons, positive stated growth/excess and at least 973 of 1024 passing paths; the selected buy must refer to an admitted original ready candidate. Wait reasons cannot contradict the presence of admitted candidates.

Future expectations are bounded finite Decimal strings, not JavaScript token floats. Their shape, sign, path counts and reason consistency are checked; the stochastic forecasts, numerical guard comparisons and ranking optimality are **not recomputed**. In particular, the sealed policy may resolve exact-mean near-ties using lower input even when rounded terminal diagnostic strings differ slightly; this validator does not invent a stricter ranking rule. Source-pinned worker execution remains the parent's trust boundary for those calculations. None of these checks establish predictive accuracy or profit.

## Parent handoff

The owned result exposes `request.packet`, `request.episode`, `decision`, all `candidateOutcomes`, the original `selectedCandidate`, input/output/receipt digests, original trusted bindings, retained receipt, and `actualClocks`. It preserves `forecastRecomputed: false`, `postComputationFreshnessVerified: false`, `journalStillCurrentVerified: false`, `orderAuthority: false`, `qualificationAuthority: false` and `financialActions: false`.

A separate parent component must recheck the current journal and original quote/context/native/deadline clocks after actual computation and at freeze/commit. It must account for monotonic elapsed time, preserve the original receipt ages and retain expired output as unusable evidence. Historical modeled decision clocks must never become the wall time of this subprocess. This validator alone cannot grant an execution slot, order, trading approval or authority to alter limits.

## Offline fixtures and checks

`createAccumulationAdmissionResultFixture({decisionAtMs?,finishedAtMs?})` returns invented `{request,inputBytes,receipt,trust,output}` using known declared source/model pins and synthetic diagnostics. It does not execute or read the trained model. `repinAccumulationAdmissionResultFixture` deliberately rebuilds synthetic request/output digests after a test mutation; it is not a production registration API. Tests create owned buy, wait and incomplete results through the real validator.

Run `node .yarn/releases/yarn-4.10.3.cjs exec vitest run --config vitest.config.mjs --project unit-scripts tests/unit/scripts/bots/accumulation-admission-result.spec.ts`. Tests cover exact quote/accounting preservation, full request/episode/runtime binding, all four before/after pins, strict transport and clocks, canonical output, incomplete/failed outcomes, malformed decisions, frozen ownership and byte tampering.
