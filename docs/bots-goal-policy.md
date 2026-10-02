# Finalized goal policy guards

`src/features/bot-trading/goal-policy.ts` provides pure checks for the explicit
`finalized-xyk-goal-v1` bot protocol. It does not select a protocol from missing
legacy fields, authorize a strategy, create a wallet session, or submit a trade.
Legacy `goal-episodes-v2` and `policy.ts` behavior remain separate.

## Inputs and fixed policy

`validateGoalExecutionPolicy` delegates to the pure `readGoalExecutionBot`
validator. A bot must carry an explicit goal binding and a restorable exact
ledger, with no own `goalState` field. The structural policy binds KUSD/XOR at
18 decimals, at most 10 KUSD initial trading capital, a separate 1 XOR initial
fee reserve, a 5% target and drawdown limit, 24 hours, 0.5% slippage, and a 1%
price-impact limit. Portfolio mirrors and per-asset lot limits must match the
exact ledger. Consent, qualification and policy digests are opaque bindings;
their presence proves no authority or profitable strategy.

`goalConsentIdentity` binds the account, network, assets, policy, strategy,
provider settings, research, explicit goal binding, and exact funded opening
epoch. Normal ledger progress and telemetry do not change this identity.
The caller must authenticate consent and qualification separately.

## Quote and prepared intent checks

`assertGoalQuote(bot, proposal, quote)` reconstructs the projected payload with
`projectGoalSwapEstimate`, requiring exact equality with its detached evidence.
The proposal and quoted natural input must encode the same positive base units;
equivalent decimal spellings are allowed. Only desired-input DEX 0 `XYKPool`
quotes with the fixed selector, denomination and slippage are accepted. The
input cannot exceed its lot cap, and one KUSD input cannot consume the full
initial KUSD allocation.

Price impact is checked by integer cross multiplication against the unrounded
output and output-without-impact from the same quote. Exactly 1% is accepted;
1.004% is rejected regardless of display text. The pool fee is already reflected
in those outputs. The native XOR network fee remains separate and is not
deducted from the quoted output again.

The returned immutable `{ mark, fill, callHex }` contains the original pool
reserves and block timestamp, the exact minimum output and native fee ceiling,
and the metadata-derived SCALE call. `goalMarkFromExecutionContext` also exposes
the mark projection directly. These functions check consistency, not RPC
provenance: callers must retain the provider-owned context and live session.

`assertGoalPrepared(bot, proposal, prepared, status, now)` additionally checks
the exact normalized request, explicit XYK SDK invocation, preview, fee
projection, signer/network/runtime, and prepare-issued quote, call and intent
digests. It rejects changes to its original input objects, exact state or durable
pause/resume control revision while asynchronous digest work runs. Its additional `envelopeDigest` is
`createAgentDigest('swap.envelope', prepared.envelope)`; it is neither the
bounded placeholder fee envelope hash nor the actual signed-envelope hash.

The envelope's `encodedCall` encodes canonical SDK-call JSON. Use
`assertGoalCallHex(prepared, tx.method.toHex())` separately to compare the actual
SCALE call with the quote's metadata-derived call. This comparison is intended
after full prepared validation and does not authenticate a signature.

## Integration boundary

The caller must retain session/context ownership, check current consent and
qualification, and reserve against the exact ledger revision and state hash.
The separate `goalControl.revision` must also match the live capability and
reservation; the stable consent fingerprint does not replace this revocation
revision. Storage checks must read the current persisted revision, including
changes made by another tab.
The ledger handles inventory, the remaining protected fee reserve and the
successful-fill/failed-fee drawdown admission cases. Generic prepared swaps have
no goal ID, so the reservation must attach the funded epoch and prevent reuse.

`assertGoalPreparedContext(bot, prepared, freshStatus, now)` is the synchronous
clock/identity recheck after awaited work. Context age must remain below 5
seconds and finalized block age at most 60 seconds, in addition to the prepared
time and block deadlines. The live session must also call `assertCurrent` on
its original owned context. A caller-supplied clock is not advanced by these
pure functions. Actual signed-envelope inspection, fresh signed-byte fee
estimation, final consent checks, broadcast and finalized receipt accounting
belong to the execution path; these guards do not enable them.

All unit inputs are invented metadata, balances and receipts. Tests cover
fixed-policy rejection, forward/reverse fees, exact impact boundaries, natural
amount consistency, changed quote/prepared evidence, mutation across awaits,
separate SCALE comparison, stale context and getter rejection. No network,
wallet or historical market data is used.
