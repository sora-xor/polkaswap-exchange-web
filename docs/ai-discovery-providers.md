# AI discovery providers

Discovery evaluates deterministic strategies in the browser. A run freezes 90 completed days: 76 training days and a sealed 14-day holdout. Providers return **one draft** for a public training window. They cannot submit orders, access the wallet, change an approved bot, or receive holdout prices. The research engine, not the provider, applies the strategy parser, exact token limits, full-window training backtest, ranking, and single-use holdout evaluation. Before a new or restarted search overlaps an earlier exposed holdout, Discover presents its dates and warns that the results will be exploratory. This happens before another provider request or deletion of the current checkpoint. A later run with that overlap is exploratory even after the checkpoint is cleared and cannot qualify a live finalist.

## Built-in connections

The Discover page supports OpenAI and Claude APIs, TypeSafe Jev, a custom HTTPS endpoint, and the optional local Codex and Claude Code companion. OpenAI and Claude model IDs come from their current model catalogs. Jev selects one of the app's fixed DCA or SMA recipes. OpenAI, Claude and Jev keys are sent directly to their selected APIs; a custom key, if supplied, is sent only to that HTTPS endpoint as a bearer header. Credentials stay in a revocable browser closure and are cleared on disconnect or page disposal; the site does not write them into experiments or IndexedDB. The local companion uses CLI sign-in and receives no website API key. Each dispatched provider call counts against the user's research cap (12 by default, at most 36), including failures; API providers may also charge for calls. The client imposes at least 60 seconds between rounds. Research progress shows the current directed pair and stage, used and failed calls, remaining call allowance, and when another request is eligible. The checkpoint retains non-secret provider type and model ID when available. For a custom HTTPS provider it retains only the canonical hostname and optional port, never the endpoint path. Editing a connected endpoint disconnects it; reconnecting to another host requires confirmation before resuming. After a reload, reconnect the provider or explicitly switch it before resuming. No API key or local pairing token is recovered from the checkpoint.

### Connecting Claude or OpenAI

The **AI connection** card offers **Claude**, **OpenAI** and **Other** (local companions, Jev and custom HTTPS). Pasting a key selects its provider from the public prefix (`sk-ant-` for Claude, other `sk-` keys for OpenAI), so a key cannot be sent to the wrong API. Only the detected provider kind is kept, never the key. **Get a Claude API key** and **Get an OpenAI API key** open the providers' own key pages in a new tab. Press Enter or **Connect AI** to load the account's model catalog. Discover defaults to Claude Opus 5.5 (`claude-opus-5-5`) when the account lists it, otherwise to the newest general OpenAI model (it skips `pro`, `codex`, `mini`, dated snapshots and similar specialized IDs); the user can pick any listed model. Start stays disabled with a short hint until a provider is connected, and the step rail above the cards shows connect → idea → screened markets → review. Example ideas fill the optional idea field in one tap.

Claude drafts use one `discovery_draft` tool with `tool_choice: { "type": "auto", "disable_parallel_tool_use": true }` and an instruction to call it exactly once; current models such as Claude Opus 5.5, Sonnet 5.5 and Fable 5.1 reject a forced `tool_choice`, and the strict local parser still validates every draft. The output budget is 16,000 tokens, lowered to the model's catalog `max_tokens` when that is smaller, because current models reason before answering. OpenAI drafts use a strict JSON schema without `minLength`/`maxLength` keywords (the local parser enforces lengths) and the same output budget. Claude and OpenAI requests time out after 120 seconds; local and custom drafts keep 245 seconds.

Failures map to app-owned messages. Response bodies are never shown or stored; only a 400 body is matched once for a low-credit phrase and then discarded.

| Cause                                                | Message key                |
| ---------------------------------------------------- | -------------------------- |
| Connect pressed with no key                          | `bots.errors.aiKeyMissing` |
| HTTP 401                                             | `bots.errors.aiKey`        |
| HTTP 403 or 404                                      | `bots.errors.aiAccess`     |
| HTTP 402 or 429, or a 400 credit-balance/quota error | `bots.errors.aiQuota`      |
| HTTP 408 or 5xx (including 529 overloaded)           | `bots.errors.aiBusy`       |
| Network, CORS or blocker failure                     | `bots.errors.aiNetwork`    |
| No answer within the timeout                         | `bots.errors.aiTimeout`    |
| Unusable or invalid response                         | `bots.errors.provider`     |

Connection failures appear inside the AI connection card. A failure during research stops the run with the same specific message, saved with the checkpoint so the user knows what to fix before resuming.

The **Research capital** entry is hypothetical input-token capital applied to each directed pair independently. The **XOR fee reserve** is also a study setting, not a wallet transfer. A new live campaign has its own separate funding check against the selected finalists' actual wallet balances and shared XOR-equivalent cap. Keep the browser tab and computer active while research or live trading runs; interruption pauses execution and live trading requires a new review and unlock.

API requests contain at most the latest 202 completed training candles for one directed pair. The pair is identified by exact `assetIn.address` and `assetOut.address`; symbols are display metadata, and the reverse direction is a separate pair. Requests include public token metadata, the exact input-token trade ceiling and interval bounds, the user's optional idea, and at most eight aggregate prior **training** results. The `feeSampleAmount` is an exact natural amount of the input token. Network fees, swap fees, and price impact are a dated current-state scenario observed for that sample size; they are neither historical fee observations nor a quote for a different trade size. The app verifies the observation's finalized state and expiry, then re-quotes each draft at its actual notional before evaluation. No wallet address, actual balances, provider credentials, holdout candles, or signing material is part of this contract. The idea and market text are treated as data. `liveFeedback` is absent by default. After separate consent, the app may send an aggregate with active hours, successful swaps, net and excess returns, drawdown, and paid XOR fees. It contains no wallet address, transaction hash, or balance. This starts a new **exploratory** research session; that session cannot claim an untouched holdout or qualify a finalist for live approval.

## Custom HTTPS version 2

Version 2 is separate from the existing version 1 trade and strategy-composer contract. Configure an HTTPS endpoint without embedded credentials, a query, or a fragment. The browser sends a POST with JSON, `credentials: omit`, no redirects, and an optional bearer header when the user supplies a key. The endpoint must allow the Polkaswap origin through CORS. The response must be JSON no larger than 32 KiB. Provider errors are reduced to the fixed app messages above rather than displayed verbatim.

```json
{
  "version": 2,
  "task": "discovery",
  "context": {
    "requestId": "48350c06-70c6-49fc-b9ce-b54e1d4f41db",
    "idea": "Accumulate after a completed-hour trend improves",
    "pair": {
      "assetIn": { "address": "0x02000c0000000000000000000000000000000000000000000000000000000000", "symbol": "KUSD", "decimals": 18 },
      "assetOut": { "address": "0x0200000000000000000000000000000000000000000000000000000000000000", "symbol": "XOR", "decimals": 18 }
    },
    "training": {
      "from": 1780000000000,
      "to": 1780100000000,
      "candles": [{ "timestamp": 1780096400000, "close": "1.25", "feeClose": "1" }]
    },
    "constraints": {
      "capital": "20",
      "maxTradeCodec": "10000000000000000000",
      "feeSampleAmount": "0.2",
      "minimumIntervalMs": 3600000,
      "maximumIntervalMs": 2592000000,
      "slippagePercent": "1",
      "feeBudgetXor": "1",
      "networkFeeXor": "0.01",
      "swapFeePercent": "0.3",
      "sellNetworkFeeXor": "0.01",
      "sellSwapFeePercent": "0.3",
      "priceImpactPercent": "0.1",
      "sellPriceImpactPercent": "0.1"
    },
    "priorResults": [{ "returnPercent": "1.2", "excessReturnPercent": "-0.1", "drawdownPercent": "2", "trades": 11 }]
  },
  "responseSchema": { "type": "object", "properties": {}, "required": [] }
}
```

The pair addresses above are the KUSD and XOR asset IDs in the current asset catalog; the candle and fee values are illustrative. The `responseSchema` in an actual request is the full `DISCOVERY_DRAFT_SCHEMA` exported by `src/features/bot-trading/discovery-provider.ts`; the shortened value above only illustrates the envelope. A production request has 20–202 chronological training candles, and the browser rejects extra fields in its context before dispatch.

With separate consent, the optional aggregate has this exact shape; the provider must treat it as past observation rather than a forecast:

```json
{
  "liveFeedback": {
    "windowState": "exploratory",
    "activeHours": 336,
    "successfulSwaps": 11,
    "netReturnPercent": "1.2",
    "excessReturnPercent": "0.2",
    "drawdownPercent": "2",
    "feesPaidXor": "0.5"
  }
}
```

Return exactly one fixed-schema strategy, with the request ID unchanged:

```json
{
  "version": 2,
  "requestId": "48350c06-70c6-49fc-b9ce-b54e1d4f41db",
  "strategy": {
    "kind": "dca",
    "amount": "1",
    "intervalMs": 86400000,
    "threshold": "0",
    "direction": "below",
    "fastWindow": 5,
    "slowWindow": 20,
    "prompt": "",
    "rules": null,
    "signalTiming": null
  }
}
```

Only `dca`, `threshold`, `sma`, and flat `rules` configurations are accepted. The app rejects code, unknown fields, mismatched IDs, invalid amounts, and strategies outside the per-trade limit. See [Strategy composer](strategy-composer.md#supported-strategies) for rule semantics.

## Local Codex and Claude Code

To use a local companion:

1. Install and sign in to the [Codex CLI](https://learn.chatgpt.com/docs/developer-commands?surface=cli) or [Claude Code CLI](https://code.claude.com/docs/en/cli-reference) on the same computer as the browser.
2. In Discover, choose **Other**, then **Codex** or **Claude Code**, download `./.well-known/polkaswap-codex-companion.mjs`, and run `node polkaswap-codex-companion.mjs` in a local terminal.
3. Enter the code printed by the companion in Discover, connect, and start or resume research. Keep the terminal, browser tab, and computer running for the session.

Chrome may ask Polkaswap for local network access before it can contact the loopback companion. Allow that browser prompt for the optional local connection; if it was denied, restore the permission in the site's browser settings before reconnecting. The companion still checks the exact Polkaswap origin and its one-use pairing code.

The companion binds only `127.0.0.1:39847`, checks the exact Polkaswap origin, rotates the one-use code, keeps the bearer token in memory, and rate-limits drafts to 12 per hour across both CLI choices. It exposes only health, pairing, the existing draft route, and `/discovery/draft`; there is no wallet, signing, or trading endpoint.

The local draft request is `{ "version": 2, "provider": "codex" | "claude-code", "expiresAt": <five-minute deadline>, "context": <the training context above> }`. The response is `{ "requestId": "…", "strategy": { … } }`. A CLI run receives an empty temporary working directory and a narrow environment whitelist without provider API keys. Codex runs with ephemeral output and a read-only sandbox. Claude Code runs with restricted mode, no built-in or MCP tools, structured JSON, and no session persistence. The app checkpoint provides pause/resume, but it never stores the local bearer token. After a browser reload, disconnect, or bearer-token expiry, enter the companion's newly printed pairing code, connect again, then resume the saved research run. Spent calls and holdout exposures remain spent. Neither CLI session is a trading session.

The CLI flags follow the [official Codex command reference](https://learn.chatgpt.com/docs/developer-commands?surface=cli) and [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference). On unsupported or older CLI versions, a draft fails closed and the user may choose another provider.
