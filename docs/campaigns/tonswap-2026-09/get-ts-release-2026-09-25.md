# Get TS production release — 25 September 2026

The guided funding journey is live at [Polkaswap Get TS](https://polkaswap.io/#/get-ts). The [TONSWAP campaign page](https://tonswap.org/ts) links directly to card, Ethereum, TON and existing-XOR entry points.

## What shipped

- Card funding through the existing ETH-only MoonPay flow, followed by an on-site ETH-to-DAI conversion review.
- Ethereum ETH/USDT-to-DAI conversion with verified router/calldata, exact USDT approvals, fresh terms and account/network checks. Conversion must retain an ETH budget for later DAI approval and bridge gas.
- DAI bridge preparation and return navigation, with exact-amount liquidity/fee checks before approval and transfer. The fixed DAI/XOR swap has a 5% price-impact limit, and the original marked XOR burn is preserved.
- TON Connect and TON-USDT quotes with an explicit Symbiosis handoff. Native TON requires a prior TON-to-USDT conversion. On-site TON signing is not enabled.
- Conditional Google wallet onboarding, navigation-only resume state, existing public burn estimates and exportable reservation receipts. Funding checks require conservative output to cover both SORA swap and marked burn fees, including the adapter's worst accepted conversion minimum.

Transactions remain separate user-reviewed actions. A burn reserves a future TS claim for its SORA signer; this release does not deliver spendable TS or introduce a claim distributor.

## Deployment evidence

| Check | Result |
| --- | --- |
| Production CIDv0 | `QmRjfyNadaLCjdjPVAQk6DUUUhmwHqVsNKHPRWUdxMQ1qt` |
| Production CIDv1 | `bafybeibspdmqgm4gpjdigjfzvckebjcsia2vy5q74szovdagltlizl7qzm` |
| Testnet CIDv1 | `bafybeiafqhklcoka5pzpypbcdjcswam4adk5mibs5gq67m7tepttaiazxi` |
| Dedicated MOF origin | Both DAGs imported and recursively pinned; candidate root and JS verified before switching |
| Bunny zone 5860217 | New production origin saved; full cache purged; live `x-ipfs-roots` matches the production CIDv1 |
| Live assets | Entry JS, CSS, Swap chunk and Get TS chunk return 200 with correct content types |
| TON Connect manifest | Public JSON returns 200 with `Access-Control-Allow-Origin: *` |
| Production WebKit, Swap | `Swap - Polkaswap`, real route UI, 0 failed requests, 0 console errors |
| Production WebKit, Get TS | `Get TS - Polkaswap`, real route UI, 0 failed requests, 0 console errors |
| TONSWAP website | Commit `452e3b526618bff99a2092a8d86757ceb17953c0`; Vercel success; canonical page and all four source links verified live |

Local machine-readable evidence: `output/tonswap-growth/get-ts-release.json`, `get-ts-final-production-assets.json`, `get-ts-final-production-webkit.log` and `get-ts-final-page-webkit.log`. Deployment: [Vercel result](https://vercel.com/soramitsubots-projects/tonswap-site-web/HkNP4dzGynYMBNWZTfCVofMp4mjF).

## Validation scope

- Final broad unit run: 991 files; 989 passed. It recorded 9,185 passing tests, one menu assertion failure, and one suite import failure while unrelated Store-page work was being added to the shared checkout. Both failures concern `src/features/store` / `sidebarMenuIcons`, not the deployed funding changes. The Store route and test were modified at 16:01:39 JST, after this release was built. Both affected files subsequently passed on a fresh targeted rerun (3 tests), after the concurrent files were present. The isolated final funding regression run passed all 197 tests; no unrelated Store source was changed for this release. Logs retain the broad run and rerun separately; this is not a claim that the broad command itself exited successfully.
- Guided-flow integration run: 34 files and 488 tests passed. The final funding guard selection passed 197 tests after the last arithmetic correction; the broader bridge/reducer checks passed 211 tests.
- Translation checks: 4 suites, 13 tests passed. Script-constrained historical-language catalogs have not received expert linguistic review.
- Script project: 115 files; two subprocess-heavy tests timed out under concurrent work. Both affected files passed on isolated rerun, 36 tests. Original and rerun logs are retained.
- TONSWAP campaign tests: 4 passed; SEO validation passed for 19 generated pages.
- Browser checks cover real production rendering and mobile wallet entry, plus explicitly labeled mocked funding, quote expiry, fee coverage, provider handoff and bridge-return scenarios. The corrected desktop layout has separate form and balance columns. The 390px layouts have no horizontal overflow.

No real card purchase, approval, bridge transfer, swap or burn was signed during QA. Browser rendering and mocked transaction tests are not evidence of a completed funded mainnet journey.

## Remaining product goals

1. **Prove newcomer completion:** observe a user-controlled journey from funding to finalized burn receipt, including actual provider minimums and all fees. Target 8 successful supported scenarios out of 10 observed trials; this is a test target, not an achieved result or sales forecast.
2. **Make TON execution native to the page:** finish complete TON message verification and disclose delegated recovery before enabling signing. The [recovery audit](ton-recovery-audit.md) distinguishes the recovery signer from the refund recipient.
3. **Improve funding capacity:** assess executable DAI/XOR depth at the full intended amount. Current liquidity can reject otherwise available conversion routes; splitting a large purchase does not remove cumulative price impact.
4. **Direct card delivery:** only advertise card-to-native-SORA2-XOR once a provider demonstrably supports the chain, denomination, delivery and recovery. No such embedded provider was verified for this release.
5. **Measure outcomes:** existing burn funnel hooks and the [measurement contract](analytics-events.md) are prepared. The [finalized campaign baseline](baseline-2026-09-25.md) is captured. Production event collection and any actual cash receipts must be verified separately before reporting conversion or revenue.

External outreach remains paused at the user's direction. Existing email drafts remain unsent. No paid acquisition or provider commitment was made.
