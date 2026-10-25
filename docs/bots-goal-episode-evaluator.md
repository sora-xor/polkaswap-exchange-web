# Causal goal episode evaluator

`createGoalEpisodeEvaluator({ plan, source })` supplies the existing `GoalQualificationEvaluator.evaluate` member. A trusted persistent wrapper still owns registration, candidate selection sealing, validation access, immutable raw receipts, and the final source manifest. This module neither qualifies a strategy by itself nor enables a wallet or bot.

The source exposes `open`, `history`, `valuation`, `quote`, and `terminal`. Inputs and returned data are detached, validated and frozen. Each mark retains a source-manifest digest, genesis, canonical block identity, runtime profile, and separate capture/receipt times. The plan labels these times as observed or modeled; block timestamps are never relabeled as receipt times. Source methods must implement their own bounded read-only transport and retain raw failed responses. Missing, stale, unsupported or inconsistent evidence rejects the episode; there is no retry, substitute state, strategy selection, or network implementation here.

Allowed runtime-profile digests are computed once from the detached, validated
plan. Each incoming source observation is still copied, frozen and freshly
hashed before membership and per-block consistency checks. Changing an external
plan or reusing a mutable source profile cannot change the admitted identities.

The evaluator reproduces the verified callback clock, including sliding due checks and coalescing. For an unconsumed completed hour while active it loads history, obtains a fresh valuation, evaluates the real `goal-signals` direction/state, and commits the mark and consumed hour before requesting a quote. It preserves receipt-owned `lastTradeAt`, so normal cooldown still applies. A held or rejected hour is never quoted again. The engine's inverse-price sell amount is discarded by the shared signal adapter: the independent codec lot is capped by actual inventory, with the unspent portion of the original 1 XOR fee allowance protected. Opening KUSD is at most 10; each KUSD lot is strictly smaller than the opening amount.

Quotes must be the upstream projection of the existing raw-decoder quote and bounded-envelope fee joins: exact pending input, DEX 0, direct XYK route, 0.5% minimum, native XOR fee, matching query-info/details and the declared fee-policy hash. Pool fees are already reflected in the quote. Exact 1% impact and both minimum-success/fee-only-loss admission are checked locally. Accepted hypothetical fills settle at the minimum output and charge the native bound once. Rejected quotes are bound into the signal evidence digest even though they do not produce a fill event. Raw transport/metadata/SCALE authenticity remains the source's job; arbitrary matching JSON is not authenticated evidence.

This version requires quote and valuation to have the same canonical state and runtime profile; their receipt clocks may differ. The existing episode contract has exactly one valuation per due check and cannot represent a newer-state mark observed during a rejected quote. Such a state change makes this evaluator incomplete instead of silently discarding the mark. This is an explicit modeled restriction, not a claim that live calls always return the same head.

Every due check is valued, including after a latched target or loss stop. Stopped hours record `action: stopped` using the due valuation evidence, without requesting more signals or quotes. Holdings continue to be valued through the fixed funded deadline. The terminal mark is canonical as of that deadline and has an adjacent successor strictly after it; the retrospective proof does not shift accounting time or claim it was available at the deadline.

The returned value is the unchanged `GoalQualificationEpisodeEvidence`. Tests use invented blocks, pools, prices and fees with the real signal, clock and ledger reducers. They exercise drift, once-per-hour consumption, reverse lots, stops, fee rejection, stale/malformed evidence, immutable awaits, and the existing qualification verifier. No recorded market dataset is loaded, and synthetic losses remain economically ineligible.

`createGoalEpisodeEvaluatorV2` is the explicit v2 entry point for deadline-cancelled
stage prefixes and verified hourly publication waiting. It preserves completed
pre-deadline events and still requires all 24 hourly signals. The original
constructor remains strict v1. See [the v2 protocol](bots-goal-clock-v2.md).
