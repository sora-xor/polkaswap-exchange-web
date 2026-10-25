# Simple Bots experience

## Goal

Help a user choose a token pair, understand a strategy's historical behavior, and start a bounded on-chain bot through an explicit wallet review in a few actions.

## Design

- Visual thesis: native light and plum-dark surfaces, restrained raised controls, strong data contrast, and one scientific flow tied to recorded decisions.
- Content plan: token pair and starting amount first; one strategy and Preview; a concise outcome with Start bot; an always-visible strategy library, inline rule editing, and expanded analytics; active bot status with Pause and Stop.
- Interaction thesis: animate recorded decisions into their actual outcome bins; let the user follow and pause one decision; collapse completed motion into a legible summary and expose the relevant setting when a rule blocks trading.

## Milestones and status

1. **Implemented.** Simplify setup: single preset selection, explicit history range, prominent preview/rerun, and advanced comparison without duplicated navigation.
2. **Implemented.** Explain results: portfolio value, net change after costs, worst decline, same-period holding comparison, clear checked/signalled/taken counts, and actionable first-failure reasons.
3. **Implemented.** Make animation useful: taken trades as the completed default, opt-in skipped what-if results, consistent filtered readouts, pause/speed/follow controls, and readable mobile presentation.
4. **Implemented.** Connect research to trading: a direct Start bot action, resumable wallet connection, concise spend/fee/session review, and explicit consent using the existing executor. Research and connecting a wallet never grant trading authority.
5. **Published and verified on 2026-09-15.** Validate and publish: focused unit/integration checks, all locale catalogs, native light/dark desktop/mobile browser checks, production/testnet pins, validated Bunny origin, full purge, and live WebKit verification.

## Product boundaries

Bots run in the browser under the existing session model; the page must say when the tab needs to remain open. Starting, pausing, cancelling, and resuming retain the execution engine's account, network, balance, fee, allocation, and signer checks. Tests use mocked wallets and never submit real trades. Historical results stay dated and identified as historical; no return or activity is invented to encourage a transaction.

The quick preview starts with a moving-average crossover and 90 days of available hourly history. New Lab bots use live-price signals with a one-minute minimum trade gap; hourly historical tests cannot validate their intrahour fills. Users can choose 30 days or all available history. Previously saved studies retain their original periods and rules. Live sessions require renewal after expiry and pause when the browser is hidden or offline. See [active defaults](bots-active-defaults.md) for timing, costs and validation details.

## Acceptance

- The pair and starting amount are the first page controls.
- Selecting one preset and previewing it requires no wallet and creates one study.
- A completed result provides a Start bot action before deep diagnostics.
- A user can review that exact study's configuration for live trading without creating or running an intermediate paper bot.
- The active chart group, hover counts, summary, and inspection terms agree.
- Every visible animation decision derives from recorded checks; visual timing cannot change a financial result or stall research.
- Cancelling a review, changing account/network, or rejecting signing cannot accidentally start trading.
- Mobile content remains readable without relying on a scaled desktop graphic.

## Wallet review

`StrategyLab` emits the exact selected bot template, immutable research summary, and a transient copy of the just-revalidated chain/denomination identity. The page retains this intent through wallet connection, then prepares an unsigned, unsaved live review. The controller independently checks the historical fee network, finalized denomination, current quote, account, and review expiry. A quote updates the output order cap; historical profits never become starting capital.

The review shows required amounts and wallet balances remaining after other active bot allocations. Insufficient funding blocks confirmation and allows a read-only balance refresh. Confirmation rechecks funding and identity before saving the same draft once and entering the existing session authorization path. A cancelled or stale intent grants no execution authority. The live executor still performs its atomic allocation checks when starting.

## Verification evidence

- Full unit command: 5,812 tests passed in 891 files (`output/bots-simple/unit-all.log`).
- Local static IPFS preview: eight Chromium/WebKit × light/dark × desktop/mobile cases passed (`output/bots-simple/browser/verification.json`). Synthetic fixture data comes from the research engine and is used only on localhost.
- Browser checks cover first controls, single preset, default period, prominent action, native themes, real grid layout, filtered histogram scaling, exact unchanged outcome bins, one-decision evidence, pause/speed/scrub, reduced motion, and no horizontal overflow or console errors.
- All 31 locale catalogs are synchronized; 13 translation checks pass (`output/bots-simple/translation-tests.log`).
- The final build's unmocked WebKit preview completed a real 30-day study (719 hourly decisions, 9 simulated trades) and opened the wallet chooser with 0 failed requests, 0 HTTP errors, 0 page errors and 0 console errors (`output/bots-simple/live-preview-final/summary.json`).
- Independent review found no concrete issues with cancellation, account/network changes, denomination checks, exact funding math, or duplicate starts.
- An existing chooser preload initialized Google Drive discovery before Google was selected. The generic Google API/OAuth libraries now preload separately to preserve popup activation; Drive discovery initializes after explicit Google OAuth succeeds. 42 focused wallet tests pass (`output/bots-simple/wallet-chooser-tests.log`).

## Original simple-start release

The five milestones are complete. Production is live at https://polkaswap.io/#/bots with production root `bafybeibd6esnxj4lmmtrtb34s5bef34r5izpggblligh2z7aebd5gopyt4`. Both production and testnet DAGs are pinned on MOF; all 46 retained pins passed integrity checks. The validated origin was saved in Bunny, the full `polkaswap` cache was purged, and all 88 required assets were warmed with exact build-byte checks.

Eight fresh, unmocked production WebKit contexts covered Bots and Swap in desktop/mobile light/dark modes. All passed with zero failed requests, HTTP errors, page errors, or console errors, and the final Swap title was `Swap - Polkaswap`. The default 30-day historical run, unchanged outcome bins, taken-trades default, single-decision inspection, pause/speed controls and wallet chooser were exercised on production. Verification stopped at wallet selection; no real wallet was connected and no trades were submitted. Evidence: `output/bots-simple/live-production/summary.json` and the release report below.

See [deployment evidence](reports/bots-simple-start-deployment-2026-09-15.md).

## Unified strategy picker

The first setup block contains token input/output, starting amount, one twelve-choice strategy picker, the selected idea, history range, the animated strategy explanation, and Run. Every basic preset and composable recipe appears in that same picker with equal visual weight. There is no privileged three-preset row, separate lower recipe catalog, or More/Mix gate. Direct links such as `#/bots/lab?strategy=sma` select a tile in this same workspace.

Selecting a tile activates its exact strategy and updates the explanation before Run; it never starts research. The chosen animation sits immediately above the primary Run action. Editable rules follow in Customize your strategy, with the second Run action after its settings. RuleBuilder uses `showRecipes=false` and `showFlow=false` here to avoid duplicating the picker or animation while retaining its standalone behavior elsewhere. Both Run actions execute the same guarded batch path.

Comparison settings use plain checkboxes labeled Compare {strategy}. Adding comparison runs preserves the primary selected tile and its explanation. Removing that primary comparison selects the first remaining preset; removing all selections disables Run. Separate preview-only explanation buttons were removed because they could show one strategy while running another.

Visual thesis: one compact, native raised selection grid with equal signal glyphs and readable names; four columns on desktop and two on phones. Content order: tokens and amount → all strategy choices → selected explanation → history → looping selected animation → Run → customization and its Run action → results and evidence. Interaction thesis: equal tiles show the current choice, the explanation responds to selection, and recorded result animations preserve their existing meaning and controls.

Prior release evidence: [visible-library deployment](reports/bots-visible-strategies-deployment-2026-09-15.md). The unified picker is published and verified at root `bafybeihek3zxzmjhrddi56fuotyxc5oksfyni7kbtlqezyiach5turknli`. See [the unified-picker release report](reports/bots-unified-picker-deployment-2026-09-15.md) for 76 passing unit tests, eight passing local browser cases, eight passing production WebKit contexts and the completed CDN purge.

## Continuous strategy preview

Visual thesis: preserve the native raised light/dark surfaces and give the selected strategy one full-width scientific preview directly above its main action.

Content plan: tokens and amount → all twelve strategies → history → selected example → Run results / Run results again. The rule editor and comparison settings stay visible below; their Run action follows the last setting.

Interaction thesis: replay the same deterministic example continuously, briefly holding the final observation before restarting; keep Pause/Resume and Replay available. Changes to the selected rules update the single preview. Invalid rules replace it with a visible error and disable both Run actions. Replaying the example never starts a historical run or a transaction.

`StrategyLab` owns the selected `RuleFlow` or `StrategyFlow` inside `lab-strategy-preview`, which moves with the token controls when teleported into the page-first region. `RuleBuilder` defaults `showFlow` to true for standalone use. Reduced motion, a hidden page, an offscreen preview, and an inactive workspace suspend the illustrative clock; it resumes only when visible and not manually paused. Stored historical decision views remain static.

Published and verified on 2026-09-15 at production root `bafybeihlio27kvwhjmdivv5ismul3zd2mtydv6a2mem37umgklytasde4i`. See [looping preview release evidence](reports/bots-looping-preview-deployment-2026-09-15.md) for the completed purge, 82 focused tests and eight live WebKit checks.
