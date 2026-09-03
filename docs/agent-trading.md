# Polkaswap Agent Trading API

Polkaswap exposes a same-page browser API for automation agents that open the static IPFS-hosted app. There is no hosted middleware, cross-origin command channel, URL auto-trading mode, or delegated custody layer.

Agents call `window.PolkaswapAgent` after the `polkaswap-agent-ready` event fires. The API uses the same SORA node connection, wallet store, indexer, and SDK primitives as the user interface.

## WebMCP and local MCP

The top-level app registers site tools through `document.modelContext.registerTool()` when WebMCP is available. The static `agent-playground.html` page registers the same catalogue itself and forwards calls into its same-origin iframe, because browser agents do not discover tools registered inside iframes.

The source repository also ships a real Node 26 MCP server for clients that launch local stdio processes:

```sh
yarn agent:mcp --profile-dir /absolute/path/to/a/dedicated/polkaswap-mcp-profile
```

The bridge lazily opens a persistent Chromium profile. It can instead attach to an existing loopback-only Chrome DevTools endpoint with `--cdp-url http://127.0.0.1:9222`. It communicates directly with the static Polkaswap page and SORA; it does not add a Polkaswap backend. See `examples/agent-mcp/README.md` for client configuration and all supported options.

Both WebMCP and the local stdio server use one strict nine-tool public catalogue. It contains account-redacted capabilities/status/readiness, public asset discovery and resolution, swap quotes and routes, wallet-independent swap plans, and pool reads. Every schema rejects additional properties and requires token amounts as decimal strings.

No public MCP tool can inspect wallet balances, positions, or transaction history; create an executable intent; connect a wallet; sign; submit; transfer assets; add/remove liquidity; or import/export/clear browser state. `polkaswap_quote_swap` returns a non-executable `quoteDigest`. `polkaswap_plan_swap` resolves assets and obtains a fresh quote, fee estimate, warnings, and unsigned SDK-call metadata in one autonomous call; no wallet or prior manual quote is required. Executable preparation and execution remain available only through the explicit same-page browser API.

Public MCP execution remains closed. Any future private local signing profile must enforce single-use cryptographic preparation envelopes, durable atomic idempotency, direct extrinsic-hash tracking, pair/trade/daily limits, minimum-output and price-impact policy, and a kill switch together. A signing key must never be stored in the page or accepted in MCP arguments.

## Agent Learning Path

Use this order when building a generic runner:

1. Fetch `.well-known/polkaswap-agent.json` from the app base URL.
2. Check `version === 'v1'`, then load `.well-known/polkaswap-agent.d.ts` and `.well-known/polkaswap-agent.schema.json`.
3. Open the app in a real browser page with `?polkaswap-agent=1` before the hash route, then wait for `window.PolkaswapAgent`.
4. Call `ready({ requireNode: true })`.
5. Verify `status().agent.mode === true` so the runner knows the transient agent mode is active.
6. Discover assets with `assets`, `resolveAsset`, and `commonAssets`; discover/select a wallet only when signing is needed.
7. Call `planSwap` for wallet-independent planning in one step, or `quoteSwap` for a quote alone. Plans and `quoteDigest` are read-only evidence; neither authorizes execution.
8. For any signing operation, call the matching `prepare*` method and review `canExecute`, `warnings`, `requiredBalances`, `fees`, `preview`, `envelope`, and `revalidation`.
9. Execute with exactly `{ intentId, clientOrderId }`; economic fields are rejected.
10. Persist `exportState()` after handoff to signing, and use `recoverTransaction` if the runner is interrupted.

The API is intentionally page-context only. A browser automation runner should evaluate JavaScript inside the Polkaswap page; it should not try to call these methods from another origin.

## Discovery

The static discovery files are bundled under `.well-known/` and can be resolved relative to the app base URL:

- `.well-known/polkaswap-agent.json`
- `.well-known/polkaswap-agent.d.ts`
- `.well-known/polkaswap-agent.schema.json`
- `.well-known/polkaswap-agent.examples.json`
- `.well-known/polkaswap-agent.errors.json`
- `.well-known/polkaswap-agent-client.js`
- `.well-known/polkaswap-agent.md`

The event detail contains the installed API and version. This first public release reports `version: 'v1'`.

```ts
async function getPolkaswapAgent() {
  if (window.PolkaswapAgent) return window.PolkaswapAgent;

  return new Promise((resolve) => {
    window.addEventListener('polkaswap-agent-ready', (event) => resolve(event.detail.api), { once: true });
  });
}

const agent = await getPolkaswapAgent();
await agent.ready({ requireNode: true, timeoutMs: 30_000 });
```

## Generic Discovery Breadcrumbs

Generic agents might not know the Polkaswap-specific manifest filename before they inspect the site. The static build also publishes common first-hop breadcrumbs:

- `llms.txt`: LLM-oriented app summary and agent API entrypoint.
- `agents.txt`: concise automation-agent quickstart.
- `AGENTS.md`: markdown quickstart for agents that probe this filename.
- `robots.txt`: crawler-readable comments pointing at the agent manifest.
- HTML head tags in `index.html`: `link[rel="help"]`, `meta[name="polkaswap-agent-api"]`, and `meta[name="ai-agent-api"]`.

All internal breadcrumb URLs are relative so they resolve under root hosting and IPFS path gateways such as `/ipfs/<cid>/`.

## Method Map

The manifest also exposes compact `methodMetadata` arrays for tools that need to identify state-changing methods, wallet requirements, user-approval points, idempotency fields, and prepare/execute pairs without parsing the full JSON schema.

| Goal                                                           | Method                                                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Check API version, defaults, limits, and capabilities          | `capabilities()`                                                                                                   |
| Wait for node or wallet readiness                              | `ready({ requireNode?, requireWallet?, timeoutMs? })`                                                              |
| Inspect current agent mode, node, wallet, and slippage setting | `status()`                                                                                                         |
| Discover injected wallet providers                             | `refreshWallets()`                                                                                                 |
| List accounts for a wallet provider                            | `walletAccounts({ source })`                                                                                       |
| Select an existing wallet account                              | `connectWallet({ source, address? })`                                                                              |
| Search tradable assets                                         | `assets({ query?, includeBalances? })`                                                                             |
| Convert `{ symbol }` or `{ address }` to a canonical asset     | `resolveAsset({ asset, includeBalance? })`                                                                         |
| Get common route assets                                        | `commonAssets({ query?, includeBalances? })`                                                                       |
| Read a swap quote only                                         | `quoteSwap({ assetIn, assetOut, amount, side?, slippageTolerance?, liquiditySource?, dexId?, quoteTimeoutMs? })`   |
| Plan a swap autonomously without account access                | `planSwap({ assetIn, assetOut, amount, side?, slippageTolerance?, liquiditySource?, dexId?, quoteTimeoutMs? })`    |
| Prepare a swap for signing                                     | `prepareSwap({ assetIn, assetOut, amount, side?, slippageTolerance?, liquiditySource?, dexId?, quoteTimeoutMs? })` |
| Prepare and apply runner risk rules                            | `assessSwap({ assetIn, assetOut, amount, policy?, maxPriceImpact?, requireCanExecute?, allowWarnings? })`          |
| Submit a prepared swap through the selected signer             | `executeSwap({ intentId, clientOrderId })`                                                                         |
| Prepare a transfer                                             | `prepareTransfer({ asset, to, amount })`                                                                           |
| Submit a prepared transfer                                     | `executeTransfer({ intentId, clientOrderId })`                                                                     |
| Inspect a pool pair                                            | `poolInfo({ assetA, assetB })`                                                                                     |
| Read wallet LP positions                                       | `liquidityPositions({ assetA?, assetB?, timeoutMs? })`                                                             |
| Quote LP add                                                   | `quoteAddLiquidity({ assetA, assetB, amountA?, amountB?, slippageTolerance?, allowPoolCreation? })`                |
| Prepare LP add                                                 | `prepareAddLiquidity({ assetA, assetB, amountA?, amountB?, slippageTolerance?, allowPoolCreation? })`              |
| Submit prepared LP add                                         | `executeAddLiquidity({ intentId, clientOrderId })`                                                                 |
| Quote LP removal                                               | `quoteRemoveLiquidity({ assetA, assetB, liquidityAmount?, percent?, slippageTolerance?, timeoutMs? })`             |
| Prepare LP removal                                             | `prepareRemoveLiquidity({ assetA, assetB, liquidityAmount?, percent?, slippageTolerance?, timeoutMs? })`           |
| Submit prepared LP removal                                     | `executeRemoveLiquidity({ intentId, clientOrderId })`                                                              |
| Compute max transferable amount                                | `maxTransferAmount({ asset })`                                                                                     |
| Compute max swap input                                         | `maxSwapInput({ assetIn, assetOut? })`                                                                             |
| Compute max LP add                                             | `maxAddLiquidity({ assetA, assetB })`                                                                              |
| Compute max LP removal                                         | `maxRemoveLiquidity({ assetA, assetB, timeoutMs? })`                                                               |
| Check local transaction/idempotency state synchronously        | `transactionStatus({ id?, txId? })`                                                                                |
| Lookup local, indexer, or chain transaction state              | `lookupTransaction({ id?, txId?, lookup?, blockHash?, blockHeight? })`                                             |
| Recover an interrupted idempotent operation                    | `recoverTransaction({ clientOrderId?, intentId?, id?, txId?, lookup?, blockHash?, blockHeight?, limit? })`         |
| Poll until a transaction reaches a target status               | `waitForTransaction({ id?, txId?, lookup?, blockHash?, blockHeight?, timeoutMs?, status? })`                       |
| Read recent local page history                                 | `recentTransactions({ type?, asset?, limit? })`                                                                    |
| Subscribe to local or indexer transaction updates              | `subscribeTransactions({ source?, address?, type?, asset?, limit?, pollMs?, includeExisting? }, listener)`         |
| Subscribe to node/wallet/status changes                        | `subscribeStatus({ pollMs?, emitImmediately? }, listener)`                                                         |
| Export idempotency records                                     | `exportState({ redacted? })`                                                                                       |
| Import idempotency records                                     | `importState({ state, merge? })`                                                                                   |
| Clear one or all idempotency records                           | `clearState({ clientOrderId? })`                                                                                   |

## Defaults

- `side` is `input`.
- `slippageTolerance` uses the current app setting and is validated from `0.01` to `10` percent.
- `dexId` is `best`, using existing multi-DEX quote selection.
- `allowPoolCreation` is `false`; agents must opt in before creating a new XYK pool.
- Assets can be referenced by `{ address }` or by an unambiguous `{ symbol }`.

Use `{ address }` after the first resolution step. Symbols are convenient for humans, but addresses are safer for repeated agent execution because duplicate symbols can exist.

## State-Changing Pattern

Every operation that can sign follows the same shape:

```ts
const prepared = await agent.prepareSwap({
  assetIn: { symbol: 'XOR' },
  assetOut: { symbol: 'PSWAP' },
  amount: '1',
  side: 'input',
});

if (!prepared.canExecute) {
  throw new Error(prepared.warnings.map((warning) => warning.code).join(', '));
}

const result = await agent.executeSwap({
  intentId: prepared.intentId,
  clientOrderId: 'agent-run-001',
});
```

`prepare*` responses include:

- `canExecute`: false when signing should not proceed.
- `warnings`: machine-readable risk and readiness warnings.
- `requiredBalances`: exact balance requirements in natural and codec units.
- `fees`: positive network fee estimates when available. An unavailable or invalid estimate adds critical `FEE_UNAVAILABLE` and forces `canExecute: false`.
- `preview`: the signer-facing SDK call, normalized args, selected signer, and human summary.
- `envelope`: immutable, versioned authorization material binding the network, signer, normalized request and quote, call digest, fee ceilings, nonce, and time/block expiry.
- `revalidation`: whether the prepared context is still valid and whether reapproval is required.
- `intentId`: a full SHA-256 identifier over the prepared envelope. It is single-use.

Pass only the returned `intentId` and a stable `clientOrderId` to `executeSwap`, `executeTransfer`, `executeAddLiquidity`, or `executeRemoveLiquidity`. Quote digests, fabricated IDs, expired intents, consumed intents, and envelopes that no longer match their network/signer/call context fail before signing.

Pass a stable `clientOrderId` with every execute call. Duplicate retries for the same intent return the original result. Reusing the id for a different intent throws `IDEMPOTENCY_CONFLICT`.

## Swaps

Swap `side` controls how `amount` is interpreted:

- `side: 'input'` spends exactly `amount` and returns `minAmountOut`.
- `side: 'output'` receives exactly `amount` and returns `maxAmountIn`.

Use `quoteSwap` for read-only exploration; its `quoteDigest` is never executable. Use `planSwap` to combine canonical asset resolution, a fresh quote, public fee/price-impact warnings, and SDK-call planning metadata without wallet access or a preceding quote. Use `prepareSwap` before signing because it creates the single-use envelope and adds balances, fees, warnings, and `preview`.

`planSwap` waits for node readiness itself; `quoteTimeoutMs` bounds the readiness wait and subsequent quote wait separately. It always returns `mode: 'unsigned'`, `canExecute: false`, and `requiresWallet: false`. Its `preview` contains no signer; it is **not a SCALE-encoded transaction**. A plan has no `intentId`, envelope, or account balance requirements and writes no prepared-intent state. The shared static fee estimate is public; missing fees produce `FEE_UNAVAILABLE`. `network` identifies the genesis hash, runtime version, and observed block. A network change during quoting rejects the plan. `plannedAt` and `expiresAt` bound the five-minute planning snapshot; request another plan when it expires. Canonical symbols are resolved without wallet-only assets, so use explicit addresses for other registered assets.

```ts
const plan = await agent.planSwap({
  assetIn: { symbol: 'XOR' },
  assetOut: { symbol: 'PSWAP' },
  amount: '1',
  side: 'input',
});
// Route selection, decimal amounts, limits, fees, and warnings are machine-readable.
console.log(plan.quote.route, plan.preview.args, plan.warnings, plan.expiresAt);
// Planning never grants permission to sign or execute.
```

`assessSwap` is a convenience policy check for agents. It creates a prepared intent and returns `{ approved, reasons, prepared, policy }`; it never signs or submits anything, but it does update the local prepared-intent registry.

```ts
const assessment = await agent.assessSwap({
  assetIn: { symbol: 'XOR' },
  assetOut: { symbol: 'PSWAP' },
  amount: '1',
  maxPriceImpact: '3',
});

if (!assessment.approved) {
  throw new Error(assessment.reasons.map((reason) => reason.code).join(', '));
}
```

## Liquidity

Liquidity methods accept `assetA` and `assetB` in either order. The API maps the pair to the chain's pool base-asset order internally and returns quote amounts in the order the agent requested.

```ts
const prepared = await agent.prepareAddLiquidity({
  assetA: { symbol: 'XOR' },
  assetB: { symbol: 'PSWAP' },
  amountA: '1',
});

if (prepared.canExecute) {
  await agent.executeAddLiquidity({
    intentId: prepared.intentId,
    clientOrderId: 'lp-add-001',
  });
}
```

Pool creation is disabled unless `allowPoolCreation: true` is passed. Treat pool creation as a separate strategy decision; do not set it just to make an LP call succeed.

## Signing

Execute methods do not introduce custody. They call the existing wallet signing flow. The agent runner must provide or select the signer through the page's wallet system, for example an injected Polkadot-compatible wallet. If the selected wallet requires human confirmation, the transaction waits for that confirmation.

Execute methods validate both identifiers and the prepared envelope before reaching the signer. A valid intent still fails with `WALLET_NOT_CONNECTED` when no SDK account pair is ready.

The page never needs private keys for this API. If a runner owns keys directly, it should expose them through its chosen injected signer interface and keep signing policy outside the page.

## Recovery And Idempotency

`transactionStatus({ id })` is synchronous and checks local page state by history id, tx id, or `clientOrderId`.

`recoverTransaction({ clientOrderId, lookup: 'any' })` uses stored v1 idempotency state to match local or indexed history after an interrupted run.

Use lookup modes deliberately:

- `lookup: 'local'`: no indexer or chain lookup.
- `lookup: 'indexer'`: force indexed history lookup.
- `lookup: 'any'`: local first, then indexer.
- `lookup: 'chain'`: explicit chain block lookup; requires `blockHash` or `blockHeight`.

`exportState()` and `importState({ state })` move v1 idempotency records between browser profiles without adding a server. State with any other version is rejected.

Use `exportState({ redacted: true })` for logs or bug reports where transaction details, signer addresses, call arguments, and execution results should be omitted. Redacted state preserves only operational idempotency metadata and cannot recover transactions that need preview argument matching.

## Subscriptions

`subscribeTransactions` defaults to `source: 'local'`, which polls the current page history. Pass `source: 'indexer'` to use the app's account-history indexer subscription, or `source: 'all'` to combine local polling with indexer updates and de-duplicate by transaction id.

Indexer subscriptions require `address` or a connected wallet.

```ts
const unsubscribe = await agent.subscribeTransactions(
  {
    source: 'indexer',
    address: agent.status().wallet.address,
    includeExisting: true,
    limit: 20,
  },
  (transaction) => {
    console.log(transaction.id, transaction.status);
  }
);

unsubscribe();
```

`subscribeStatus` returns an unsubscribe function and polls the current page status.

## Errors

Thrown errors use `name: "PolkaswapAgentError"` and include a stable `code` plus optional `details`. Branch on `error.code`, not localized text.

| Code                                    | Typical action                                                                         |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `NODE_NOT_READY`                        | Retry after reconnecting or opening a working node endpoint.                           |
| `WALLET_NOT_CONNECTED`                  | Connect/select a wallet, then call `ready({ requireWallet: true })`.                   |
| `WALLET_ACCOUNT_NOT_FOUND`              | Refresh accounts and pass a valid address for the wallet source.                       |
| `ASSET_NOT_FOUND`                       | Resolve by address or choose a different symbol.                                       |
| `ASSET_AMBIGUOUS`                       | Use `{ address }` instead of `{ symbol }`.                                             |
| `INVALID_AMOUNT`                        | Fix decimal input; do not use floats for calculations.                                 |
| `INVALID_SLIPPAGE` or `INVALID_PERCENT` | Stay within published `capabilities().limits`.                                         |
| `PATH_UNAVAILABLE`                      | Try a different pair, DEX, liquidity source, or amount.                                |
| `QUOTE_TIMEOUT`                         | Retry with a longer `quoteTimeoutMs` or different route.                               |
| `POOL_UNAVAILABLE`                      | Check `poolInfo` before LP operations.                                                 |
| `NETWORK_CONTEXT_UNAVAILABLE`           | Wait for a node with genesis hash, runtime version, and block height before preparing. |
| `INTENT_REQUIRED` or `INTENT_NOT_FOUND` | Call the matching `prepare*` method and use its returned identifier.                   |
| `INTENT_EXPIRED`                        | Prepare again and review the fresh envelope.                                           |
| `INTENT_ALREADY_USED`                   | Recover the original submission or prepare a new single-use intent.                    |
| `INTENT_INTEGRITY_FAILED`               | Discard the envelope and prepare again; do not sign.                                   |
| `INTENT_MISMATCH`                       | Re-run the matching `prepare*` call and sign the new intent.                           |
| `IDEMPOTENCY_CONFLICT`                  | Use `transactionStatus` or `recoverTransaction`; do not reuse the id for a new intent. |
| `SIGNING_CANCELLED`                     | Treat as user or runner cancellation; recover before retrying.                         |
| `INVALID_SUBSCRIPTION_SOURCE`           | Use `local`, `indexer`, or `all`.                                                      |

`PATH_UNAVAILABLE` and `QUOTE_TIMEOUT` include diagnostics in `details`, including checked DEX ids, requested assets, selected liquidity source, and quote timeout where applicable.

Warnings are not thrown. They are returned by `prepare*`, `assessSwap`, and `max*`. Treat `severity: 'critical'` as a blocker unless the strategy has an explicit external policy.

Generic runners can also fetch `.well-known/polkaswap-agent.errors.json` for machine-readable retry guidance and safe retry notes for every stable error code.

## Optional Client

Generic runners can load `.well-known/polkaswap-agent-client.js` and call:

```ts
const client = await window.PolkaswapAgentClient.attach();
await client.ready({ requireNode: true });
await client.prepareAndExecuteSwap(
  { assetIn: { symbol: 'XOR' }, assetOut: { symbol: 'PSWAP' }, amount: '1' },
  { clientOrderId: 'swap-001' }
);
```

The client also provides `prepareAndExecuteTransfer`, `prepareAndExecuteAddLiquidity`, `prepareAndExecuteRemoveLiquidity`, and `waitForTransaction`.

The client is optional. It is only a small same-page helper around `window.PolkaswapAgent`; it does not add policy, custody, networking, or a transport.

## Runner Checklist

Before signing:

- `capabilities().version` is `v1`.
- `ready({ requireNode: true })` succeeded.
- The chosen wallet source is available.
- `ready({ requireWallet: true })` succeeded after `connectWallet`.
- Asset refs have been resolved to addresses.
- A `prepare*` method returned `canExecute: true`.
- No critical warning violates runner policy.
- The execute request contains exactly `intentId` and a stable `clientOrderId`.
- The runner has persisted `exportState()` or can reconstruct the same `clientOrderId`.

After signing:

- Store the returned `transaction.id` or `transaction.txId` when available.
- Use `waitForTransaction` for local/indexer polling.
- Use `recoverTransaction` after runner crashes or uncertain signer handoff.
- Export redacted state for logs, not full state.

## Cookbook

Practical runner recipes live in `docs/agent-trading-cookbook.md`.

The source repository includes a copyable Playwright runner in `examples/agent-runner/`:

```sh
yarn agent:runner
```

Deployed/static builds include `agent-playground.html`, an agent-first workspace that automatically calls wallet-independent `planSwap` after initialization, input changes (debounced 500 ms), and plan expiry. Automatic calls are serialized, hidden pages pause scheduling, superseded results cannot overwrite current inputs, and the switch stops future calls and discards an in-flight automatic result. Disabling automatic planning does not suppress expiry labels. Transient node, quote-timeout, and network-context failures get at most three retries (1, 5, then 15 seconds); other failures stop until the request changes or planning is restarted. No automated call connects a wallet, prepares an executable intent, signs, or submits.

The top-level WebMCP `polkaswap_plan_swap` tool and local MCP require no form interaction. For local page integrations, `window.PolkaswapAgentPlayground.plan()` plans current form inputs, `setAutomaticPlanning(boolean)` changes session-only scheduling, and `getSnapshot()` returns sanitized state and expiry-aware freshness. Manual quotes and optional wallet-bound preparations keep automatic refresh enabled. Bare quotes refresh after five minutes; preparations use their envelope expiry. Wallet-bound preparation requires wallet-data consent once per page session, but no separate quote click because preparation already requotes internally. It remains unsigned.

If the embedded application reloads, the inspector invalidates interrupted calls, reconnects to the new API, and resumes enabled planning. It never retains a destroyed iframe's API as the active engine.

## Browser Smoke

Run the static browser smoke against the built app:

```sh
yarn test:e2e:agent:smoke
```

The smoke verifies installation, the ready event, discovery artifacts, public-client attachment, node readiness, live quotes, unsigned plans, pool reads, preparation previews, schema-conformant responses, and rejection of invalid execution arguments. It also verifies the nine-tool WebMCP catalogue and automatic amount-change replanning without wallet opt-in. The smoke injects a registration harness; use a WebMCP-capable browser separately to verify native tool discovery and invocation.

The default unit suite includes deterministic signed-path coverage for swap, transfer, add liquidity, and remove liquidity using mocked SDK/wallet signers. The opt-in signer E2E remains available for funded extension profiles.

Useful environment overrides:

```sh
AGENT_SMOKE_ASSET_IN=XOR \
AGENT_SMOKE_ASSET_OUT=VAL \
AGENT_SMOKE_AMOUNT=1 \
yarn test:e2e:agent:smoke
```

This smoke never connects a wallet or submits a transaction. `AGENT_SMOKE_EXECUTE_SWAP`, `AGENT_SMOKE_WALLET_SOURCE`, and `AGENT_SMOKE_WALLET_ADDRESS` are not supported. Keep judge/demo runs on an unfunded, wallet-free browser profile. Extension-backed signing tests are a separate opt-in suite described below, not part of the public WebMCP demonstration.

## Signer E2E

There is an opt-in Playwright signer-profile test for extension-backed runs:

```sh
PS_AGENT_SIGNER_E2E=1 \
PS_AGENT_SIGNER_SOURCE=polkadot-js \
PS_AGENT_SIGNER_ADDRESS=cn... \
PS_AGENT_SIGNER_PROFILE=.playwright-cli/extensions/profiles/polkadot-js \
PS_AGENT_SIGNER_EXTENSION_PATH=.playwright-cli/extensions/unpacked/polkadot-js \
yarn test:e2e tests/e2e/ui/agent-trading-signer.spec.ts
```

It connects the injected signer, verifies `ready({ requireWallet: true })`, and quotes a swap. It only submits a signed swap when `PS_AGENT_SIGNER_EXECUTE_SWAP=1` is set.
