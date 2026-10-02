# Fixed-lot completed-hour goal signals

`evaluateGoalCompletedSignal` in `src/features/bot-trading/goal-signals.ts` is a
pure adapter for the explicit finalized goal protocol. It uses the existing
deterministic engine for direction and strategy state. It does not use that
engine's inverse-price sell amount, place orders, write storage or establish
qualification.

```ts
const result = evaluateGoalCompletedSignal({
  bot, // Validated exact ledger, control revision and durable goalSignal cursor.
  binding: verification.binding,
  history, // One IndexedPoolHistoryWithEvidence query snapshot.
  receivedAtMs, // Actual browser receipt of that query response.
  now: now(),
});
```

The qualification binding parser enforces a deterministic strategy, completed
hours, hourly 1–24 hour cadence, positive independent KUSD/XOR codec lots equal
to the persisted ceilings, and a KUSD lot strictly below initial trading
capital. `strategy.amount` must encode the KUSD lot. AI and live-price signals
are excluded. The binding must exactly match this bot; the caller still needs
the owned qualification verification and current consent.

To make a decision, the latest candle must be the current UTC completed hour. Candles must be
strictly chronological, with aligned finalized boundary evidence for the same
network and denomination. Second-resolution closing and successor identities
are checked without inventing exact millisecond block timestamps. The response
receipt time remains separate from those indexed timestamps and must precede
the decision. Required signal windows must be contiguous; older gaps remain
reported in `sourceMissingPeriods`. No future, repeated, interpolated or
substituted price is added. This adapter checks consistency, not canonical RPC
proof or the indexer's authenticity; the trusted loader retains raw provenance.

When a valid, sufficient contiguous prefix ends exactly one hour earlier, the
adapter returns `kind: 'awaiting-history'` with the desired hour and latest
available hour. The runtime still records a fresh portfolio mark but neither
consumes the signal nor changes strategy state or places an order. It requests
history again at the next scheduled check. This covers finality and publication
delay; it does not substitute an older price. Evidence older by two hours,
malformed boundaries and insufficient windows still fail.

For a buy or sell, including an engine `blockedAction`, the selected input is
`min(qualified codec lot, spendable allocated inventory)`. For XOR, spendable
inventory excludes the remaining original 1 XOR fee allowance after actual
paid fees. Buy and sell sizes never borrow their own anticipated output. The
result freezes both `inputCodec` and its exact natural amount; execution must
keep that input, not resize or price-convert it after the signal. Fresh quote,
fee and dual-scenario drawdown admission remain downstream requirements.

A decision returns the next immutable `StrategyState`, proposal, selected
input codec (or null for hold), exact completed boundary, response receipt
time and actual `decisionAtMs`. `lastEvaluatedAt` remains that actual decision
time; the separate `completedAtMs` identifies the consumed candle. It preserves
`lastTradeAt`, crossover direction and rule consumption;
only a later realized fill advances the trading clock. Zero spendable inventory
produces a hold that still consumes the completed hour.

The durable cursor is `bot.goalSignal.completedAtMs`, not a caller override.
An already consumed current hour returns `kind: 'already-consumed'`. The trusted
runtime must atomically call goal storage `recordSignal` with this decision's
state and hour, `accountingAtMs: result.decisionAtMs`, a fresh independently identified mark, and current
ledger/control CAS guards plus `expectedCompletedAtMs: bot.goalSignal.completedAtMs`
**before** quoting or executing. It must proceed only
if the returned goal is still active. A rejected quote, admission failure or
absent fill must never retry the same consumed hour. No pending order can be
ignored when committing the signal. This function itself grants no exactly-once
authority: that guarantee belongs to the atomic storage commit.

Missing or malformed required evidence throws without producing a new cursor.
A later query may supply missing evidence while the session remains valid; do
not fabricate a price or silently call missing data a hold. Paused/expired goals,
attention states and changed bindings are rejected. The scheduler separately
handles browser gaps and the immutable funded deadline.

Tests use invented indexed boundaries and real pure ledger transitions for
partial inventory, independent reverse lots, protected remaining fees, legacy
zero-sized blocked directions, crossover/rule state, consumed-hour behavior,
causal windows, malformed evidence and accessor rejection. They make no network,
wallet or market-data requests.
