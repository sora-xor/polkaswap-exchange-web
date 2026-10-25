# Native XOR liquidity: funding proposal

Prepared 25 September 2026. **No funds moved, orders placed, provider terms accepted or transactions signed.** This proposal sizes two funding choices for review; it does not identify an already authorized treasury or promise an available card-to-native-XOR service.

## Proposed first target

Prepare a **100 DAI net purchase at a 3% pool-impact target**, leaving room below the checkout's 5% maximum. At the observed reserves this means adding approximately **2,790.74 DAI and 508.536737 native XOR together**, worth about **5,581.48 DAI at the pool's current spot ratio**. The source of both assets and the funding budget remain to be approved. Refresh the calculation immediately before any deposit.

This is an illustrative **$100-equivalent net-at-pool** target assuming 1 DAI = 1 USD. A $100 gross card payment has provider and network costs and can deliver a different DAI amount. No executable $100 or $500 card-to-native-XOR offer is established by this calculation. Full route cost and availability checks remain necessary before payment.

## Verified current market

[Read-only evidence](../output/tonswap-growth/native-xor-liquidity-sizing-2026-09-25.json) was captured at **2026-09-25 13:02:20 UTC**, finalized block **27,774,602**, hash `0x0cfc6eebc96840ba5e37b42eaeb68e6652519908b362f63b875c0b5551ab4cc6`, using the approved `https://ws.mof.sora.org/` endpoint. Genesis matched SORA2 mainnet. Runtime version, live asset precision and raw denomination are retained in the artifact; the table uses native 18-decimal amounts, not ERC-20 or migrated exchange display units.

The DEX 0 XOR/DAI pool held **442.593469506793176067 DAI** and **80.650669586653038335 XOR**. Its spot ratio was approximately **5.487784190449404790 DAI per XOR**. Pool account: `cnTQ1kbv7PBNNQrEb1tZpmK7fuxWZxsAP6HA1UauiMxyJ4Wmp`.

| Native DAI input | Quoted XOR output | Price impact |
| ---: | ---: | ---: |
| 5 | 0.895531 | 1.1171% |
| 25 | 4.286136 | 5.3465% |
| 100 | 14.774738 | 18.4300% |
| 500 | 42.524571 | 53.0451% |

Outputs include the quoted pool fee but are before separate network fees and checkout safety buffers. The 25, 100 and 500 DAI examples fail the current 5% impact limit.

The enabled sources were `XYKPool` and `OrderBook`; a direct order book exists. At every tested size, **XYK-only and the checkout's combined XYK/OrderBook quote both matched the direct pool model**, including output, fee and no-impact amount within two native codec units. This supports the model for this snapshot; it does not claim the order book never contributes or that future routing will be identical. The reproducer refuses to size a deposit if this comparison fails.

## Option A: add balanced native pool liquidity

For a DAI input `q`, current DAI reserve `R`, XOR reserve `X` and output fee `f = 0.006`, the verified model is:

```text
XOR output = q × X / (R + q) × (1 − f), with native integer rounding
no-impact output = q × X / R × (1 − f), with runtime fixed-point rounding
price impact ≈ q / (R + q)
required DAI reserve for limit p = q × (1 − p) / p
additional DAI = max(required reserve − current reserve, 0)
additional XOR = additional DAI × X / R, rounded upward to native precision
```

The [pool quote implementation](../src/lib/substrate/liquidity-proxy/pallets/poolXyk/index.ts) and [fee constant](../src/lib/substrate/liquidity-proxy/consts.ts) establish the output-fee form. The [official liquidity guide](https://wiki.sora.org/provide-liquidity-to-xyk-pools.html) describes supplying both assets to an XYK pool. The model preserves the observed spot ratio; it is not a proposal to change the token price.

| Net DAI purchase | Impact target | Additional DAI | Matching additional XOR | Combined value at current pool spot ratio |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 5% mathematical boundary | 1,457.41 | 265.572858 | 2,914.81 DAI |
| 100 | **3% working target** | **2,790.74** | **508.536737** | **5,581.48 DAI** |
| 500 | 5% mathematical boundary | 9,057.41 | 1,650.466967 | 18,114.81 DAI |
| 500 | 3% working target | 15,724.07 | 2,865.286362 | 31,448.15 DAI |

Figures are rounded for discussion; the artifact retains exact amounts. At the 3% targets, modeled pool output is approximately 17.569568 XOR for 100 DAI and 87.847842 XOR for 500 DAI, before separate network fees and checkout buffers. The exact 5% boundary offers no operational headroom and must not be treated as an executable deposit or future quote guarantee.

**Funding source matters.** The XOR side must come from already owned native inventory, a willing existing holder, or an independently quoted supplier. Buying that XOR from this same small pool first would move its price and reserves and invalidate these figures. The combined value is a spot valuation, not the cost of acquiring the assets. Pool transaction fees, bridge/acquisition expenses and operating reserves are additional and unpriced here.

Possible funding arrangements are an approved treasury allocation of both assets, a voluntary holder supplying the XOR side alongside funded DAI, or a liquidity partner supplying the pair under agreed terms. None is assumed available. Depositors own a market-exposed LP position; adding liquidity is not an operating-company cash receipt. Successive purchases change reserves and market price, so a one-order target is not a daily volume promise. Replenishment and monitoring remain necessary.

## Option B: provider-approved native inventory fulfillment

**Deferred on 26 September 2026:** the user selected provider-managed ChangeNOW/Guardarian and GateHub integration inquiries and set aside a Polkaswap-operated inventory/payout service. The following retains the earlier sizing analysis; it is not active implementation or funding authorization. See the [current integration decision](direct-card-native-xor-plan.md).

Deliver native XOR from a reserved inventory balance and replenish separately. This can remove the customer's Ethereum wallet, conversions and bridge steps. It requires explicit provider approval, a payout/custody arrangement and funded inventory; the current consumer ETH widget does not establish permission for this model. See the [provider integration packet](native-xor-provider-integration-packet.md), [Transak partner requirements](https://docs.transak.com/guides/partner-faqs) and [Banxa's case-by-case native-token listing process](https://support.banxa.com/en/support/solutions/articles/44002339172-can-i-list-a-token-on-banxa-).

The following inventory illustration converts a net DAI-equivalent budget at the observed **spot ratio**, without a spread, provider fee, payout fee or price buffer. It is a unit-count estimate, not a purchasable quote or promised customer output.

| Net purchase value | XOR for one order | XOR for ten orders before replenishment | Inventory spot value for ten orders |
| ---: | ---: | ---: | ---: |
| 100 DAI-equivalent | 18.222291 | 182.222909 | 1,000 DAI-equivalent |
| 500 DAI-equivalent | 91.111455 | 911.114546 | 5,000 DAI-equivalent |

Ten orders is an illustrative reserve window, not a demand forecast. Real inventory is the sum of accepted net-XOR quotes, plus a separate native fee reserve; cash for refunds and chargebacks must be budgeted independently. One 500 DAI-equivalent order at spot already exceeds the current pool's entire XOR reserve, so replenishment cannot be assumed available at that price from this pool. A provider may require its own market maker, custody or minimum capital instead of this model.

If the provider approves inventory fulfillment and a willing inventory owner exists, compare it against LP funding using actual commercial quotes. It uses less illustrative inventory than preserving a 3% AMM price curve, but introduces fulfillment, settlement, fraud and refund obligations. No provider price, capital minimum or onboarding timeline is established.

## Operating revenue is a separate decision

- **LP funding:** contributes assets to a pool and acquires a liquidity position. Do not count its deposit value or total trading volume as company revenue, or assume the whole swap fee is paid to the company.
- **Inventory sales:** the identified inventory owner receives whatever settlement the approved agreement specifies, less provider charges, replenishment costs, refunds and operating expenses. Revenue and margin cannot be computed until ownership, sourcing cost and settlement terms are known.
- **Buying and burning XOR for TS:** buying pays the relevant sellers/liquidity venues; burning destroys the user's XOR. Neither step, by itself, establishes operating cash paid to the company.

## Concrete decisions and acceptance checks

For a reviewable first funding decision, identify: **(1)** the owner and available amount of native XOR, **(2)** the DAI/cash source and maximum budget, **(3)** who owns the LP position or sale proceeds, and **(4)** who can authorize deployment of those funds. No private keys are needed to answer these questions. For inventory delivery, additionally obtain the provider's approved settlement contract and refund/capital requirements.

After approval, refresh finalized reserves and full-route quotes; prepare exact deposit or inventory limits for review; verify fees and remaining balances; then execute only the separately authorized transactions. Re-quote 100 and 500 DAI against the actual post-funding finalized state. An authorized funded pilot must prove the all-in customer receipt, account recovery and failure/refund path before promoting those purchase sizes. No such funding or pilot is performed by this proposal.

## Reproduce and validate

```sh
node scripts/liquidity/native-xor-sizing.mjs output/tonswap-growth/native-xor-liquidity-sizing-2026-09-25.json
node .yarn/releases/yarn-4.10.3.cjs vitest run --config vitest.config.mjs --project unit-scripts tests/unit/scripts/liquidity/native-xor-sizing.spec.ts
```

The [script](../scripts/liquidity/native-xor-sizing.mjs) reads one finalized snapshot, validates genesis and asset precision, records reserves and metadata, and compares eight public quotes before calculating capital with integer arithmetic. It has a two-minute outer deadline and no wallet, signing, purchase-order or submission API. It writes local evidence only. [Tests](../tests/unit/scripts/liquidity/native-xor-sizing.spec.ts) cover exact units, deposit boundaries, sufficient reserves, invalid limits and refusal to extrapolate mismatched routing or fees. Scoped lint and focused tests pass.
