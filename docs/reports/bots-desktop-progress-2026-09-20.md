# Desktop research status — 20 September 2026

The site-tool status previously returned `awaiting_budget` as soon as a draft was consumed, even while backtesting continued or after qualification failed. The bridge now follows the local workflow through `researching`, `awaiting_review` and `research_failed`. It exposes only known application error keys and bounded failure categories. `bot_available` requires a saved bot and does not assert an active signer, a trade or profit.

The connected/pending-request lifecycle still takes precedence. Invalid, detached or throwing progress readers report `unavailable`; cancellation clears the previous result. Status excludes account data, balances, provider responses, opening prices, validation observations and return metrics. Reading it has no execution authority. The shared error-key check also prevents key-shaped provider text from entering the setup error state.

## Live Chrome investigation

Before this status release, the existing connected Chrome tab successfully completed GO with **10 KUSD maximum input and XOR output**, same-tab assistant acknowledgment without an API key, and delivery of a pending training-only context. That context included the separate **1 XOR** reserve, exact dated directional fees, **5% target / 5% peak-loss limit / 24 hours**, partial-order constraints and partition requirements.

One diagnostic candidate used a **5 KUSD** partial order with a six-hour mean-deviation band of −20% for entry and +20% for exit, evaluated on completed hourly closes. Its purpose was to test a wide no-trade region, not to claim an established edge. The page tested its three allowed sizes. All three failed training on insufficient fills, no positive net return and excessive drawdown. There was no subsequent tuning, held-out inspection, wallet unlock or transaction. The page visibly acknowledged **“Agent connected to this tab”** and exposed the failure categories under **“Why it stopped.”**

The manually transcribed DOM evidence is `output/go-history/research-20260920/chrome-go-20260920.json`. It is not a video or an exported execution trace. This observation supersedes the earlier opening-bound rejection as the reason this particular fresh GO attempt stopped; it does not invalidate that earlier dated result.

## Validation

- **1,714 Bots regression tests** passed across 74 files; after a type-only annotation, the final focused run passed **148 tests**, including 72 bridge tests and 32 orchestration tests.
- **13 translation checks** and scoped ESLint passed. There are no new translation keys.
- Tests cover native/portable status parity, progress after submission, rejection cleanup, pending-request precedence, invalid callbacks, detached diagnostics, unknown error keys, component disposal and disappearance of the saved bot. All wallet and provider boundaries are mocked.
- Production and testnet publication succeeded. The ongoing day-001 research sources remain unchanged.
- Broader TypeScript checking still encounters existing dependency errors; this report does not claim a clean repository-wide type check.

## Release

Production root: `bafybeieewmpaz4lgf4ql7rf67h442yov5xlfd47qwp4hepa6zzavxidhby` (`QmXGewMZzf7CD3ASfNW562pjrX3tgN41FgWuys2NxZ5Hzd`). Testnet root: `bafybeidla522ehsjb76jqyx5o7w4c42vmtnzvjwqjwtlky6ndhqxywredy` (`QmVYSvvCCkwbvSg9KE96q7T9VYmFRvgxDyuq6fEb6q4C5K`).

Both DAGs were imported and recursively pinned on MOF before the production switch. The candidate root and entry JS/CSS plus Swap/Bots chunks returned exact built bytes, correct content types and HTTP 200 without redirects. Bunny's authorized UI confirmed **“Origin settings successfully updated”**, then **“Pull Zone was successfully purged.”** The required origin settings and header rules were verified. The public root and initial assets match the new release.

All 138 bootstrap/Swap/Bots assets were warmed sequentially with exact-byte checks. The official WebKit check had zero failed requests and console errors. The separate final check reached **Swap - Polkaswap**, plus **Bots - Polkaswap** on desktop and 320-pixel mobile, with the new root, no-cache document and zero request, HTTP, page or console errors. The mobile screenshot was inspected. The existing connected Chrome tab loaded the new entry script, and its form was restored to **10 KUSD → XOR** without initiating another research request or trading. Release evidence is retained under `output/go-history/deploy-desktop-progress/`, including `verification.json`. Deployment is complete.

No strategy qualified, no funds moved and no successful-trade recording exists. The overall trading goal remains incomplete.
