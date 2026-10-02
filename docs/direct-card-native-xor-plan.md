# Direct card → native XOR: integration decision

Reviewed 26 September 2026. Status: authorized feasibility requests sent to ChangeNOW, Guardarian and GateHub, alongside the earlier Transak and Banxa inquiries. Transak support says its relevant team will review the request as a priority. Provider/network approval and a supported liquidity arrangement remain outstanding. The user has set aside a Polkaswap-operated inventory/payout service. This document does not enable checkout or claim an available native-XOR card quote.

## Required customer experience

Choose a fiat amount → create or select a SORA2 receiving wallet → review the total card charge and native XOR received → complete provider identity/card checks → receive native XOR on SORA2.

The customer should not need an Ethereum wallet, intermediate tokens, bridge signatures or pre-existing gas to receive the purchase. Any later TONSWAP burn remains a separate customer choice and signature. The same purchase serves every XOR use case.

## Decision

Pursue provider-managed native SORA2/XOR listing and delivery. On 26 September the user selected ChangeNOW plus Guardarian for a coordinated native swap/card proposal and GateHub for an approved purchase-to-native-withdrawal integration. Continue assessing the pending Transak and Banxa inquiries. Request the chain integration as well as the token listing: supporting ERC-20 XOR does not meet the requirement.

The previously proposed Polkaswap-operated native-XOR inventory and payout service is **deferred by the user's 26 September instruction**. The active requests seek provider-managed payment, exchange, liquidity sourcing and native custody/delivery, with Polkaswap supplying the interface and receiving-account connection. Do not build or provision the deferred service or redirect customer purchases into an operator wallet under this task.

## Verified provider evidence

| Candidate | Evidence | What remains to establish |
| --- | --- | --- |
| MoonPay | Polkaswap already integrates its card widget. [Gateway documentation](https://dev.moonpay.com/platform/overview/supported-currencies) describes fiat purchase followed by token conversion and destination delivery; its listed Gateway networks are Solana, Ethereum, Base and HyperCore. | Native SORA2 chain/asset integration, executable XOR quotes and delivery; or explicit approval of a partner fulfillment model. Headless checkout alone does not add a network. |
| Transak | [Partner FAQ](https://docs.transak.com/guides/partner-faqs) documents negotiated listing fees, due diligence and technical integration by Transak. [Listing criteria](https://transak.com/list-your-token) include analytics coverage and adequate liquidity. | Acceptance of SORA2/XOR, chain integration effort, actual listing cost, liquidity source, supported regions and production availability. |
| Banxa | [Native-token listing program](https://support.banxa.com/en/support/solutions/articles/44002339172-can-i-list-a-token-on-banxa-) accepts applications case by case for direct fiat purchases. [Listing agreement](https://banxa.com/token-listing-terms) establishes a commercial listing process. | SORA2 acceptance, native custody/delivery, liquidity arrangement, quote economics and integration schedule. No partner-supplied fulfillment API was verified. |
| ChangeNOW | [Asset-listing program](https://changenow.io/asset-listing) explicitly describes custom mainnet integration and liquidity arrangements. [Partner program](https://changenow.io/for-partners) identifies its business-development contact. | Exact native SORA2 support, source networks, accepted liquidity supplier, costs, partner/API access and any coordinated Guardarian card arrangement. No ready-to-use native XOR route is established. |
| Guardarian | [Listing service](https://guardarian.com/list-your-tokens) explicitly offers coin/token integration, card purchases through a widget/API, and an optional liquidity arrangement through ChangeNOW. The process includes a listing agreement and invoice. | Whether the offer includes native SORA2 integration, its actual price, denomination support and deliverable liquidity. This is a concrete alternative proposal; existing native-XOR delivery was not verified. |
| GateHub | [Supported currencies](https://support.gatehub.net/hc/en-us/articles/360021426493-Supported-currencies) includes XOR deposits/withdrawals. [SORA's guide](https://wiki.sora.org/on-ramp.html) describes card-funded EUR → XOR → SORA withdrawal. | A current working native withdrawal, denomination/fee mapping, and an approved embedded or API purchase-to-withdrawal flow. The documented multi-step account flow alone does not meet the requested checkout. |

The [Sui launch guide](https://www.sui.io/launch-on-sui) explicitly lists MoonPay, Transak, Banxa and Coinbase Pay as on-ramps. This supports treating direct purchase as a provider integration project. It does not establish that those providers already support SORA.

## Concrete provider request — submitted 25 September 2026

**Subject: Native SORA2 XOR card checkout for Polkaswap — network and settlement integration**

We want customers at polkaswap.io to pay by card and receive native XOR directly in their own SORA2 mainnet wallet. Customers must not need an Ethereum wallet or manually bridge funds.

The destination is the Substrate SORA2 mainnet, genesis `0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5`, native XOR asset ID `0x0200000000000000000000000000000000000000000000000000000000000000`. This request is not for Ethereum XOR or the separate Iroha/Nexus network. We can provide address validation, RPC/SDK integration references and denomination test vectors.

Please confirm whether you can onboard this network and asset for provider-managed native delivery. If not, can you approve a model where an agreed liquidity/delivery partner fulfills native XOR from reserved inventory? We need your actual integration contract/API and responsibility split for that model.

Please provide the listing/integration fee, recurring minimums, liquidity/custody requirements, supported countries and card methods, sample all-in quotes at supported retail sizes, delivery/refund and chargeback responsibilities, sandbox access and estimated onboarding schedule. Confirm that the customer checkout can bind a SORA2 destination and report the native delivery transaction.

No listing fee, treasury commitment, transaction volume or delivery deadline is promised by this request.

The full listing application forms were inspected but not submitted: [Banxa application](https://share.hsforms.com/18UWyNGZTTxypUPWYXqsd7A3tvp6) and the form on [Transak's listing page](https://transak.com/list-your-token). Banxa requires the applicant company, registered business address and token-sale history, and says legal opinion/whitepaper/terms/privacy material is needed before listing. Its blockchain menu includes an Other option. Transak requests the company, region, token network and market-data URL, and asks for an email associated with a Transak account. Applicant identity and corporate facts must be accurate; do not invent them to complete intake. Initial feasibility inquiry and full listing due diligence are separate stages.

### Submission evidence

The user explicitly approved submitting the prepared requests to Banxa and Transak using `takemiya@soramitsu.co.jp`, without spending or contract commitments.

- **Transak:** sent the request above to `sales@transak.com` from `takemiya@soramitsu.co.jp` at **2026-09-25 12:25:27 UTC**. This commercial contact is published in the [official partner FAQ](https://docs.transak.com/guides/partner-faqs). Gmail message ID and thread ID: `1a0d88718eaf3414`. Reading the sent message confirmed the `SENT` label, sender, recipient, subject and complete body. The only additions to the text above were “Hello Transak listings team,” and the signature “Makoto Takemiya”.
- **Banxa:** submitted the complete subject and request above through its [official growth-team inquiry form](https://banxa.com/talk-to-our-team/) at approximately **2026-09-25 12:26 UTC**. Contact: Makoto Takemiya, `takemiya@soramitsu.co.jp`; website: `https://polkaswap.io`; industry: Exchange; country: Japan; product: Token listings; discovery source: Search Engine. Optional job title and Telegram fields were left empty. After submission, the browser redirected to `https://banxa.com/?submissionGuid=0fd879df-315b-4292-8362-4852029079b4`. The returned submission identifier is `0fd879df-315b-4292-8362-4852029079b4`; no separate confirmation text was shown. No duplicate support email was sent.

Transak's automated sales-support acknowledgement arrived at **2026-09-25 12:25:57 UTC**, message ID `1a0d88794927d121`, in the same thread. It confirms receipt and says the team expects to respond within 48 hours. [Open acknowledgement in Gmail](https://mail.google.com/mail/u/?authuser=takemiya%40soramitsu.co.jp#all/1a0d88794927d121).

### Reply check — 26 September 2026

Checked the approved mailbox at approximately **2026-09-26 03:25 UTC / 12:25 JST**, including a targeted search of spam and trash for Banxa and Transak correspondence since the inquiries.

- **Transak:** [Shivam's reply](https://mail.google.com/mail/u/?authuser=takemiya%40soramitsu.co.jp#all/1a0d90e9275c0f68), received **25 September at 14:53 UTC / 23:53 JST**, says the relevant team will review the request as a priority and asks for **24–48 hours**. This is a support update, with no native SORA2/XOR acceptance, commercial terms, named integration owner, sandbox access or technical questions. The stated interval runs through **27 September at 14:53 UTC / 23:53 JST**. At the check, that interval had not elapsed.
- **Transak's later message:** a satisfaction survey at 14:55 UTC. It provides no integration decision; its arrival does not establish that the listing request was approved or rejected.
- **Banxa:** no matching reply or acknowledgement found, including spam and trash. The form submission evidence above remains the only recorded response evidence.
- **MoonPay:** a weekly newsletter appeared in the recent search, not a reply approving this integration. No new native-XOR partner response was found.

No outbound message, draft, label change, provider submission or payment was made during this check. The [technical packet](native-xor-provider-integration-packet.md) remains prepared locally. No automated follow-up is scheduled by this record.

**Prepared follow-up for Transak if its stated interval expires without a substantive reply — not sent:**

> Hi Shivam,
>
> Following up on the native SORA2 XOR request below. Please connect us with the person responsible for network and token integrations. Can Transak support card payment with native XOR delivered directly to the customer's SORA2 account, either through your own settlement or an explicitly approved delivery partner?
>
> We have the network identity, address validation, denomination/finality requirements and integration test plan ready. To choose the implementation, we need the supported settlement model, listing/integration cost and recurring minimums, liquidity requirements, sandbox/API access and estimated onboarding schedule. ERC-20 XOR delivery would not meet the requested destination.
>
> Please confirm the integration owner and next step. No fee, volume or funding commitment is made by this inquiry.
>
> Makoto Takemiya

These records establish a sent email and submitted inquiry, not provider acceptance, a signed listing agreement, or production checkout availability. Replies should go to the approved email address. No fees, minimum volumes, liquidity funding or delivery dates were committed.

## ChangeNOW, Guardarian and GateHub — sent 26 September 2026

The user explicitly selected options 1 (ChangeNOW plus Guardarian) and 2 (GateHub) and requested a goal. The outreach goal covers verified official contacts, non-binding feasibility inquiries from `takemiya@soramitsu.co.jp`, read-after-send verification and this tracker update. It does not include contracts, payments, company due-diligence submissions or operating a payout service.

| Provider | Official destination | Sent, UTC on 26 September | Gmail record |
| --- | --- | --- | --- |
| ChangeNOW | `partners@changenow.io`, published in its [partner program](https://changenow.io/for-partners) and [listing agreement](https://changenow.io/listing-agreement) | 03:41:00 | [Sent inquiry](https://mail.google.com/mail/u/?authuser=takemiya%40soramitsu.co.jp#all/1a0dbcd4d946c401) |
| Guardarian | `sales@guardarian.com`, designated for listings on its [contact page](https://guardarian.com/contact-us) | 03:41:14 | [Sent inquiry](https://mail.google.com/mail/u/?authuser=takemiya%40soramitsu.co.jp#all/1a0dbcd86f01e604) |
| GateHub | `info@gatehub.net`, designated in its [collaboration guidance](https://support.gatehub.net/hc/en-us/articles/360021426673-Collaboration-and-third-party-services) | 03:41:21 | [Sent inquiry](https://mail.google.com/mail/u/?authuser=takemiya%40soramitsu.co.jp#all/1a0dbcda14d3ed35) |

All three were read back from Gmail. Exact sender, recipient, subject, HTML body and `SENT` label matched. This verifies sending, not recipient acceptance or native integration availability. The only recent pre-existing GateHub item was an unsent marketing draft; it was neither sent nor changed. Exact outgoing bodies and verification evidence: `output/tonswap-growth/provider-outreach-2026-09-26/requests.json` and `sent-verification.json`.

- **ChangeNOW:** requested native SORA2 delivery for TON/USDT-on-TON and ETH/USDT-on-Ethereum, plus assessment of a coordinated Guardarian card route. Asked about supported networks, liquidity source, itemized fees/minimums, $25/$100/$500-equivalent estimates, countries, API/hosted access, status/receipts, responsibilities and an integration owner/timeline.
- **Guardarian:** requested a costed native card proposal and coordination with ChangeNOW if appropriate, including the settlement entities, liquidity supplier, eligible countries/payment methods, all-in $25/$100/$500 examples, destination binding, sandbox, delivery/refund/chargeback split and referral/distribution options.
- **GateHub:** requested confirmation of currently operating native SORA2 withdrawals and an approved card/SEPA EUR → XOR → native withdrawal API, embedded flow or hosted redirect. Asked which KYC/account/hosted-wallet/trustline actions remain, exact denomination/fees/minimums, EUR25/EUR100/EUR500 examples, status/native transaction reporting, responsibilities and commercial terms. Its documented EU/SEPA card restriction was explicitly acknowledged.

All requests use the exact SORA2 genesis/native asset ID, distinguish native settlement from ERC-20 XOR and the separate Iroha/Nexus network, and expressly make no fee, liquidity, volume, contract or delivery-date commitment. No technical packet attachment, unverified corporate fact or customer data was sent. No listing application or provider account was created.

**Next decision:** compare substantive provider replies on exact native delivery, integration cost, customer eligibility, liquidity supplier, API/sandbox and responsibility split. Obtain current executable quotes and a separately authorized funded native-delivery pilot before enabling checkout. Provider responses are pending; no background mail monitor or automatic follow-up is created by this record.

## Engineering implementation

### Provider-managed delivery

1. Verify the partner's exact asset/network identifier and validate SORA2 destination addresses. Pin the intended genesis and use live denomination metadata; agree test vectors rather than copying old exchange display units.
2. Add a private service for signed checkout sessions, provider credentials, verified webhook processing and server-side order reconciliation. The Polkaswap Vue/IPFS build remains static. [MoonPay headless requirements](https://dev.moonpay.com/platform/overview/requirements) explicitly include a partner account, credentials and backend webhook service.
3. Embed approved provider-hosted payment/identity fields inside the existing neumorphic page. Show the all-in card price, net native XOR, quote expiry and receiving wallet before payment. Do not route card details through Polkaswap application code.
4. Track the order across browser reloads and complete only after the exact native delivery is finalized. Make provider rejection, delays and refunds visible and recoverable.

### Approved partner fulfillment alternative

**Deferred:** this is retained design history, not active implementation scope following the user's 26 September decision.

Reuse patterns from `../sora-pay/packages/relay/store.ts` and `chain.ts`: encrypted durable records, atomic reservations, idempotency, authenticated recovery, outbox and finalized chain verification. Its current service takes XOR payments for goods and intentionally has no spending keys. Its goods schema and disabled staging deployment cannot be relabeled as a functioning on-ramp.

Implement a separate purchase ledger and isolated native-XOR payout signer. An order binds the provider order ID, exact customer destination, fiat charge, XOR base-unit amount, denomination version, inventory reservation and quote expiry. Keep native fee reserves separate from sellable inventory.

Order lifecycle:

`quoted/reserved → checkout → payment verified → payout prepared → submitted/uncertain → finalized native receipt → delivered`

Authenticate and deduplicate provider events, then reconcile against the provider's own order API. Follow the provider-approved payment/fraud release status; a browser success event or card authorization alone is not sufficient. Persist the signed payout identity before broadcasting. After an ambiguous broadcast, recover that same payout before permitting a replacement. Match the exact finalized chain, sender, destination, amount and order reference. Late payment, destination mismatch or failed delivery enters an explicit review/refund path.

Existing SORA2 account creation and encrypted backup live in `src/lib/soraneo-wallet/src/components/Connection/ConnectionView.vue` and `src/lib/soraneo-wallet/src/services/google/wallet/accounts.ts`. Reuse this path; do not assume an unrelated EVM/Sui embedded wallet supports SORA2. The present account flow still has password/backup steps, and Google availability depends on configuration.

## Liquidity and launch conditions

Inventory removes customer steps; it does not create liquidity. Current recorded DAI→XOR quotes already reject some small retail budgets on price impact. A provider needs a credible sourcing arrangement. An operator delivery service needs funded native XOR, a replenishment plan, refund obligations and transaction limits. Do not promise large purchases based on one successful small quote or assume selling treasury inventory produces an equivalent open-market XOR purchase.

Launch requires all of the following evidence:

- The approved provider product explicitly supports the exact native destination and customer markets; required commercial terms and responsibilities are settled.
- A real partner sandbox can quote and create an order for the agreed model. Unsupported network, region, stale price and exhausted inventory fail before payment.
- Unit/integration tests cover concurrent reservations, duplicate/out-of-order webhooks, altered destinations, wrong denomination, partial/late payments, failed KYC/card payment, restart during payout and ambiguous broadcast without duplicate delivery.
- An authorized funded pilot proves delivery to a new SORA2 address with no Ethereum wallet or initial gas, and exercises failed-delivery/refund recovery. This has not been performed.
- The customer can restore an order, see the final native receipt and contact the responsible support team. Private order data and signing credentials remain outside IPFS and the public indexer.

## Immediate dependencies

The [provider integration packet](native-xor-provider-integration-packet.md) now gathers the native-network handoff and current liquidity evidence locally. [Prioritized purchase improvements](buy-xor-next-improvements-2026-09-25.md) separate immediate recovery fixes from liquidity, complete cost review and measurement work.

Engineering can prepare the native adapter and provider-order reconciliation against a selected provider's sandbox once its delivery contract is known. Production cannot be enabled by editing a currency selector: an approved native settlement route, production partner access and supported liquidity are still missing. Feasibility requests are now recorded for ChangeNOW, Guardarian, GateHub, Transak and Banxa. No listing terms were accepted, no funds moved, and no live checkout behavior changed during this outreach.
