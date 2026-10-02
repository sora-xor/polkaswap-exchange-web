# Quant Loop: self-improving liquidity-shock bots

`/#/bots` opens with the **Strategy Lab** command center. In the browser, it researches rule strategies for every SORA market in the bundled archive. It shows the search as it runs and offers only the markets whose strategies made money in blind walk-forward tests. Going live uses the existing funding review and consent dialog; nothing in the loop signs, saves or starts a bot by itself.

## Why this strategy family

SORA XYK pools are thin. In the bundled archive (March 1 to September 19, 2026), median XOR-side depth is 29 XOR for VAL, 57 for PSWAP and 77 for DAI. ETH, XSTUSD and XST pools hold less than 11 XOR. A single large swap can move such a pool 20–40% away from its recent mean, and the price often stays there until other traders return. Hourly price volatility is 6–9%.

Every swap pays a 0.6% pool fee and a fixed network fee of about 0.10002 XOR. Each order also moves the pool. Small frequent strategies therefore lose to costs. In the reference run, trend, breakout and hour-of-day strategies were rejected on every market. The family that survives is **liquidity-shock reversion**: supply liquidity into a deep dislocation and sell into the recovery, at cost-aware order sizes of 2–3 XOR.

## Research protocol

`quant-loop.ts` is pure and deterministic. It needs no wallet, provider key or network.

1. **Data.** `parseQuantArchive` validates the bundled archive: hourly, contiguous rows that share one denominator, with u128 reserves. It rebuilds each XOR-paired market with its exact reserves. Closes are the same 36-decimal floors that the history loader produces.
2. **Costs.** The page observes the current network fee and pool fee from a finalized quote (`createResearchFeeLoader`). It retries while the node connects. Slippage of 0.5% is charged as a full cost on every fill, matching the rest of the bots workspace.
3. **Liquidity gate.** Markets with a median XOR depth below 20 XOR are marked *too thin* and are not simulated.
4. **Candidates.** 672 rule strategies are generated per market. All of them use the live rule language (`strategy-rules.ts`), so any candidate can run unchanged in a bot.
   - Families: dislocation fade, guarded fade (with a 168-hour momentum guard), shock fade, trend and breakout.
   - Each family comes in two order sizes, 2 and 3 XOR.
5. **Fills.** Rules decide on each completed hourly close. The order fills at the next hour's exact constant-product reserves, after the pool fee, slippage and network fee, using the live engine's semantics:
   - while the entry rule holds, the bot buys `amount` XOR every bar;
   - while the exit rule holds, the bot sells lots worth `amount` at the decision close;
   - the exit takes priority, and a 2 XOR fee reserve is protected inside the 10 XOR research capital.
6. **Valuation.** Inventory is valued at its **liquidation value**: what the pool would actually pay for all of it after fees. In a pool of tens of XOR, a spot mark overstates a large position.
7. **Selection.** Each candidate is screened on its training hours. It must make at least 8 trades, a positive return, and a profit in at least 3 of 4 training quarters. Survivors are ranked by `return − 0.5 × drawdown + worst quarter`. Drawdown is penalised rather than capped. A hard 35% cap was tried and removed the configurations that carried the out-of-sample edge, so the drawdown is disclosed instead.
8. **Walk-forward.** The first 50% of hours are the initial training span. The remaining hours are split into 4 expanding folds. Each fold selects only from earlier hours, then trades its own hours blind. Fold results are chained into one equity curve.
9. **Deployment gate.** A market is *live-ready* when three conditions hold:
   - the selection over all hours passes the gates;
   - the chained walk-forward return is positive;
   - the folds made at least 6 trades.

   Otherwise the loop *sits out* and keeps the XOR idle.

### Two arithmetic tiers

Ranking thousands of candidates needs speed, so **Tier 1** screens with Float64 arithmetic. Those values only order hypotheses. **Tier 2** (`replayQuantCandidate`) replays every selected candidate with exact bigint arithmetic: constant-product fills, codec fees, and the rule engine's integer comparisons (`quantSignalAt`). Every number shown in the UI or saved with a bot comes from Tier 2.

`tests/unit/features/bot-trading/quant-loop.spec.ts` checks that `quantSignalAt` matches `evaluateStrategyRules` bar by bar on real PSWAP history.

## Reference result

This was run on the bundled archive with the frozen finalized fee observation in `tests/fixtures/bot-trading/mainnetFees20260914.json`. Live runs use the current fee observation, so their numbers can differ slightly.

| Market | Status | Walk-forward (Jun 10 – Sep 19) | Max drawdown | Trades | Token price over the same hours |
| --- | --- | --- | --- | --- | --- |
| PSWAP | live-ready | +43.49% | 33.72% | 37 | +60.04% |
| DAI | live-ready | +11.20% | 9.59% | 8 | −8.26% |
| VAL | sitting out | 0.00% | — | 0 | −8.29% |
| XST, ETH, XSTUSD | too thin | — | — | — | — |

The loop ran 19,372 backtests. At the final selection, 125 candidates passed every gate and 3,907 were rejected. These are hypothetical results on historical pool states with today's costs. They are not a promise of future returns.

## Live signals

For each selected rule, `evaluateQuantSignal` runs the exact rule engine on the latest completed hourly closes. The closes come from `createPlaygroundHistoryLoader`, which merges indexer, archive and repair sources. This is the same evaluation a running bot performs. When live history is unavailable, the card evaluates the last archived closes and labels the result *Archived close* with its date.

The gauge shows the current distance from the rule's mean against the buy and sell triggers. It is display-only; the bot uses the exact evidence.

## Going live, paper trading and Swap

- **Go live** first observes a fresh fee quote for that pair. It then builds the bot with `createQuantBot` and attaches a walk-forward research snapshot (`quantResearchSnapshot`). The template goes through `startFromResearch`: wallet connection, `prepareLiveBot` (network, denomination and genesis checks), the funding preview, and the consent dialog.
  - For Quant Loop bots, the dialog opens with a one-glance summary: budget, order size, fee reserve, price-impact ceiling, session length, the walk-forward evidence including drawdown, and the two remaining steps.
  - Starting still requires the wallet password (or external-wallet approvals) and the explicit consent checkbox. Nothing is pre-ticked.
  - If the wallet is short of funds, the summary links to **Get XOR**.
- **Paper trade** saves an idle paper bot through the existing research save path, keeping the same rules and provenance.
- **Swap XOR → token** sets the Swap store pair and opens `#/swap/XOR/<token>`, so the user can trade manually.

### Session length and expectations

The strategies trade rarely and hold positions for days. In the reference run:

- PSWAP had 5 trading episodes in 101 blind days, about one every 20 days. Positions stayed open 26–164 hours.
- DAI had 2 episodes, with positions open 9–21 hours.

Each live-ready card shows this cadence ("about one opportunity every N days · positions unwind in X–Y days · last on DATE"), and the consent summary repeats it.

The card lets the user choose a live session of 1, 3, 7 or 14 days; the default is 7. Sessions longer than a day are reserved for reviewed walk-forward rule studies:

- `prepareLiveBot(template, research, denomination, { sessionDurationMs })` rejects anything outside one hour to 14 days. It also rejects more than a day unless the strategy is `rules` and the research validation is `walk-forward`.
- When an extended session is granted, the bot is marked with `extendedSession: true`.
- `validatePolicy` allows up to 14 days only for marked bots outside discovery campaigns. Every other bot keeps the one-day cap.

The tab must stay open for the whole session, as for every browser-run bot.

When a live-ready market's exact rule is in its buy zone, a banner at the top of the command center offers **Go live** and **Swap** for that moment.

### Long-running pages

The page is built to stay open for a multi-day session:

- **Calm mode.** Ambient motion (the iridescent rim, light sweep and drift, glass float, pulses) runs on arrival. After 60 seconds without pointer, keyboard, wheel, touch or scroll input, the page sets `--quant-motion: paused`. Every infinite animation reads that variable through `animation-play-state`, and the mesh stops scheduling animation frames. Any interaction wakes it.
- **Live signals.** They refresh a few minutes after each completed hour and never overlap. A tab that was throttled in the background catches up when it becomes visible again.
- **Cleanup.** Timers, observers and listeners are released on unmount.
- **Bounded live engine.** The engine keeps per-bot, size-capped state: activity is capped at 200 entries, equity at 1,000 points and observations at 120. One history entry per bot refreshes hourly, and the research history cache holds at most 3 entries.

Every bot is **capacity-limited** to the researched shape:

- 10 XOR budget, including a 2 XOR fee reserve;
- the researched order size;
- a price-impact ceiling set to the largest researched fill impact, rounded up, plus one point, capped at 20% (`quantImpactCeiling`).

A larger budget would let the bot keep buying into a pool of a few dozen XOR, which the research never tested. The live session lasts up to 24 hours, and the tab must stay open, as for every browser-run bot.

## Interface

`components/quant/QuantCommandCenter.vue` composes:

- `QuantGlassArt`: decorative glass objects in the Polkaswap Strategy Lab style.
- A six-stage pipeline: pool data, live fees, backtest, robustness, walk-forward, deploy. Each stage shows real counters.
- `QuantMesh`: a canvas map of the tested strategies, clustered by family. Robust candidates glow, and the selected one pulses.
- The opportunity radar: market cards with `QuantGauge`, walk-forward metrics, rule chips and actions.
- `QuantEquity`: chained walk-forward equity against the token's own price, with fold bands and fills.
- `QuantLattice`: a Galton board in which each out-of-sample sell drops into its realized after-fee result bin.

All colours derive from native theme tokens through `color-mix`, so light and dark (Noir) themes need no separate palette. Glass uses `backdrop-filter` with the `-webkit-` prefix. Canvases read colours through hidden probe elements and pause when off-screen or hidden. With `prefers-reduced-motion`, they draw static frames.

`useQuantLoop.ts` runs the search in a module worker (`quant-loop.worker.ts`), with an identical in-thread fallback, and caches the result for the session.

## Structure-break research (negative)

We tested whether structural-break detection improves this loop: the ADIA Lab Structural Break Challenge detector (a 1,361-feature LightGBM bag scored causally on hourly returns), Bayesian online changepoint detection (BOCPD), and a windowed z-test. All runs used the same protocol, costs and exact replay. Both thresholds were chosen on training hours only, and random-break placebos were used as controls.

- **Breaks as filters** gave no robust gain:
  - selecting a strategy per structure (shock, drift, range, quiet) cost about 42 points of summed walk-forward return;
  - suppressing entries after breaks, trading only in ranges, and resetting indicator windows at breaks all failed to beat both the baseline and the random-break placebos.
- **Breaks as positive signals** also lost to the baseline in all 12 pre-declared variants: trading only after breaks, sizing up or down near breaks, and faster exits after breaks.
- **Clustering.** Entries do cluster after detected breaks, because one price jump triggers both the alarm and the dislocation rule. However, winning trades are not closer to breaks than losing trades. In the largest sample, losers were closer.
- **Rebound after a detected break.** Dislocations that coincide with a detected regime break rebound less, but on average still positively. Filtering them out therefore removes winners.

The dislocation rule already acts as the relevant break detector for this edge, so no break-conditioned trading is shipped.

## Refreshing the data

The research covers the bundled archive. To extend it, rerun the read-only extractor described in `public/bot-history/README.md`, then rebuild. The loop picks up the new hours automatically.

## Tests

- `tests/unit/features/bot-trading/quant-loop.spec.ts` covers:
  - archive validation;
  - candidate validity against the live rule parser;
  - exact constant-product fills, the fee budget and the protected reserve;
  - determinism and progress reporting;
  - no-lookahead walk-forward selection;
  - bar-by-bar parity with the rule engine on real PSWAP history;
  - a real-archive regression.
- `quant-deploy.spec.ts`: templates, impact ceilings, research snapshot contract, signals.
- `useQuantLoop.spec.ts`: state machine, fee retry, cache, archive fallback, cancellation.
- `QuantCommandCenter.spec.ts`: rendering, signals, emitted payloads and the error and retry paths.
- `BotsPage.spec.ts`, *Quant Loop command center*: page wiring, the one-glance consent, the funding-short link, paper save and Swap navigation.
