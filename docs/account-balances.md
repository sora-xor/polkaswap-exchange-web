# Account balances

XOR balances come from the connected SORA node. They are not cached in the
IPFS deployment or read from the market indexer. The wallet store publishes
account asset snapshots for wallet views, Polkamarkt fee checks, and shared
asset consumers. Swap also subscribes to its selected assets directly.

## Total and spendable XOR

The wallet's main balance is total ownership: free + reserved + referral-bonded
funds. Swap and Polkamarkt check the transferable portion when validating an
amount or a network fee. Compare that value with the usable XOR balance on
polkamarkt.com, rather than comparing the wallet total.

SORA's current native balances pallet applies freezes to free and reserved
funds together. With its zero existential deposit, the calculation is:

```text
unavailable free = max(0, frozen - reserved)
transferable     = max(0, free - unavailable free)
locked           = free - transferable + reserved + bonded
total            = free + reserved + bonded
```

For example, an account with 8 free XOR, 2 reserved XOR, and a freeze of 5 XOR
has 5 transferable XOR. Subtracting the entire freeze from free would report
only 3 XOR, even after a hard refresh. The native calculation must not be
applied to ORML token balances or legacy native records with `miscFrozen` and
`feeFrozen`.

`src/lib/substrate/sdk/assets/index.ts` owns this calculation for direct reads,
wallet subscriptions, and transferable-balance subscriptions. Codec strings
remain exact through `FPNumber`; do not add a display denomination adjustment
to balances that the chain has already denominated.

## Publishing updates

The SDK changes plain JavaScript asset objects outside Vue's reactive state.
`useWalletStore().setAccountAssets()` copies each asset and its balance when
publishing an update. Merely replacing the array while reusing those objects
can leave nested computed values, such as Polkamarkt's XOR fee check, stale.

Account-owned subscriptions must restart when the account changes, even if
the wallet stays logged in. Clear the previous account's balances while the
new account loads; preserve the visible snapshot during a refresh of the same
account. Swap must not hydrate from an unsettled wallet snapshot.

Resetting a wallet subscription also invalidates pending hydration. Both the
store and SDK check account ownership before publishing asynchronous results.
The SDK additionally invalidates pending asset additions on removal, and ignores
old callbacks after clearing the list. A direct balance confirmation can replace
a stale nonzero value, but cannot overwrite a newer live update.

Account selection invalidates balances, transaction history, deposit notifications,
and pending multisig transactions before any asynchronous wallet-provider work.
SDK logins are serialized and only the most recent selection may publish state;
balance hydration does not delay a later account selection. Cross-tab account
changes reconnect the SDK and its subscriptions instead of changing only the
displayed address. History reads and subscription parsing discard results after
an account change or history reset, including an A → B → A switch.

An unsuccessful balance read is not an empty portfolio. SDK hydration propagates
failed asset reads, and the wallet keeps `accountAssetsLoaded` false until every
requested asset has loaded successfully. Existing loading placeholders therefore
remain visible instead of reporting zero funds after a connection failure.
Transient hydration failures retry automatically after 1, 2, and 4 seconds;
account switches and subscription resets cancel pending retries immediately.
After those attempts fail, balances remain unknown until reconnection or an
explicit refresh starts a new hydration attempt.

Staking account resets clear cached stake, rewards, and ledger data together with
pending reads. Subscription generations reject old initialization results and
live emissions, while the active subscription continues applying updates after
its first emission. Polkamarkt clears positions and trades synchronously when
the account, network, or indexer changes; a manual refresh of the same account
preserves its visible snapshot while the new data loads.

Page subscription lifecycles reset synchronously and let the newly selected
account load without waiting for a stalled request from the previous account.
Each subscription action must therefore invalidate its own pending setup and
callbacks during reset. Only the latest lifecycle controls the page's loading
state. Open-order snapshots also reject out-of-order reads within one account,
and switching accounts clears selected cancellation orders and paged streams.

`TokenBalanceSubscriptions` clears its value when subscription setup fails or
the stream errors or completes. Replacing a key closes the old stream, and late
callbacks from that stream cannot update the replacement. Consumers must keep
an invalidated balance unknown; falling back to a cached wallet amount would
undo the invalidation and could enable a transaction using stale funds.

Pool subscriptions register teardown before waiting for their first balance.
An account switch cancels pending discovery and LP reads, and only the owning
account's generation can update positions or complete its readiness signal.
Failed or empty balance streams reject readiness instead of leaving the page
waiting indefinitely. Add-liquidity clears its direct balance overrides when
subscriptions restart, so they cannot mask the new account's wallet snapshot.

Points and referral pages refresh on account identity changes even when login
status stays true. They clear the previous account's metadata immediately and
reject delayed responses, including a switch back to the same address. Points
recalculate when wallet holdings or liquidity arrive after indexer metadata;
liquidity subscriptions restart on account changes and stop when leaving the
points page.

## Preparing Polkamarkt transactions

Wallet preparation can pause a transaction while the user changes the form or
account. Capture the intended account, market, trade terms, and quote when the
user submits. Immediately before executing, verify those values and current
balance requirements again. Reject changed or abandoned requests, including
claims after market navigation, rather than combining a new amount or market
with an earlier quote or receipt.

Trades and claims require a valid positive network fee estimate and enough
transferable XOR to cover it. An unavailable estimate must remain unknown,
including when fee estimation fails. Trader payouts and creator-fee claims use
their own estimates so each action is checked against its actual fee. Account
and network changes invalidate outstanding quotes, claim reads, and receipts.

## Validation

Regression coverage includes native versus ORML freeze rules, balance increases
and decreases to zero, fee availability after SDK updates, and account-switch
subscription ownership. Relevant suites live in:

- `tests/unit/lib/substrate/sdk/assets/`
- `tests/unit/stores/wallet/index.spec.ts`
- `tests/unit/composables/useSubscriptions.spec.ts`
- `tests/unit/stores/{pool,staking,vault,referrals,orderBook,dashboard}/index.spec.ts`
- `tests/unit/lib/substrate/sdk/{poolXyk,mst}/index.spec.ts`
- `tests/unit/views/{PointSystem,PointSystemV2,ReferralProgram}.spec.ts`
- `tests/unit/stores/swap.spec.ts`
- `tests/unit/composables/useSwapBalanceSubscriptions.spec.ts`
- `tests/unit/components/pages/Swap/Widget/Form.spec.ts`
- `tests/unit/features/polkamarkt/components.spec.ts`
- `tests/unit/utils/subscriptions.spec.ts`

For a new discrepancy, collect the public account address, selected node,
screen, block number, and total/transferable values. Check the same account
and chain state before attributing a discrepancy to browser caching.

## Production deployment — 2026-10-05

The account-switch freshness fixes are deployed at `https://polkaswap.io`.
Production CIDv1 is
`bafybeid27alfiwxd5pzvhb4ybqizfvxe7qavg6iizozfdtbffdgr4jubnq`, replacing
`bafybeicnjvvhl6tyrjdi3gfrc4bggvr5ttudw34hvztaqebb2dx7j4u6ky`.
The separately published testnet DAG is
`bafybeifxs7pq3kzb746eh6cfs6a5n6sn6537mb5h3vs4jbs5v62jf3gqzi`.

The release preserves the shipped Store configuration, Sora Pay package, Bots,
Polkamarkt, referral bonding fixes, and the complete 45-route catalog. Production
and testnet DAGs were imported separately into the approved Pi origin; all 34
recursive pins passed integrity verification. Bunny's production origin was
updated and its full pull-zone cache purged. All 100 required entry and Swap
assets returned complete, matching bytes through both the origin and Bunny.

Validation passed 13,878 unit tests and 13 translation tests. Candidate and live
WebKit checks passed for Swap, Bots, Store, Buy XOR, and Get TS. A final live Swap
check confirmed `Swap - Polkaswap`, mounted UI, the expected production CID,
and zero failed requests or console errors. The browser checks verify release
loading and RPC connectivity; account-switch races are covered by the mocked
regression suites above. No wallet transaction was submitted.

Local release evidence, source hashes, CAR files, checksums, logs, and browser
screenshots are retained under `output/deployments/account-data-20261005/`;
`release.json` records the completed deployment.
