# Codex strategy authoring validation

Validated locally on 2026-09-14/15 while the Bots UX changes were being integrated in the shared checkout. Setup and scope are documented in [Create a bot strategy with Codex](../codex-strategies.md).

## Focused automated checks

- ESLint passed for `codex-handoff.ts`, `codex-strategy.ts`, `StrategyComposer.vue`, their three unit suites, and the browser suite.
- All **62 tests in five unit files** passed: `codex-handoff.spec.ts`, `codex-strategy.spec.ts`, `StrategyComposer.spec.ts`, `strategy-composer.spec.ts`, and `StrategyLab.spec.ts`.
- All **8 browser cases** passed across Chromium and WebKit. These mount the actual Vue composer and strategy modules with fabricated, explicitly labeled market fixtures. Coverage includes ordinary-browser onboarding, mobile layout, exact amounts and cadence, explicit review, invalid/stale submissions, unavailable history, and tool cleanup.
- The coordinated full repository `test:unit` run passed with exit code 0: **851 unit files / 5,147 tests**, plus **24 script files / 273 tests**, totaling **875 files / 5,420 tests**. Evidence is retained in `output/bot-lab/final-combined-unit.log`.
- The final coordinated bots run passed **40 files / 592 tests**. Aggregate translation checks passed **4 files / 13 tests**, and lint and the static build passed. Codex sources remained unchanged through these gates. Subsequent unrelated Bots UI fixes and production publishing remain with the shared release task.

## Native Codex browser checks

The native in-app browser supplied `document.modelContext`; these checks used no WebMCP polyfill.

1. The isolated composer registered `polkaswap_strategy_context` and `polkaswap_strategy_draft`. Reading synthetic PSWAP/VAL observations and submitting a threshold draft populated the actual review form with amount `1.000000000000000001`, interval 15 blocks, and trigger `2.5`. The buy-only limitation and maximum trade size were visible. **Add experiment** remained an explicit button. The available-browser state hid redundant desktop handoff controls. There were no warning or error logs.
2. The full application at local Vite route `/#/bots` reached title **Bots - Polkaswap**. Opening **AI strategy assistant** registered the two drafting tools alongside the existing nine public tools.
3. The full application's context tool successfully read **120 real hourly XOR/VAL observations** through the existing history loader, with public asset metadata and the selected virtual trade ceiling. A verification-only scheduled-buy draft preserved `0.000000000000000001` XOR and 15 blocks in the review form.
4. Neither native check added an experiment, created a bot, connected a wallet, signed, or executed a trade. The full app retained its three existing studies and zero bots. **Stop website tools & clear draft** removed the review and the two drafting tools while leaving the existing nine tools registered. The full-app check recorded zero console errors. Temporary tabs were closed.

The OS desktop-link launch and account sign-in were not exercised: the link format was verified against OpenAI's official desktop composer, and sign-in remains a user action in Codex. These checks validate strategy authoring and review, not unattended AI inference or live trading. Production publishing is coordinated separately by the shared release task; this report does not claim that the implementation is already deployed.
