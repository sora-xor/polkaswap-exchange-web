# Exact goal funding approval

`createGoalFundingService(storage, dependencies)` constructs the opt-in KUSD/XOR
goal through the existing exact storage API. It allocates tokens already present
in the connected wallet; it does not transfer or deposit tokens on chain. No
wallet unlock, signature, transaction, trading session, or default UI is enabled.

The application supplies the actual connected SDK client and wallet status, a
transferable-balance reader, the same account/network lease used by live bots,
and the current clock. The balance adapter must return codec balances for the
new goal and all existing allocation assets, using the wallet SDK's
`getAccountAsset(...).balance.transferable`. These are trusted application
dependencies, never values supplied by an AI or a web tool.

Both operations take the same request:

```ts
const request = {
  draftId, // Keep stable across retries, double clicks, and reloads.
  account: reviewedWalletAddress,
  source: reviewedWalletSource,
  qualification: ownedVerification,
};
const preview = await funding.preview(request); // No writes or account lease.
// Only after the user approves the displayed wallet, amount, and fee reserve:
const funded = await funding.approve(request); // New record is PAUSED.
```

The original locally owned `GoalQualificationVerification` is required. A JSON
certificate, copied verifier, arbitrary hook, opaque digest, or overridden amount
cannot substitute for it. The qualified candidate supplies the exact initial
KUSD budget (at most 10 KUSD), both fixed trade limits, strategy and denomination.
The separate reserve is exactly 1 XOR. The policy remains mainnet KUSD/XOR,
5% target and maximum drawdown, 24 hours, 0.5% slippage, and 1% maximum impact.
Balances never cause the qualified strategy or amounts to be scaled.

Preview captures an owned finalized context, validates its full runtime profile
and denomination, builds a temporary exact projection solely to verify the
qualification, and checks transferable balances against all existing
allocations. This temporary projection is never persisted. Preview returns
`kind: 'preview'`, exact required/available codec amounts and `sufficient`, or
`kind: 'funded'` with the already existing matching record. An insufficient new
budget is a preview result; malformed balances, existing over-allocation,
unresolved orders, or account deficits are errors.

Approval obtains the account lease and repeats current context and balance
checks. Only `storage.goals.initialize` creates the funded epoch, using its own
transaction-time clock and the newly captured original finalized mark. Its
transaction guard rechecks wallet/source/client context ownership and the exact
qualification before committing. The initial price and deadline are never taken
from a prior preview. Reads and approval are bounded to 30 seconds; session
ownership also enforces the original context's freshness. All session listeners
and acquired leases are released, including a lease arriving after timeout.

Each draft deterministically hashes to bounded IDs for one bot and one goal epoch. Storage enforces
both IDs atomically. Concurrent clicks are serialized locally, and a concurrent
instance that loses the storage race reads and validates the winner. Repeating
approval with the same reviewed binding returns that existing epoch unchanged,
including its original deadline; it does not initialize again. A failed later
Start therefore leaves the paused funded goal available for retry. Returning an
already running or completed matching goal does not change its status.

This service requires the canonical SORA SS58 address and exact current displayed
wallet/source identity. Existing records with another SS58 representation of the
same public key are rejected rather than silently rewritten or ignored: current
storage aggregates allocations by literal account string. A caller should keep
the reviewed draft ID and address; switching accounts or sources is a new review,
not a way to repurpose an existing funded draft. Existing storage cannot atomically
normalize a legacy alias record created concurrently under another lease key;
this service does not claim that guarantee. Canonical new-service writers use the
same account lease and storage's atomic allocation check. Default UI integration
must preserve that canonical account boundary.

Tests use a genuine locally owned qualification derived from invented causal
fixtures, the actual exact storage transaction and ledger, and mocked external
SDK ownership/balance boundaries. They cover approval-time funding, previews,
double clicks, reloads, same/different-draft concurrency, insufficient balances,
reserved assets, pending orders, aliases, context revocation, runtime changes,
stale contexts, copied proof rejection and timeout cleanup. No network or real
market data is used.

The acquired lease is retained by its first promise handler before the timeout race resumes. This preserves cleanup when acquisition and expiry settle in one turn, prevents releasing that lease twice, and still releases a lease that arrives after the operation has ended. Synthetic tests cover both arrival orders and late cleanup failures.
