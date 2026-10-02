# Bots UX improvement goals

All six implementation goals are complete. The goal was to make choosing, testing, comparing, and running a strategy understandable while keeping the animated decision flow central to the experience.

1. **Orient the user.** Give research, detailed inspection, and paper/live bot management distinct purposes. First visits show editable rules and never start research automatically.
2. **Explain each strategy.** Show a plain-language trigger and action, with a clearly labeled animated rule illustration. Keep real historical computation visibly distinct from that illustration.
3. **Make results assessable.** Put full-period performance, held-out performance, maximum drawdown, and the return from holding the starting assets together. Keep dates, coverage, costs, and hourly resolution visible.
4. **Show the decisions.** Preserve the existing animated candidate flow and make accepted/skipped opportunities, rule checks, and simulated fills readable. Respect reduced motion and pause animations when inactive.
5. **Clarify dependencies and operation.** Disclose AI provider setup before entry and explain browser-dependent execution beside bot controls. Preserve separate live authorization.
6. **Verify the experience.** Add focused unit tests, synchronize every translation catalog, run unit/translation checks and the static build, and inspect the local UI on desktop and mobile.

## Implemented behavior

- The first visit opens the builder without running research. Users choose rules, explicitly run a test, compare matching studies, and create an idle paper bot with the tested rules. The handoff focuses and scrolls to the new bot.
- Scheduled buying, fixed-price dip buying, and moving-average crossings have readable trigger/action explanations. Animated candles, rule checks, fee gates, and fill/skip paths show the process. Illustrations are labeled; actual evaluated decisions drive the running graphs.
- The four result metrics share visual prominence. Dates, coverage, costs, the hourly resolution limit, and empty held-out windows remain visible. Matching comparisons cannot fall back to unrelated saved studies after a failed run.
- Running graphs appear above partial metrics and freeze after computation. Completed unselected diagnostics collapse. Phone layouts wrap descriptions and graph captions without page overflow.
- AI entry discloses Codex/provider setup. Browser-dependent execution, inactive saved sessions, manual resume, and separate live authorization are explicit.

## Validation

- Full `test:unit`: **875 files, 5,420 tests passed**, including 24 script-test files (273 tests). Later narrow UX regressions are covered by the final focused bot run.
- Real-history browser check: three strategies completed from 4,743 hourly observations; comparison showed full/held-out returns and drawdown separately. Creating a paper bot preserved the exact one-block interval, ten-XOR buy amount, fresh holdings, and stopped state. No wallet signing occurred.
- Desktop and 390 × 844 phone inspection: animated rule explanations and processing views fit; body/document width remained 390 px, with comparison-table overflow contained in its scroll area. Browser warning/error logs were empty.
- Independent Chromium Light and WebKit Noir checks proved screenshot-pixel movement in all three concurrent runs, then unchanged graph pixels after completion. Both reported zero page/console errors. Evidence: `output/bot-lab/motion-browser-verification.json`.
- Final focused bot checks: **40 files, 592 tests passed**. Translation consistency: **4 files, 13 tests passed**, including interpolation, locale scripts, and English-fallback limits. All new standard-locale copy was localized; semantic locales follow the existing repository vocabulary mapping.
- Final static build passed in **26.00 seconds**; focused ESLint passed. The final phone check confirmed full-width strategy descriptions and separate, readable graph captions. The completion counter refers to the current batch rather than including older saved results; a repeat-run regression covers this behavior. The final phone handoff visibly focuses the new bot’s heading, with Ready status and Start control immediately visible. Browser warning/error logs remain empty. The final StrategyLab suite passes **18 tests**, including the saved-studies/current-batch counter regression; ESLint and formatting pass.

Production deployment is coordinated in the separate deployment task; these implementation results do not by themselves claim the public site has been updated.
