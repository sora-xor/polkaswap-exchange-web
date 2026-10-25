# Get TS checkout UX goals

Status: complete. All seven primary UX requirements, the user-requested neumorphic styling and final production release verification passed. The final CID is live with completed asset warming, expected Swap/Get TS titles, real route UI, zero failed requests and zero console errors. Financial behavior is unchanged from the passing 1,003-suite / 9,353-test application run; 118 scripts suites / 2,374 tests and 13 translation tests passed. Requested on 2026-09-25 after review of the live Get TS flow.

## Delivery goal

Make the supported funding journey understandable before wallet setup, preserve a buyer's intended amount through each reviewed transaction, and ship a tested responsive production update.

1. Show payment source, amount, indicative future TS allocation and route constraints before asking for accounts. Unknown fees or unavailable provider quotes remain explicitly unknown.
2. Connect the spending wallet first, then explain and create/connect the SORA account that owns the future claim. Offer direct entry to the existing Google-backed wallet flow.
3. Run read-only liquidity checks automatically, carry amounts forward, and show a single next action with expandable transaction details.
4. Preserve a validated draft and transaction references. Derive confirmation from account/network-matched transaction evidence; balances alone never prove a purchase completed.
5. Explain TON's external provider steps and intermediary Ethereum wallet before setup. Never enable an unverified transaction path to simplify presentation.
6. Use a focused checkout layout on desktop and mobile. Remove unrelated exchange navigation and infrastructure status from this journey while retaining settings and an explicit exit.
7. Show stable journey phases, separate transaction status, future-claim terms and the final burn review/receipt.
8. Verify financial state transitions, amount math, account changes, translations, responsive screens and the production build; deploy using the approved IPFS/MOF/Bunny runbook.

## Requirement evidence

| Requirement | Implementation and evidence |
| --- | --- |
| 1. Amount before accounts, honest estimate | Public provider/SORA preview runs before wallet setup; unknown fees remain unknown. The interface retains “before Ethereum gas” in the later summary and explicitly states that the card quote alone does not cover every step. Preview helper/component: 18 tests; the five-message correction passes all 13 translation tests across 31 catalogs. |
| 2. Sequential wallet setup and Google entry | TON/Ethereum spending wallet precedes the SORA claim account. Google enters the existing encrypted-wallet flow only after a click, with the ordinary SORA chooser retained. Wallet sequence and Google-entry tests cover availability, rejection and connection ordering. |
| 3. Automatic estimates and reviewed next action | Debounced read-only quotes, collapsed details, explicit transaction review and exact amount suggestions are implemented. Conversion panel: 29 focused tests. No automatic purchase, approval or signing. |
| 4. Recoverable, evidence-based progress | The flow stores the conversion hash immediately after submission; exact DAI comes from the matching canonical receipt, never a balance delta. Account/network/provider changes revoke received status. New upstream hashes invalidate downstream references and amounts; duplicate hashes are idempotent. Recovery selection: 3 suites / 41 tests. |
| 5. Accurate TON route | TON requires an external provider handoff and intermediary Ethereum wallet; native TON first needs TON-to-USDT conversion. The flow retries a failed Ethereum conversion in Ethereum phase without restarting the TON handoff. On-site TON signing remains disabled. |
| 6. Focused responsive checkout | Checkout hides exchange navigation/footer but retains settings and exit; ordinary routes restore their shell. Existing Polkaswap neumorphic raised/inset surfaces and light/noir tokens now style all five journey components. Actual app reviewed at 1,280 px light/noir and 390 px noir; fixtures at 1,200/390 px in both themes, including pending states, had no overflow or console errors. Final production verification passed; the live 701 px noir review showed native raised workspace/inset input shadows, a loaded logo and no overflow. |
| 7. Stable phases and future-claim review | Plan, wallets and reviewed actions retain separate pending/received/failed/unavailable conversion states. Saved conversion references suppress card repurchase. The final marked burn and same-SORA-wallet future claim remain explicit, with no launch-date promise. |

Requirement 8, final delivery, is complete. The recovery application rerun passed 1,003 suites / 9,353 tests in 526.24 seconds (`output/tonswap-growth/get-ts-recovery-all-app-tests.log`, exit 0). The scripts project passed 118 suites / 2,374 tests in 22 minutes 51 seconds (`get-ts-ux-all-unit-final.log`, exit 0). The subsequent five-component restyle is CSS-only, with no copy, template or financial logic changes; compilation, lint, formatting and visual checks passed. Existing translation validation remains 4 suites / 13 tests across 31 catalogs. The final deployment is independently verified below.

The final neumorphic production CID is `bafybeicrgvhc64ot2oljrrofdlgadelghhaunixrp5m4tkcz2l6nxmpmqq`; testnet is `bafybeifbdzwswpkatgmgraxlqcccrearhbn6xchxsj7awpo3l2kt7c2jla`. Publishing succeeded (`get-ts-neumorphic-publish.log`). Verification uses the immutable local CID export at `output/tonswap-growth/get-ts-neumorphic-frozen-dist`. Both MOF roots were imported and recursively pinned, and eight critical candidate files passed exact-byte, MIME, HTTP 200 and zero-redirect checks (`get-ts-ux-candidate-6nxmpmqq/verification.json`). Bunny origin save and authorized purge completed. The live root returned HTTP 200 with this CID and `no-cache` at 10:14:05 UTC (`get-ts-neumorphic-live-root.headers`). All 231 stable files passed exact-byte, HTTP 200, MIME and zero-redirect checks; `warmingComplete` is true (`get-ts-ux-stable-6nxmpmqq/verification.json`). Both official WebKit runs exited 0 with expected Swap/Get TS titles, real route UI, no bootstrap loader, zero failed requests and zero console errors (`get-ts-neumorphic-webkit-swap.log`, `get-ts-neumorphic-webkit-get-ts.log`, `get-ts-neumorphic-live-summary.json`). The release owner reloaded the user’s live browser and verified the Get TS title, loaded logo, correct outward/inward neumorphic shadows and equal viewport/document widths of 701 px in noir.

The recovery production CID is `bafybeianutxuw7uijq7uo2jvi55s4qrbc2snz6tup26wx4rli3w2xan3km`; testnet is `bafybeifjr75bhhdcnegkl7fdx7hmbvr5fs5mhr32violbgdw2zg57hjnmu`. Exact-byte verification uses the immutable production CID exported to `output/tonswap-growth/get-ts-recovery-final-frozen-dist`, because another concurrent build changed ordinary `dist`. All 231 candidate files passed. The release owner saved this origin in Bunny and completed the authorized purge; the live root returned HTTP 200 with this CID and `no-cache` at 10:05:06 UTC. All 231 stable files also passed. Recovery WebKit reached real Swap and Get TS interfaces with expected titles, no bootstrap loader, zero failed requests and zero console errors (`get-ts-recovery-webkit-swap.log`, `get-ts-recovery-webkit-get-ts.log`). This historical recovery CID is superseded by the verified final neumorphic CID above.

## Earlier verified delivery and current test limitations

The earlier verified production root is `bafybeignxpiuidwvdottzfku7ve7cdqlsdtuvqr4iw46jnzoc4ajdulype`. Its production/testnet publishing, MOF recursive pins, Bunny origin save and authorized cache purge completed. All 231 candidate files and all 231 stable-host files passed exact-byte checks with zero failures; sequential dependency warming completed. This CID does not identify the second-audit recovery candidate.

Production WebKit reached `Swap - Polkaswap` and `Get TS - Polkaswap` with real route UI, no bootstrap loader, zero failed requests and zero console errors. Live Get TS verification passed at 701 px desktop width and 390 × 844 mobile size; the mobile page has no horizontal overflow, the logo loads and no erroneous orientation dialog appears. Translation checks passed four suites and 13 tests. See the [release evidence](get-ts-ux-release-2026-09-25.md) for exact logs and scope.

All required implementation, validation and deployment work is complete. No real purchase, conversion, bridge, swap or burn was performed for QA. A live funded journey is therefore a test limitation, not an acceptance requirement to spend the user's funds. A read-only $100 card quote produced 16.77% DAI/XOR price impact and was correctly blocked by the 5% limit. Current liquidity, gas and provider economics remain constraints on funded acquisition after the UX work.

## Design direction

Visual thesis: a calm TONSWAP checkout using Polkaswap's existing neumorphic light/noir surfaces, raised controls, recessed fields, rounded corners and one accent, with generous spacing and a compact amount/outcome summary.

Content plan: choose payment and amount; inspect the indicative outcome and route; connect the required accounts; perform one reviewed action at a time; receive a burn/claim receipt. Supporting route and fee details are progressive disclosures.

Interaction thesis: promptly refresh read-only estimates after amount changes, smoothly reveal only the current wallet/action, and preserve visible progress across navigation. Respect reduced motion and never animate or infer financial completion before evidence.

## Acceptance boundaries

No automatic signatures or purchases. No secret added to the static site. No invented full-cost quote, guaranteed allocation, launch date, direct card-to-XOR support or on-site TON execution. Keep the existing exact marked-burn protocol and all account, network, amount and quote checks.

The current checkout contains unrelated concurrent work. Preserve it; review and validate scoped changes without resetting or broadly staging the tree.
