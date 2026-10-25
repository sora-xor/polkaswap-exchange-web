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

### Probability data contract

Both Polkaswap and the standalone Polkamarkt app treat `probability` as a
percentage, `priceYes` as a fractional legacy fallback, and implied probability
basis points as hundredths of a percent. Values below one retain their units;
for example, `probability: 0.8` means 0.8%, not 80%. Missing values are not zero.
Implied probability fields take precedence over legacy indexed fields. Current
runtime odds replace stale indexed odds while indexed metadata is retained.

The runtime fallback uses the DPM virtual shares on both outcomes, with integer
arithmetic and the same basis-point truncation as the pallet. Real-position
totals alone are not market probabilities. Market discovery uses the public
indexer's supported `ID_DESC` ordering; the board ranks results locally.

Cards, detail labels and shares use one complementary rounding rule: round YES
once, then display NO as its complement. Nonzero probabilities below 1% appear
as `<1%` (and their complements as `>99%`). Historical snapshots retain their
precision; detail labels prefer the current quote over an older snapshot.

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
