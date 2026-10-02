# Tonswap burn amount focus — 2026-09-21

Opening the TS burn dialog should place the cursor in the XOR amount field and
select its existing value, so immediate typing replaces that value. Apply this
once when the dialog is open, after the modal focus trap has initialized. Opening
again should select again; amount edits and indexer refreshes must not steal
focus or reset a selection.

This follows the deployed burn spacing and history release documented in
[the spacing release notes](tonswap-burn-spacing-2026-09-21.md). It changes input
interaction only. No amounts, rewards, campaign rules, or signing behavior are
changed. Browser verification uses mocked wallet/indexer data and sends no
transactions. Evidence is retained under `output/tonswap-autofocus`.

## Validation and release

The component and input tests pass (72 tests); target ESLint is clean. Actual
Chromium and WebKit checks on desktop and mobile confirm opening and reopening
focuses the amount, selects its full value, and typing replaces it. Refreshing
retains the user's caret and does not steal focus from other controls.

Published with the requested reward-curve visualization. Production CIDs and
release verification are recorded in
[the curve release notes](tonswap-burn-reward-curve-2026-09-21.md).
