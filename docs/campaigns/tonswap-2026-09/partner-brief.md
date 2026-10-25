# Funding partner brief and outreach drafts

Prepared, not sent. Use the provider's verified official business contact or an existing relationship. No partner agreement, fee commitment, inventory purchase or integration availability is implied. For new-audience distribution, prioritize the [individual external proposals](external-outreach.md) instead of the generic community invitation below.

## What we want to build

Help a participant fund **their own SORA mainnet wallet with native XOR**, including enough XOR for a separate burn fee. They then review and sign the existing Polkaswap TONSWAP burn themselves. That signing wallet owns the future TS claim. The first provider pilot should support one explicit source asset/network and a small set of documented markets.

Preferred first investigation: a practical EUR → native XOR path with GateHub; in parallel, determine whether Cede currently exposes a native XOR withdrawal route. Desired next integration: TON or USDT on TON → native XOR on SORA. The [provider review](funding-provider-review.md) has not verified the latter.

## Required provider response

| Area | Required answer/evidence |
| --- | --- |
| Asset and chain | Exact native SORA mainnet asset/network; distinguish it from Ethereum XOR, Nexus and testnets; confirm current XOR denomination and units |
| Source | Exact accepted asset/network or fiat/payment method; token contract/jetton identity when applicable; no generic USDT label |
| Destination | User-controlled SORA address, validated for the intended network; prefilling/deep-link/API options without altering recipient |
| Quote | Input, every fee/spread, net XOR delivered, minimum/maximum, expiry, price-movement handling and expected delivery range |
| Gas | Explain source fees and include an explicit XOR delivery reserve sufficient for the separately estimated campaign burn fee |
| Execution | Deposit detection, finality policy, idempotent order handling, duplicate payment detection, transaction identity and delivery evidence |
| Exceptions | Underpayment, overpayment, late payment, wrong network/asset, changed withdrawal status, failed delivery and refund handling |
| Responsibility | Who controls funds at each step, who owes delivery/refund, which service handles support, and what happens during an outage |
| Eligibility | Supported regions and customer requirements; confirmation that this specific funding use is permitted |
| Integration | Public/client configuration versus server secrets; sandbox; signed webhooks or equivalent reconciliation; provider order status |
| Economics | Provider fees, settlement costs, inventory requirement, optional disclosed partner revenue and minimum commercial commitments |
| Privacy | Necessary customer/order data, retention, access and user notice; no transfer of recovery phrases or private keys |

## Acceptance scenarios

- A valid order delivers the quoted net native XOR to the exact user wallet; denomination matches chain amounts.
- Replayed callback/polling cannot create a second delivery or burn; independent orders remain separate.
- An expired or underpaid order cannot silently execute on different terms.
- A payment whose status is uncertain is reconciled before another fulfillment is attempted.
- A failed delivery follows a documented recovery/refund path, with source-chain fees and responsibility disclosed.
- The frontend clearly separates provider delivery from the later user-signed burn and indexed TS allocation.
- Campaign cap movement cannot turn a funding quote into a false guaranteed TS quote. The user gets a fresh estimate before deciding to burn.
- The service never burns from an omnibus account and presents the resulting claim as belonging to the customer under the current protocol.
- Static Polkaswap assets contain no operator key or private provider credential.

These are acceptance requirements for a proposed service, not claims that a partner already provides them. No campaign protocol changes are authorized through this brief.

## GateHub inquiry

**To:** info@gatehub.net, as directed by [GateHub's collaboration instructions](https://support.gatehub.net/hc/en-us/articles/360021426673-Collaboration-and-third-party-services). Do not send collaboration requests through its support channel.

**Subject:** Native SORA XOR funding route for Polkaswap participants

Hello GateHub team,

We are improving onboarding for Polkaswap's TONSWAP campaign. Participants need native XOR in a SORA wallet they control; they later choose whether to sign a separate irreversible burn that reserves a future TS allocation.

Your public supported-currency pages and SORA's guide describe native XOR withdrawals. Could you confirm the route's current availability, the XOR denomination used in your interface, supported customer markets, withdrawal minimum and fee? Your published schedule lists 500 XOR; we want to verify the units before showing any cost to users.

We would like indicative all-in quotes for 25, 100 and 500 EUR where those amounts are supported, plus information about prefilling a SORA destination address, current withdrawal status, expected delivery time and recovery if a transfer cannot complete. Please also confirm whether this funding use is permitted and whether a partner API or supported deep link exists.

We are evaluating a small pilot, with no volume commitment. We would not ask GateHub to hold or burn tokens on behalf of the participant, and would clearly disclose your fees and custody model.

Could you direct us to the appropriate integration contact?

Thank you,

Campaign/product team

## Cede inquiry

**Subject:** Confirm an active native XOR → SORA withdrawal path in Cede

Hello Cede team,

Polkaswap already embeds your send widget with `tokenSymbol: 'XOR'`, `network: 'sora'`, the participant's SORA address and a locked destination network.

Before promoting this route, we need to identify an exchange currently supporting native SORA XOR withdrawals through Cede. Could you confirm the exchange, exact asset/network identifier, withdrawal status, current denomination, minimum, fee and supported authentication flow? Please distinguish current availability from an old token listing.

We also need a reliable way to show unavailable routes before a user begins, handle mobile/browser-extension limitations, and track an existing withdrawal through delayed or uncertain status without repeating it. Is GateHub available through a supported Cede integration, or would that require separate work?

Participants would receive XOR in their own wallet and independently sign the campaign burn. Cede would only handle the funding transfer.

Please send current integration guidance and a sandbox/demo path if available.

Thank you,

Campaign/product team

## MoonPay or liquidity-provider inquiry

**Subject:** Feasibility: TON/USDT funding with native XOR delivery on SORA

Hello integration team,

We are evaluating a funding route for Polkaswap participants: pay with one supported source asset, initially TON or USDT on TON if available, and receive native XOR in the user's own SORA mainnet wallet. The user then separately reviews and signs a burn reserving a future TS allocation.

Could your service support the SORA destination directly, or through an explicitly supported fulfillment partner? We have not established a working native SORA route and do not want to infer it from generic token or TON support.

Please specify destination asset/network and current XOR denomination, accepted source token/network, supported regions, all-in quotes and minimums, delivery finality, failed/late payment handling, refund responsibility, custody, integration/sandbox access and any inventory or commercial commitment required.

Our frontend is a static IPFS application. Any provider secrets and payment reconciliation must stay in your service or an approved backend. The first pilot would deliver XOR plus a transparent fee reserve to the participant; it would not burn from a company wallet or promise a fixed future TS amount.

If the route is not currently available, a clear gap assessment would help us decide whether a native SORA integration is practical.

Thank you,

Campaign/product team

## Community demonstration invitation

**Subject:** A short Tonswap testnet demo and open onboarding Q&A

Hello,

We are preparing a practical demonstration of Tonswap's public TON testnet and would like to offer your community a short walkthrough and Q&A. The product demonstration uses test assets.

We will also explain the separate XOR burn campaign accurately: it requires a SORA wallet, burns real XOR irreversibly and reserves a future TS allocation subject to campaign limits. We will show current access barriers and supported routes, without price forecasts or requests to share wallet recovery information.

Would a 20-minute demonstration plus questions fit a future community session? We can provide the video, FAQ and dated campaign terms in advance. No paid placement or referral arrangement is assumed.

Thank you,

Campaign/product team
