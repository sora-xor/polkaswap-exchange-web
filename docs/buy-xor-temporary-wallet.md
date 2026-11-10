# Temporary Ethereum wallet for card purchases

Added 9 October 2026. On `/#/buy-xor`, card buyers need only a SORA wallet. The page opens an Ethereum purchase wallet for the connected SORA account and keeps it encrypted in this browser. It signs the purchase's Ethereum steps itself and shows them as a step list. Buyers can still connect their own Ethereum wallet (MetaMask, WalletConnect and others work as before); that wallet then asks them to confirm each step. `/#/get-ts` keeps the manual flow: a temporary wallet made by hand, with an approval dialog before every transaction.

**Update, 10 October 2026: ETH goes straight to SORA.** The card route no longer swaps the ETH for DAI on Ethereum. The purchase wallet sends the delivered ETH to the buyer's SORA account in one bridge transaction, and the buyer swaps ETH for XOR on SORA (Buy XOR's price-impact limit is 15%). The sections below describe this route; [buy-xor-flow.md](buy-xor-flow.md) has the overview.

## Why

The card route is card → MoonPay delivers ETH → ETH is bridged to SORA → ETH is swapped for XOR. (Until 10 October 2026 the ETH was first converted to DAI and the DAI bridged.) An Ethereum account must receive the ETH and sign the bridge transfer. Until now that meant installing an Ethereum wallet app, even though Polkaswap is a SORA app. With the purchase wallet the buyer connects their SORA wallet, pays by card in MoonPay's checkout on the page, and confirms only the final swap to XOR.

## What the buyer sees (Buy XOR, card)

1. **Start screen.** The card route's steps say that a SORA wallet is enough (`buyXor.start.steps.walletsCard`, `card` and `sendCard`).
2. **Wallet step.** Only the SORA wallet is required. A note says that card payments use a temporary Ethereum wallet on the page, with a **Use my own Ethereum wallet instead** button.
3. **Purchase step.** **Your purchase** lists five steps: Pay by card, MoonPay sends ETH, Send ETH to SORA, ETH arrives on SORA, Swap ETH for XOR. (When it finishes DAI left from the earlier route, the last three name DAI.) Done steps are ticked, and the current step has one sentence on what is happening. A sentence under the heading says who signs: the page (temporary wallet) or the buyer's Ethereum wallet.
4. **Paying.** The cost review and **Copy address and open MoonPay** work as before. MoonPay still needs the address pasted (see below). The button waits until the purchase wallet is ready.
5. **Waiting for MoonPay.** The step offers **My purchases** (the MoonPay order history) and **Review a new card purchase**, for a checkout that was closed or a payment that failed.
6. **After the ETH arrives.** The page sends the ETH, minus the transfer's gas, to the connected SORA account in one bridge transaction. The buyer confirms the last step, ETH → XOR, in their SORA wallet.
7. **When a step stops.** The step list says why: too little SORA liquidity, a stopped bridge transfer, or a purchase wallet that cannot be opened. **Try again** runs that step again. Ethereum reads that fail are simply retried on the next pass.
8. **Purchase wallet.** This collapsed section shows the address and the backup controls: show, copy or download the recovery phrase, or restore a wallet.
9. **Closing the page.** Once the wallet is saved, reloading or closing the page is safe. The purchase continues when the buyer comes back with the same SORA account.

## Purchase wallet storage

- There is one wallet per SORA account, made on first use (`openTemporaryPurchaseWallet(owner)`).
- **Where it is kept.** IndexedDB database `polkaswap-temporary-wallet-v1`, store `vault`, keyed by the SORA address. The phrase is encrypted with AES-GCM-256 under a random, non-extractable WebCrypto key stored in the same record. The additional authenticated data binds the ciphertext to the wallet address and the SORA account.
- **Who can read it.** Other sites cannot read it (same-origin storage). Tools that copy browser storage get ciphertext and a key that cannot be exported. Code running in the Polkaswap page can still use the key; this is the same trust as the in-browser SORA wallet.
- **When storage fails.** If the browser refuses storage, the wallet lives in page memory, and the payment button stays disabled until the buyer confirms they saved the recovery phrase.
- **A record that cannot be decrypted** is never overwritten. The step list reports it and opens the restore controls.
- **Recovery.** The phrase can still be copied or downloaded, and any Ethereum wallet app can import it (BIP-39, `m/44'/60'/0'/0/0`).

## Automatic signing

- `createBuyXorPurchasePolicy` lets the page sign without the dialog only these transactions from the purchase wallet:
  - the bridge transfer of ETH (`sendEthToSidechain`) to the connected SORA account (its public key, compared as bytes32);
  - for DAI left in the wallet by the earlier DAI route: the DAI allowance for the SORA bridge contract (any amount, including unlimited) and the bridge transfer of DAI to the connected SORA account.
  - The ETH → DAI swap is no longer signed automatically (10 October 2026).
- Everything else opens the approval dialog: another SORA account, other contracts, plain ETH transfers, another sender. The step list sets the policy when it opens the wallet. Leaving or disabling the purchase, logging out, changing either account or Ethereum provider/network, or closing the wallet clears it. The policy also checks that captured purchase context on each request, before queued UI updates can run.
- Wallet opening, conversion and bridge preparation recheck the active purchase after asynchronous work. Switching accounts or leaving the purchase cannot connect a stale wallet or submit a newly prepared transfer for the previous context. Transactions already submitted keep their existing receipt tracking.
- Automatic signing uses the same fee planning and checks as the dialog: fresh nonce, balance and base fee. If fees rise, the fees are planned again, up to three times; after that the step stops with "Ethereum network fees kept rising".
- For a bridge transfer, the dialog names the receiving SORA account and warns when it is not the connected one. The **To** row alone shows only the bridge contract.
- Nothing on SORA is signed automatically: the buyer's SORA wallet signs the ETH → XOR (or DAI → XOR) swap.

## How the step list decides what to do

`useBuyXorCardRun` checks every 12 s, and whenever the purchase record or the progress readers change.

- **Position.** It comes from the purchase record (`useGetTsPlan`: card draft, bridge draft and reference, swap reference, and the swap asset) and the existing receipt readers, never from balances alone.
- **Temporary wallet.** The whole ETH balance goes to SORA:
  - The transfer's gas is estimated for the exact `sendEthToSidechain` call. `planBuyXorBridgeAmount` keeps back 1.25 × that gas at `2 × baseFee + 3 gwei` (the wallet's highest tip), plus 5 %, so the wallet's own fee plan always fits.
  - ETH below what a transfer needs at the current base fee (`isBuyXorBridgeableBalance`: 0.0005 ETH plus the reserve) is left alone and sent together with the next delivery. This covers the reserve left after a purchase; that balance is not looked at again until it changes or five minutes pass.
  - DAI left by an interrupted DAI-route purchase goes to SORA when no new ETH is waiting; the swap step then sells DAI. A purchase whose ETH → DAI conversion was already recorded moves that DAI on.
- **Own wallet.** The wallet may already hold ETH, so the step list records its balance when the checkout opens, in session storage `polkaswap:buy-xor:checkout-baseline:v1`. It sends exactly the reviewed amount once at least that much has arrived since.
- **Bridge.** The step list creates the guided bridge row exactly as the bridge page does (tag `buyXorFunding: 'ethereum-eth-v1'` for ETH) and lets the bridge store run it. Before signing, the bridge store re-quotes ETH → XOR on SORA within the 15% limit.

## MoonPay cannot be pre-filled

MoonPay rejects a widget URL that carries `walletAddress` unless the URL is signed with the partner's secret key ([URL signing](https://dev.moonpay.com/docs/ramps-sdk-url-signing)). A static IPFS site cannot hold that key, so the buyer still pastes the address into MoonPay. The **Copy address and open MoonPay** button copies it, and the dialog shows it again with its own copy button (the buyer may copy a card number in between). Skipping the paste needs a small signing endpoint on the existing relay host with the MoonPay secret key; that is not part of this change.

## Security model

- **Key**: `Wallet.createRandom()` from ethers 6 (browser build: `crypto.getRandomValues`), a standard 12-word English BIP-39 phrase on path `m/44'/60'/0'/0/0`. Any Ethereum wallet app can import it.
- **Storage**: purchase wallets as described above. Wallets made by hand with **Make a temporary wallet** (Get TS, or the wallet list) stay in page memory only: nothing is written to `localStorage`, `sessionStorage`, IndexedDB, the purchase plan, telemetry or logs. While such a wallet is open, the page asks before the tab closes (`beforeunload`).
- **Backup**: the user's explicit **Copy phrase** or **Download as a file** (plain text, `polkaswap-temporary-wallet-<address prefix>.txt`). The word list and the restore field carry `translate="no"`; the field also disables autocomplete, autocorrect and spellcheck, so browser translation and spelling services do not receive the words. Restore accepts any valid English BIP-39 phrase and warns not to enter a main wallet's phrase.
- **Signing**: only `eth_sendTransaction`. The purchase transactions above are signed automatically; all others only after **Approve** in the dialog. Message signing (`personal_sign`, `eth_sign`, typed data), `eth_signTransaction`, raw broadcasts from the app, contract creation, the zero address, other chains and EIP-4844/EIP-7702 fields are refused. The wallet takes only `to`, `data`, `value` and the gas limit from the app; it sets nonce and fees itself.
- **Fees**: tip = median of the last 10 blocks' median tips, bounded to 0.05–3 gwei; `maxFeePerGas = 2 × baseFee + tip`, capped at 500 gwei; gas limit = estimate + 25 % when the balance covers it. When it does not, the plain estimate is used, then the highest fee cap the balance allows, as long as it still covers one maximal base-fee rise (+12.5 %).
- **Approval**: at the click, the nonce, balance and base fee are read again. The shown fee cap is kept while it still covers a base-fee rise plus its tip. If new figures would cost more than what was shown, the dialog shows them with "Network fees went up" and asks again. The user never signs a higher maximum cost than the one on screen.
- **Network**: reads and broadcasts go to `https://ethereum-rpc.publicnode.com`, then `https://eth.drpc.org` on transport errors, rate limits or internal errors only. Both answered browser CORS from `https://polkaswap.io` on 9 October 2026, and publicnode rejected an unfunded signed transaction with "insufficient funds". A rebroadcast after a timeout is safe: the same signed transaction has the same hash, and "already known" counts as sent. Requests carry no credentials and refuse redirects.
- **Limits**: code running in the page can use the key. The wallet is only as available as the public endpoints. Some ETH is left after each purchase because the fee reserve assumes the fee cap (2 × base fee plus the highest tip) while the transfer usually pays base fee plus tip. With one bridge transfer of about 26,000 gas at a 1 gwei base fee, roughly 0.00014 ETH (about 0.35 USD) stays in the purchase wallet; on the DAI route it was about 0.0014 ETH. This is an estimate, not a measured purchase. The next card purchase sends it together with its own ETH, and the phrase recovers it at any time.

## Code

| File                                                                    | Role                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/connection/evm/temporaryWallet.ts`                           | Key creation and restore, EIP-1193 provider, fee planning, RPC transport, backup file text, and the purchase wallet per SORA account (`openTemporaryPurchaseWallet`, `openSavedTemporaryPurchaseWallet`, `forgetTemporaryWallet`). `TemporaryWalletAppProvider` is passed to `web3Store.selectEvmProvider`, so the cost review, the conversion and the bridge use it like MetaMask. |
| `src/utils/connection/evm/temporaryWalletVault.ts`                      | Encrypted IndexedDB records of purchase wallets.                                                                                                                                                                                                                                                                                                                                    |
| `src/utils/connection/evm/temporaryWalletSession.ts`                    | Reactive state without `ethers`: open address, whether it is saved, the request waiting for approval, approve/reject, the automatic-signing policy, the unload guard. The app shell imports only this.                                                                                                                                                                              |
| `src/features/misc/lib/buyXorCardPurchase.ts`                           | Step states, bridge transfer sizing (`planBuyXorBridgeAmount`, `isBuyXorBridgeableBalance`) and the signing policy.                                                                                                                                                                                                                                                                 |
| `src/features/misc/composables/useBuyXorCardRun.ts`                     | Moves the purchase on after payment and resumes it after a reload.                                                                                                                                                                                                                                                                                                                  |
| `src/features/misc/components/buy-xor/BuyXorCardRun.vue`                | The step list on the purchase step: failures with **Try again**, the restart while waiting for MoonPay, and the purchase wallet section.                                                                                                                                                                                                                                            |
| `src/features/misc/components/buy-xor/TemporaryWalletPanel.vue`         | Offer, backup, restore, reconnect and close screens. Used in the step list's purchase wallet section and in `GetTsWalletSetup`: on the Get TS card route's Ethereum step, and in the connected-wallets list while a temporary wallet is open.                                                                                                                                       |
| `src/features/misc/components/buy-xor/TemporaryWalletRequestDialog.vue` | Approval dialog, mounted lazily by `AppShellOverlays` while a request waits, so it also works on `/#/bridge`.                                                                                                                                                                                                                                                                       |
| `src/features/misc/lib/temporaryWalletAction.ts`                        | Names the ETH or DAI bridge transfer, the DAI approval and the conversion for the dialog and the policy, only for the exact purchase contracts and only when the conversion pays DAI back to the signing wallet.                                                                                                                                                                   |

The wallet is not added to the general EVM wallet chooser.

Copy lives in `src/features/misc/temporaryWallet.en.json` (`temporaryWallet.*`) and `src/features/misc/buyXor.en.json` (`buyXor.run.*`, `buyXor.start.steps.*`). Claude (an AI model) translated it for the 27 modern locales, following each catalog's existing terms; Akkadian, Egyptian and Pijin come from scoped runs of `scripts/lang/semantic-locales.ts`. No native speaker has reviewed these translations. Dhivehi and Dzongkha are the least certain.

## Verification (9 October 2026, DAI route)

The ETH route of 10 October 2026 is covered by the same unit test files (rewritten for ETH: sizing, policy, the step list, the run, the cost review) plus `getTsPlan`, `getTsBridgeProgress`, `getTsSwapDraft`, `getTsSwapProgress`, `tonswapBridgeLiquidity` and `getTsPlanQuote` cases for ETH. The checks below are from the DAI route.

- **Unit tests**:
  - Wallet: `tests/unit/utils/connection/evm/temporaryWallet.spec.ts` and `temporaryWalletVault.spec.ts`. Both run in the Node environment, because ethers' Node crypto returns Buffers from another realm under jsdom. Also `temporaryWalletSession.spec.ts`.
  - Buy XOR: `tests/unit/features/misc/buyXorCardPurchase.spec.ts`, `useBuyXorCardRun.spec.ts`, `BuyXorCardRun.spec.ts`, `TemporaryWalletPanel.spec.ts`, `TemporaryWalletRequestDialog.spec.ts` and `temporaryWalletAction.spec.ts`.
  - Updated: the `GetTsWalletSetup`, `GetTsPage`, `Moonpay`, `overlays` and `buyXorStart` specs.
  - Coverage includes: a run through ethers `BrowserProvider`/`JsonRpcSigner` (rejection → `ACTION_REJECTED`, shortfall → `INSUFFICIENT_FUNDS`); fee fitting and approved-cap reuse; the fee-rise re-approval; nonce tracking; refused methods and fields; RPC fallback.
  - Also covered: the vault's lifecycle; the policy's accepted and refused transactions; sizing and the leftover threshold; the own wallet's balance baseline across a reload; failure, retry and restart. The new checks were mutation-tested.
  - Release regressions cover automatic approval cleanup on disposal, immediate policy rejection when the purchase/account/network changes, an account switch while its saved wallet opens, and cancellation before bridge submission when funding preparation finishes for an inactive purchase.
- **Browser check** on a scratch production build, with the public Ethereum RPC stubbed inside the page (the stub refused every broadcast) and a fake SORA login:
  - The purchase wallet was created, and came back from the vault after a reload.
  - With 0.0014 ETH left over, the step list stayed on Pay by card and asked for no price. When a delivery was added, it moved to Swap ETH for DAI.
  - On localhost the price relay refuses requests, so the step stopped with "No price is available right now", and **Try again** ran it again.
  - A DAI allowance for the bridge and a bridge transfer to the connected SORA account were signed with no dialog.
  - A plain ETH transfer and a transfer to another SORA account opened the dialog. The dialog named the SORA account and warned; **Reject** returned 4001.
  - The dialog's warning text measured 6.1:1 contrast in the light theme and 6.5:1 in dark, and the dialog fit at 375 px.
  - The own-wallet mode is covered by unit tests only: the test browser has no wallet extension.
- **Live read-only cost review** through a new, empty temporary wallet wrapped in ethers `BrowserProvider` (as the app connects it), at 2026-10-08 17:05 UTC: `allowed: true` for a 25 USD card budget.
  - MoonPay would deliver 0.00845673 ETH (fee 3.86 USD).
  - 0.00485935 ETH converts to 11.60 DAI (2.45 % price impact on SORA, about 2.00 XOR spendable).
  - 0.00222412 ETH is reserved for the conversion and 0.00122326 ETH for the approval and bridge transfer (simulated with `eth_simulateV1`).
  - Chain ID, accounts, state-override gas estimates and the simulation all went through the wallet's provider. There was no signature and no order.
  - Script and evidence: `output/tonswap-growth/audit-card-readiness-temporary-wallet.ts` and `buy-xor-temporary-wallet-readiness-live.json` (git-ignored).
- **Not done**: a funded end-to-end card purchase. MoonPay only frames on approved origins, so the checkout itself can only be tried on polkaswap.io.
