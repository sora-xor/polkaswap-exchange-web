# Native XOR funding: provider evidence and shortlist

Research date: 25 September 2026. Scope: public primary sources and repository integration code, read only. No provider account was opened, no credentials were read, no order was created and no funds were moved. A listed token or integration is not proof of executable liquidity or current withdrawal availability.

## Decision

**Prioritize a GateHub native-XOR feasibility check and improve the existing SORA asset → XOR flow. No direct TON/USDT-on-TON → native-XOR-on-SORA provider was verified.**

GateHub is the strongest documented native-network candidate, but still needs a fresh quote, withdrawal-status and denomination check. Cede is an existing transfer interface whose underlying exchange route must be established. MoonPay's existing Polkaswap flow is an EVM purchase plus bridge flow. SimpleSwap and StealthEX display Ethereum XOR, so neither establishes direct SORA delivery.

## Evidence table

| Candidate | Verified public evidence | Native SORA delivery | TON/USDT starting point | Fees/minimums observed | Action |
| --- | --- | --- | --- | --- | --- |
| GateHub | Provider lists XOR deposits/withdrawals and SORA among gateway networks; SORA's official guide describes EUR → XOR → SORA wallet | Documented by provider/project; current execution not tested | USDT listed, but TON funding not established. GateHub's deposit guidance warns ERC-20 transfers must use Ethereum; do not assume USDT-on-TON works | Public fee schedule lists 500 XOR withdrawal, free SEPA deposit, 1% card top-up; minimum and current denomination unverified | First provider inquiry; obtain denomination-correct native quote and supported-market details before endorsement |
| Cede widget | Repository preselects XOR, `sora`, user address and locked network; Cede provides exchange withdrawal discovery | No current XOR/SORA exchange route established from public matrix | Depends on exchange balances, enabled withdrawals and account eligibility; no direct TON conversion demonstrated | Must query actual exchange fee/minimum for exact token/network | Ask Cede for a presently operational exchange; do not market the widget as a guaranteed route |
| MoonPay | Existing repository integration prepares Ethereum/EVM delivery and bridging; provider documents TON products and a separate Gateway product | Not verified; published Gateway destinations are Solana, Ethereum, Base and HyperCore | TON-side support does not establish a SORA destination | No total price/minimum for a complete SORA route confirmed; quote-specific | Evaluate as a later integration request, or verify the existing multi-step EVM path separately |
| SimpleSwap | Official XOR page identifies ETH; rates were blank in the read page | Not demonstrated | Generic USDT/XOR pair links do not establish native delivery or a working quote | None confirmed | Exclude from direct-native recommendations pending explicit new network support |
| StealthEX | Official XOR coin page labels ETH; quote/liquidity not established | Not demonstrated | Generic exchange pages do not establish native delivery | None confirmed | Same exclusion as SimpleSwap |
| Gate.com | Official April 2024 announcement delisted XOR | No current native route verified | Not established | No current figures relevant to this route | Do not confuse with GateHub or reuse old Gate.io tutorials |

Sources for the table are linked below. Public prices/fees can change; no displayed fee is a guaranteed execution quote.

## GateHub: first candidate to qualify

[Supported currencies](https://support.gatehub.net/hc/en-us/articles/360021426493-Supported-currencies) lists XOR, USDT and EUR. [Gateway terms](https://gatehub.net/legal/terms) identify SORA network support. [SORA's on-ramp guide](https://wiki.sora.org/on-ramp.html) describes account verification, EUR funding, exchange into XOR and withdrawal to a SORA wallet. These sources support a documented route; they do not establish current depth or availability for a particular customer.

The [fee schedule](https://gatehub.net/fees) lists a 500 XOR withdrawal charge, free SEPA deposits and 1% card top-ups. **Do not translate that 500 into a campaign amount or fiat cost until GateHub confirms which XOR denomination its interface uses.** No current withdrawal minimum was established. Additional exchange spread, network costs and account-specific charges need a complete quote.

[Deposit guidance](https://support.gatehub.net/hc/en-us/articles/6494328248338-Cryptocurrency-deposit-mobile-app) instructs users to use the correct network and restricts ERC-20 deposits to Ethereum. It also describes XRPL wallet reserves. This is not evidence for TON deposits. [Gateway setup](https://support.gatehub.net/hc/en-us/articles/360021426453-Gateways) requires verification. Confirm which setup is necessary for the actual hosted/native withdrawal route rather than imposing extra XRPL steps by assumption.

Required response: native SORA mainnet withdrawal status; current XOR unit/denominator; sample 25/100/500 EUR quotes where supported; supported customer regions; minimum, fee and expected delivery range; status/refund handling; whether a deep link or API can prefill the customer's SORA address. Treat quote sizes as research samples, not recommended investment amounts.

## Cede: existing integration, missing exchange-level proof

[Cede's widget documentation](https://docs.cede.store/widgets/installation) describes a browser-extension-based exchange withdrawal flow. The repository's [Cede page](../../../src/features/deposit/pages/CedeStorePage.vue) configures the exact intended destination, but configuration does not create withdrawal availability.

The [public token matrix](https://docs.cede.store/supported-tokens) exposes columns for Binance, Coinbase, Kraken, Gate.io, Bitfinex, Huobi, KuCoin, OKX, Bybit, Bitget and MEXC; token rows remained dynamically loading in this read. No XOR/SORA row was verified. GateHub does not appear in those visible columns; that observation is not a comprehensive claim about all current Cede integrations.

[Withdrawal API documentation](https://docs-sdk.cede.store/documentation/api-reference/withdraw) describes `getWithdrawableBalances`, `getNetworks` with `opts.toWithdraw`, and fee discovery. For a consenting user's normal provider flow, verify the exact exchange, XOR token, `sora` destination, free balance, live withdrawal status, minimum and fee. Do not collect exchange API secrets through campaign support. An exchange name from the supported list is insufficient.

## MoonPay: keep product boundaries clear

[Current supported-currency documentation](https://dev.moonpay.com/platform/overview/supported-currencies) describes Gateway's four destination networks and directs integrators to the live asset catalog. It does not establish native SORA delivery. The [public help list](https://support.moonpay.com/en/articles/382207-list-of-supported-cryptocurrencies) says availability varies by region and account, including geographic restrictions. No complete native-SORA quote or minimum was verified.

[MoonPay's TON Wallet announcement](https://www.moonpay.com/newsroom/moonpay-deposits-tonwallet) documents cross-chain deposits into TON Wallet. That is useful partnership context, but the receiving environment is TON, not this campaign's SORA signer wallet. The [existing Polkaswap bridge code](../../../src/composables/useMoonpayBridge.ts) requires an EVM destination/account, registered bridge asset and external gas before bridging. It cannot be advertised as direct fiat-to-XOR/TS.

Ask whether native SORA output can be supported, whether a destination partner can fulfill XOR, who owns delivery/refund responsibility, and which regions/products are permitted. Do not assume a TON feature from one MoonPay product is available in another.

## Exclusions that prevent misleading onboarding

- [SimpleSwap's XOR page](https://simpleswap.io/coins/xor) labels the asset protocol ETH. Its separate [SORA ticker page](https://simpleswap.io/coins/sora) is also an Ethereum listing. Neither is evidence of this native SORA route; matching names must not bypass asset/network verification.
- [StealthEX's XOR page](https://stealthex.io/coin/sora/) also labels ETH. Do not publish its generic pair page as native SORA delivery.
- [Gate.com's delisting notice](https://www.gate.com/ja/announcements/article/35705/gate.io-to-delist-xor-xor) announced XOR trading suspension for 8 April 2024. Gate.com and GateHub are different providers; current support from one cannot be inferred from the other.

## Qualification checklist and execution order

1. Obtain a provider response to the [partner brief](partner-brief.md), starting with GateHub and Cede.
2. Obtain a nonbinding quote with explicit source/destination network, asset identity, denominator, net XOR delivered, fee reserve and expiry. Reject ticker-only quotations.
3. Verify the user's own SORA wallet is the destination. Provider delivery completes funding; only the user's subsequent qualifying burn creates that wallet's campaign claim.
4. Exercise expired/duplicate/underpaid/failed-delivery cases in a sandbox when offered. No live-money test has been performed for this review.
5. Before a live pilot, establish provider permission for this use, supported regions, costs, reconciliation, refund responsibility and a capped operating budget. Never embed operator secrets in static IPFS assets.
6. Show a fresh campaign estimate after delivery. Do not guarantee TS output from an earlier funding quote or gate the current direct-burn flow on provider availability.

If no provider qualifies, the honest near-term experience is the guided SORA wallet plus currently supported SORA swap route, accompanied by precise funding limitations. A TON-only wallet experience still requires the separate beneficiary/claim protocol described in the growth plan.
