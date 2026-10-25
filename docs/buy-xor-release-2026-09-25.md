# General Buy XOR release — 25 September 2026

Superseded by the [funding and recovery repair release](buy-xor-repair-2026-09-25.md), including its production CID and verification evidence.

## Goal

Make buying XOR a first-class Polkaswap feature independent of TONSWAP, retaining the existing neumorphic design. The general journey ends with verified XOR received in the user's SORA wallet. A TS burn is a separate, optional journey.

## Acceptance criteria

- Buy XOR is visible in the desktop/mobile header, main menu, Swap and Wallet.
- `/buy-xor` supports card, Ethereum, TON and existing SORA DAI funding with honest route requirements.
- General estimates omit campaign queries, TS allocations and burn fees. Exact amounts, wallet/network validation, quote expiry and 5% price-impact protection remain enforced.
- Separate drafts, transaction references and receipt recovery prevent generic and campaign journeys from sharing progress.
- Receipt-verified completion offers the Wallet action; no purchase triggers a burn.
- The existing `/get-ts` journey remains available, with its own campaign-specific estimate and explicit burn review.
- Unit tests, translations, responsive visual checks, static-origin checks and production WebKit verification pass.

## Validation

Focused page, navigation, quote, liquidity, bridge and receipt tests pass. All 31 locale catalogs have matching keys and the translation suite passes. The fixture matrix covers both journeys at desktop/mobile widths and in light/dark themes, including verified receipt states. Main-app local inspection confirms the visible mobile Buy XOR label, menu navigation, general estimate and receiving-wallet copy.

No real wallet connection, purchase, transfer, swap or burn was performed during QA. Provider handoffs remain explicit: the configured card route buys Ethereum ETH before conversion, bridge and swap; direct card-to-SORA XOR is not available. TON requires an external provider step. Liquidity constraints can prevent a purchase from proceeding.

## Production deployment

Production CID: `QmcS8twWnKq9egi3F6wqWYPrtme5bPw9Ua3iPSzzqEsS1e`

Production CIDv1: `bafybeigrnnsfki4mqjt6q4xc427zfdsxmeyalynpiur6pcbqso7aynjqbe`

Testnet CIDv1: `bafybeihsxsvesxrellhyhqcttbal52wxcz4kobkhdhrzb2pun62d6nh2je`

Both root DAGs were imported and recursively pinned on the dedicated MOF origin. Nine critical files passed status, MIME type, no-redirect and exact-byte checks against an immutable export of the production CID. Bunny zone 5860217 was saved with the new MOF production URL and host header mof.sora.org, then purged. The live root returned HTTP 200 with the production CIDv1 in x-ipfs-roots at 10:47:22 UTC. Existing TLS validation, header forwarding, redirect, error-cache and CSP/header rules were checked and retained.

Release logs: `output/tonswap-growth/buy-xor-final-publish.log`, `buy-xor-mof-{prod-import,test-import,pins}.log`, `buy-xor-candidate-validation.log`, `buy-xor-live-root.headers`.

All 234 critical/dependency files passed stable-host status, MIME and exact-byte verification. The official WebKit checker passed on /swap, /buy-xor and /get-ts: expected route titles, mounted route UI, no bootstrap loader, zero failed requests and zero console errors. Buy XOR and Get TS checks used their exact page selectors. In-app browser inspection also verified the live desktop header, primary menu position, Wallet entry and header-to-Buy-XOR navigation.

Evidence: `get-ts-ux-stable-7aynjqbe/verification.json`, `buy-xor-webkit-{swap,purchase,get-ts}-summary.json` under `output/tonswap-growth/`; responsive fixture evidence remains under `output/playwright/get-ts-harness/`.

The full application test run against the frozen final source passed: **1,003 suites, 9,396 tests**, exit 0. The translation suite passed all 13 tests across 4 suites; all 31 catalogs are synchronized. An earlier concurrent-edit run mixed cached source and updated tests; its three affected suites subsequently passed 34 tests, and a clean full application rerun was started after source freeze. The page suite also passes all 31 cases, including direct-DAI Back/deep-link behavior for both purposes.


Final status: goal completed. General Buy XOR is live at https://polkaswap.io/#/buy-xor. Final application test evidence: `output/tonswap-growth/buy-xor-final-all-app-tests.log`. Final live root recheck preserves the production CIDv1 in `buy-xor-final-live-root.headers`. Temporary local Vite servers and the deployment dashboard tab were closed; the live result page is retained.
