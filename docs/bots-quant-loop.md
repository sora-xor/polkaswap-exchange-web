# Quant Loop: self-improving liquidity-shock bots

`/#/bots` opens with **Ready-made bots**. In the browser, it researches rule strategies for every SORA market in the bundled archive. It then offers a bot only for the markets whose strategies made money in blind walk-forward tests. Going live uses the existing funding review and consent dialog; nothing in the loop signs, saves or starts a bot by itself.

The page explains itself in three steps, which match the card actions from left to right:

1. **Choose a bot**: compare the rules and test results.
2. **Try it on paper**: _Paper trade_ adds the bot to _My Bots_ with virtual funds. The user starts it there; no wallet is needed.
3. **Go live**: review the limits, confirm with the wallet, and keep the tab open while the bot runs.

The page header links to _My Bots_ (with the number of saved bots) and to _Advanced_ (the Strategy Lab, Discover and Backtesting workspaces). The **AI trading** card below the ready-made bots is the separate AI-built flow; see [autopilot.md](autopilot.md).

### Copy guidelines

The page copy is plain and short. Write for someone who has never seen a backtest:

- Say what the user sees or does, not how the research works. Prefer "Test result", "Holding PSWAP", "Biggest drop" and "Trades about once every 20 days" to "walk-forward", "drawdown", "kill rate", "survivors" or "folds".
- Explain the method once, in the disclaimer and the chart caption, without jargon.
- Avoid slogans, live-terminal styling ("LIVE · MAINNET · 01:17 UTC") and vanity counters.

## Why this strategy family

SORA XYK pools are thin. In the bundled archive (March 1 to September 19, 2026), median XOR-side depth is 29 XOR for VAL, 57 for PSWAP and 77 for DAI. ETH, XSTUSD and XST pools hold less than 11 XOR. A single large swap can move such a pool 20–40% away from its recent mean, and the price often stays there until other traders return. Hourly price volatility is 6–9%.

Every swap pays a 0.6% pool fee and a fixed network fee of about 0.10002 XOR. Each order also moves the pool. Small frequent strategies therefore lose to costs. In the reference run, trend, breakout and hour-of-day strategies were rejected on every market. The family that survives is **liquidity-shock reversion**: supply liquidity into a deep dislocation and sell into the recovery, at cost-aware order sizes of 2–3 XOR.

## Research protocol

`quant-loop.ts` is pure and deterministic. It needs no wallet, provider key or network.

1. **Data.** `parseQuantArchive` validates the bundled archive: hourly, contiguous rows that share one denominator, with u128 reserves. It rebuilds each XOR-paired market with its exact reserves. Closes are the same 36-decimal floors that the history loader produces.
2. **Costs.** The page observes the current network fee and pool fee from a finalized quote (`createResearchFeeLoader`). It retries while the node connects. Slippage of 0.5% is charged as a full cost on every fill, matching the rest of the bots workspace.
3. **Liquidity gate.** Markets with a median XOR depth below 20 XOR are marked _too thin_ and are not simulated.
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
9. **Deployment gate.** A market is _live-ready_ when three conditions hold:
   - the selection over all hours passes the gates;
   - the chained walk-forward return is positive;
   - the folds made at least 6 trades.

   Otherwise the loop _sits out_ and keeps the XOR idle.

### Two arithmetic tiers

Ranking thousands of candidates needs speed, so **Tier 1** screens with Float64 arithmetic. Those values only order hypotheses. **Tier 2** (`replayQuantCandidate`) replays every selected candidate with exact bigint arithmetic: constant-product fills, codec fees, and the rule engine's integer comparisons (`quantSignalAt`). Every number shown in the UI or saved with a bot comes from Tier 2.

`tests/unit/features/bot-trading/quant-loop.spec.ts` checks that `quantSignalAt` matches `evaluateStrategyRules` bar by bar on real PSWAP history.

Both tiers support every live condition except `mad`:

- deviation, trend, momentum, breakout, up-move share (`rsi`), efficiency, fall from the high (`drawdown`), return quantile and restoring force;
- `all` and `any` groups.

Exact signals are computed once per rule and market with rolling bigint algorithms, so they never drift. They are kept in a bounded memo that lives as long as the market object. Tier 1 pool depths are converted from the exact reserves once per market, with the same values as before.

Together these took the reference run from about 2.2 s to about 0.4 s, including the strategy map data, with unchanged results.

### Strategy map data

For the strategy map, each simulated market also records every candidate's fixed-parameter Tier 1 results:

- the first half (before the blind start) and the second half;
- the larger biggest drop of the two;
- the share of hours holding the token;
- trades;
- whether it passed every training check and whether it is the final selection.

These values only position lines (`QuantLoopResult.atlas`).

## Reference result

This was run on the bundled archive with the frozen finalized fee observation in `tests/fixtures/bot-trading/mainnetFees20260914.json`. Live runs use the current fee observation, so their numbers can differ slightly.

| Market           | Status      | Walk-forward (Jun 10 – Sep 19) | Max drawdown | Trades | Token price over the same hours |
| ---------------- | ----------- | ------------------------------ | ------------ | ------ | ------------------------------- |
| PSWAP            | live-ready  | +43.49%                        | 33.72%       | 37     | +60.04%                         |
| DAI              | live-ready  | +11.20%                        | 9.59%        | 8      | −8.26%                          |
| VAL              | sitting out | 0.00%                          | —            | 0      | −8.29%                          |
| XST, ETH, XSTUSD | too thin    | —                              | —            | —      | —                               |

The loop ran 19,372 backtests. At the final selection, 125 candidates passed every gate and 3,907 were rejected. These are hypothetical results on historical pool states with today's costs. They are not a promise of future returns.

## Live signals

For each selected rule, `evaluateQuantSignal` runs the exact rule engine on the latest completed hourly closes. The closes come from `createPlaygroundHistoryLoader`, which merges indexer, archive and repair sources. This is the same evaluation a running bot performs. When live history is unavailable, the card evaluates the last archived closes and labels the result _Archived close_ with its date.

The gauge shows the current distance from the rule's mean against the buy and sell triggers. It is display-only; the bot uses the exact evidence.

## Going live, paper trading and Swap

- **Go live** first observes a fresh fee quote for that pair. It then builds the bot with `createQuantBot` and attaches a walk-forward research snapshot (`quantResearchSnapshot`). The template goes through `startFromResearch`: wallet connection, `prepareLiveBot` (network, denomination and genesis checks), the funding preview, and the consent dialog.
  - For Quant Loop bots, the dialog opens with a short summary: budget, order size, fee reserve, price-impact ceiling, session length, the test result including the biggest drop, and the two remaining steps.
  - Starting still requires the wallet password (or external-wallet approvals) and the explicit consent checkbox. Nothing is pre-ticked.
  - If the wallet is short of funds, the summary links to **Get XOR**.
- **Paper trade** saves an idle paper bot through the existing research save path, keeping the same rules and provenance.
- **Swap XOR → token** sets the Swap store pair and opens `#/swap/XOR/<token>`, so the user can trade manually.

### Session length and expectations

The strategies trade rarely and hold positions for days. In the reference run:

- PSWAP had 5 trading episodes in 101 blind days, about one every 20 days. Positions stayed open 26–164 hours.
- DAI had 2 episodes, with positions open 9–21 hours.

Each live-ready card shows this cadence ("Trades about once every N days · holds X–Y days · last buy DATE"), and the consent summary repeats it.

Under **Run for**, the card lets the user choose a live session of 1, 3, 7 or 14 days; the default is 7. Sessions longer than a day are reserved for reviewed walk-forward rule studies:

- `prepareLiveBot(template, research, denomination, { sessionDurationMs })` rejects anything outside one hour to 14 days. It also rejects more than a day unless the strategy is `rules` and the research validation is `walk-forward`.
- When an extended session is granted, the bot is marked with `extendedSession: true`.
- `validatePolicy` allows up to 14 days only for marked bots outside discovery campaigns. Every other bot keeps the one-day cap.

The tab must stay open for the whole session, as for every browser-run bot.

When a live-ready market's exact rule is in its buy zone, a banner above the bot cards offers **Go live** and **Swap** for that moment.

### Long-running pages

The page is built to stay open for a multi-day session:

- **Calm mode.** Ambient motion (the iridescent rim, light sweep and drift, water bubbles, pulses) runs on arrival. After 60 seconds without pointer, keyboard, wheel, touch or scroll input, the page sets `--quant-motion: paused`. Every infinite animation reads that variable through `animation-play-state`, and the canvases (including the strategy map) stop scheduling animation frames. Any interaction wakes it.
- **Live signals.** They refresh a few minutes after each completed hour and never overlap. A tab that was throttled in the background catches up when it becomes visible again.
- **Cleanup.** Timers, observers and listeners are released on unmount.
- **Bounded live engine.** The engine keeps per-bot, size-capped state: activity is capped at 200 entries, equity at 1,000 points and observations at 120. One history entry per bot refreshes hourly, and the research history cache holds at most 3 entries. `controller.spec.ts` (_long-running session memory bounds_) checks every cap.
- **Hourly cadence.** Quant bots are checked on every finalized block, but their rules act only on a new completed hourly close.
  - Between closes, the engine skips the block and quotes and revalues the bot at most once a minute. Previously it quoted every six seconds, about 600 quotes an hour.
  - The first block that brings a new close is evaluated immediately.
  - Repeated "no signal" holds share one activity entry, so trades stay visible for days.
  - Equity points are spaced by session length: about every 20 minutes for 14 days, every 10 minutes for 7 days. The 1,000-point chart and its Net P&L therefore cover the whole session.
- **Bounded RPC bookkeeping.** Each evaluation quotes through a short-lived storage subscription. Unpatched `@polkadot/rpc-provider` kept every notification that arrived after such an unsubscribe for the life of the connection, about 0.5 MB per hour with a bot running. The patched provider drops them (see the README's install notes).

Every bot is **capacity-limited** to the researched shape:

- 10 XOR budget, including a 2 XOR fee reserve;
- the researched order size;
- a price-impact ceiling set to the largest researched fill impact, rounded up, plus one point, capped at 20% (`quantImpactCeiling`).

A larger budget would let the bot keep buying into a pool of a few dozen XOR, which the research never tested. The session length is the one chosen on the card (see _Session length and expectations_), and the tab must stay open for all of it.

## Interface

`components/quant/QuantCommandCenter.vue` composes:

- `QuantGlassArt`: ray-traced WebGL water bubbles carrying the PSWAP, XOR and ETH coin logos printed around them in 3D (see _Water art_). The Discover hero uses it too.
- The hero: the **Ready-made bots** heading, one plain paragraph and the three how-to steps. While the research runs, a one-line status and a progress bar replace the earlier six-stage pipeline and counters.
- **Available bots**: one card per live-ready market with `QuantGauge`, the test result against holding the token, the biggest drop and the number of trades. It also shows the buy and sell rules in plain words, the trading cadence, the budget, the **Run for** session choice, and the actions **Paper trade**, **Go live** and **Swap**. Markets without a bot follow under **Other markets**, each with its reason.
- **Results over time** (`QuantEquity`): chained walk-forward equity against the token's own price, with fold bands and fills. Each test period is listed with its result and trades.
- **Strategies tested** (`QuantAtlasMap`): every candidate tested in the market shown under **Results over time**, as parallel coordinates (`QuantParallel`).
  - The axes are idea, order size, trades, time holding, biggest drop, first half and second half.
  - Each line is one strategy, coloured by its second-half result: pink for a gain, blue for a loss. Strategies that passed every training check are drawn stronger, and the bot's own strategy is highlighted.
  - Dragging along an axis keeps only the lines in that range. Hovering a line shows its rules in words and whether it passed. Clicking pins it, and **Edit this strategy** opens it in the [Strategy Studio](bots-strategy-studio.md).
  - The map prints no result numbers; positions come from the Tier 1 estimate (see _Strategy map data_).
- **Trade results** (`QuantLattice`): a Galton board in which each out-of-sample sell drops into its realized after-fee result bin.

All colours derive from native theme tokens through `color-mix`, so light and dark (Noir) themes need no separate palette. Glass uses `backdrop-filter` with the `-webkit-` prefix. Canvases read colours through hidden probe elements and pause when off-screen or hidden. With `prefers-reduced-motion`, they draw static frames.

`useQuantLoop.ts` runs the search in a module worker (`quant-loop.worker.ts`), with an identical in-thread fallback, and caches the result for the session.

### Water art

`QuantGlassArt` renders three water bubbles and four beads in one full-screen WebGL1 fragment pass. It is presentation only and receives no market data.

- **Optics** (`quant-water-renderer.ts`). Each pixel traces wobbling water surfaces and shades them with exact Fresnel terms, refraction at index 1.334, one internal reflection and Beer–Lambert absorption. A studio key light plus the theme's pink and violet lights are reflected as softboxes.
- **Global illumination.** The backdrop receives soft shadows, sphere ambient occlusion and caustics from all three lights. Caustics come from a table that `quant-water.ts` builds once per page by tracing light through a water ball lens. That takes a few tens of milliseconds and is deferred until after first paint. It covers red, green and blue indices, so caustic edges show dispersion.
- **Coins** (`quant-water-coins.ts`). The PSWAP, XOR and ETH logos are rasterised from the bundled SVGs into one texture atlas. Each logo is printed around its bubble by an azimuthal projection. A turned-away print shows mirrored through the water, and light through the ink tints that bubble's caustic.
- **Motion.** Bubbles drift and oscillate in the two lowest Rayleigh modes, and each coin sways about a near-vertical axis. A pointer swipe across a bubble pushes it and spins its coin, which then settles facing forward.
- **Compositing.** The canvas is composited relative to the card behind it: open backdrop stays transparent, shadows scale the card, and highlights and caustics brighten it. Bubbles therefore take on the card's real tint and gradients. A host whose backdrop differs from the theme surface can set `--glass-art-backdrop`.
- **Budget.** The canvas uses at most two device pixels per CSS pixel and about 0.6 megapixels, and draws at most 30 frames a second. The frame loop stops while the art is off-screen or the tab is hidden, after 60 s without input, and while the optional `paused` prop is set (pass `calm`). Reduced motion, Save-Data and devices with two or fewer cores or 2 GB or less of memory get one still frame.
- **Fallback.** Without WebGL, high-precision shaders or a surviving context, the art shows static CSS drops with the same logos.

## Extended families (negative)

The six ideas added for the [Strategy Studio](bots-strategy-studio.md) were tested as extra families in the automatic selection, with the same protocol, costs and gates:

- oversold bounce (`rsi`);
- far below the high (`drawdown`);
- rare drop (return quantile with a dislocation);
- choppy-market dip (`efficiency` filter);
- bounce-back market (`restoring` filter);
- quick rebound (an `any` exit on recovery or a sharp jump).

All six together passed many more training checks (355 instead of 103 on PSWAP), but did worse blind:

| Selection                          | PSWAP walk-forward | DAI walk-forward |
| ---------------------------------- | ------------------ | ---------------- |
| Five ready-made families (shipped) | +43.5%             | +11.2%           |
| Plus all six new families          | +31.0%             | +2.3%            |
| Six new families only              | +13.2%             | +2.3%            |
| Five families, plateau selection   | +30.2%             | +11.2%           |

Added one at a time, the choppy-market and bounce-back filters cost the most. Rare drop changed DAI by +0.2 points, which is noise after eight variants. The others did not change the folds.

Plateau selection averages each candidate's score with its grid neighbours, to prefer settings whose neighbours also work.

More candidates gave the training selection more ways to fit noise, so the ready-made bots keep their five families and these numbers stay as published. The new ideas are offered in the studio, where users see both halves for every setting.

## Structure-break research (negative)

We tested whether structural-break detection improves this loop: the ADIA Lab Structural Break Challenge detector (a 1,361-feature LightGBM bag scored causally on hourly returns), Bayesian online changepoint detection (BOCPD), and a windowed z-test. All runs used the same protocol, costs and exact replay. Both thresholds were chosen on training hours only, and random-break placebos were used as controls.

- **Breaks as filters** gave no robust gain:
  - selecting a strategy per structure (shock, drift, range, quiet) cost about 42 points of summed walk-forward return;
  - suppressing entries after breaks, trading only in ranges, and resetting indicator windows at breaks all failed to beat both the baseline and the random-break placebos.
- **Breaks as positive signals** also lost to the baseline in all 12 pre-declared variants: trading only after breaks, sizing up or down near breaks, and faster exits after breaks.
- **Clustering.** Entries do cluster after detected breaks, because one price jump triggers both the alarm and the dislocation rule. However, winning trades are not closer to breaks than losing trades. In the largest sample, losers were closer.
- **Rebound after a detected break.** Dislocations that coincide with a detected regime break rebound less, but on average still positively. Filtering them out therefore removes winners.

The dislocation rule already acts as the relevant break detector for this edge, so no break-conditioned trading is shipped.

## Live-only bots for new deep pools

The archive can only research pools that were deep while it was recorded. XOR-ETH grew from under 1 XOR to about 104 XOR on 2026-10-10 and 2026-10-12, after the archive ended, so the loop rated it `thin` from its archive median. Users can now set up and run a bot on such a pool without a past test (`quant-live.ts`, `useQuantLoop` → `live`, the _Live only_ card in `QuantCommandCenter`).

- **Which pools.** After research finishes, and on every hourly signal refresh, each archive-`thin` market's direct XOR pool is read from the connected node (`readQuantPoolDepth`). A pool whose XOR side holds at least 20 XOR (the loop's liquidity gate) becomes a live-only offer with its last 48 hourly closes from `createPlaygroundHistoryLoader` (exact pool reserves). A still-shallow pool stays under _Other markets_, and its note shows the live depth instead of the archive median.
- **Freshness.** An offer is marked stale when its depth or closes fail to load or its latest close is more than two hours old (the limit a running bot applies). A stale card keeps its information but disables Paper trade and Go live. Both actions first re-read that pool and its closes (`refreshLiveMarket`), so a review is never prepared from an old depth or close.
- **Rule.** Buy when the price is 5, 8 (default) or 12% below its 24-hour average; sell when it is far enough above it. These are ordinary `rules` strategies, so the live engine, limits and paper mode are unchanged.
- **Cost-aware plan** (`quantLivePlan`). A round trip pays price impact on both legs, the pool fee twice and the network fee twice, so:
  - the order size is about √(network fee × pool XOR depth), where impact (≈ order / depth per leg) and the fixed fee (fee / order per leg) cost least: 3 XOR for 0.1 XOR fees and a 104 XOR pool. It is capped at half the budget after the 2 XOR reserve and at 5% of the pool, in 0.5 XOR steps;
  - the sell trigger is set one point above where a round trip from the buy trigger covers its estimated cost, counting buy- and sell-side fees separately: 13.5% on 2026-10-13, giving −5%/+10%, −8%/+7% and −12%/+3%. The card says so in one line;
  - the review quotes fees for the planned order. If fresh fees change the order size, the new order is quoted again, so the saved fee evidence matches the bot.
- **Break-even exit floor.** The exit is measured against a moving average, which can fall below the price the bot paid. Live-only bots therefore carry `strategy.exitFloor: 'break-even'`: the engine holds a sell signal (`bots.events.breakEven`) while selling all holdings at the latest close, after the saved sell-side pool fee, price impact and network fee, would leave the bot below its starting budget (`sellKeepsBreakEven`). If an edit drops the saved costs, holdings are valued at the close alone, so an edited bot can still exit. The floor is opt-in and accepted only on `rules` strategies.
- **Budget.** The pilot budget is fixed at 10 XOR including the 2 XOR fee reserve, which bounds stacked buys during a long slide to two. Larger budgets wait for forward results. The price-impact ceiling is the order's constant-product impact plus two points (`quantLiveImpactCeiling`).
- **Untested, said plainly.** The saved record is `source: 'live'`, `validation: 'none'`, zero trades and zero return; `copyResearchSnapshot` rejects a live record that claims anything else. The card is titled _No past test_, the consent dialog shows "Not tested on past data…" instead of a test result, and a saved bot is titled _Live prices · not tested_ (not "created from a backtest").
- **Sessions.** `prepareLiveBot` allows sessions longer than a day for `rules` bots with walk-forward research or with a live-only record, so live-only bots get the same 1–14 day choice.
- **Live prices for every rule bot.** Running `rules` bots now read hourly closes on the `xor-pool` basis (exact same-block pool reserves), the basis their research uses. The indexed USD price feed applies its own liquidity gate and had no ETH price at all, which would have stopped an ETH bot with a stale-history error. Every bot-eligible asset has a direct XOR pool above 1 XOR, which is exactly the indexer's rule for publishing pool evidence.

On true hourly reserves read from the archive node (2026-10-11 08:00 to 2026-10-13 04:00 UTC), XOR-ETH swung between about 361 and 463 XOR per ETH several times a day. A rough replay suggested that fixed +2–3% exits lose money after costs and that cost-aware exits do better. It resets reserves every hour (ignoring the bot's own fills), counts a final liquidation the engine does not perform and covers only three or four swings, so it is not evidence of profit and the card shows no result.

The indexer's hourly closes for XOR-ETH were stale during that period: its worker did not refresh cached pool reserves after swaps, so closes repeated the reserves of the last liquidity change. Live signals for new pools depend on the indexer fix in `polkaswap-indexer` and on repairing the affected hours.

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
  - bar-by-bar parity of every extended condition and of `any` groups on real VAL, PSWAP and DAI history, plus bounded, market-bound memos;
  - a real-archive regression, including the strategy map data.
- `quant-deploy.spec.ts`: templates, impact ceilings, research snapshot contract, signals.
- `useQuantLoop.spec.ts`: state machine, fee retry, cache, archive fallback, cancellation, live-only offers for archive-thin pools that are deep now, stale marking and the per-market re-read.
- `quant-live.spec.ts`: depth gate, cost-aware order sizing and sell triggers (including asymmetric buy and sell fees), rules, impact ceiling, the bot template with its break-even floor and the untested research record.
- `engine.spec.ts`, _break-even exit floor_: sells above break-even, holds below it with the sell direction kept, the no-cost fallback and rules-only validation.
- `QuantCommandCenter.spec.ts`: the three how-to steps and the matching card action order, plain rule and budget text, research progress, signals, the strategy map's market, emitted payloads, and the error and retry paths.
- `QuantAtlasMap.spec.ts` and `QuantParallel.spec.ts`: map data, rules in words, pinning and the studio link; brushing, picking and axis ranges.
- `BotsPage.spec.ts`, _Quant Loop command center_: page wiring, the consent summary, the funding-short link, paper save and Swap navigation. The _My Bots_ and _Advanced_ header links are covered there too.
- `controller.spec.ts`, _long-running session memory bounds_: activity, equity and chart observations stay capped over a 17.5-hour paper session.
