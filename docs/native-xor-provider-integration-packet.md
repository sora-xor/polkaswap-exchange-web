# Native SORA2 XOR: provider integration packet

Prepared 25 September 2026 for technical diligence; scope updated 26 September. **Local preparation only; this packet has not been sent externally.** Feasibility inquiries to ChangeNOW, Guardarian, GateHub, Banxa and Transak are recorded in the [integration decision](direct-card-native-xor-plan.md). These inquiries do not establish provider approval, available native checkout, committed liquidity or agreed commercial terms.

## Delivery requirement

**Card payment → native XOR in the customer's own SORA2 mainnet account.** The receiving customer should need no Ethereum wallet, intermediate asset, bridge signature or initial gas. The quote must bind the receiving account, total fiat charge, net native amount and expiry. Any later TONSWAP burn is a separate customer decision and signature; it is not part of native XOR delivery.

Active model following the user's 26 September decision: provider-managed native network integration, sourcing and delivery. The Polkaswap-operated native-XOR inventory/payout alternative is deferred. ChangeNOW/Guardarian and GateHub have received the focused feasibility requests recorded in the [integration decision](direct-card-native-xor-plan.md); this full packet remains unsent. An ordinary consumer ETH on-ramp cannot be redirected into an operator wallet and described as this service.

## Network and asset identity

| Field | Integration value or verification requirement |
| --- | --- |
| Network | SORA2 mainnet, Substrate runtime; not Ethereum XOR and not the separate Iroha/Nexus network |
| Genesis | `0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5` |
| Native XOR asset ID | `0x0200000000000000000000000000000000000000000000000000000000000000` |
| Public read endpoint | `https://ws.mof.sora.org/`; WebSocket `wss://ws.mof.sora.org`. Public access is not a provider SLA or archive commitment. |
| Destination | Checksum-validated 32-byte account; the existing adapter canonicalizes to SS58 prefix `69`. Reject abbreviated or malformed addresses. |
| Units | Existing native adapter uses XOR metadata and integer codec amounts. Read `assets.assetInfosV2({ code: assetId }).precision` and `denomination.denominator()` at the same finalized block before agreeing provider units. No current denominator value is asserted in this packet. |
| Versioning | Capture finalized block/hash, runtime version, precision and denominator with the integration vectors. Revalidate before settlement; stop on incompatible metadata changes. |

Source references: [network/asset binding and address validation](../src/features/store/client.ts), [live metadata, fee and amount checks](../src/features/store/walletAdapter.ts), [native asset constants](../src/lib/substrate/sdk/assets/consts.ts), [finalized metadata validation](../../sora-pay/packages/relay/chain.ts).

[Public network observation at 2026-09-25 12:44:00 UTC](../output/tonswap-growth/native-xor-readiness-network-2026-09-25.json): `system_chain` returned `SORA`; `system_properties` returned `ss58Format: 69`, `tokenDecimals: 18`, `tokenSymbol: XOR`; health reported 35 peers and `isSyncing: false`. These time-specific properties do not establish the business denomination or replace the finalized asset/denominator queries required above. Genesis verification is retained in the adjacent finalized liquidity evidence below.

**Market-data IDs are supporting diligence only.** Do not use a ticker match, ERC-20 listing, migrated display unit or exchange price as proof of native asset identity. The applicant must confirm the correct current market-data references and denomination explanation for the provider's listing team. The network genesis and native asset ID remain the settlement identifiers.

## Minimum technical handoff

The following can be assembled without moving funds. Existing code is reference material, not a deployed payout service.

| Deliverable | Available now | Remaining verification |
| --- | --- | --- |
| Address and amount vectors | Existing adapter and [unit tests](../tests/unit/features/store/walletAdapter.spec.ts) validate native codec amounts, network changes and fees. At precision 18, the arithmetic vector `1.234567` maps to `1234567000000000000` codec units, with an exact round trip. | Capture current finalized precision/denominator and agree display-to-codec semantics with the provider. Test fixture denominator values are not live-chain evidence. |
| Native payout call and fee estimate | The [wallet adapter](../src/features/store/walletAdapter.ts) builds the constrained native transfer, obtains the actual call's `paymentInfo`, checks positive fee evidence, and guards the account/network again before submission. | Provider must choose and approve its payout call, signer/custody, fee payer, reference format and recipient minimum. Read current existential-deposit and transfer rules; do not assume a receiving account needs no minimum balance merely because it pays no transaction fee. |
| Finalized receipt verification | The [existing payment reader](../../sora-pay/packages/relay/chain.ts) checks finalized canonical blocks, successful extrinsics and the actual asset, caller, recipient, amount and reference. It rejects mismatched genesis and missing historical evidence. | Adapt verification to the approved payout call/event. Agree provider receipt schema and chain finality policy. Establish approved historical RPC coverage for recovery. |
| Durable reconciliation | The [existing goods-payment store](../../sora-pay/packages/relay/store.ts) demonstrates encrypted records, idempotency and finalized evidence processing. | A separate purchase ledger, inventory reservations, provider order reconciliation and isolated payout signer are needed. The existing service intentionally has no spending keys. |
| Receiving wallet | [Wallet setup](../src/features/misc/components/burn/GetTsWalletSetup.vue) and [Google-backed account creation](../src/lib/soraneo-wallet/src/services/google/wallet/accounts.ts) are existing SORA account paths. | Validate account creation, backup and restoration on supported devices. Google availability depends on configuration; password/backup steps still exist. |

A provider-facing vector set should include: valid and invalid destinations; the smallest supported payout and precision boundary; wrong genesis; changed denominator; unavailable fee; failed extrinsic; unfinalized transfer; wrong recipient/amount; and duplicate receipt. Values must come from an agreed finalized metadata snapshot. No real recipient, customer data or signing material is required for these read-only vectors.

## Liquidity evidence and its limits

At **2026-09-25 12:40:56 UTC**, finalized SORA2 block **27,774,401**, hash `0xf2d731f842d0c47ddc965f11c100e7b3d47ece049beee87e45ada0973a2fbfea`, public DAI→XOR quotes returned:

| Native DAI input | Price impact, truncated to four decimals | Within the checkout's current 5% limit |
| ---: | ---: | :---: |
| 5 | 1.1170% | Yes |
| 25 | 5.3465% | No |
| 50 | 10.1503% | No |
| 100 | 18.4300% | No |

[Raw finalized evidence](../output/tonswap-growth/native-xor-readiness-liquidity-2026-09-25.json) retains chain amount and fee fields. Quotes used DEX `0`, desired input, and the checkout's allowed `XYKPool`/`OrderBook` sources. Native DAI asset ID: `0x0200060000000000000000000000000000000000000000000000000000000000`. The genesis was verified; no account, order, signature or transfer was involved.

These are **SORA DAI inputs, not USD card budgets**, provider offers, net payouts or guaranteed execution. Passing the impact threshold alone does not establish sufficient network fees or route availability. The [liquidity evaluator](../src/features/misc/lib/tonswapLiquidity.ts) also applies conservative conversion/slippage allowances and requires positive fee evidence; a generic XOR purchase reserves the swap fee, while a TS plan additionally reserves its burn fee. Checks expire after 30 seconds and the eventual swap requires a fresh quote.

The current liquidity constraint is demonstrable before wallet setup. The [preview](../src/features/misc/lib/getTsPlanQuote.ts) labels external routes as partial because Ethereum gas is additional; [wallet setup](../src/features/misc/components/burn/GetTsWalletSetup.vue) subsequently requires Ethereum plus SORA accounts for the card/Ethereum route, and TON plus Ethereum plus SORA for the supported TON route. Wallet friction is therefore real, but there is no verified funnel measurement here proving which factor causes the most abandoned purchases.

Direct inventory delivery removes those customer steps; it does not create inventory or replenishment liquidity. A provider comparison needs timestamped executable all-in quotes at supported retail sizes, source-market depth, inventory ownership, fee reserves, replenishment limits and refund capacity. Do not extrapolate a fixed maximum order from this snapshot, increase the impact limit to claim feasibility, or assume splitting orders removes cumulative price impact.

## Precise unanswered provider and business fields

| Owner | Required answer before implementation or launch |
| --- | --- |
| Provider | Will it integrate this exact native network and asset? Which product and asset/network IDs? Is provider-managed settlement available, or is partner fulfillment explicitly permitted? |
| Provider | Listing/integration price, recurring minimums, supported customer countries/card methods, per-order limits, all-in spread/fees, settlement currency and timing. None is agreed. |
| Applicant | Correct contracting entity, registered address, authorized signatory, token-sale history and required legal/whitepaper/terms/privacy materials. Do not infer these from the contact email or website. |
| Provider + liquidity owner | Accepted sourcing venue or inventory partner, custody model, executable depth, capital amount, replenishment policy, native fee reserve, payout limits and refund funding. No inventory or treasury commitment is made. |
| Provider + engineering | Sandbox and production access, signed session API, authenticated webhook/reconciliation API, payment status permitting payout, destination binding, order expiry and idempotency contract. |
| Provider + operations | KYC/fraud duties, chargeback and refund liability, failed/late delivery handling, support owner and escalation/SLA. |
| Engineering + provider | Current finalized unit/version vectors, approved payout call, finalized receipt format, archive/recovery coverage and behavior on runtime or denomination changes. |

Primary intake references: [Transak partner FAQ](https://docs.transak.com/guides/partner-faqs), [Transak listing criteria](https://transak.com/list-your-token), [Banxa native-token listing FAQ](https://support.banxa.com/en/support/solutions/articles/44002339172-can-i-list-a-token-on-banxa-), [Banxa listing terms](https://banxa.com/token-listing-terms). These document listing processes; they do not establish SORA2 approval. Banxa's “Native API” product name does not itself establish native SORA chain support.

## Evidence required to call the integration ready

1. Provider approves the exact settlement model and customer markets, supplies sandbox access and an implementable responsibility/API contract.
2. Read-only metadata vectors and executable retail quotes establish precise units, sufficient liquidity and all-in net payout economics.
3. Sandbox tests prove destination binding, expired/unavailable quotes, failed payment, authenticated duplicate/out-of-order events, concurrent reservations, restart recovery and ambiguous broadcast without duplicate payout.
4. A separately authorized funded pilot delivers the quoted native XOR to a fresh SORA2 receiving account without an Ethereum wallet or pre-existing gas; receipt verification and failed-delivery/refund recovery are exercised.

No funded pilot has been performed for this proposed direct-card service. Preparing this packet does not authorize spending, accept provider terms or enable checkout. Next engineering priorities are recorded in [Buy XOR: next improvements](buy-xor-next-improvements-2026-09-25.md).
