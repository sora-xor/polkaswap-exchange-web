# Buy XOR card continuation and wallet backup fixes

This follow-up addresses failures before a new customer can complete the existing purchase route. It does not enable a new card provider, move funds or claim a completed customer purchase.

## Card checkout and return

Closing and reopening card checkout after editing the USD budget previously retained the old locked widget URL while the page reviewed the new amount. Checkout now has a current account/budget context. A closed checkout is refreshed for changed inputs; an unchanged reopen preserves its current provider session. Changing a receiving account invalidates and closes the old context. Pending polling handles and iframe update timers cannot survive their component after unmount.

Guided provider completion must match the current checkout's time window, native ETH currency, USD charge, SORA external reference and Ethereum receiving address. Fee-exclusive provider amounts are summed in integer cents. Missing or mismatched metadata does not advance the guided purchase. This is provider-reported status, not independently verified chain receipt or exact provider order correlation. Manual history inspection and the subsequent fresh conversion checks remain available.

Card-history fetches also capture their account and provider configuration. A wallet switch, disconnect, reset or configuration replacement revokes a pending response; its success, error and cleanup cannot overwrite a newer request. This also protects the ordinary deposit history flow, whose supported asset selection remains unchanged.

The page saves a purpose-scoped card continuation hint before opening the provider. Closing or reloading then shows the conversion workspace with a neutral explanation and card-history link. It never restores a payment-success flag. The hint contains only exact draft ETH inputs, and every conversion still checks the currently selected accounts, balance, provider quote and gas. Explicitly reviewing a new card purchase clears the hint and requires a fresh complete cost review. Switching from a manually selected USDT conversion back to card funding also resets the unit to ETH.

See [purchase recovery](buy-xor-funding-state.md) and the [page contract](../src/features/misc/pages/GetTsPage.md).

## New SORA wallet backup

Google's asynchronous upload error callback previously resolved as success, and account creation published file metadata before uploading its encrypted contents. A rejected upload could therefore leave a visible account without a usable backup.

New backups now upload metadata and encrypted contents together. Both creation and update require an acknowledged successful response. Failure leaves the creation form and its existing credentials available for explicit retry, with no success transition. Previous backups are not deleted or repaired by this release. Details and limits: [Google backup writes](google-wallet-backup-writes.md).

## Validation scope

Unit tests use mocked providers, wallet state and Google responses. Visual checks use an isolated SFC fixture. No live Google backup, customer login, payment order, wallet signature or funded transaction is created by this validation. Production release identity and public browser results are recorded in `output/tonswap-growth/buy-xor-followthrough/release.json`.

The preceding cost-review release passed the full 12,016-test suite. This follow-up reruns the affected purchase, MoonPay, wallet creation and Google backup suites, along with translations and the production build. It does not relabel the previous full-suite result as a run of this new source.

Current results: **40 affected suites / 488 tests passed** (`output/tonswap-growth/buy-xor-followthrough/affected-tests.log`). After the final history request guard, the four MoonPay integration/store suites passed **74 tests** (`final-moonpay-tests.log`); these overlap the broader run. Translation checks passed **4 suites / 13 tests**, the cuneiform check passed, and a 31-catalog audit recorded exactly the two new keys with no unrelated changes (`locale-audit.json`). Scope-specific lint passed; the locale authoring file retains one unrelated pre-existing formatting warning.

The real page components also passed eight isolated visual checks: Buy XOR and Get TS, desktop and mobile, light and dark. All viewports stayed within their width. Reload showed neutral continuation, and requesting another card purchase returned to a fresh cost review. These fixture checks use mocked account boundaries and do not substitute for a funded checkout. Evidence: `output/tonswap-growth/buy-xor-followthrough/card-resume-visual-report.json`.

## Production release

The production origin was activated and the Polkaswap Bunny cache purged on 2026-09-25 (UTC). Both release DAGs were imported and recursively pinned on the dedicated MOF origin:

- Production: `bafybeici756qly6rbuyv4n47jycikgujtz26epvwibyykh4lwmyrluorf4`
- Testnet: `bafybeicj4w5qbw3yl2646smafqrb52y7q4pq24y3vu2fhjltsjzdfgejci`

The public root returned the new production CID. Nine critical files and 226 additional JavaScript dependencies returned HTTP 200, with correct content types, no redirects and exact frozen-build bytes. Public WebKit checks loaded Buy XOR, Get TS and Swap with their expected titles, no bootstrap loader, zero failed requests and zero console errors.

A separate public read-only $25 card preview received real MoonPay and MOF quote responses, rendered on 1200 px desktop and 390 px mobile without horizontal overflow, and kept measurement disabled with no event requests. This was an indicative preview before Ethereum gas, not a checkout, reserved rate or completed purchase. The final review still gates checkout on current accounts, balances, gas, quote and price impact. Evidence: `live-card-25.json` and the `webkit-*.log` files in the release directory.

The final audit found only the expected MoonPay README edit after the build among the 2,346 snapshotted app files. That snapshot does not cover complete build provenance (including `vite.config.mjs`).

## Unchanged external dependencies

The latest narrow read-only mail check found only Transak's existing acknowledgement and no Banxa reply. Native SORA2/XOR delivery remains unapproved. The [liquidity proposal](native-xor-liquidity-funding-proposal.md) is still unfunded. A real funded pilot and device-level account recovery remain separate outstanding evidence.
