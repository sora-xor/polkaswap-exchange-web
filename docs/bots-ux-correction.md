# Bots UX correction — 15 September 2026

## Critique and decisions

| Problem | Change | User outcome |
| --- | --- | --- |
| Token selection was first, but the run action sat below the entire rule editor and disappeared when that editor closed. | Keep one prominent, full-width **Run results** action immediately after the token and starting-capital controls. After a run, label it **Run results again**. | The next step is visible before scrolling; rerunning does not require opening the editor. |
| The dark Bots panel used a private charcoal palette, visually disconnecting it from the application's theme. | Inherit native surface, input, text, action, and shadow tokens. | Light mode uses the app's pale surfaces; dark mode uses its plum palette. The existing theme setting controls both. |
| “Does the result repeat?” paired completed numbers with a timed training/locking/testing walkthrough. Playback looked like an action but performed no new test. | Use **Historical validation**, static dated training/test periods, and immediately visible result rows. Remove the playback clock and its controls. | Users can read what was tested, when, and with what outcome without interpreting a decorative sequence. |
| An invalid starting amount was rejected only after attempting to run. | Validate the amount in exact token base units and show the error next to the primary action. | The disabled action has a concrete explanation; fixing the amount restores it. |
| Running and saved-result states were separated from the primary action. | Show **Running results…**, actual progress and data status beside the action; retain older studies and the existing cancel control. | Users see whether work is active, can rerun after completion, and keep their previous evidence. |

## Interaction contract

1. Select the input and output tokens, then enter virtual starting capital.
2. Run the selected strategy configurations against historical prices. The summary states the configuration count; the nearby note explains virtual capital and modeled costs.
3. Inspect results and dated validation periods. Customize strategies through the existing editor when needed.
4. Change the draft and run again. Each invocation creates fresh immutable definitions; changing the draft never rewrites a completed result.

The top controls and action use the same Vue Teleport and component state. There is no second form or second primary run button. They remain visible when the editor collapses, and hide when the Lab view becomes inactive.

Capital readiness uses the existing exact `toCodec`/`codec` helpers, requires a positive amount within the engine's one-billion-token bound, and rejects fractional base units. The run pipeline still performs complete configuration validation. Verified token availability and valid strategy rules remain prerequisites; unavailable network data never produces invented results.

Native theme switching exposed a WebKit resize loop in the shared settings dropdown. `SPopoverPanel` now retains its observer when Vue repeats the same mounted-element reference, avoids unchanged position writes, and coalesces resize-triggered writes into one cancellable frame. This fixes the observed loop without suppressing browser errors or changing chart evaluation.

## Related implementation notes

- [Native theme contract](bots-native-themes.md)
- [Historical validation presentation](bots-validation-report.md)
- [Strategy composition and execution](bot-composable-strategies.md)

## Validation

Component tests exercise the primary action's placement, single-state teleport, collapsed-editor rerun, immutable prior amounts, busy/duplicate protection, and exact invalid-amount feedback. The theme regression compiles actual Vue/Sass styles. Browser checks cover native theme switching, preserved draft amount, viewport-visible desktop/mobile actions, and readable engine-generated validation fixtures.

| Final check | Result | Evidence under `output/bots-ux-correction/` |
| --- | --- | --- |
| Full `yarn test:unit` | 5,726 passed: 5,449 app tests and 277 script tests | `all-unit.log` |
| All Bots suites | 869 passed in 53 files | `bots-unit.log` |
| Focused shared dropdown/header integration | 59 passed in 3 files | `dropdown-tests.log` |
| Translation consistency | 13 passed | `translation-tests.log` |
| Production static build | Passed in 21.20 seconds | `build-final.log` |
| Chromium and WebKit | All 8 scenarios passed, zero tracked errors | `browser-final.log` |
| Changed Vue/TypeScript lint and whitespace | Passed | Final command results |

The browser scenarios cover desktop and mobile light/dark layouts, the real app theme switch, the visible primary action, editable recipes, reduced motion, native worker execution, saved-result restoration, and static historical-validation rows. Test prices are isolated synthetic engineering fixtures. Screenshots of the token-first layouts and validation contents were inspected. An initial text assertion was corrected to check the button's accessible name, since its decorative arrow is intentionally hidden from assistive technology. The earlier WebKit resize warning was reproduced and fixed at its dropdown source; it is not filtered out of the passing checks.

## Production publication

Published on 15 September 2026 at [polkaswap.io/#/bots](https://polkaswap.io/#/bots).

- Production CIDv1: `bafybeigntcj36isimsszaskoiloznv7xveks6e44hyxbgkri64omwe6gz4`.
- Testnet CIDv1: `bafybeiftncbo6tfmopshxnjh563w3vjdxclqbwchphllcmrtc2ugr5iflu`.
- Both DAGs were imported to the dedicated MOF origin; recursive roots and retained pin integrity passed verification.
- Bunny zone `polkaswap` (`5860217`) uses the new production root with host header `mof.sora.org`. The origin-save and full-zone-purge success notifications were verified. Required origin settings and both static-origin/CSP edge rules remain correct.
- The live root identifies the new CID and uses `no-cache`; entry JavaScript, CSS, Swap and Bots chunks match the built bytes. Eighty-eight required assets were warmed and verified sequentially.
- The official WebKit check passed with real Swap content and zero failed requests or console errors. Additional desktop/mobile light/dark checks passed for both Bots and Swap, with zero unfiltered console, page, request or HTTP errors and final title `Swap - Polkaswap`.
- A real XOR/VAL historical study completed, rendered three dated validation periods, and enabled **Run results again** while the editor remained collapsed. Native theme switching preserved the draft amount.

Publication evidence is under `output/bots-ux-correction/deploy/`: `release.json`, `replicate.log`, `bunny-update.json`, `origin-assets.json`, `live-assets.json`, `warm-assets.json`, `official-webkit-summary.json`, and `final-verification/summary.json`. The initial additional Swap probe used an outdated text assertion; its corrected rerun is retained separately under `swap-final/`, alongside the original Bots evidence in `live-verification/`. No application change was needed for that assertion correction.
