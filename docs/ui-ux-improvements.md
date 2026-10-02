# Polkaswap UI and UX refinements

Light and Noir retain their canvas colors, pink accent and rounded surfaces. Swap stays first in navigation. The next links remain Trade, Bots, Polkamarkt and Bridge, followed by visible Account & tools, Earn & borrow and Explore sections. Feature flags and routes are unchanged. Announcements retain their existing destinations and use manual previous/next buttons instead of a rotation timer.

## Readable controls

Secondary/tertiary text uses `#6e6168` / `#796971` in Light and `#dcc2d4` / `#ccb0cc` in Noir. Separate semantic text, action-fill and status-text variables provide readable small controls without changing the brand palette or canvas. Token inputs and token selectors use the original neumorphic bevel shadows without painted outlines. Disabled controls use muted fills. Keyboard focus outlines are 2px with a 2px offset. Controls use 125ms transitions; reduced-motion preferences suppress animations and smooth scrolling.

The form and dialogs retain soft depth; chart and route panels use a lighter shadow. The narrow-screen chart disclosure uses the original neumorphic bevel without a painted outline. The phone header exposes the page customization and trading settings actions without wrapping into multiple control rows. The selected market remains available in trading settings.

Swap header actions use matching 44px icon buttons. Page customization keeps its localized tooltip and accessible name, and exposes whether its menu is open. The market label collapses based on the form widget's available width, including narrow desktop columns. Focusing either amount editor highlights the complete rounded token field; the inner text input does not draw a second rectangular outline. The amount and token selector retain a 12px gutter.

Transactions use compact headers, aligned numeric columns and a smaller token filter. Column headings stay on one line; narrow widgets scroll the table horizontally instead of breaking words or shrinking amounts. The empty state uses the localized “No transactions found” message, and pagination appears only when transactions exist.

Toggling optional widgets preserves the form's measured height, so showing Transactions cannot restore an undersized default layout and clip the form. Automatic sizing alone still does not write a saved layout.

## Amounts and transaction recovery

Token inputs preserve their canonical decimal string while formatting the unfocused display with digit grouping. Focus restores the editable canonical value. A selectable, wrapping exact-value line appears only when the main amount does not fit its field; fully visible amounts are not repeated. Phone token selectors have their own row. Changing the display currency cannot clear or reinterpret an unfocused token draft. Token, fiat and custom-slippage inputs carry separate localized native accessible names and decimal keyboard hints.

Fees and trade details stay expanded above 1024px, including network and liquidity-provider fees. At 1024px and below, the section retains its disclosure control.

Fiat inputs keep their exact decimal value separately from the blurred display. `fiatDecimals` controls display precision (two decimal places by default); focusing restores the full value, and editing accepts at least the token's precision. Grouping, display rounding and focus/blur do not emit a replacement token amount. Fiat conversions continue to use `FPNumber`.

See [Swap interaction](swap-interaction.md) for route and quote state handling, timeouts, fee recovery, frozen review terms, duplicate submission protection and saved-layout migration. Quote retries never retry a transaction. The Receive XOR dialog keeps the draft mounted and displays the current SORA account address and QR code.

## First use and connection

Wallet choices are grouped as Built-in wallets and Browser and mobile wallets. Each offered provider describes where the account is stored or where the connection must be approved; provider availability and selection behavior are preserved. Bridge connection buttons identify the selected network independently for each direction, and long network names wrap.

The Wallet asset view shows a loading state while the first account balance fetch is pending. It does not label a funded account as `$0` before that fetch settles; an empty account displays `$0` only after hydration. A same-account refresh keeps the previous balance snapshot visible until replacement data is ready.

The disclaimer is at most 640px wide with 16px body text and 1.6 line height. It includes a short risk summary followed by the complete prior terms, links and fiat notice. Its acknowledgement footer stays within the viewport. Acceptance requires an unchecked checkbox, while stored approval and route visibility rules remain unchanged.

## Internal interfaces

- `WidgetsGrid.migrateStoredLayouts` optionally transforms loaded geometry. Swap also opts into persistence only after user edits.
- `CustomiseWidget.compact` places its existing widget toggles and Reset action in the form's `header-actions` slot.
- `BridgeAccountPanel.networkName` is optional and preserves the generic fallback label.
- Confirmation receives captured review terms, readiness and submission state from its form.

No external API, agent API or endpoint contract was changed. Everything builds to static assets and retains root and IPFS-prefixed routing. Production deployment is excluded.

## Validation and screenshots

Behavioral unit tests cover route evidence, stale requests, 15-second timeouts, retry, fee bounds, hidden balances, confirmation invalidation, rejected signing, duplicate submission, exact decimal amounts and layout migration. Chromium scenarios exercise both themes at 320, 390, 768, 1024 and 1440px, chart disclosure, persistence, keyboard focus, acknowledgement, wallet guidance, long translations and RTL. A 720px CSS viewport models the reflow available at 200% browser zoom on a 1440px display; this is distinct from applying CSS `zoom` without changing media queries.

`TokenInput.spec.ts` exercises real amount inputs and exact arithmetic at a unit fiat rate, covering a large value with 18 fractional digits and a one-wei value through editing and repeated focus/blur. Its native Max regression uses the real fee-and-margin calculation, preserves the resulting `123456789012345678.023455789012345678` in the token model, shows a two-decimal fiat display, and restores the exact value for fiat re-editing. `SFloatInputCompat.spec.ts` separately checks bounds differing by one wei and locale formatting without model changes.

Original review screenshots are under `output/playwright/ux-critique-*.png`. Inspected revised screens and browser reports are under `output/playwright/ux-implementation/`. Networked browser smoke checks report external-service errors separately from local asset and UI failures. Final command results are recorded in `output/playwright/ux-implementation/validation.md`.
