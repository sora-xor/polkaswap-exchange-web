# Offline accumulation execution accounting

`scripts/bots/accumulation_execution_replay.py` is a pure, separate helper for the frozen partial-accumulation admission prototype. It has no network, wallet, policy invocation, scheduler, quote collection, fill inference or signing API. It accepts exact caller-declared hypothetical outcomes; a price crossing, native quote or fee estimate cannot produce a settlement automatically.

The original funding is at most 10 KUSD and a separate at most 1 XOR fee allocation, with the original 24-hour deadline. All token amounts use exact `Fraction` values that represent 18-decimal codec units. Prices and combined-portfolio ratios remain exact. No floating-point money or approximate drawdown threshold is used.

## Usage and responsibilities

1. `create_episode(opening: OpeningPortfolio, opening_at_ms, opening_mark: ReplayMark)` establishes the original hourly boundary using a canonical H-minus mark authenticated externally. Its opening price must match the supplied opening portfolio.
2. `observe_mark(state, mark, at_ms, expected_revision=...)` accounts for current held assets at a causally received native mark. Native time and receipt time remain separate. At exactly 10% drawdown from the observed durable peak, the goal pauses. A target requires a successful modeled purchase, at least 5% growth from opening, and strictly positive excess over unchanged idle holdings at the same mark. Passive repricing before a purchase, or after only a paid failure, cannot reach the target.
3. `freeze_order(state, order: DecisionOrder, expected_revision=...)` preserves the chosen input, original 0.5% minimum, estimate, evidence digests and encoded call/envelope bytes before a future-state lookup. `DecisionOrder` validates its fixed partial size and exact minimum rule; the external codec must verify that those bytes actually encode the claimed terms, route and chain. The helper does not authenticate claimed hashes or run the admission model. Original context and quote receipt ages must each be below five seconds; finalized native block age may be at most 60 seconds.
4. `cancel_order(...)` can cancel an uncommitted order without a fee or consuming the attempt. `commit_attempt(...)` consumes the **only** hypothetical attempt and rechecks controls, freshness, partial funding and immediate minimum-success/fee-only loss. It is a research state transition, never an actual submission. After commitment, `may_request_admission` stays false even if the outcome is unresolved or a fee-paying failure. Do not call the immutable admission primitive again or reconstruct its original reserve after a failure.
5. `settle_attempt(...)` requires the same order and envelope digest, explicit included/received times, a native mark, explicit `hypothetical-success` or `hypothetical-paid-failure`, output and paid-scenario fee. Caller-side evidence or a separately registered scenario must establish those values. A quote or estimated fee is not proof that a transaction paid a fee. The original fixed execution window, order acceptance expiry and deadline remain in force; no lower minimum or replacement target is generated from later data.
6. `finalize_episode(...)` marks the unchanged original deadline using a canonical H-minus terminal state authenticated externally. It refuses unresolved committed attempts. It closes **accounting only**, and does not certify complete control observations, historical execution, a profitable strategy or qualification.

Success debits the fixed KUSD input, credits the explicitly supplied output and charges the explicitly supplied fee once. Paid failure charges only the fee. The remaining fee allowance is the original fee allocation minus paid fees; purchased XOR never replenishes that allowance. A fee above the original estimate but still funded is applied with `paid_fee_exceeded_estimate` attention. A fee beyond funded reserve, aggregate codec overflow, a claimed success below the original minimum, or incompatible inclusion timing raises `ReplayError` with unchanged committed state and public diagnostics; it does not become a free cancellation or a successful complete episode. The external journal must retain the rejected outcome and classify the run accordingly.

A risk stop after commitment does not erase the outstanding attempt. The helper observes pre-settlement holdings at the settlement mark before applying effects, then observes the post-settlement value. Stops latch; holdings continue to be valued, and full-period observed drawdown continues after a target or loss stop. No forced exit is modeled. A pause cannot guarantee that subsequent passive losses remain within 10%.

The order's `expires_at_ms` is an immutable **model acceptance cutoff**, not on-chain revocation. Quote freshness cannot revoke a genuinely submitted transaction. Inclusion at or after that cutoff remains an unresolved incompatible scenario. Evidence received after the goal deadline can still account for an inclusion before the original deadline and order expiry, provided native events remain ordered. It cannot backdate a target/loss action. A later native valuation cannot be followed by retroactive insertion of an earlier settlement; the external driver must retain and order that history correctly.

## What this helper does not prove

Callers must own a trusted, linear replay history. Frozen dataclasses prevent ordinary mutation, and expected revisions catch stale calls on that history; they do not authenticate forged dataclasses, prevent a caller from branching an earlier state, or provide global exactly-once storage. The returned event tuple contains accounting summaries, not complete prior order terms. Reproduction requires a separate durable append-only journal retaining every full transition input/order, output and failure.

The future evidence bridge must verify canonical first-eligible execution blocks and predecessor adjacency, complete nine-size decision packets, native runtime/denomination/call bindings, real or explicitly modeled arrival times, control cadence, publication delays, minimum-output/failure-fee semantics and raw RPC evidence. It must retain all unavailable, failed, expired and no-fill outcomes. This helper checks a supplied execution window; it does not prove a supplied block was the first eligible one. Collection and bridge work require a separate source-bound protocol before development data is opened.

No sealed admission, model, collector, driver or earlier protocol is changed by this helper. The source-only design is in `output/go-history/tc1-new-strategy-research-20260926/execution-replay-adapter-design-v1.md`.

Run the synthetic tests without external services:

```sh
python3 tests/unit/scripts/bots/test_accumulation_execution_replay.py
```
