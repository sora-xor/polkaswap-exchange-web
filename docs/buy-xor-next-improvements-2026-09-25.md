# Buy XOR: next improvements

Updated 25 September 2026 after deploying purchase recovery, the before-card cost review, a working browser quote relay, and explicit opt-in aggregate measurement. Native-SORA2 card inquiries were submitted to Banxa and Transak; provider approval is still outstanding. This plan does not commit treasury funds or establish an available native card offer.

**26 September provider update:** the user selected provider-managed ChangeNOW/Guardarian and GateHub integration paths. All three feasibility emails were sent and verified in Gmail; details are in the [integration decision](direct-card-native-xor-plan.md). A Polkaswap-operated inventory/payout service is deferred. The [26 September usability release](buy-xor-usability-2026-09-26.md) is also deployed; the older evidence below remains timestamped to its own checks.

## 1. Establish usable liquidity before expanding acquisition

At finalized SORA2 block **27,774,401**, read-only DAI→XOR quotes using the checkout's allowed XYKPool/OrderBook sources showed:

| DAI input on SORA | Price impact, truncated to four decimal places | Within current 5% limit |
| ---: | ---: | :---: |
| 5 | 1.1170% | Yes |
| 25 | 5.3465% | No |
| 50 | 10.1503% | No |
| 100 | 18.4300% | No |

Evidence: `output/tonswap-growth/native-xor-readiness-liquidity-2026-09-25.json`, observed at 12:40:56 UTC. These are native DAI inputs, not USD card budgets, and are time-specific quotes rather than executable offers. Amount and impact calculations use integers. The RPC genesis was checked against SORA2 mainnet; no account, order, signature or transfer was involved.

The practical dependency is a funded liquidity source: either sufficient market depth or provider-approved, reserved native-XOR inventory. Request the provider's sourcing requirements and compare executable all-in quotes at retail sizes. A useful first acceptance target is a 100 USD purchase that produces a positive net native receipt within the existing impact limit. This target is proposed, not funded or promised. Increasing the price-impact limit or splitting a large order does not establish adequate liquidity.

The [funding proposal](native-xor-liquidity-funding-proposal.md) sizes a concrete pool target using a later finalized snapshot: **100 DAI arriving at the pool at 3% impact** requires an estimated additional **2,790.74 DAI and 508.536737 XOR**. This is a net pool input, not a $100 card purchase. The calculation assumes existing XOR inventory and proportional liquidity; refresh the pool state before approving any deposit. No assets were moved.

## 2. Preserve every purchase already in progress

The review found that changing the source, asset or original budget can clear the current plan's references and reviewed drafts. Preserve unresolved transactions, including across source deep links, and give the user a clear resume/status action. Only matching, verified terminal evidence may release a tracked stage. A stale preview, browser redirect or wallet balance is not sufficient proof of completion.

Deployed in the shared purchase page, plan guard and conversion panel. Funding references/drafts survive edits and source deep links, pending actions resume their tracked stage, and a wallet switch cannot discard a valid returned conversion hash. Burn-only plans keep their existing independent receipt lifecycle. The signing component stays mounted during an in-page pending request; forcibly closing/reloading the browser before its hash arrives remains outside this new guarantee.

Focused validation passed **3 suites / 103 tests**, with scoped ESLint and `git diff --check` clean. See [funding-state documentation](buy-xor-funding-state.md) and `output/tonswap-growth/buy-xor-plan-preservation-tests.log`. These changes are included in the [25 September cost-review release](buy-xor-cost-release-2026-09-25.md).

## 3. Check the whole route before a card payment

The live UI returned an indicative 25 USD card estimate of approximately 3.330687 XOR **before Ethereum gas** during this review. A 100 USD request returned an unavailable conversion quote. No wallet was connected and no payment was attempted. A smaller amount that worked at one observation is not a permanent supported purchase size.

The deployed [before-card review](buy-xor-card-cost-review.md) checks the exact fee-inclusive USD budget, conversion gas, bridge gas, provider fee, downstream liquidity and purpose-specific native fees before payment. It reserves costs from card-delivered ETH without assuming an existing ETH balance. Unknown costs, stale quotes, changed accounts/providers or unavailable routes block opening checkout. The existing amount-first preview remains explicitly indicative.

A complete public read-only check at 13:40 UTC used a synthetic account with zero existing ETH. An exact $25 budget produced a conservative estimate of 2.380549793491646835 spendable XOR after the listed reserves, with sequential conversion/approval/bridge simulation passing. No payment or wallet transaction was made; this is a timestamped estimate, not a standing offer. The [quote relay](buy-xor-quote-relay.md) fixes the observed provider browser CORS failure while retaining all client validation and signing boundaries.

## 4. Prepare the native-network handoff now

Use the [provider integration packet](native-xor-provider-integration-packet.md) to answer technical diligence quickly: exact mainnet identity, canonical native asset, address validation, denomination, transfer/finality rules and acceptance tests. Keep corporate, legal, treasury and commercial fields explicitly unanswered until verified. The packet is prepared locally; the only approved external requests are recorded in [the integration decision](direct-card-native-xor-plan.md).

Provider-managed native delivery remains the shortest intended customer journey: fiat amount → SORA receiving account → provider checks/payment → finalized native XOR receipt. Existing Google-backed/local SORA account creation can be reused after its recovery path is validated on supported devices. The current Ethereum and TON route steps remain necessary until an approved alternative can actually settle native XOR.

## 5. Observe purchase progress and failure stages

The deployed [aggregate measurement](buy-xor-measurement.md) records fixed purchase-step and coarse failure-reason enums only after explicit opt-in. DNT/GPC veto collection. It includes verified native receipt observations and keeps the TS campaign separate.

The MOF collector's fixed verification probe incremented its separate probe counter exactly once while purchase rows remained empty. There are no wallet addresses, hashes, exact budgets or user identifiers in counter payloads. Restored stages and reloads can count again; these are observations, not unique purchasers, conversion rates or revenue. Keep XOR acquisition, XOR burning, TS claims and operating-company cash receipts as separate outcomes.

## Practical sequence

1. Use the pending provider replies and prepared integration packet to select a real native delivery model.
2. Approve an explicit asset source and budget for the sized liquidity target before promising larger purchase sizes.
3. Run a separately authorized funded pilot on mobile and desktop, including recovery after closing the browser; verify native receipt before broad promotion.
4. Inspect opted-in step observations for actionable failure patterns without presenting them as unique buyers or revenue.
