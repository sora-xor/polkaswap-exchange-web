# Bot playground validation

Date: 2026-09-14 (Asia/Tokyo).

Historical record of the earlier playground release. The replacement Backtesting workspace has separate [implementation and validation evidence](bot-backtesting-validation.md); this report's timings and deployment receipt do not establish its deployment status.

The quick-test workspace runs an unsigned, local strategy simulation before a user creates a bot or connects a wallet. Synthetic prices and simulated results remain explicitly labeled. Historical mode requires verified candles and reports coverage; an unavailable provider clears historical metrics and does not substitute a synthetic result. Saving creates an idle paper definition with its original virtual capital and no simulated trades in the execution ledger.

## Browser coverage

The initial built-application run passed **14/14 cases**: eight playground cases, four existing bot-workspace cases, and two browser-storage cases. The playground matrix covers Chromium and WebKit, desktop (1440 × 960) and mobile (390 × 844), and root and IPFS-prefixed hosting.

The stronger initial-viewport check identified a partially clipped mobile Run button. The mobile chart was reduced by 12 pixels to provide clearance above the fixed footer. The final matrix is run against a fresh snapshot containing that change and the active-session attention controls.

The playground suite checks:

- A chart and the full primary Run button in the initial viewport.
- Preset, capital, trade-size, and period changes, followed by a single Run click.
- Preview completion within two seconds, measured from the browser's click event to its `aria-busy` completion using `performance.now()` and a mutation observer. Calendar time is fixed; the animation clock runs normally. Test-driver polling and locator delays are excluded from this measurement.
- Reduced-motion behavior, replay controls, and no horizontal overflow.
- A mocked unavailable historical-data path with an explicit error, no equity curve, no coverage claim, and no numeric result.
- Saving an idle paper bot with zero completed trades, zero transaction orders, and no wallet-consent dialog.
- No market-quote request while previewing. Only Save requests a fresh unsigned quote, with node readiness required and wallet readiness explicitly unnecessary. A test quote of 5 XOR per VAL must produce a 50 VAL output limit from 250 XOR, rather than retaining the synthetic reference price of 2.
- Existing creation, consent, reload, multiple-tab, IndexedDB, and Web Locks behavior.

The **final 14/14-case matrix passed** against the final production build (HTML entry `index-Df9uXBAW.js`) in 83.8 seconds, with zero skipped, unexpected, or flaky cases. Every playground case passed the full Run-button viewport assertion. The 16 animated run measurements were **1,141–1,158 ms**; eight reduced-motion measurements were **11–17 ms**. These timings apply to the local synthetic preview, not historical data retrieval.

| Browser | Hosting | Viewport | Animated runs (ms) | Reduced motion (ms) |
| --- | --- | --- | --- | --- |
| Chromium | Root | Desktop | 1141, 1158 | 14 |
| Chromium | Root | Mobile | 1153, 1148 | 16 |
| Chromium | IPFS prefix | Desktop | 1142, 1148 | 16 |
| Chromium | IPFS prefix | Mobile | 1148, 1158 | 15 |
| WebKit | Root | Desktop | 1152, 1149 | 17 |
| WebKit | Root | Mobile | 1147, 1144 | 13 |
| WebKit | IPFS prefix | Desktop | 1141, 1148 | 12 |
| WebKit | IPFS prefix | Mobile | 1148, 1144 | 11 |

All eight playground cases verified zero quotes before Save, exactly one unsigned quote on Save, `requireWallet: false`, and a saved 50 VAL limit derived from 250 XOR at the mocked current price of 5 XOR per VAL. Each saved paper bot had zero completed trades and zero transaction orders.

Screenshots are written to `output/playwright/bots-playground/`. Desktop and mobile composition were reviewed; an independent first-open WebKit screenshot is `webkit-initial-mobile.png`.

## Focused automated checks

| Check | Result |
| --- | --- |
| Strategy engine and playground model | 53 tests passed |
| Playground component | 6 tests passed |
| Controller, historical loader/cache, and page integration | 40 tests passed |
| Locale catalogs | 13 translation tests passed |
| New and updated browser specifications | ESLint passed |
| Full unit suite | 5,011 passed: 4,741 application tests and 270 script tests |
| Final controller/cache regression checks | 32 tests passed after fresh-quote saving correction |
| Static build | Passed; production and testnet DAGs published and replicated |
| Production CDN update | New origin saved and full-zone cache purged; root and index.html return the release CID and exact built HTML with no-cache |
| Production WebKit | Official check and desktop Swap, desktop Bots, and mobile Bots checks passed with zero failed requests, HTTP errors, console errors, or page errors |

The focused tests cover explicit synthetic-data provenance, unverified-history rejection, stale and rejected provider promises, exact token amounts, immutable input state, and saving configuration without simulated portfolio activity. The browser quote fixture uses the existing frozen `window.PolkaswapAgent` interface; no production test hook was added. All services and wallets used in these automated checks are mocked; the checks do not sign transactions or call paid AI providers.

## Localization

All **49** playground message keys are present in all **31** main locale catalogs. Interpolation tokens are preserved, and the translation gate passes. Existing translations were reused where wording matched; new modern-language copy was translated manually for this iteration.

Akkadian and Egyptian preserve the repository's existing script-only transcription convention for new technical copy. Those transcriptions are not scholarly translations. Native-language review remains advisable, particularly for Dhivehi, Dzongkha, Amharic, Burmese, and Khmer.

## Reproduction

```sh
PS_PLAYWRIGHT_REUSE_SERVER=1 \
PS_IPFS_TEST_PREFIX=/ipfs/polkaswap-playground-e2e \
yarn exec playwright test \
  tests/e2e/ui/bots-playground.spec.ts \
  tests/e2e/ui/bots.spec.ts \
  tests/e2e/ui/bot-storage-browser.spec.ts --workers=1
yarn test:translation
```

The preview server must serve a freshly built static bundle at port 41733 with the matching IPFS prefix. Changing source files after the preview server starts does not update its snapshot.

## Production delivery

The playground is live at [polkaswap.io/#/bots](https://polkaswap.io/#/bots). Production CIDv1 is `bafybeibowokjwybnotv2gmco7352qkombxagnh6ys2xzqport2435rq4jy`; both production and testnet DAGs are pinned at the dedicated MOF origin. Bunny's origin-save success notification was observed before confirming a full-zone purge. The subsequent live root returned the new CID with `CDN-cache: MISS`.

All 265 startup, Swap, and Bots assets were warmed sequentially and matched the published bytes. The official WebKit check passed. Additional live WebKit checks reached `Swap - Polkaswap` and `Bots - Polkaswap`, verified the exact release CID, and captured zero failed requests, HTTP errors, console errors, page errors, or pending script requests. The mobile chart and Run button each had a full intersection ratio of 1 at 390 × 844. The live sample label and fee/slippage assumptions were verified without connecting a wallet, accepting terms, saving a bot, or initiating a transaction.

The receipt is [bot-playground-deployment.json](bot-playground-deployment.json). Production screenshots and detailed browser evidence are under `/tmp/polkaswap-bots-production-webkit/`; command logs are referenced in the receipt.
