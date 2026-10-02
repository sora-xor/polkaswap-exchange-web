# Polkamarkt browsing and trading

Polkamarkt opens at `/#/polkamarkt` with a compact, responsive market grid.
Search and category buttons are immediately available; status and creator-only
filters are under **Filters**. **Clear filters** restores the active-market view.
Selecting a market opens its existing hash route, and Back returns to the board
with the current filters preserved.

## Market questions and odds

- Cards show the first question from the original market title, current YES/NO
  percentages, and market context. They do not paraphrase thresholds, dates, or
  other conditions. Titles without a safe question boundary remain intact.
- The full original title and additional description remain available under
  **Market rules** in the detail view. Short headings are a browsing aid; the
  complete rules define the outcome.
- Card percentages use the current market probability. NO is its complement.
  They are display values, not guaranteed outcomes or an executable trade quote.
  Missing, invalid, or out-of-range probabilities display as unavailable.
- Cards have no synthetic history charts and do not request per-card history.
  Opening a market still loads its detailed outcome history.

## Trading

Choose YES or NO, then **Buy shares** or **Sell shares**. When buying, **You pay
(KUSD)** identifies the collateral amount being entered, and **Shares you receive**
identifies the quoted output. When selling, the input is shares and **You receive**
identifies the quoted collateral output. The trading fee remains visible in the
quote summary. Slippage is available under **Trade settings**.

The pricing curve remains visible for a selected DPM market. It must not be hidden
inside a collapsed disclosure: users need to see the current curve position and
understand how trades move prices. Supporting oracle and mechanism metadata can
remain in expandable sections.

## Implementation constraints

This is a presentation change within the existing static Vue application. Keep
the existing wallet connection, quote validation, signing, claim, and market
creation flows. Token calculations continue to use the existing precision-safe
amount helpers. Hash navigation and relative assets remain compatible with IPFS;
the simplified UI introduces no server runtime.

Maintain keyboard-operable controls and visible focus states. Category and status
buttons expose their selected state; native disclosures keep their built-in
keyboard behavior. Hover effects must honor reduced-motion preferences, and
layouts must support narrow screens and right-to-left locales.
