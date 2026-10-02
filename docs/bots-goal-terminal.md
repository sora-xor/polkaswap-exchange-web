# Original-deadline terminal accounting

`goal-terminal.ts` provides a read-only terminal valuation for the opt-in exact
KUSD/XOR goal. It uses the existing connected SDK through
`createGoalExecutionSession().captureTerminal()`. It never signs, submits,
quotes a trade, funds a goal, releases allocations, or authorizes a session.

The request binds the goal ID, original funded deadline, denomination and exact
last-accounted block height/hash/timestamp. A bounded canonical lookup locates
the final block at or before the deadline. Its immediate canonical successor
must have a later timestamp and be covered by the connected node's finalized
head. Pool reserves and token metadata are decoded using the actual browser
execution codecs at each pinned block. The terminal mark must be no more than
60 seconds older than the deadline. Current market prices cannot substitute for
that mark. Finality is the node's canonical finalized attestation, not an
independent cryptographic finality proof.

The provider records request/response digests and returns immutable evidence
bound to its private connection epoch. `assertGoalTerminalEvidence` rejects a
serialized copy or a revoked connection. `readGoalTerminalEvidence` validates
persisted data for inspection; it does not grant write authority. Each capture
is bounded to 30 seconds, 256 RPC calls, 35 block reads and a fixed parsed-character
budget. Only canonical state reads occur.

`storage.goals.terminal({ botId, expected, evidence })` is a dedicated atomic
compare-and-save operation. It checks the original evidence object before and
inside the transaction, verifies the exact ledger anchor and deadline, marks
holdings at that deadline and saves the evidence/hash with `goalTerminal`.
`receivedAtMs` remains the actual later receipt time. The ledger's accounting
time and expired stop time remain the original deadline. Earlier target/loss
outcomes remain latched, and all already accounted fills and fees remain exact.
The XOR fee reserve and portfolio allocation remain in place.

Closure accepts accounted orders, genuinely cancelled reservations, and retained
canonical finalized receipts included at or before the terminal block. New
receipts are sorted by block height and extrinsic index, then applied atomically
through `settleGoalExactTerminal`: exact input/output movements and actual fees
(including failed-extrinsic fees and fee deficits) are applied before **one**
terminal valuation. Intermediate batch balances do not invent market observations,
peaks, or drawdown. Receipt identities and the resulting state hash are persisted
with each order; retries cannot apply them twice.

Reserved, signed, or submitted orders still block closure. A real receipt from
after the terminal block remains durably pending and blocks closure as well:
committed late effects cannot be silently excluded from a claimed final balance.
Every previously accounted receipt must be represented in the exact ledger and
lie at or before the terminal block. Missing receipts never imply failure or
non-inclusion. A ledger already accounted past the deadline cannot be rewound.

Ordinary receipt accounting rejects expiry, including when a valuation read
crosses the deadline. The live executor revokes signing and retains the actual
receipt without applying a current mark; terminal storage then accounts eligible
receipts using the owned original-deadline evidence. Allocations stay reserved
while any uncertain or late transaction remains unresolved. Genuine terminal
fee deficits continue to block all new allocations on that account.

`createGoalRuntime().close(id)` provides explicit read-only closure after the
deadline. The live clock invokes it on expiry **after synchronously revoking the
signer**. If the node has not finalized the successor yet, it waits for actual
finalized-head notifications on one subscription, bounded to 60 seconds and eight
captures. The initial current head is a baseline; duplicate callbacks do not
trigger retries. A strictly newer head after the failed capture is required.
After the canonical successor is finalized, read-only reconciliation discovers
and retains any late predeadline receipt, then terminal storage applies the
eligible batch. No current-price accounting, polling loop, new authorization or
deadline extension occurs. Connection changes, stop, dispose, and the waiting
deadline revoke local work. A pending-order or missing-
finality failure remains visible through the existing `onChange` error callback;
`close(id)` can be retried after the missing evidence is available.

Tests exercise the actual metadata and pool codecs, exact ledger and atomic
storage using invented data. They cover late arrival, adjacent successor
requirements, canonical-anchor changes, copied capabilities, CAS conflicts,
connection revocation, pending orders, accounted fees, latched target outcomes,
actual late success/failure/deficit accounting, no intermediate batch peaks,
postdeadline receipt retention, signer revocation before runtime closure,
repeated current-head callbacks, delayed finality, timeout, and receipt discovery
after finality. No real
market data, account credentials or transaction submission is involved.
