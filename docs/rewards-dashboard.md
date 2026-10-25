# Rewards dashboard

The Rewards tab (`/#/rewards`) shows what an account can claim, where it comes from, how much of it is still
vesting, and what the reward tokens are worth. The claim flow itself (store, signing, fee) is unchanged; this page
only changes how it is presented, plus two selection fixes listed at the end.

## What the page shows

| Area       | What it is                                                                                                                      | Data                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Hero       | Total claimable value in the user's currency, one chip per token, an "Unlocked" and a "Still locked" tile, and the reactor ring | Selected rewards in the rewards store, wallet prices           |
| Claim list | The four reward sources with a checkbox each, the network fee and the claim button                                              | Rewards store                                                  |
| By source  | Stacked bar of what can be claimed per source, legend with values, table view                                                   | Rewards store, wallet prices                                   |
| Vesting    | One meter per vesting source (strategic, crowdloan)                                                                             | `limit` and `total` from the SDK reward info                   |
| Price      | Live price, 24h and 7d change, 30 day daily chart, table view                                                                   | Wallet price, token stats and daily snapshots from the indexer |

Before an account is connected the hero shows a plain heading, the existing "connect both accounts" hint and the
Connect button, the claim card lists the three steps, and the first two analytics cards are empty frames. The Price
card needs no account and defaults to PSWAP and VAL.

While a claim runs, the hero shows the claim steps (the Ethereum wallet first when external rewards are included,
then the SORA account). A success plays a short celebration. After a failure the step that failed is marked, the
failure message stays, and the claim card is replaced by a Retry button.

## How the numbers are made

All token math uses `FPNumber`. Plain numbers are used only for geometry (bar and meter fill, chart lines).

- **Sources.** `buildRewardSources` maps the store into four sources in a fixed order: liquidity fees, strategic,
  crowdloan, external. A source with nothing earned is left out. For strategic rewards `limit` is claimable now and
  `total - limit` is still locked. For a crowdloan, `amount` is claimable now and `total - amount` is locked.
- **Shares and the unit they are measured in.** Shares use fiat when every token involved has a price. If some do
  not, a single token is compared in its own units. Otherwise the priced sources are drawn and the unpriced ones are
  only listed, with a one-line note. If nothing can be priced the bar stays empty instead of guessing.
- **Unlocked share.** Claimable now divided by claimable plus locked, over all sources (hero) or over the vesting
  sources (Vesting card). Unknown when the tokens cannot be put on one scale, except that nothing locked is 100% and
  nothing claimable is 0% whatever the tokens cost. A share short of everything never rounds up to 100%.
- **Fee share.** The network fee (XOR) and the selected claim are both converted to fiat first.
- **Price.** The headline is the wallet's live price, falling back to the indexer's last price. The chart is drawn in
  the display currency. Market data is cached for five minutes per indexer and token, a reload keeps the old chart on
  screen (dimmed), and switching token clears it. The indexer stamps a daily candle with the last block of its UTC day
  (about 23:59 UTC), so the dates on the chart are UTC dates. A price change rounds the same way up and down. When no
  price can be found the headline shows a dash instead of a shimmer.
- **Number format.** The wallet's amount component reads its value with the delimiters of the app language, so every
  amount is handed to it already formatted (`1.234,5` in German; a plain `1234.5` would be read as 12,345). The signed
  percent changes in the Price card use the same decimal mark.

Claim history is not shown: the indexer can only list an account's activity as a whole, so the claims of an active
account cannot be found reliably.

## Selection

Ticking or unticking a source changes what the next claim pays, so the hero total, the token chips and the fee update
at once. The Unlocked and Still locked tiles and the ring describe the whole account, so they do not change.

In the By source card an unticked source is dimmed, tagged "Not in this claim" and keeps its full value. A ticked
source shows what the claim pays; crowdloan rewards are ticked tag by tag, so for them that is only the ticked tags.

## Look and motion

- The hero is a dark panel in both themes. Everything on it that moves animates only `transform` or `opacity`
  (drifting glow, perspective grid, scan line, sparks, orbiting tokens, status pulse, button sweep), so the
  compositor runs it. One-off entrances (ring fill, bar growth, line draw, count-up) are short.
- Every animation stops for `prefers-reduced-motion: reduce`. The count-up shows its value immediately, the ring is
  drawn finished, the burst does not play and the pointer tilt is off.
- Chart colors follow the dataviz rules: each source has a fixed slot (color follows the source, never its rank),
  thin marks, 2px gaps between touching segments, 2px rings on markers, text in text colors, a legend next to every
  chart and a table view for every chart. The slot colors were checked with the palette validator against the
  surface they are drawn on:

  | Source         | Light (surface `#fdf7fb`) | Dark (surface `#592d71`) |
  | -------------- | ------------------------- | ------------------------ |
  | Liquidity fees | `#d8267a`                 | `#f04e9a`                |
  | Strategic      | `#5b6ee1`                 | `#7585f0`                |
  | Crowdloan      | `#d9741a`                 | `#d9741a`                |
  | External       | `#0e9680`                 | `#14ad93`                |

  Neighbouring colors stay at least 11.3 apart (light) and 13.6 apart (dark) under simulated protanopia and
  deuteranopia (target 8), at least 24.0 apart for normal vision (floor 15), and every mark has at least 3:1 contrast
  on its surface. Up and down text uses
  `#006300` / `#b42318` on light and `#6ee7a8` / `#ffb3b3` on dark (all above 4.5:1), always with an arrow and a sign.

- Layout is container-query based: one column below 860px of page width, two columns above. While a claim runs and
  after it succeeds the claim card is gone, and the analytics cards then use the full width. The Rewards tab widens
  the page container (and turns the tabs into a floating pill) while Points and Referrals keep the narrow card.

## Accessibility

The ring and the vesting bars are `role="meter"` with a value and a label. When the value is unknown they are hidden
from assistive technology instead, and the text beside them shows a dash. The stacked bar has a text summary, legend
rows are focusable and show the same readout as hover, and every chart has a table view. The price chart is
focusable: arrow keys, Home and End move the crosshair, Escape clears it, and the active day is announced politely.
Claim steps are an ordered list with `aria-current` on the running step.

## Code map

| Path                                                                                           | Role                                                   |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `src/features/rewards/pages/RewardsPage.vue`                                                   | Page: state, claim flow, layout                        |
| `src/features/rewards/pages/RewardsTabsPage.vue`                                               | Tabs and the wide dashboard container                  |
| `src/features/rewards/components/rewards/GradientBox.vue`                                      | Hero shell and decoration                              |
| `.../AmountHeader.vue`, `AnimatedAmount.vue`                                                   | Hero figure and token chips with count-up              |
| `.../RewardsReactor.vue`                                                                       | Ring, orbit, pointer tilt                              |
| `.../RewardsBreakdown.vue`, `RewardsVesting.vue`, `RewardsMarket.vue`, `RewardsPriceChart.vue` | Analytics cards                                        |
| `.../RewardsClaimSteps.vue`, `RewardsBurst.vue`                                                | Claim progress and celebration                         |
| `.../AmountTable.vue`                                                                          | Claim list with checkboxes                             |
| `src/features/rewards/utils/analytics.ts`, `market.ts`                                         | Pure calculations                                      |
| `src/features/rewards/composables/`                                                            | Count-up, reduced motion, store analytics, market data |
| `src/features/rewards/styles/rewards.scss`                                                     | Color tokens and the shared card look                  |

Tests live in `tests/unit/features/rewards`, `tests/unit/components/pages/Rewards` and `tests/unit/views`.

## Fixes made along the way

- The claim list used Element UI checkboxes that are no longer registered, so no checkbox rendered. They are native
  checkboxes now.
- `setSelectedRewards` and `reset` in the rewards store merged objects with `$patch`, so a crowdloan tag could never
  be unticked or cleared. They now assign. A previous account's crowdloan selection could also survive an account
  switch.
- After a failed claim the Retry button was never shown although the store keeps what a retry needs. It is shown now.
