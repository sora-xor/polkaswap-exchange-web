# Bot backtesting validation

Date: 2026-09-14 (Asia/Tokyo).

The workspace now uses real historical observations beginning March 1, 2026 and current SORA network and swap fees. This is a local static implementation; no production deployment is included. Earlier sample-data videos and screenshots describe the retired implementation and are not evidence of real historical performance.

## Historical data evidence

- Static dataset: `public/bot-history/sora-mainnet-hourly-2026-03-01.json`.
- SHA-256: `f58ba3fd2f74d231e723d1bb26a6f7ec2e018a380038b0aea4da072b291fac79` (9,070,774 bytes).
- Capture: 4,729 hourly observations, March 1 01:00 UTC through September 14 01:00 UTC; every requested hour is present.
- XOR, VAL, PSWAP, DAI, ETH, XSTUSD and XST yield complete historical spot-price coverage for all 42 directed pairs in this capture. Current fee-route support is checked separately. Verified XOR intermediary routes are supported; unsupported fee assets or routes remain unavailable.
- Each row retains exact historical pool reserves, asset precision, denomination, block and following-block hashes, and timestamps bounding its completed hour. First, middle and last row hashes were cross-checked against the primary MOF node.
- Full evidence: `output/research-verification/archive-summary.json`. The served IPFS-prefixed static file returned HTTP 200 and the identical dataset hash.
- These are historical pool spot observations. Animated trades are backtest decisions, not recorded executions. No synthetic interpolation, generated-price fallback or unverified CSV source is offered.

## Fee evidence and behavior

`research-fees.ts` queries both trade directions at one finalized block. It reads each route's explicit fee map and the runtime's transaction payment information with unsigned estimation envelopes. It submits no transaction and uses no wallet key. Current observed fees are applied to historical simulated trades; they are not represented as past paid fees. Fee observations expire after five minutes, and unavailable observations prevent a result or bot creation.

The recorded live check at block 27,642,604 (`0x4e88532acc5dd7775b1d1ff2d935f18d50799cbd05d6efabedb45d461286f418`) returned a network fee of `0.100020612589707326 XOR` for the tested 10 XOR → VAL swap, plus an explicit `0.06 XOR` swap fee. Its reverse direction had its own quote and network-fee observation. This dated evidence is in `output/research-verification/live-fee-observation.json`; none of these observations are production defaults.

For a non-XOR pair routed through XOR, the loader reproduces the two direct legs at the full quote's finalized block and DEX. The final output and aggregated XOR fees must match exactly; even a one-codec-unit mismatch prevents normalization. With first-leg net XOR output `x`, first-leg fee `f1`, and second-leg fee `f2`, the measured proportional fee is `(f1 + f2) / (x + f1)`. No extra conversion swap is introduced. Integer arithmetic rounds the percentage and equivalent capital deduction upward once. The fee snapshot retains raw XOR amounts and optional conversion provenance: both leg fees, gross and net intermediary XOR, equivalent capital amount and asset, and the observed block.

The primary MOF RPC observation at block 27,647,467 (`0xd33b659bb5db1c723fcbca2f90744697f41159a8884f716f165bd6eb2debdd3b`) returned 371.701599019721154347 PSWAP for 10 VAL. The reverse quote used that exact PSWAP amount and returned 9.747231939188790848 VAL. Both two-leg reconstructions matched their full quote's output and XOR fee total exactly. The combined raw fees were `0.000238553339326131 XOR` forward and `0.000235574559208464 XOR` reverse. The loader's upward-rounded proportional fees are `1.196400000000002407%` and `1.196400000000008178%`, respectively. These swap quotes do not include the separately charged network fee and do not establish a historical or future fee schedule.

Raw route evidence is in `output/research-verification/third-asset-fee-roundtrip-evidence.json`, with a frozen regression fixture at `tests/fixtures/bot-trading/mainnetCrossPairFees20260914.json`. The diagnostic evidence's derived `feePercent` field is truncated; the loader regression asserts the upward-rounded rates above from the raw integer amounts. Tests verify both directions, pinned block and DEX selection, unsupported assets, route and amount mismatches, exact fee aggregation, and very small fees that must not round down to zero. The frozen route fixture uses separate, explicitly mocked network fees in unit tests.

Both the main workspace and My Bots backtest dialog use the March-onward loader and directional fee observations. History and fees must match on chain genesis and denomination. Startup waits for `ApiPromise.isReady`, not merely WebSocket connection, before accessing guarded metadata getters. Public swap quotes also refresh live DEX/source configuration, allowing bot creation when the user enters Bots directly before visiting Swap.

## Automated validation

| Check                                                       | Result                                                         |
| ----------------------------------------------------------- | -------------------------------------------------------------- |
| Full application unit suite                                 | 834 files, 4,940 tests passed                                  |
| Full script unit suite                                      | 24 files, 273 tests passed                                     |
| Complete bot feature units, including intermediary XOR fees | 23 files, 383 tests passed                                     |
| Subsequent price/cost display verification                  | 32 component tests passed                                      |
| Public quote initialization                                 | 89 service tests passed                                        |
| Translation consistency                                     | 4 files, 13 tests passed                                       |
| Final static build, including price display                 | Passed, 55.82 seconds                                          |
| Offline built-app matrix                                    | 8 passed, Chromium/WebKit, root/IPFS paths, desktop/mobile     |
| Actual-network built-app matrix                             | 6 passed, Chromium/WebKit, desktop/mobile and VAL/PSWAP routes |

Counts overlap and must not be added as unique tests. The full unit run is logged in `/tmp/real-history-all-units-complete.log` (5,213 tests total); the feature run is `/tmp/third-asset-final-feature-units.log`; translations are `/tmp/real-history-translations.log`; the final build is `/tmp/real-history-final-precision-build.log`. The subsequent component run (`/tmp/bots-price-display-tests.log`) covers six additional display cases: tiny prices remain visible, LP cost readouts round half up, and sub-cent costs retain meaningful digits. Portfolio calculations and counters are unchanged. The updated fee module, component and browser spec pass ESLint without warnings; existing formatting warnings remain elsewhere in feature fixtures and older agent-service tests.

The real archive integration tests validate every recorded hour and exact prices, all candidates, direction-specific costs, progressive accounting and engine parity for all three strategy methods. On the quieter final run, a 4,729-candle replay took 252–485 ms and optimized three-fold validation took 1.1–2.9 seconds. These local compute timings exclude chain/history loading and the 12–90 second presentation animation.

The browser checks use separate artifact directories. The offline matrix verifies that unavailable chain evidence produces no made-up results. The actual-network matrix reads the real static archive and live SORA fees and checks all 4,738 candidates, progressive and rewound accounting, three-fold training, and idle paper bot creation/reload. It also verifies the My Bots backtest uses March-onward history without changing holdings or adding orders. The four primary runs recorded zero failed app requests and zero unexpected console errors. The two additional VAL/PSWAP runs verified live XOR intermediary costs and successful idle bot creation. Logs: `/tmp/real-history-offline-browser-complete.log` and `/tmp/real-history-live-browser-final.log`.

Evidence is under `output/playwright/bots-real-history/`: per-browser JSON contains current fee observations and chain identity; desktop/mobile screenshots show the UI. `real-march-backtest-replay.mp4` is a 30-second excerpt of the actual live-data browser recording, preserving normal replay speed. It is a backtest visualization, not a recording of executed trades.

After the next UTC hour completed, a fresh browser load extended the verified range through September 14 12:00 UTC with 100% coverage and 4,739 candidates. The refreshed local preview observed the same `0.100020612589707326 XOR` network fee at block 27,647,614. The desktop recording also verified the additional completed hour; its evidence supersedes the earlier desktop capture.

## Requirements audit

| Requirement                  | Verified outcome                                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Real data from March 1, 2026 | Verified historical reserve observations plus a verified recent indexer tail; no generated prices or upload fallback                         |
| Live fees                    | Finalized SORA transaction-payment queries and directional swap fee maps; no hardcoded fee default                                           |
| Token selection and methods  | Visible capital/traded-token selectors; scheduled buying, dip buying and trend following                                                     |
| Every trade animated         | Every candidate appears in the ladder, histogram, keyboard navigation and complete paginated ledger                                          |
| Profit follows replay        | Portfolio return, selected outcomes, missed winners, avoided losses and paid costs follow landed candidates and rewind exactly               |
| Cross-validation             | Chronological holdout and walk-forward testing with a gap, independent test capital and training-only parameter selection                    |
| Create bot in My Bots        | Tested settings and fee observations persist in an idle paper bot with original holdings, no historical orders and no copied simulated gains |

The static local preview has been rebuilt and refreshed. Production has not been deployed by this task.
