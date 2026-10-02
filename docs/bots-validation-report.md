# Historical validation report

`src/features/bot-trading/components/ValidationReport.vue` presents completed historical validation results without a playback timer or walkthrough controls.

- Each recorded fold shows its exact training and test boundaries in UTC on a shared, static time scale. An excluded-candle marker appears only when the fold contains purge evidence.
- The summary, period returns, benchmark comparison, drawdowns, and execution counts are visible immediately. Returns preserve their arithmetic sign, including very small losses. Missing benchmark evidence remains unavailable.
- The assumptions disclosure explains fresh capital per test, indicator warmup, cost assumptions, sample screening, and parameter-tuning limits. No return is presented as a forecast or a probability of future profit.
- An optional `progress` prop displays only the evaluator's real scope and completed/total checkpoint counts. It never advances on a separate clock or highlights a previous run's completed dates as current work. StrategyLab displays its existing evaluator progress while running and mounts this completed report afterward.
- All colors use the app's native content, surface, border, and financial-status tokens. The report follows native light and dark modes without a local palette or theme override. Completed evidence remains static with either motion preference.

The focused component suite covers exact ranges, native theme tokens, absent playback controls, immutable completed evidence during subsequent progress, conditional purge markers, unavailable evidence, and signed financial summaries:

```sh
node .yarn/releases/yarn-4.10.3.cjs test:unit tests/unit/features/bot-trading/ValidationReport.spec.ts
```
