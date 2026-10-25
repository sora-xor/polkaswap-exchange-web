# Create a bot strategy with Codex

The Bots page’s **AI strategy assistant** defaults to **Use Codex app**. It drafts deterministic strategies using the user’s existing Codex account, without an API key in Polkaswap. The Polkaswap engine evaluates accepted strategies; Codex does not become the live bot’s continuously polled provider.

## Keep the existing Polkaswap tab

1. Select tokens, starting amount and a strategy on the Bots page. Open the assistant and describe the intended change.
2. Select **Use Codex app** to open the desktop app with the idea. This is an HTTPS app-opening link, available immediately; it does not wait for market history or optional site tools.
3. Keep this original Polkaswap tab open and attach it when Codex needs browser access. If site tools are unavailable, select **Prepare Codex task**, then **Copy instructions** and paste into Codex. Preparation reads verified public history and creates a five-minute request for the current market, limits and selected rules.
4. Codex can submit a draft through site tools, or return JSON with exactly `{ "requestId": "…", "strategy": { … } }` from the copied context. Paste the result into the original tab and select **Review strategy**.
5. Review the conditions, amount, timing and limits. **Add experiment** submits the reviewed definition to the lab’s research queue. Starting a live bot remains a separate wallet/session action after inspecting its results.

The desktop link uses `https://chatgpt.com/codex/open-app?q=…` with `target="_blank"` and `rel="noopener noreferrer"`. The installed Codex app recognizes this link and converts it to a prompt-only `codex://threads/new?prompt=…` handoff, prefilling the task composer without submitting. Its built-in browser blocks direct `codex:` navigation while Browser Use restrictions are active, so a bare protocol link does not work there. No `browserUrl` parameter is sent. Its compact prompt contains only the sanitized page URL and idea, and stays within a 12,000-character encoded transport budget. Oversized ideas shorten at Unicode code-point boundaries and instruct Codex to request the full copied instructions. Market history, recipes and response schemas remain in the website tools or **Copy instructions**, rather than the protocol URL. The link requests no new built-in browser tab and transfers no wallet/session storage. Launch remains available if history fails; copied context can still be prepared and reviewed after **Stop site tools**, while retained site-tool callbacks remain revoked. A link opening successfully does not prove Codex authentication, task creation or a provider connection.

The built-in browser has a separate session from a user’s ordinary browser, so opening a fresh copy of Polkaswap there can appear disconnected. The integration preserves the original tab instead of attempting to copy accounts, cookies or wallet permissions. See the official [browser documentation](https://learn.chatgpt.com/docs/browser) and [browser-extension setup](https://learn.chatgpt.com/docs/chrome-extension).

## Current strategies and context

The shared schema supports the three basic strategy families (`dca`, `threshold`, `sma`) and `rules` compositions. Public context includes all nine recipe trees and descriptions of ten supported conditions. Entry and optional exit groups contain one to four conditions each, joined by `all` or `any`; nested expressions and executable code are rejected. Rule compositions require at least hourly cadence. Explicit SMA `closed-hour` or `live-price` timing survives review; live-price timing is not added implicitly. See [Strategy composer](strategy-composer.md) for execution semantics.

The history request covers nine days and shares at most **202 verified recent observations**, enough for the largest supported 200-observation condition plus its lagged inputs. The latest observation must be no more than two hours old. Unavailable or stale history fails visibly rather than becoming fabricated example data.

Public context contains selected token metadata, hypothetical per-trade limits, the idea, selected public rules/custom strategy, copied market observations and bounded `researchPreferences`. Both direct tools and the copied task preserve the current basic preset, amount controls, cadence, SMA windows/timing and relative `thresholdPercent`; the relative trigger is not an invented absolute price. It excludes wallet identity, actual balances, holdings, signing material, provider keys, ChatGPT credentials and saved live bots. No hosted callback or companion server is required by the static IPFS build.

## Optional website tools

The composer registers two tools in a supported top-level document while Codex mode is enabled. It checks the existing `document.modelContext` surface first and falls back to `navigator.modelContext`. These tools are separate from the public trading catalogue.

| Tool                         | Behavior                                                                                                                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `polkaswap_strategy_context` | Reads fresh public context and returns a unique request ID, five-minute expiry, current selection, recipe catalogue and response schema. An optional idea must not conflict with the page’s entered idea. |
| `polkaswap_strategy_draft`   | Validates the matching request and deterministic strategy, then fills the editable review form. It cannot enqueue research, create/start a bot, connect a wallet or sign.                                 |

Availability is checked again on focus/visibility changes and by a lightweight capability poll, so extension setup can be detected without reloading the wallet-connected tab. **Check site tools again** offers an explicit recheck. Capability detection does not send a model request or fetch history. Registration failures roll back partial tools; cleanup revokes retained handlers. Tool availability is not evidence of account authentication. See [OpenAI’s website-tool documentation](https://learn.chatgpt.com/docs/webmcp).

## Freshness and validation

Requests expire after five minutes and are single-use. Preparing newer context, editing market controls/idea/selected rules, stopping website tools, changing provider mode or disposing the component invalidates the corresponding pending review. Late history responses cannot restore an obsolete context. Refresh an expired task in the same original tab before asking Codex for another result.

Manual JSON review and direct tool submission both use the shared deterministic parser and normal review flow. Token decimals, input-token trade ceilings, exact rule trees and supported timing are checked. Unknown fields, code and `ai` strategies are refused. Accepted rules are detached from source objects, provider prose is dropped, and parameter optimization remains disabled.

## Verification scope

Unit tests cover public context projection, all recipes, schema/parser compatibility, registrar fallback/cleanup, expiry, stale responses, exact amounts and explicit review. Browser tests use isolated fixtures for the same-page preparation and review flow. The HTTPS app-opening route, its required new-window handling and prompt-only conversion were checked against the installed desktop app parser (v26.915.31945); this does not claim an actual Codex task was created or that an external model completed a strategy request.
