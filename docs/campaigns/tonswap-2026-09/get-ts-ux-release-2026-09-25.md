# Get TS checkout UX release — 25 September 2026

**Complete: final neumorphic release is live and verified.** All seven primary UX requirements and the user-requested existing Polkaswap design language are delivered. The CSS-only final update passed compilation, lint, formatting and desktop/mobile light/noir visual checks. Financial behavior and copy remain unchanged from 1,003 application suites / 9,353 tests, 118 scripts suites / 2,374 tests and 13 translation tests passing. Publishing, MOF imports/pins, exact-byte checks, Bunny save/purge, stable asset warming and final WebKit verification all passed for the final CID.

## Final neumorphic implementation and release

Five component style blocks—Get TS page, amount preview, wallet setup, conversion panel and liquidity check—now use existing Polkaswap theme tokens for raised surfaces, recessed controls, native roundness and accessible control/state colors. The restyle preserves markup, exact outputs, quotes, transaction progress, route guards and financial logic. The release owner reviewed the actual app at 1,280 px in light/noir and 390 px in noir; controlled fixtures were reviewed at 1,200 and 390 px in both themes, including pending states. No horizontal overflow or console errors were observed. These local checks complement the final live browser verification below.

| Final release check | Result |
| --- | --- |
| Production CIDv0 / CIDv1 | `QmToesoFBpXZkDxBNYNLDhUaG1K668eoC2kocSyQ4bNBK1` / `bafybeicrgvhc64ot2oljrrofdlgadelghhaunixrp5m4tkcz2l6nxmpmqq` |
| Testnet CIDv0 / CIDv1 | `QmZBbFvku5PrVS78EM3AwpiDXdudSRWbC5S9NgCnNfemr7` / `bafybeifbdzwswpkatgmgraxlqcccrearhbn6xchxsj7awpo3l2kt7c2jla` |
| Build and publish | Passed: `output/tonswap-growth/get-ts-neumorphic-publish.log`. Source was frozen before the final build. |
| Exact-byte baseline | Immutable published local CID export: `output/tonswap-growth/get-ts-neumorphic-frozen-dist`. |
| MOF imports and recursive pins | Both roots imported, recursively pinned and pin-verified; exit 0. Evidence: `get-ts-neumorphic-mof-*.log` under `output/tonswap-growth/`. |
| Candidate static validation | All eight critical files passed exact immutable bytes, correct MIME, HTTP 200 and zero redirects. Evidence: `output/tonswap-growth/get-ts-ux-candidate-6nxmpmqq/verification.json`. No additional candidate warming was required. |
| Bunny origin save, purge and stable root | Final origin saved and authorized purge completed in the authenticated UI. Live root returned HTTP 200 with `x-ipfs-roots: bafybeicrgvhc64ot2oljrrofdlgadelghhaunixrp5m4tkcz2l6nxmpmqq` and `no-cache` at 10:14:05 UTC. Evidence: `get-ts-neumorphic-live-root.headers` / `.html`. |
| Stable assets and sequential warming | All 231 files passed exact immutable bytes, HTTP 200, correct MIME and zero redirects; `passed: true`, `warmingComplete: true`. Evidence: `output/tonswap-growth/get-ts-ux-stable-6nxmpmqq/verification.json`. |
| Production WebKit Swap and Get TS | Both official checks exited 0 for this final CID. Titles are `Swap - Polkaswap` and `Get TS - Polkaswap`; `hasRouteUi: true`, `hasBootstrapLoader: false`, zero failed requests and zero console errors. Evidence: `get-ts-neumorphic-webkit-swap.log`, `get-ts-neumorphic-webkit-get-ts.log` and `get-ts-neumorphic-live-summary.json`. |
| Final live visual review | Release owner reloaded the user’s browser at 701 px in noir. Title is `Get TS - Polkaswap`, logo loaded, viewport and document widths both 701 px, workspace shadows outward and input shadows inward using native theme tokens. |

## Outcome and scope

The updated `/get-ts` journey lets a visitor choose a payment source and enter an amount before connecting wallets. Its public preview explains the indicative future TS allocation, supported route and incomplete cost coverage. The three stable phases are plan, wallets and reviewed actions. The checkout shell removes unrelated exchange navigation and infrastructure status while keeping an exit and settings.

The supported paths remain separate financial actions:

- Card buys native ETH on Ethereum through MoonPay; ETH is then converted to DAI, bridged to SORA, swapped to XOR and burned with the existing claim marker.
- Ethereum accepts ETH, canonical USDT or existing canonical DAI. The DAI route skips conversion.
- TON USDT requires a TON wallet, an intermediary Ethereum wallet, an explicit Symbiosis handoff and then the Ethereum route. Native TON still requires a prior TON-to-USDT conversion. On-site TON signing is disabled.
- Existing SORA DAI or XOR can enter at the relevant reviewed action.

Wallet setup presents one connection action at a time, starting with the spending wallet. Where supported, the Google action enters the existing Google-backed SORA account flow directly. This does not eliminate the Ethereum/TON wallet, Google availability, encrypted-backup or account-ownership requirements. The SORA account signs the burn and owns the future TS claim.

Read-only conversion and liquidity estimates refresh automatically; review/sign actions remain explicit. Details are collapsed by default, monetary displays are rounded independently of exact execution amounts, and the card budget is carried to the existing provider widget. A balance-aware ETH amount suggestion reserves conversion gas, native provider fees and later Hashi gas before filling the form. Its final wallet-specific quote and gas checks still run before signing.

## Second-audit recovery update — included in final build

The conversion panel records the submitted Ethereum hash immediately, before waiting for confirmation. Its result is reconstructed from canonical DAI `Transfer` logs in that exact receipt: matching Ethereum mainnet, connected sender, configured conversion gateway, transaction/block identity and the existing one-confirmation policy. Incoming DAI minus outgoing DAI in that receipt supplies the exact received amount; unrelated balance changes never establish conversion completion.

The page resumes saved conversion references without reopening a card purchase. Received status comes from the current receipt reader; changing account, network or provider revokes it, and late responses cannot restore stale progress. A failed Ethereum conversion originating from TON retries in Ethereum phase instead of returning the buyer to the TON provider handoff. Recording a new upstream transaction invalidates its downstream references and amount suggestions; recording the same hash again is idempotent.

The later plan summary retains the partial estimate's “before Ethereum gas” label. The revised copy states that conversion and bridge fees are excluded, extra ETH is needed, those costs are checked in their respective reviews, and the card quote alone does not establish coverage of every step. This replaces the earlier implication that the reserve is calculated before a card purchase.

| Primary UX requirement | Implementation evidence |
| --- | --- |
| Amount-first preview and honest costs | Public provider quotes, exact SORA fees/campaign math, explicit unavailable states, qualified preview and later summary; 18 preview helper/component tests plus the copy correction. |
| Spending wallet before SORA/Google entry | Sequential wallet component and explicit Google entry; existing wallet availability, rejection and ordering coverage retained. |
| Automatic checks and one reviewed action | Debounced quotes, collapsed detail, exact amount prefills and explicit review/sign boundaries; 29 conversion-panel tests. |
| Draft continuity and verified progress | Immediate conversion hash, receipt-derived DAI, context revocation, saved-reference recovery and downstream invalidation/idempotency; focused recovery selection passes 3 suites / 41 tests. |
| Truthful TON route | External TON handoff remains explicit; native TON prerequisite remains visible; Ethereum conversion retry now stays in Ethereum phase. |
| Focused desktop/mobile shell | Existing 5 shell and 7 header tests; final CSS-only neumorphic implementation passed local actual-app and fixture visual checks above. Final WebKit and live visual verification passed for the final CID. |
| Stable phases, receipt status and future claim | Distinct conversion status/recovery, saved-reference card suppression, explicit final burn review and same-wallet future TS claim. No launch date or automatic execution. |

The recovery application rerun passed 1,003 suites / 9,353 tests in 526.24 seconds (`output/tonswap-growth/get-ts-recovery-all-app-tests.log`, exit 0). The earlier overall command finished with exit 0; its scripts project passed 118 suites / 2,374 tests in 22 minutes 51 seconds (`get-ts-ux-all-unit-final.log`). Recovery production/testnet publishing succeeded in `get-ts-recovery-final-publish.log`. Only CSS spacing and a 44 px touch target changed between that application's test start and recovery publishing, as confirmed by the release owner. The later user-requested neumorphic restyle is CSS-only; its local visual checks and final live verification passed.

## Recovery build deployment record — verified before the neumorphic update

| Check | Result |
| --- | --- |
| Final production CIDv0 / CIDv1 | `QmPFusvKBdTNupRrejQ32dVyQqdLxLQU7kio337hEtuKwY` / `bafybeianutxuw7uijq7uo2jvi55s4qrbc2snz6tup26wx4rli3w2xan3km` |
| Final testnet CIDv0 / CIDv1 | `QmZkYwixxVakFwFuL4ZMwcHCkya2J2G7pW6ytngEwpyg4C` / `bafybeifjr75bhhdcnegkl7fdx7hmbvr5fs5mhr32violbgdw2zg57hjnmu` |
| Build/publish | Succeeded: `output/tonswap-growth/get-ts-recovery-final-publish.log`. |
| Immutable verification baseline | The final published production CID is exported to `output/tonswap-growth/get-ts-recovery-final-frozen-dist`; the verifier uses `GET_TS_VERIFY_BUILD_DIR` to compare against those exact immutable bytes. Another concurrent build changed ordinary `dist`, so it is not this release's comparison source. |
| MOF imports and recursive pins | Completed for the recovery release; evidence paths are `get-ts-recovery-final-mof-prod-import.log`, `get-ts-recovery-final-mof-test-import.log` and `get-ts-recovery-final-mof-pins.log`. |
| Candidate static files, saved Bunny origin, purge and stable files | All 231 candidate files passed exact-byte verification. Release owner confirmed the Bunny origin save and authorized purge. Stable root returned HTTP 200 at 10:05:06 UTC with `no-cache` and this production CID; all 231 stable files passed and dependency warming completed. |
| Production WebKit Swap and Get TS | Both official 30-second checks passed for this CID: expected `Swap - Polkaswap` / `Get TS - Polkaswap` titles, real route UI, no bootstrap loader, zero failed requests and zero console errors. Evidence: `get-ts-recovery-webkit-swap.log` and `get-ts-recovery-webkit-get-ts.log`. The subsequent neumorphic CSS release is independently verified in the final record above. |

## Continuity and verified progress

The strict tab-session draft stores only the payment asset, bounded exact amounts and submitted transaction references. Original asset/amount changes clear downstream drafts and references. No account identifiers, quotes, calldata, signed data or trusted completion flags are persisted. Bridge and swap forms receive reviewable amount suggestions; burn suggestions leave a known burn fee and never overwrite an edited input or open review.

Bridge progress matches the tracked Ethereum hash to an incoming Ethereum-mainnet DAI history row and both connected accounts. It verifies the exact incoming request and completed transfer data in finalized SORA storage. Swap progress matches the tracked hash, signer and DAI/XOR arguments in a canonical finalized block, then checks the extrinsic's success and exchange events. Saved history status and preexisting balances cannot establish either completion. An observed matching XOR fee event can supply exact net swap proceeds. Existing funds remain a separately labeled choice.

These readers are deliberately bounded. They require the retained matching history row and, for a swap, a candidate block. They do not search arbitrary old blocks, independently prove finality or bypass RPC pruning. A reverted Ethereum transfer with no SORA incoming mapping may remain pending in the summary; the existing bridge history provides transaction details and recovery. Missing, pruned or inconsistent evidence is unavailable, not a declaration that funds were lost or a transaction was undone. See [draft and progress implementation](../../tonswap-get-ts-plan.md).

## Financial checks retained

- Mainnet, current accounts, registered token identities, exact amounts, allowance/spender, calldata and quote freshness remain checked at financial boundaries, including after asynchronous approval or wallet work.
- Guided DAI/XOR execution rejects price impact above 5%. The exact bridge amount receives its own fresh check; a previous wizard estimate cannot authorize it.
- Conservative output must cover both output-funded SORA swap fees and the marked burn fee with positive XOR remaining. Missing or default-zero fee evidence blocks the route. Ethereum and TON gas remain separate requirements.
- A submitted hash is not received funds. Pending swaps cannot be completed by an unrelated existing XOR balance. A failed action can be reviewed again; an expired/replaced quote never automatically retries a financial action.
- The final burn remains irreversible and reserves a future claim. The release does not deliver spendable TS, promise a launch date, provide a claim distributor or establish proceeds to the campaign operator.

## Read-only liquidity evidence

The $100 card preview was independently checked against public provider quotes and a verified SORA mainnet finalized block at **2026-09-25 09:26:30 UTC**, block **27,772,572**, hash `0x278d87b9e09f0ca29555e0abf5a44e8a84f88223185d24860c8a0ba3e137c0bd`.

MoonPay quoted a $100 total for **0.032959817 ETH**, including provider amounts of $3.99, $0.93 and $2.02. The existing strict read-only conversion adapter quoted **89.06483 DAI**, minimum **88.1741817 DAI**, with **0.31%** provider price impact. Quoting that full expected DAI output on SORA produced **13.459421324098194801 XOR**, against **16.171177583629116232 XOR** without impact: **16.7690710556302749%**.

| SORA DAI input                 | Quoted XOR            | Price impact         | Within 5% impact limit |
| ------------------------------ | --------------------- | -------------------- | ---------------------- |
| 10                             | 1.775499517158917301  | 2.2120919499835929%  | Yes                    |
| 20                             | 3.474147692873244834  | 4.3284349391186647%  | Yes                    |
| 25                             | 4.296195113505139732  | 5.3526224785185023%  | No                     |
| 50                             | 8.155838957651268544  | 10.1613464431982356% | No                     |
| 100                            | 14.807079290478007518 | 18.4481159159354743% | No                     |
| 89.06483, from this card quote | 13.459421324098194801 | 16.7690710556302749% | No                     |

The configured `XYKPool`/`OrderBook` SMART filter and unrestricted source selection returned identical values at that block; those were the only enabled sources. The helper calculates `(withoutImpact − output) / withoutImpact × 100` with `FPNumber` and compares percentage points with `5`. Its unit test accepts exactly 5% and rejects one codec unit beyond the boundary. No scale/decimal error or omitted enabled source was found in this check. The $100 plan is correctly blocked by liquidity, not a failed checkout rendering.

The card preview is explicitly before additional Ethereum gas. This observation quotes the gross delivered ETH and does not prove that the entire ETH amount is spendable after gas. Passing the impact column alone also does not establish fee coverage, provider minimum eligibility or complete-route feasibility. Rates are historical observations, not offers; smaller repeated transactions do not remove cumulative price impact.

Raw evidence: `output/tonswap-growth/get-ts-card-liquidity-2026-09-25.json`; read-only reproduction script: `output/tonswap-growth/check-get-ts-card-liquidity.ts`. No user account, order, wallet connection, approval or transaction was used.

## Local validation record

| Check                                 | Evidence and status                                                                                                                                                                                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Second-audit recovery regression | 3 suites / 41 tests passed in `output/tonswap-growth/get-ts-recovery-tests.log`; conversion panel 29 focused tests passed. These are scoped checks, not the final application rerun. |
| Second-audit copy and locale correction | Five messages synchronized across all 31 catalogs, `en.json` and runtime messages. Four translation suites / 13 tests, explicit Akkadian script check, formatting and runtime-message lint passed. `get-ts-second-audit-locale-audit.json` records no unrelated catalog-value changes or placeholder/symbol/artifact errors. |
| Recovery application rerun | 1,003 suites / 9,353 tests passed, exit 0, in 526.24 seconds: `output/tonswap-growth/get-ts-recovery-all-app-tests.log`. |
| Initial broad UX unit run             | 1,002 files: 1,000 passed, 2 failed; 9,314 tests passed, 3 failed. The failures were shell-context mocks and a header asset-import assertion. Log: `output/tonswap-growth/get-ts-ux-all-unit.log`. This command did not pass. |
| Corrected broad run                   | Earlier overall command exited 0: application **1,002 suites / 9,325 tests passed** and scripts **118 suites / 2,374 tests passed**, recorded in `output/tonswap-growth/get-ts-ux-all-unit-final.log`. Scripts duration: 1,371.16 seconds. The recovery application rerun remains separate. |
| Latest page regression run            | 17 tests passed in one file; `get-ts-ux-page-final-tests.log`.                                                                                                                                                                |
| Checkout shell regression run         | 5 tests passed in one file; `get-ts-shell-layout-tests.log`.                                                                                                                                                                  |
| Root integration selection            | 69 tests passed in five files; `get-ts-ux-root-tests.log`. Its subsequent scripts-project selection contained no matching tests and is not extra test coverage.                                                               |
| Google entry selection                | 12 tests passed in one file; `get-ts-ux-google-tests.log`.                                                                                                                                                                    |
| Plan/progress/wallet/bridge/burn lane | 166 focused tests passed in nine suites during implementation. Covers strict state, exact amounts, submitted-reference binding, finalized evidence, account/network changes, burn edit protection and bridge prefill.         |
| Translation checks                    | 4 suites, 13 tests passed; `get-ts-preview-translations-test.log`. The 140-string delta was synchronized across 31 main catalogs including English (30 non-English), with runtime keys and interpolation checks.                                  |
| Earlier funding regression evidence   | 197 tests passed in seven files, `get-ts-final-funding-regressions.log`, plus the earlier 488-test integration run. Retained financial-boundary coverage; not a replacement for the new final broad run.                      |
| Lint/format                           | Final consolidated lint: 0 errors and 2 duplicate-import warnings in the swap form; `get-ts-ux-final-lint.log`. Scoped formatting checks passed.                                                                                                         |
| Browser fixtures                      | Real page/preview/wallet/conversion components with explicitly simulated financial boundaries. Root visual review artifacts are under `output/playwright/get-ts-harness/`; they are not mainnet transaction evidence.         |
| Real app, read-only preview           | Full local app loaded with bounded Vite scanning; provider and production SORA reads exercised without wallet signatures. Production WebKit and live responsive checks passed for the final CID, as recorded below. |

The shared checkout contains unrelated concurrent changes. Preserve the original broad log and targeted/final reruns distinctly; do not describe a corrected subset as a successful original broad command. The final build must follow the last source change.

Ordinary translations are machine-assisted and not represented as native-speaker reviewed. The repository's constrained historical/specialized locale workflow for Akkadian, Egyptian and Pijin can satisfy structural/script tests without proving faithful financial meaning. Expert semantic review remains necessary. See [preview usage and translation limitations](../../../src/features/misc/components/burn/GetTsPlanPreview.md).

## Earlier deployment record — historical, browser verified

This record identifies the earlier amount-first UX release. It is retained as historical evidence; the final neumorphic release has its own production proof above.

| Check | Result |
| --- | --- |
| Final build and source freeze | Final production/testnet build and `ipfs:publish` succeeded after source freeze. Evidence: `output/tonswap-growth/get-ts-ux-final-publish.log`. |
| Production CIDv0 / CIDv1 | `QmcBkPpcEdpngX3VJY8xBhf7dWyRULLC2eKkcat1uLN6BA` / `bafybeignxpiuidwvdottzfku7ve7cdqlsdtuvqr4iw46jnzoc4ajdulype` |
| Testnet CIDv0 / CIDv1 | `QmRrmR2hgEBeALgUC5s3LLMThuJmHqaBihwRRXyz1LBo3C` / `bafybeibujiisxjk7zx6vk5zmboo4s66cm67ncjnyel2zwczfbnw4u6yi64` |
| MOF imports and recursive pins for both DAGs | Both root imports succeeded and both roots were verified recursive. Logs: `get-ts-ux-final-mof-prod-import.log`, `get-ts-ux-final-mof-test-import.log`, `get-ts-ux-final-mof-pins.log` under `output/tonswap-growth/`. |
| Candidate root, entry JS/CSS and route assets | Eight critical files and 223 additional imported JS files passed HTTP 200, correct content types, zero redirects and decompressed SHA-256 equality with exact local `dist` bytes. All 231 files (229 JS plus HTML/CSS) passed with zero failures; sequential warming is complete. Evidence: `output/tonswap-growth/get-ts-ux-candidate-ajdulype/verification.json`. |
| Bunny production origin | Saved `https://mof.sora.org/ipfs/bafybeignxpiuidwvdottzfku7ve7cdqlsdtuvqr4iw46jnzoc4ajdulype` with host header `mof.sora.org` in the authenticated UI; confirmed by the release owner. |
| Authorized Bunny cache purge | Full `polkaswap` pull-zone cache purge completed in the authenticated UI after saving the validated origin; confirmed by the release owner. |
| Live root matches new production CID | HTTP 200 at 09:36:28 UTC, `Cache-Control: no-cache`, `x-ipfs-roots: bafybeignxpiuidwvdottzfku7ve7cdqlsdtuvqr4iw46jnzoc4ajdulype`; live CSP is present. Evidence: `output/tonswap-growth/get-ts-ux-live-root.headers`. |
| Stable-host route assets and warming | All 231 stable-host files (229 JS plus HTML/CSS; eight critical files and 223 additional imports) passed HTTP status/type, zero redirects and exact-byte checks with zero failures. The root carries the final production CID and sequential warming is complete. Evidence: `output/tonswap-growth/get-ts-ux-stable-ajdulype/verification.json`. |
| Earlier overall unit command / scripts project | Exit 0: application 1,002 suites / 9,325 tests and scripts 118 suites / 2,374 tests passed. This historical application result does not replace the recovery rerun. |
| Production WebKit Swap: real UI, expected title, request/console failures | Passed on the final CID: title `Swap - Polkaswap`, real route UI present, bootstrap loader absent, `consoleErrors: []` and `failedRequests: []`. Evidence: `output/tonswap-growth/get-ts-ux-webkit-swap.log`. |
| Production WebKit Get TS | Passed on the final CID: title `Get TS - Polkaswap`, real route UI present, bootstrap loader absent, `consoleErrors: []` and `failedRequests: []`. Evidence: `output/tonswap-growth/get-ts-ux-webkit-get-ts.log`. |
| Live Get TS responsive verification | Release owner verified the amount-first interface at 701 px desktop width and 390 × 844 mobile size. Mobile `scrollWidth` equals the 390 px viewport, the TONSWAP logo loads, and no erroneous orientation dialog appears. |

No real card purchase, token approval, conversion, bridge, swap or burn was executed during this release's QA. The absence of a live funded journey is an explicit test limitation; acceptance does not require spending the user's funds. Current DAI/XOR depth is a material acquisition constraint even when the UI and providers work correctly. Improving funded completion requires verified liquidity/provider/gas economics in addition to presentation.
