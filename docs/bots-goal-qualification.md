# Exact execution qualification boundary

`goal-qualification.ts` adds an explicit `finalized-xyk-qualification-v1` certificate and a privately owned in-process verification capability for `finalized-xyk-goal-v1`. It does not ship an enabled production evaluator, qualify an existing strategy, read a holdout, or authorize a wallet. Existing `goal-episodes-v2` and both `goal-ordered-replay-v3-*-development` result formats reject; changing a label is not a migration.

The certificate binds the mainnet genesis, KUSD/XOR denomination, exact initial KUSD (positive and at most 10), separate 1 XOR fee allowance, strategy, and per-asset order ceilings. Those ceilings are also the explicitly chosen fixed codec lots. A signal proposes `min(lot, spendable inventory)`; XOR spendable excludes the unspent original native fee allowance. The input freezes at the signal and is never silently resized during execution. The strategy's inverse-price sell amount is not used by this protocol. Each plan permits exactly one runtime profile; listing another profile is not evidence that the study exercised its economics.

The fixed policy retains a 5% target stop, 5% observed peak drawdown, 24-hour independent episodes, direct DEX0 XYK `AllowSelected`, 0.5% minimum-output tolerance and a 1% exact quote-impact cap. It binds the full native mortal64/u32/signature-length fee policy hash and exact runtime/transaction versions, metadata hash and runtime code hash. Quotes already include pool fees; only the separately verified native fee is debited again.

## Producer and trusted evaluator

The application composition root may create `createGoalQualificationBoundary(trustedEvaluator)`. The dependency is executable trusted application code, never JSON from an AI, a site tool or a stored certificate. Its explicit contract owns:

1. Canonical finalized raw data and same-state quote/pool/runtime/fee verification, with retained source and dataset manifests.
2. Deterministic strategy evaluation using completed hourly observations only, the declared recorded-or-modeled availability times, exactly-once signals and frozen fixed-lot proposals. It must preserve warmup, prior strategy state, cooldowns, rejected signals and delayed pending-input identity.
3. Persistent preregistration of the candidate set, source/partitions and validation identity before training begins. Validation must be genuinely unopened by selection, not merely marked with a boolean.
4. A persistent selection seal before opening validation. Reverification may replay the same immutable sealed evidence; it may not select another candidate, date, cost scenario or missing-data replacement after seeing validation.

The [archive evaluator](bots-goal-qualification-archive-evaluator.md), durable study store and [portable replay composition](bots-goal-bundle-verifier.md) implement this corridor. The earlier isolated development wrappers, fixed-minute results and fee-estimation caveats cannot be relabeled as qualification. A historical evaluator may use the separately preregistered arrival model below; that evidence remains explicitly hypothetical. The boundary cannot authenticate arbitrary caller-authored transcripts or prove non-exposure from a checksum; it relies on the specifically installed trusted evaluator for those facts. Supplying synthetic test doubles is not production qualification. The completed real study failed training and created no qualified release.

`qualify(plan)` calls registration, evaluates the predetermined training episodes for at most three candidates, selects by positive mean benchmark-excess return (then positive mean net return; digest tie-break), seals that selection, and only then evaluates validation. A failed attempt does not retry, replace evidence or open validation early. `reverify(certificate)` verifies its integrity and reruns the same trusted sealed corridor; an opaque digest or imported `qualified: true` never restores a capability.

The existing study strength comes from `goal-research.ts`'s `copyGoalResearchEvidence` and `validateGoalResearchSnapshot`: four complete 24-hour training episodes plus the declared 20-hour tail, a two-hour embargo, two validation episodes plus the one-hour tail, and at most three candidates. Qualification keeps positive mean net return and benchmark-excess return after fees in both percentages and absolute XOR in each partition, nonzero accepted hypothetical fills, and complete observed drawdown limits. A 5% **target stop** is distinct from the positive-return qualification threshold. The certificate only reports a reached target when the accounting trace reaches it.

## Independent checks on structured episodes

The evaluator must return a complete, bounded callback/processing trace, 24 signal records, exactly one valuation for every started check, and at most one minimum-output fill per signal. `goal-qualification-clock.ts` reproduces `goal-live-clock.ts`: checks follow finalized callbacks, `nextDue` advances from actual check-start time, callbacks coalesce while a check is busy, and a scheduler gap greater than 60 seconds makes the episode incomplete. It does not substitute a fixed minute grid or fill a missing request with a later day. The policy also binds the provider's strictly-under-five-second operation/context age and at-most-60-second finalized-state age.

Each plan explicitly declares one timestamp provenance model. `observed-finalized-callbacks` binds a recorder source digest and requires genuine callback/processing evidence. `modeled-finalized-callbacks` binds fixed nonnegative finality, callback and processing delays plus a bounded check duration. The pure verifier derives those hypothetical times from every consecutive canonical block in the declared episode. The trusted evaluator must independently verify that complete canonical sequence and model preregistration. Newly fetched historical RPC data and canonical block timestamps are never labeled past browser receipts. The model, source hashes and immutable partitions are sealed before training or validation access; no data-selected replacement model is permitted.

A check may await hourly history before capturing a fresh state. Each valuation therefore records both capture start and completion, separately from scheduler check start and block timestamp. The capture must finish within five seconds and before that check completes; signals use the valuation and evidence actually available by their decision time. Missing/duplicate checks, changed request identity, stale contexts, incorrect minimums, fee disagreement, unknown runtime profiles, impact above 1%, changed lots or incomplete terminal evidence reject.

The boundary independently runs the exact ledger over every mark and accepted hypothetical fill. It checks minimum-success and fee-only-failure admission, charges each native fee once, marks unchanged benchmark inventory on the same states, and recomputes net return and benchmark excess in percentage and absolute XOR units, fees, fill counts and maximum observed drawdown with integer fractions. Held inventory continues to be marked after target/loss stops. Separate terminal evidence must prove the last canonical state at or before the original funded deadline, with its adjacent successor strictly after it and a maximum age of 60 seconds. Accounting remains exactly at the deadline; it is not an invented browser observation timestamp. A runtime deadline callback alone is insufficient terminal evidence. This is observed drawdown, not a claim about losses between observations or executable liquidation value.

Hypothetical fills do not claim an on-chain trade or feed invented market impact back into later real pool states. The structured transcript includes immutable evidence references; raw receipts remain in the evaluator's evidence store. Accounting recomputation is independent of those references, while their authenticity and the causal signal interpretation remain trusted-evaluator responsibilities.

## Runtime use

The result contains `{ certificate, verification }`. `assertGoalQualificationVerification(verification, bot)` checks module-private ownership plus the exact bot binding, certificate digest and policy digest. A plain object with an `assertCurrent` function, a serialized clone or a digest-only record fails. `assertGoalQualificationRuntime` must also match the **current owned execution context**'s exact version/metadata/code profile; a spec version alone is insufficient. The certificate policy digest is exposed as `verification.policySha256` and must populate `bot.goalExecution.policyDigest`.

The verifier is synchronous, in-process and revocable through its creating boundary. It does not grant account authority, preserve a wallet unlock, override goal-control revocation, or promise future profit. The executor must separately enforce its owned connection, current context, user consent, session/control epoch, exact live quote and actual signed-envelope fee. After reload, the application must obtain a new owned capability. Public GO uses the explicit [trusted publisher release model](bots-goal-releases.md): full raw replay at publication, independently shipped manifest pins and strict certificate checks in the browser. An arbitrary imported certificate cannot restore authority.

All tests are synthetic. They exercise the real exact accounting reducer and the producer ordering, but their injected evaluator is a test-only contract double and provides no evidence about Polkaswap profitability or any actual dataset.

## Explicit target-runtime v3

`createGoalQualificationBoundaryV3` and `createGoalEpisodeEvaluatorV3` select
`finalized-xyk-qualification-v3` explicitly. This is unrelated to the older
development result formats mentioned above. V1/V2 constructors still reject
V3 input, and their runtime and economic semantics are unchanged.

A V3 plan requires the strict [target execution model](bots-target-runtime-study.md).
Its single `runtimeProfiles` entry continues to identify source130 historical
state. The separate model pins target131 and the executed host/state/quote
implementation. Each causal quote retains source130 context and adds its exact
target profile and model digest. Each fill records source, target and model
digests; the accounting boundary validates all three independently.

Raw fee API results must agree and fit the preregistered per-transaction cap.
The causal evaluator rejects a quote above that cap without a fill or fee
deduction. Accepted hypothetical fills charge the full cap, retaining the two
unmodified raw estimates. The boundary recomputes those charges, and small
release summaries must report `fills × cap` native fees. Exact budget,
drawdown, partial-order, selection and validation gates still apply.

Only the target profile appears in the resulting owned live verification.
`assertGoalQualificationFee` checks ownership and its exact cap; copied or
revoked verifications fail. The publisher-attested release path derives the
same target profile and cap. This does not authenticate arbitrary source pins
or transcripts: the new Node raw producer and complete portable replay still
must be implemented before a V3 release can be published. No V3 study or
production release is enabled by these structural and synthetic checks.
