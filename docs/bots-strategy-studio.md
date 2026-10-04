# Strategy Studio: build your own bot

The **Build your own bot** section sits in the Discover workspace (`/#/bots/discover`), under the AI search. It needs no AI key and no wallet. Users pick a market and an idea, tune the rules on past SORA pool data, check whether the rules held up on hours they did not tune on, and paper trade the result. Everything runs in the browser from the bundled archive, so it works from IPFS like the rest of the app.

The main bots page links into it: in **Strategies tested**, clicking a line pins one of the Quant Loop's tested strategies, and **Edit this strategy** opens the studio with that strategy's market and rules (see [Quant Loop](bots-quant-loop.md#interface)).

## How to use it

The section shows four steps:

1. **Pick a market and an idea.** Markets whose pool is too thin for a 2 XOR order (the Quant Loop's 20 XOR median-depth gate) are listed but disabled.
2. **Tune it on the first half.** Each idea has a few settings. They can be changed in four places, and every view follows the same choice:
   - click a column in the 3D chart;
   - drag the pink buy line or the purple sell line on the price chart;
   - click a line in the parallel chart;
   - use the sliders and buttons beside the results.
3. **Check the second half.** The results card shows both halves side by side, each next to what simply holding the token did.
4. **Paper trade it.** _Paper trade_ adds the strategy to _My Bots_ with virtual funds. _Open in Strategy Lab_ loads the same rules as an editable draft there, for other pairs or a different test setup.

A note under the actions says plainly that changing settings until the second half looks good stops it being a fair check.

## Ideas

Every idea builds rules in the live rule language (`strategy-rules.ts`), so any setting runs unchanged in a bot. The first three and the last two are the Quant Loop's ready-made families on finer grids; the other six are newer.

| Idea               | Buys when                                                                          | Sells when                                        | Ready-made family |
| ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------- |
| Buy the dip        | price is X% below its N-hour average                                               | price is Y% above that average                    | reversion         |
| Dip in a calm week | the same, and the week's fall is under G%                                          | the same                                          | guarded           |
| Sudden drop        | price fell X% within H hours                                                       | price is back near an average                     | shock             |
| Oversold bounce    | up moves were under L% of all moves (simple RSI)                                   | price is back above an average                    | new               |
| Far below the high | price is X% below its N-hour high                                                  | price is back near an average                     | new               |
| Rare drop          | this hour's change is in the lowest P% of recent hours, and price is below average | price is above average                            | new               |
| Quick rebound      | price is X% below average                                                          | price recovers, **or** it jumps G% within H hours | new               |
| Choppy-market dip  | price is below average, and little of the recent movement went one way             | price is above average                            | new               |
| Bounce-back market | price is below average, and the market recently pulled back to its average         | price is above average                            | new               |
| Follow the trend   | price is X% above its average                                                      | price falls back below it                         | trend             |
| New high           | price makes a new N-hour high                                                      | price makes a new M-hour low                      | breakout          |

Order sizes are 1, 2 or 3 XOR with the Quant Loop's 10 XOR capital and 2 XOR fee reserve. At 1 XOR the fixed network fee takes about a tenth of every round trip, which the results show.

## How results are measured

The archive is split at the Quant Loop's blind start (50% of the hours): the first half for tuning, the second half as the check.

Each half is tested as **four consecutive periods**, and each period restarts from the 10 XOR capital and its 2 XOR fee reserve. The results are compounded like the Quant Loop's walk-forward folds; the second half's periods are exactly those folds. A single run over a whole half would let the fee reserve decide the outcome, because 2 XOR covers at most 19 trades. With periods, a studio result reads like a ready-made bot's test result.

Two arithmetic tiers keep speed and money separate, as in the Quant Loop:

- **Tier 1 (positions and colours).** The 3D chart, the parallel chart and the drag preview use Float64 screening (`screenQuantReplay`). Those values only place marks. Tests check they stay within half a percentage point of the exact results.
- **Tier 2 (every printed number).** `studioReplay` runs the exact replay: constant-product fills, codec fees and the rule engine's integer comparisons. Tooltips on the 3D chart and the parallel chart ask the worker for an exact replay of the hovered setting (about 5–15 ms), and show "Calculating…" until it arrives.

Exact signals for the new conditions use rolling exact algorithms in `quant-loop.ts`. The conditions are up-move share, efficiency, fall from the high, return quantile and restoring force, plus `any` groups. Tests compare them bar by bar with `evaluateStrategyRules` on real VAL, PSWAP and DAI history. Median-deviation conditions (`mad`) are not supported by the loop and are not used by any idea.

## Views

- **Results by setting** (`QuantTerrain`, `quant-terrain-renderer.ts`). This is a WebGL1 3D bar chart of the idea's two main settings, with every other setting fixed.
  - Column height is the first-half result: columns rise above a glass floor for a gain and hang below it for a loss. Column colour is the second-half result on one diverging ramp: pink for gains, blue for losses and grey at zero, matching the bots page's tone classes.
  - Tall columns that turn blue are settings that only worked on the hours they were tuned on.
  - Drag to turn the view. Click a column, or use the arrow keys and Enter, to use its settings; a live region reads out the focused column.
  - New grids grow as a ripple out from the chosen column, and height changes morph.
  - Without WebGL the same data draws as a flat heatmap with the first half as dots.
- **Price and trades** (`QuantSignalChart`). This is a canvas with stacked panels on one time axis:
  - price with buy and sell marks;
  - the buy indicator, and the sell indicator when it differs, with draggable lines that snap to the setting's grid;
  - bot value against holding the token, each half restarting at zero.

  The handles are keyboard sliders (arrows, Home and End). _Replay_ animates the trades across both halves.

- **Every variation of this idea** (`QuantParallel`). This is a parallel-coordinates chart of the idea's whole setting grid, thinned to at most 4,000 combinations, from the settings on the left to the trades, biggest drop and both halves on the right.
  - Dragging along an axis keeps only the lines in that range; click an axis or press Escape to clear.
  - Clicking a line uses its settings.
  - Axes can have a floor, a ceiling, a baseline and an inverted direction, so the biggest drop reads better-upward.
- The results card lists both halves, holding the token, the biggest drop, trades, how often it trades and how long it holds, and the rules in words.

Colours come from theme tokens read through hidden probe elements, so light and dark themes need no separate palette.

## Runtime and long sessions

`useQuantStudio` loads the archive only when the section comes into view. It loads into a module worker (`quant-studio.worker.ts`), with an identical in-thread engine if the worker fails. Then it observes current fees from a finalized quote, retrying while the node connects.

- Each view keeps at most one job in flight and always answers the latest choice, so dragging never queues stale work.
- The worker answers large parameter grids in steps, so exact replays run in between.
- The archive text is not kept after loading.
- Tier 1 and exact memos are bounded and bound to their market; landscapes, grids and probes have small LRU memos.
- After a minute without input, the views stop drawing animation frames. They also stop while off-screen, while the tab is hidden, and with reduced motion. Unmounting terminates the worker and releases the WebGL context.

## Paper trading

`quant-studio-deploy.ts` builds the paper template the same way as a ready-made bot:

- the exact rules and order size;
- a price-impact ceiling from the researched fills (largest, rounded up, plus one point, within 2–20%);
- an output cap of the 10 XOR capital at the latest archived close.

The research record reports the second half as a chronological holdout with `optimized: true`, because the settings were tuned by hand. Before saving, the studio observes fresh fees for the pair. The page then saves through the existing paper flow; nothing is signed. Studio strategies are not offered for one-click live trading: real money still goes through _My Bots_' own review and consent.

## Deep links

`?studio=<market>~<idea>~<values>~<order size>` (for example `PSWAP~dip~48_15_10~3`) opens a setting. Links are bounded and must hit the grid exactly; anything else is ignored.

## Research notes

Adding the six newer ideas to the Quant Loop's automatic selection made its blind results worse:

- PSWAP fell from +43.5% to +31.0%, and DAI from +11.2% to +2.3%.
- Choosing plateaus (settings whose neighbours also passed) instead of the single best setting also did worse.

The ready-made bots therefore keep their five families, and the newer ideas are offered here, where both halves are visible. See [Quant Loop: extended families](bots-quant-loop.md#extended-families-negative).

## Tests

- `quant-studio.spec.ts`:
  - recipe grids and live-rule validity;
  - state snapping;
  - mapping every ready-made candidate to the same rules;
  - deep links;
  - period boundaries equal to the Quant Loop folds;
  - exact replays equal to chained period replays;
  - Tier 1 versus exact agreement;
  - views and the engine (job routing, memoisation, thin-market and cost checks, stepped grids).
- `quant-studio.worker.spec.ts`: worker messages.
- `quant-studio-deploy.spec.ts`: the paper template, research record and payload.
- `useQuantStudio.spec.ts`: lifecycle, latest-only jobs, probes, deep links, fee retries, worker fallback and cleanup.
- `quant-loop.spec.ts`, _extended rule kinds_: bar-by-bar parity of every new condition and of `any` groups with the rule engine, plus bounded memos.
- `QuantStudio.spec.ts`, `QuantTerrain.spec.ts`, `QuantSignalChart.spec.ts`, `QuantParallel.spec.ts`, `QuantAtlasMap.spec.ts`, `quant-terrain-renderer.spec.ts` and `studio-colors.spec.ts`: the components, the renderer geometry and picking, and the colour helpers.
