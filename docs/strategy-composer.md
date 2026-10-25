# Strategy composer

The Bots assistant turns a written idea into a deterministic, editable strategy. Users choose **Use Codex app** or **Use an API key**, review the proposed configuration, then explicitly add it to the research queue. Drafting and importing never start live trading.

## Codex in the existing tab

**Use Codex app** opens the supported HTTPS app link (`https://chatgpt.com/codex/open-app?q=…`, `target="_blank"`) immediately, without `browserUrl` or a history request. The installed app prefills the task composer without submitting. **Prepare Codex task** reads verified history in the original Polkaswap tab; **Copy instructions** supplies the complete context when site tools are unavailable. Manual preparation and review remain available after stopping site tools. The task asks Codex to use the attached existing tab/profile through the browser extension, preserving that tab’s wallet connection. It never requests a wallet/account transfer into the built-in browser.

Optional website tools can fill the review form directly. Without them, Codex returns `{ "requestId": "…", "strategy": { … } }` for the user to paste into **Review strategy** on the same page. Requests are single-use and expire after five minutes. Refreshing or changing the source controls invalidates old drafts. Focus, visibility, **Check site tools again** and lightweight capability polling discover newly available site tools without a page reload or inference request. See [Create a bot strategy with Codex](codex-strategies.md) for the data boundary and official browser references.

## API-provider alternative

OpenAI and Claude connections fetch the connected account’s current model catalogue; users can select and refresh it. No fixed model ID is required. The initial choice prefers the newest available mini/Haiku model, otherwise the newest text model. Custom providers use their configured HTTPS endpoint and manage their own model choice. Model discovery reads metadata; **Generate strategy** sends the idea and observations for inference. Reference: [OpenAI Models API](https://developers.openai.com/api/reference/resources/models/methods/list), [Claude Models API](https://platform.claude.com/docs/en/api/models/list).

API keys leave the password field immediately and remain only in the client’s revocable closure. They never enter Vue state, experiment definitions, storage or logs. Disconnect/disposal revokes the key and aborts pending work. Errors use fixed messages. Catalogue reads are bounded to ten pages, 1 MiB per page and a 15-second timeout. Generation retains a 60-second minimum request interval, 30-second timeout and bounded structured responses; see [provider connections](bot-trading.md#openai-claude-and-custom-connections). These API limits do not govern Codex-account drafting.

## Market evidence

Both paths request nine days of history and share at most **202** recent, copied observations. This covers a 200-observation rule plus lagged-return inputs. Data must be chronological, denomination-verified and have valid prices; the newest close must be at most two hours old. Missing/stale markets stop preparation rather than substitute another pair or example series.

Codex context contains public token metadata, experiment trade limits, the idea, selected rules/custom strategy, observations and bounded research preferences; it excludes holdings. Direct tools and copied tasks both preserve basic preset controls, including cadence, SMA windows/timing and the relative price-trigger percentage. API mode also sends the experiment’s virtual holdings. Neither path sends a connected wallet’s identity, actual balances or signing material. Public Codex context includes the nine canonical recipe trees and ten condition definitions, so it can compose the same strategies shown in the page’s picker.

## Supported strategies

| Kind        | Behavior                                                                                                                                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dca`       | Buys a fixed input-token amount at its interval; no sell condition.                                                                                                                                                                                   |
| `threshold` | `below` buys at or below a positive trigger; `above` sells existing output holdings at or above it. An initially unfunded output side cannot sell.                                                                                                    |
| `sma`       | Buys when the fast average crosses above the slow average and sells on a downward crossing. The first signal initializes tracking. Explicit `closed-hour` or `live-price` timing is preserved; a live-price choice adds the forming-hour observation. |
| `rules`     | One to four flat conditions per entry/exit group, combined with `all` or `any`. Exit may be `null` for accumulation. Completed hourly closes drive evaluation; minimum cadence is one hour. Exit takes precedence if both groups match.               |

The ten condition types are trend, momentum, breakout, deviation, return percentile, robust volatility, restoring strength, path efficiency, simple RSI and drop from a recent high. All nine built-in recipes can be copied and edited. Conditions retain their existing evaluator semantics and bounds: no nested groups, arbitrary scripts or implicit indicator variants.

Amounts are input-token units for buys and input-token-equivalent sizing for sells. Sells convert at the observed price and remain limited by available output holdings; an exit does not imply full liquidation. Amount precision and per-trade ceilings are enforced before review. Basic strategy intervals are bounded to 6,000–2,592,000,000 ms; rule compositions require at least 3,600,000 ms. Lookback and threshold bounds use the canonical rule parser.

`DETERMINISTIC_STRATEGY_SCHEMA` and `DETERMINISTIC_STRATEGY_INSTRUCTIONS` are shared between provider requests, portable context and website tools. Strict schema responses use `rules: null` for basic strategies and nullable `signalTiming`; parsing removes unused nulls while preserving the previous basic output shape. Timing is SMA-only and never implicitly opts into live-price signals. Unknown properties, getters, executable code and `ai` strategy responses are rejected.

Exact reviewed amounts, intervals, price triggers, directions, windows and rule trees survive review. Parameter optimization is disabled. Provider prose is removed. A rule composition keeps a valid research preset as its underlying settings scaffold; it never writes the unsupported value `preset: 'rules'`. Whole-block cadence and explicit SMA window/timing controls stay aligned with the accepted strategy.

## Component contract

`StrategyComposer.vue` accepts:

- `assets` and current `ResearchSettings` for the selected public market.
- `loadHistory(bot, settings)`, a read-only history callback.
- Optional `selectedRules` and `selectedStrategy`, carrying the actual lab selection so a recipe/custom rule does not silently become the previous basic preset in Codex context.
- Optional `busy` (default `false`) while the lab’s research batch runs.

Keep settings stable across unrelated parent renders. Semantic changes to settings, asset metadata, selected rules or selected strategy invalidate context and pending drafts. Research progress preserves them. `busy` blocks **Add experiment** without clearing reviewed rules; the same draft can be added after the batch finishes.

The sole event, `propose`, carries `{ name, strategy, settings }` after explicit review. The parent queues historical evaluation; users inspect results before the separate live-start flow. The composer has no wallet, signing, persistence or execution dependency.

Core and component tests cover all recipes, copied rule trees, nullable-schema compatibility, exact amounts, SMA timing, history bounds, stale/expired requests, provider credentials, capability recovery and review-before-enqueue. Browser fixtures verify the page interaction without creating a real Codex task, signing or executing a trade.
