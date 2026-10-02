# Visible Bots setup

## Design

The complete strategy library, applicable rule controls, trading limits, validation settings, comparisons, and AI composer remain visible. Section headings and spacing organize the page; choosing a strategy never collapses the library or hides the editor. The settings summary displays the exact current order size, minimum gap, and fee budget.

The page order is input/output tokens and starting capital, all twelve strategy choices, the selected strategy explanation and animated rule preview, limits and test controls, Run, then the composer and available historical results. The rule preview stays above Run and responds immediately to rule edits. Reduced motion retains a static explanation.

Available result analysis, comparisons, rule evidence, and fee assumptions render directly below results. Result-specific review restores the exact saved configuration, then scrolls and focuses its applicable controls. The AI shortcut scrolls to the existing composer; it never mounts, hides, or resets that panel. Legacy composer route flags remain navigation intent only.

Editing a control, choosing a strategy, viewing analysis, or focusing the composer never runs research or starts trading. Run remains the explicit action for an unsigned experiment; wallet and policy review remain required before live trading.

## Defaults and trade frequency

The user explicitly wants frequent trading. New trend-following drafts use a one-minute minimum gap between eligible trades, a 10% order size, and a 1% maximum price impact. Price signals determine actual trading frequency; a timer does not force an order. Reducing order size alone would increase the burden of fixed network fees, so the order percentage is retained and displayed together with its exact token amount and fee budget.

The live-price signal option allows a new SMA bot to react to the current price alongside completed hourly observations. Previously saved bots preserve their original signal timing. The historical test has hourly prices: it cannot validate intrahour executions or their additional costs. This limitation remains visible above Run.

New tests request 90 days with three chronological test windows, using the first 60% for initial training. No automated optimization or additional comparison strategies run by default. These are starting settings, not evidence of future profits.

Reset limits and tests preserves the chosen strategy rules, market, and starting capital. It resets the trading/validation controls and removes extra comparison runs. Practice is the emphasized result action; live trading remains explicitly available through the existing wallet and policy review.

## Rationale

The user explicitly requested that strategies, settings, and analysis stay visible. The layout therefore uses ordinary sections instead of progressive disclosure. Financial execution behavior and defaults are independent of this layout change.

## Visibility regression coverage

The StrategyLab unit suite checks that all twelve choices and applicable controls are visible initially, after a selection, while a batch runs, and after teleported market controls move into the main Bots page. It also checks that saved analysis and rule evidence are immediately visible, result-review navigation focuses the correct controls, and repeated AI shortcut clicks preserve the same composer instance. No native disclosure or expansion toggle remains in StrategyLab.

## Previous release verification — 15 September 2026

- The focused engine, controller, Lab, result-card, editor, defaults and experiment suites pass 322 tests. Coverage includes a simulated buy and sell within two minutes, unchanged hourly behavior for older bots, duplicate/stale quote rejection, missing-hour history and a slow history fetch preceding a fresh quote.
- The shared Bots regression run passes 1,043 tests across 55 files, including the concurrent Codex strategy integration. Its log is `output/bots-calm/combined-bots-tests.log`.
- The static build passes the eight-case Chromium/WebKit matrix across desktop/mobile and light/dark themes. All cases have zero page/console errors and zero horizontal overflow. That previous release checked the then-collapsed settings, all twelve strategy choices, exact amount summaries, minute cadence, reset preservation, reduced motion and practice/live-review actions. The always-visible revision supersedes those disclosure expectations and requires fresh browser verification.
- Browser checks load the real public runtime. Saved result examples are synthetic local fixtures; the checks do not connect an account, submit a trade or claim profitability from those fixtures.
- The final combined static build, including Safari dropdown sizing and the Codex context update, passes all eight browser cases again. Minute-cadence and signal-timing selectors have at least 44px targets in both browser engines. Translation checks pass all 13 tests.
- Evidence lives in `output/bots-calm/final-focused.log`, `output/bots-calm/build-combined.log`, `output/bots-calm/final-translations.log` and `output/bots-calm/browser-final/verification.json`, alongside desktop/mobile screenshots. The normal app route is required: `?ipfs-check=1` deliberately renders the offline check shell and is unsuitable for this interaction test without the checker's explicit online configuration.
