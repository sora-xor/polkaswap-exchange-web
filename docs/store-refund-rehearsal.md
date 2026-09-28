# Private refund signer rehearsal

The regular wallet Send form has no payment-reference input. Automatic refund matching uses a comment-bearing native XOR transfer so the relay can verify finalized outgoing evidence. The optional refund panel reuses the Store wallet adapter, normal wallet unlock/fee checks, and Sora Pay widget. It exists only in explicit `store-rehearsal` development mode on `http://127.0.0.1:41829`, when `PS_STORE_REHEARSAL_REFUND_HANDOFF` points to a reviewed private artifact. Production constant folding removes its component/import. There is no production refund route or operator endpoint. This explicit mode disables HMR and all filesystem watching; file changes cannot automatically reload a prepared checkout. Restart deliberately to pick up changes, after preserving or clearing any prepared order.

Before preparing an artifact, the operator privately fetches the authenticated order/refund obligation, confirms the order’s saved refund policy, exact quoted refund amount and original paying wallet, acquires the real relay refund-attempt lease and securely persists that lease. The real operator token/attempt token and order recovery capability never enter this artifact or browser. Derive the signing `PaymentRequest` solely from the reviewed obligation and original native-chain identity: group wallet as payer, verified original payer as recipient, exact `amountCodec` and public refund reference. Give this signing request a fresh bounded `expiresAt`, at most 30 minutes from review; the original quote may already be expired. Do not mutate the original order. Finalized refund matching permits the original expiry while checking exact chain/asset/accounts/amount/reference.

Version 1 orders (including missing policy snapshots) keep their original full-XOR terms and require a separately funded refund fee. For version 2, prepare a fresh trusted relay quote and sign its exact net amount; never subtract the original payment’s network fee or charge a correction transfer again. A draft without `amountCodec` cannot be signed. Use the relay’s finalized fee evidence and correction obligation to reconcile the quote; the local signer does not establish final refund completion.

A separate, explicit customer agreement may amend an unsigned version 1 refund without rewriting the original policy. Its saved `agreedDeduction` records the deduction, consent identifier and timestamp. For the agreed example, 5.453596 XOR less 0.11 XOR gives an exact transfer of 5.343596 XOR. This agreed deduction is not the actual SORA network fee: finalized fee evidence is displayed separately and never subtracted again. A lower or unavailable actual fee does not create an automatic correction for this fixed agreement. The receipt shows the agreed transfer amount while pending and labels it returned only after finalized evidence; public checkout and standard refund policies are unchanged.

If the payer has already received an exact refund through a direct `assets.transfer` without a comment, do not send it again. A protected, explicit operator reconciliation may bind that canonical finalized transfer to the saved refund intent after exact chain, asset, account and amount checks. The separate `verifyFinalizedRefund` boundary accepts its audited `operator-bound` receipt; ordinary payment verification and automatic reference matching stay strict. The stored/downloaded receipt preserves the original expected reference in `request` and `reconciliation.expectedReference`, while the actual evidence keeps `reference: null` and `transferKind: 'assets-transfer'`. It never invents an on-chain comment. The receipt displays the verified transaction and existing refund amounts; operator audit notes and credentials are not exposed. This support does not itself prove a live reconciliation occurred.

The handoff must be a regular, single-link, current-user-owned **0600** file directly under `/Users/takemiyamakoto/dev/sora-pay/private` (**0700**, canonical non-symlink directory), named `refund-rehearsal-<lowercase-id>.json`. Exact shape:

```text
{
  "version": 1,
  "orderId": "<UUIDv4 from the authenticated order>",
  "paymentRequest": {
    "version": 1,
    "merchant": { "id": "polkaswap-community-store", "name": "Polkaswap Community Store" },
    "chainGenesisHash": "<original SORA mainnet genesis>",
    "assetId": "<native XOR asset>",
    "payer": "cnWUWKLZmNjQXGzYAF7YuRSiW1pKTRTzu4fmcYmWQX6UMGQUZ",
    "recipient": "<verified original payer from refund obligation>",
    "amountCodec": "<exact amount from refund obligation>",
    "decimals": 18,
    "denomination": "<verified current original-chain denomination>",
    "reference": "<public sp_... reference from refund obligation>",
    "expiresAt": "<fresh bounded ISO timestamp>"
  }
}
```

Unknown fields, credentials, non-native assets, a different payer/network, noncanonical recipient or self-payment fail closed. Nothing reads the file unless the explicit opt-in environment variable is supplied. Never point at a generic operator-response file containing customer data.

The middleware returns only the reviewed request/order ID, its SHA-256 identity and status. Browser claims include that exact digest/order ID; stale tabs cannot claim a different handoff after restart. Before wallet signing, it exclusively creates and fsyncs `<handoff>.claim.json` with an unrelated local claim token. The permanent claim prevents repeated signing across tabs and process restarts. Separate owner-only `.uncertain.json`, `.submitted.json` or `.canceled.json` files record outcomes. The browser cannot change the request or forward operator API calls.

Even a proven prebroadcast cancellation leaves the local claim locked: the operator reviews/releases the real relay lease and prepares a fresh reviewed handoff if appropriate. Never delete a journal to force another send. Timeout, lost callback, crash or uncertain submission requires chain reconciliation. The final `.submitted.json` contains the transaction hash for the operator to report with the separately protected real lease. That hash remains a hint; only the relay's finalized outgoing evidence and refund receipt establish completion.

The endpoint requires exact loopback peer/Host, same-origin fetch metadata and a custom header. POSTs additionally require the exact Origin and bounded JSON bodies. The artifact/journal remain outside frontend assets. No request bodies or secrets are logged. Failed refresh removes the payable UI. The local widget never claims finality. Closing the refund view disables connection and the signing hooks immediately. A claim that returns after the view closes is recorded as canceled when possible but stays permanently locked; delayed wallet-unlock callbacks cannot invoke the signer.

To enable the panel, add `PS_STORE_REHEARSAL_REFUND_HANDOFF=/Users/takemiyamakoto/dev/sora-pay/private/refund-rehearsal-<id>.json` to the existing explicit rehearsal command:

```sh
PS_STORE_REHEARSAL_RELAY_URL=http://127.0.0.1:39849 \
PS_STORE_REHEARSAL_REFUND_HANDOFF=/Users/takemiyamakoto/dev/sora-pay/private/refund-rehearsal-<id>.json \
node .yarn/releases/yarn-4.10.3.cjs vite --mode store-rehearsal
```

Substitute a real reviewed filename before running. The connected wallet must be the group wallet. Its owner reviews payer, recipient, exact amount/reference and live estimated fee before signing. This does not replace the private operator queue or automate customer messages. Unit tests create only synthetic local fixtures; no real artifact, order, transfer, refund or signature is created by tests.
