# Jev trading goals

The default Bots page offers [automatic AI trading](autopilot.md). **Advanced** exposes the **Create goal** action for direct Jev paper trading. Choose a name, capital token, traded token, virtual capital, target gain, loss pause threshold, and time horizon. Saving creates an idle paper bot; it does not connect a wallet, trade, or make paid model requests.

Use **Connect Jev**, then **Start**. Goal progress shows the observed return, target, loss threshold, deadline, and pause reason. Existing per-token trade ceilings, cadence, slippage, price-impact and fee limits still apply. Goal settings are editable while stopped, including before connecting Jev. **Reset goal period** explicitly starts a new measurement on the next run, retaining current holdings. For a paused live bot, first use **Stop** to release its session after reconciliation.

## Static hosting and connection

Jev uses TypeSafe's [`POST /v1/systemone` API](https://docs.typesafe.ai/introduction/quickstart) with `jev-latest`. On September 18, 2026, a preflight from `https://polkaswap.io` returned HTTP 400, “Disallowed CORS origin,” without `Access-Control-Allow-Origin`. A static IPFS application cannot bypass this restriction or safely bundle a company API key. The UI therefore requires an explicitly configured trusted HTTPS endpoint supporting browser CORS and the Jev protocol. No endpoint is assumed or provisioned.

The optional [Node 26 relay example](examples/jev-provider-relay.mjs) keeps `TYPESAFE_API_KEY` on the operator's server and accepts a separate `JEV_RELAY_TOKEN` from the browser. Securely configure those environment variables and an exact `JEV_ALLOWED_ORIGIN`, such as `https://polkaswap.io`, then run:

```sh
node docs/examples/jev-provider-relay.mjs
```

The example binds `127.0.0.1:8788`. The operator supplies an approved HTTPS reverse proxy exposing `/jev`. Users enter that HTTPS URL and the separate relay token in Polkaswap, not the upstream TypeSafe key. The relay enforces origin, authentication, size, concurrency, and timeout limits, with a five-second request floor. This is a single-operator example; a shared public service requires per-user authentication, quotas, and billing controls. It is not part of the static site's build or runtime.

Keys stay in revocable memory and never enter storage or exports. Jev receives the selected pair, the bot's pair holdings, price observations, public strategy/goal settings, and bounded progress. It receives no account identity, unrelated holdings, or signing keys. Connection setup installs a client; the first decision request verifies remote availability and credentials.

## Decisions

`jev.ts` asks one typed buy/sell/hold question. It validates the action, exact options, probability distribution, and confidence. Confidence and selected-choice probability must both reach 0.8 to admit a trade. These conservative abstention thresholds are not probabilities of profit. Amounts are calculated by deterministic code, converted and rounded down for sells, and capped by available holdings and per-token limits. Jev cannot override amounts or signing authority.

The engine obtains fresh executable quotes and enforces trading policy. Model inputs contain observed prices rather than a full execution-cost forecast, and instruct Jev to hold when after-cost evidence is insufficient. Invalid responses, stale data, timeouts, and unavailable endpoints suspend execution. The integration does not establish profitability.

## Deterministic research suggestions

`BotAiClient.suggest` can ask Jev to select one fixed recipe for local historical testing: `dca_daily` (one buy per day), `sma_5_20` (completed-hour 5/20 moving-average crossovers), or `sma_12_48` (completed-hour 12/48 crossovers). The native request has exactly one `questions.strategy` choice with those three criteria. The native response must contain exactly one `answers.strategy` choice with a valid probability distribution. Confidence and selected-choice probability must both reach 0.8, otherwise no draft is returned. SMA selections require at least 21 or 49 supplied observations respectively.

The application constructs every strategy parameter locally and preserves the user's precise trade amount and per-trade ceiling. Jev returns only the recipe ID; it cannot generate arbitrary strategy JSON or change the amount, cadence, or signing limits. Suggestions contain at most 202 validated training closes and the user instruction, with no account, current holdings, goal progress, or appended current/test-period observations. Older training partitions are allowed for suggestions; live trading still rejects stale observations. The caller must supply only its training partition: this adapter does not invent or split historical data.

Local backtests and bounded parameter searches evaluate the deterministic recipe, not Jev's live buy/sell/hold policy. Neither research output nor a recipe selection authorizes trading or establishes future profitability. The relay supports both exact question shapes and rejects unknown choices, combined questions, and arbitrary output parameters. Jev continues to use the documented `jev-latest` alias; no model-catalog endpoint or freeform generation API is assumed.

## Goal accounting

Goals are measured in the capital token: more XOR does not necessarily mean more dollars. The first fresh observation at **Start** fixes the baseline and deadline, including allocated network-fee holdings. Reported portfolio returns include trading costs reflected in holdings; separately billed AI fees and hypothetical liquidation costs are excluded. Returns are unrealized valuations, not locked-in income.

Goal state persists separately from bounded chart history. Pause, resume, and reload cannot restart its clock or baseline. An observed target, loss threshold, or deadline pauses execution and revokes signing. A completed period cannot resume until explicitly edited or reset. Switching paper/live clears the baseline through the existing portfolio-reset and consent flow.

Pausing does not sell holdings or cancel submitted transactions. Loss thresholds are sampled triggers, not guaranteed maximum losses. Sessions default to one hour, independently of the goal's longer horizon; the page shows the session duration and expiry, and resuming requires user action. An already authorized session can continue while its browser tab is in the background. Initial authorization must occur in a visible tab; hiding during authorization cancels that start. Keep the browser open and awake: page exit, offline state, identity changes, expiry, or a scheduler interruption longer than one minute revoke execution. Browser throttling or sleep can therefore pause the session. Internal wallets unlock once per session; external wallets retain their own transaction approval requirements. This feature does not add a hosted background service or remove live consent.

## Validation

Unit tests cover exact goal accounting, persistence, expiry, interrupted sessions, Jev validation, amount caps, credential handling, and page creation/connection. Relay tests mock the upstream. No tests sign real transactions or call a paid model.

```sh
yarn test:unit tests/unit/features/bot-trading tests/unit/scripts/bots/jev-relay.spec.ts
yarn test:translation
yarn build
```
