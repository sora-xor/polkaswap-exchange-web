# Burn page layout and the sidebar "Live" mark

The Burn page was restructured and the sidebar's Burn item now shows when the
TONSWAP burn can still earn TS. Nothing here changes whether a burn can be
submitted: the burn button, the dialog and the signing checks are untouched, so
the rule from `tonswap-burn-availability-2026-09-21.md` (slow blocks and indexer
delays never prevent burning) still holds. The new UI is informational only.

## What "Live" means

The mark appears only when all of these hold:

- Polkaswap is on SORA mainnet, where the campaign exists.
- The indexer returned a complete snapshot with `fresh: true`.
- That snapshot leaves XOR under the 1,753,357 XOR cap (`remaining > 0`).

It does not mean someone burned a moment ago. On 2026-10-04 the public indexer
reported 41 counted burns, 11,592.4 XOR (0.66% of the cap), and the last burn was
about 2 h 50 min old. The campaign was open, so the mark was correct.

A stale snapshot, a failed read, a reached cap or a test network shows no mark.
This follows the indexer rule not to infer current availability from a stale or
historical response. A verified reading is kept for at most 5 minutes while later
reads fail or come back stale, then dropped.

## Sidebar

- Expanded sidebar: the Burn row shows a "Live" pill next to the title and a
  caption with the current rate, for example `49.70 TS / XOR`. The rate is rounded
  down, so it never promises more than the campaign pays.
- Rail (528 to 767 px) and collapsed sidebar: the label is hidden, so a pulsing
  dot sits on the icon instead. Hovering a collapsed sidebar shows the pill again.
- The pill uses `--s-color-action-text` with `--s-color-base-on-accent`, which
  reads in both themes. Reduced motion stops both animations.
- The row stays 58 px tall in English with and without the mark, so nothing below
  it moves. In a language whose title is long (for example Russian "Сжигание") the
  pill wraps to its own line and the row grows by about 14 px.
- The accessible name of the link includes the status, for example
  "Burn Live 49.70 TS / XOR".

## Where the status comes from

`src/features/misc/composables/useTonswapCampaignStatus.ts` keeps one shared
reading and one poller, started by the sidebar on mainnet only:

- First read 2.5 s after the sidebar mounts, then every 60 s while the tab is
  visible. A failed read retries after 5 s, doubling up to 60 s.
- The query and allocator load on demand, so the sidebar adds nothing to the
  startup bundle (`docs/startup-performance.md`).
- The Burn page publishes the fresh readings it already fetches
  (`publishTonswapCampaignSummary`), and the poller skips a read when a recent one
  exists, so the mark never disagrees with the page and adds no requests there.
- A full snapshot walk is paged at 100 rows. It was two requests (about 1.5 s) on
  2026-10-04; the cost grows with the number of burns.

`summarizeTonswapCampaign` in `src/features/misc/lib/tonswapCampaignStatus.ts`
derives the rate, burned, remaining, reserved and percent values for both the page
and the sidebar.

## Burn page

- The TONSWAP card is full width and leads: title with the same "Live" pill, four
  stat tiles (current TS per XOR, XOR burned, XOR remaining, TS reserved), a cap
  meter, the data status row, then the amount preview panel next to the reward
  chart. The chart no longer repeats the rate and totals (`showSummary` is false).
  Burn history is a grid of receipts below.
- The SOLSWAP card keeps all its behavior in a matching layout: terms and account
  panels, total tiles, the SORA Nexus recipient generator and the burn button. Its
  script block is unchanged.
- Both cards use container queries. The campaign card measures its own width
  (`@container tonswap`): four tiles from 620 px, two columns from 760 px. Inside
  `GetTsPage` the same card stays inside its own column and falls back to two tile
  columns and one panel column.
- The global `.container` rule limits cards to 464 px, so the Burn page opts out
  with `container--featured` and `container--campaign` and sets `max-width: none`.
  The size-contained wrapper needs `width: 100%` inside the centered flex column.
- Heading weight needs `!important`, because the shared header mixin sets
  `font-weight: 300 !important`.
- `TonswapOnboarding.vue` and the new rules escape CSS grid `minmax()` as
  `#{'minmax(…)'}`. `tests/unit/features/misc/burnLayout.source.spec.ts` fails if
  a bare one returns.

## Translations

New keys: `burnPage.tonswap.live` and `mainMenu.burnLive` (a link to the first key
everywhere except `akk` and `egy`, which must hold glyphs only). The 30 non-English
words were written by Claude and have not had native-speaker review. The SOLSWAP
card's own texts were already hard-coded English and remain so.

## Checks

- Full unit suite: 1072 files, 10,535 tests passed. New specs cover the summary,
  the poller (fake timers, backoff, expiry, hidden tab, shared consumers, network
  switch), the sidebar item and menu, the campaign card (live state, tiles, meter,
  publishing) and the layout sources.
- Translation tests pass for every key this change added. Key parity failed only
  for another session's unfinished `buyXor.*` keys at the time of the run.
- E2E: `route-desktop-burn` was regenerated (the committed image predated the
  TONSWAP card). The animated WebGL logo is now masked (`.burn-logo-fire`), because
  two captures of a moving flame never match. The mobile baseline and four related
  tests (sidebar navigation, collapse, icon colors, the Burn connect modal) pass.
  The `swap` baseline already differed by about 3% before this change.
- Screenshots reviewed in light and dark, at 1440, 820 and 390 px, signed in and
  out, in English, German, Russian and Arabic, with the sidebar expanded, as a
  rail, collapsed and hovered. No deployment or release work was done.
