# Before-card route review

`GetTsCardReadiness.vue` is the wallet-bound review between account setup and opening the MoonPay checkout. The amount-first preview remains indicative. The new review uses the exact locked USD budget, current connected Ethereum account on chain 1, current SORA recipient and mainnet API, live Hashi registration, Ethereum fee data, and the purpose-specific native fee policy. It never opens an order, connects or switches a wallet, obtains a signer, or sends a transaction.

Use `:amount="paymentAmount" :purpose="purpose" :paused="financialInteractionActive" @checked="onCardReview"`. The parent may enable card checkout only when the matching result has `allowed: true`, its expiry is in the future, and the component's exposed `canContinue()` returns true at the payment click. `canContinue()` also checks provider-object and SORA API identity; matching account strings or provider UUIDs alone are insufficient. `refresh()` explicitly reruns the read-only check. Compare USD amounts canonically, so `25.00` and `25` represent the same budget.

The result carries exact natural-unit amounts and no addresses, calldata, signed data or trusted completion state. Do not persist a ready result. The current `deliveredEth` can inform the later card-funded spending cap, but the actual card delivery, fresh conversion quote and wallet transaction reviews remain authoritative.

## Quote transport

The static frontend requests `https://mof.sora.org/api/buy-xor/quote`, a restricted read-only relay to the documented `https://api.symbiosis.finance/crosschain/v2/quote` upstream. It does not provide an arbitrary URL proxy, create provider orders or accept wallet transactions. The client sends ordinary JSON with no custom partner header and retains all payload, timeout, response, contract/runtime, recipient and receipt checks. There is no direct-browser fallback to the CORS-failing upstream. The separately exported upstream constant records provenance.

Actual production Chromium on 2026-09-25 observed upstream OPTIONS HTTP 404 without `Access-Control-Allow-Origin`, both with and without the custom header. POST was never sent in that browser case. Node server-side responses were intermittent, so Node 200 alone was not treated as proof of browser functionality. MOF’s ordinary Node24 server returned a valid upstream quote at 13:29:00 UTC, without a disguised user agent or custom partner header, before this relay integration was enabled. After relay deployment, an ordinary browser fetch from the production origin at 13:41:33 UTC returned OPTIONS 204 with the exact allowed origin and POST 200 JSON, with no failed requests (`output/playwright/buy-xor-live-relay-synthetic-quote.log`). This verifies browser quote transport; it is not a payment or a funded pilot.

## Cost calculation

1. Require a MoonPay native Ethereum quote whose fee-inclusive `totalUsd` numerically equals the locked USD amount. A clamped or different provider budget blocks checkout.
2. Read the selected account's current ETH balance separately. It is displayed but never added to the card-funded budget. Read current Ethereum max-fee/gas-price data and the gateway's on-chain fee.
3. Start conversion price discovery near the actual budget: delivered ETH minus the live gateway fee, the existing 196,000-gas Hashi floor, and a conservative 600,000-gas seed. Halving a small budget can create an artificial provider minimum failure. The seed never establishes readiness.
4. Obtain real recipient-bound ETH→DAI calldata. The existing adapter verifies all four contract runtime hashes, the current gateway fee and executor, both calldata layers and the enforced DAI minimum. The read-only verifier obtains no signer.
5. Estimate that exact calldata with an ephemeral sender ETH balance equal to the card delivery. If the wallet does not forward balance overrides, a fixed read-only Ethereum public RPC can perform the estimate after its chain ID, fresh block and canonical block hash match the selected provider. No DAI balances, allowances, contract code or token storage are fabricated.
6. Round estimated gas upward to a 10,000-gas bucket, then reserve twice that amount at current fee data. The upward rounding prevents small calldata-dependent gas changes from repeatedly moving the reviewed input. Requote the remaining exact input; at most three quote/estimate iterations are permitted. Repeated cost growth or insufficient funds blocks checkout.
7. Simulate the exact conversion, exact-minimum DAI approval and `sendERC20ToSidechain` in order using `eth_simulateV1`. Reserve the larger of twice the upward-rounded simulated approval/transfer gas or the existing 196,000-gas floor. Only explicit unsupported-method errors (-32601 or 4200) from that simulation permit the conservative floor alone. Invalid parameters, a reverted call, wrong chain, stale/forked block, malformed output and ordinary RPC errors block checkout.
8. Ordinary incoming registered DAI is a nonpayable Hashi transfer and its incoming runtime request uses `should_take_fee=false`; no separate DAI deduction is invented. Current registration, Initialized bridge status and the canonical bridge address are checked again. Manual recovery and future fee changes are outside this normal-path estimate.
9. Quote the enforced minimum DAI on SORA and use the existing 5% impact limit, conservative output allowance, configured slippage and known native fee evidence. Generic XOR reserves the swap fee; TS also reserves the marked-burn fee and requires a fresh campaign allocation check.

The headline summary shows “You pay” and the conservative native XOR output after the checked costs, making the net outcome the dominant figure. For TS, it says XOR available to burn; the separately labeled future TS estimate remains in the disclosure. A visible “Remaining costs” note states that current estimated fees are reserved from this budget and later fees or prices may change. ETH delivery, the network reserve, conversion/bridge amounts, individual fees, existing wallet balance, and detailed limits are inside the closed fee disclosure. Existing neumorphic surfaces, wrapped mobile rows, 44px controls and focus rings are retained. This presentation does not change calculation, expiry, account binding, or checkout gates.

## Freshness and limits

The whole review is bounded by a 30-second abort and expires at the earliest card, conversion, downstream or review deadline. Amount, purpose, recipient, account, provider, chain and native fee changes synchronously revoke readiness. Expiry is respected even while card interaction is paused. Unknown evidence is unavailable, never zero cost.

This is a current estimate with reserves, not an all-in guarantee. Card processing can outlast it; the provider may change its final quote or reject eligibility, and later gas, bridge timing or liquidity can change. The existing conversion, bridge and native signing checks still run. A successful simulation is neither a submitted transaction nor proof that the customer received funds.

## Verification

Focused unit coverage exercises zero existing ETH, exact card-budget equality including trailing zeroes, separate existing funds, reserve-first discovery, fee growth/requotes, explicit-method-only simulation fallback, malformed/forked network evidence, unknown costs, rejected/expired downstream quotes, account/provider/API changes, cancellation and click-time freshness. RPCs and providers are mocked in unit tests.

The cost-summary component regressions verify that the displayed XOR is the helper's net result, intermediate ETH/DAI figures and existing funds stay in closed details, future TS is qualified, and all existing click-time guards still pass or revoke as before. The presentation-only update passed both preview/review component suites (20 tests) and scoped ESLint. Logs: `output/tonswap-growth/buy-xor-usability-cost-{tests,lint}.log`. No funded payment was used for this check.

Local presentation QA rendered both actual components against mocked financial boundaries at 1200px and 390px, in light and dark themes. All eight cases had viewport width equal to document width, closed fee details, unchecked measurement consent, and no page errors, failed requests, or external requests. The saved component screenshots were visually inspected. Evidence: `output/tonswap-growth/buy-xor-usability-cost-visual.json` and matching `cost-preview-*` / `cost-review-*` screenshots. These fixtures establish layout only; their illustrative amounts are not live quotes.

The separate `output/tonswap-growth/audit-card-readiness.ts` performs public read-only checks with a deterministic synthetic account and live quotes/RPC. It emulates selected-wallet identity only; it is not a connected customer wallet or a funded pilot. Its JSON contains no customer identifiers. Earlier direct-access attempts correctly failed closed during the upstream HTTP 404 observations. The official upstream endpoint remains unchanged; the frontend now uses the restricted relay described above.

At 2026-09-25 13:40:07–17 UTC, the complete live synthetic-account review returned `allowed: true` for an exact $25 budget and zero existing ETH. Mainnet finalized block 27,774,963, runtime 131, canonical DAI registration and Initialized Hashi status verified. Three relay POSTs returned 200. The exact conversion, approval and bridge calls passed sequential read-only simulation. The result was:

| Item                            | Current amount            |
| ------------------------------- | ------------------------- |
| Card-delivered ETH              | 0.007587102 ETH           |
| ETH available for conversion    | 0.00552992057484 ETH      |
| Conversion network reserve      | 0.00127145428344 ETH      |
| Bridge network reserve          | 0.00063572714172 ETH      |
| Current gateway fee             | 0.00015 ETH               |
| Enforced minimum DAI for bridge | 14.832672224801084765 DAI |
| Native DAI→XOR price impact     | 3.2083386262777432%       |
| Native swap fee reserve         | 0.100020712589707326 XOR  |
| Conservative spendable output   | 2.380549793491646835 XOR  |

Evidence: `output/tonswap-growth/buy-xor-card-readiness-live.json` and `.log`. The provider’s current $3.79 fee is included in the locked $25 charge. The ETH budget equals conversion input plus both gas reserves plus the gateway fee, without assuming a prefunded wallet. These are timestamped estimates, not a standing quote or proof of delivery. No order, signature or transaction was created.

Official references: [Geth read-only simulation](https://geth.ethereum.org/docs/interacting-with-geth/rpc/ns-eth), [state overrides](https://geth.ethereum.org/docs/interacting-with-geth/rpc/objects), [Symbiosis current workflow](https://docs.symbiosis.finance/developer-tools/symbiosis-api).

Focused commands (relay-aware source):

```sh
node .yarn/releases/yarn-4.10.3.cjs exec vitest run --config vitest.config.mjs --project unit tests/unit/features/misc/getTsCardReadiness.spec.ts tests/unit/components/pages/Burn/GetTsCardReadiness.spec.ts tests/unit/features/misc/tonswapConversion.spec.ts tests/unit/features/misc/getTsPlanQuote.spec.ts
node .yarn/releases/yarn-4.10.3.cjs exec eslint src/features/misc/lib/getTsCardReadiness.ts src/features/misc/components/burn/GetTsCardReadiness.vue src/features/misc/lib/tonswapConversion.ts tests/unit/features/misc/getTsCardReadiness.spec.ts tests/unit/components/pages/Burn/GetTsCardReadiness.spec.ts tests/unit/features/misc/tonswapConversion.spec.ts
```

Result: 4 suites / 70 tests passed; scoped lint clean. `vue-tsc` is not installed. A native `tsc` pass over the new helpers and compiler-sfc-generated component script with the production SDK aliases reported no errors in those files; inherited repository dependency errors prevent a clean overall typecheck. Logs are under `output/tonswap-growth/buy-xor-card-readiness-{tests,lint,types}.log`.

The Ethereum simulation RPC's ordinary JSON CORS preflight from `https://polkaswap.io` returned 204 with `Access-Control-Allow-Origin: *` and `content-type` allowed at 13:31:10 UTC. This is separate from the failed direct Symbiosis preflight.
