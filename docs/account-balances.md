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

`TokenBalanceSubscriptions` clears its value when subscription setup fails or
the stream errors or completes. Replacing a key closes the old stream, and late
callbacks from that stream cannot update the replacement. Consumers must keep
an invalidated balance unknown; falling back to a cached wallet amount would
undo the invalidation and could enable a transaction using stale funds.

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
- `tests/unit/stores/swap.spec.ts`
- `tests/unit/composables/useSwapBalanceSubscriptions.spec.ts`
- `tests/unit/components/pages/Swap/Widget/Form.spec.ts`
- `tests/unit/features/polkamarkt/components.spec.ts`
- `tests/unit/utils/subscriptions.spec.ts`

For a new discrepancy, collect the public account address, selected node,
screen, block number, and total/transferable values. Check the same account
and chain state before attributing a discrepancy to browser caching.
