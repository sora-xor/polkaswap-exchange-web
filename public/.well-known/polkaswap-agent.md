# Polkaswap Agent Trading API

Polkaswap exposes a same-page browser API for automation agents that open the static IPFS-hosted app.

- Global: `window.PolkaswapAgent`
- Version: `v1`
- Ready event: `polkaswap-agent-ready`
- Manifest: `.well-known/polkaswap-agent.json`
- Types: `.well-known/polkaswap-agent.d.ts`
- Request schema: `.well-known/polkaswap-agent.schema.json`
- Examples: `.well-known/polkaswap-agent.examples.json`
- Error catalog: `.well-known/polkaswap-agent.errors.json`
- Optional client: `.well-known/polkaswap-agent-client.js`
- Static playground: `agent-playground.html`
- WebMCP catalogue: `.well-known/polkaswap-mcp-tools.json`

There is no hosted middleware, cross-origin command channel, URL command mode, or delegated custody layer. The top-level app and playground register a strict public, read-only, account-redacted WebMCP catalogue when supported. The source repository also provides a user-run Node 26 stdio MCP bridge with the same profile.

The nine-tool MCP catalogue exposes public status, asset metadata, swap quotes/routes, unsigned swap planning, and pool information. It never exposes balances, positions, account history, executable preparation, wallet connection, signing, execution, transfers, liquidity mutation, or state import/export. Private keys are never accepted by the page or MCP arguments.

Call `planSwap` (MCP `polkaswap_plan_swap`) for autonomous, wallet-independent planning: wait for the node, resolve canonical assets, obtain a fresh quote and public fees/warnings, and return unsigned SDK-call metadata in one request. No prior quote or account permission is required. `quoteTimeoutMs` bounds both the node-readiness wait and the subsequent quote wait separately. Plans always have `mode: 'unsigned'`, `canExecute: false`, and `requiresWallet: false`; no signer, balances, `intentId`, or envelope is returned or persisted. The preview is **not a SCALE transaction or signing authorization**. Plans include `network`, `plannedAt`, and a five-minute `expiresAt`; request a fresh plan when expired. For assets outside the canonical catalogue, use explicit addresses instead of wallet-only symbols.

## Start Here

1. Fetch `.well-known/polkaswap-agent.json`.
2. Require `version === 'v1'`.
3. Open the app in a browser page with `?polkaswap-agent=1` before the hash route, for example `?polkaswap-agent=1#/swap`. This transient agent flag suppresses the first-launch disclaimer modal without persisting disclaimer approval.
4. Wait for `window.PolkaswapAgent` or the `polkaswap-agent-ready` event.
5. Call `ready({ requireNode: true })`.
6. Verify `status().agent.mode === true`.
7. Plan autonomously with `planSwap`; connect/select a wallet only when signing is needed, through `refreshWallets`, `walletAccounts`, and `connectWallet`.
8. Resolve symbols to asset addresses before repeated execution.
9. Treat every quote `quoteDigest` as non-executable; use `prepare*` to create a single-use intent envelope.
10. Execute with exactly `{ intentId, clientOrderId }`.
11. Recover uncertain submissions before retrying.

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

## Other Breadcrumbs

Agents that do not already know this manifest name can also discover it from:

- `llms.txt`
- `agents.txt`
- `AGENTS.md`
- `robots.txt`
- HTML head tags: `link[rel="help"]`, `meta[name="polkaswap-agent-api"]`, and `meta[name="ai-agent-api"]`

These breadcrumbs use relative URLs so the same static bundle works from root domains and IPFS path gateways.

## Decision Rules

- Use decimal strings for token amounts.
- Use `{ symbol }` only for discovery; use `{ address }` for execution.
- Treat `canExecute: false` as a hard stop.
- Treat `severity: 'critical'` warnings as hard stops.
- Treat `HIGH_PRICE_IMPACT`, `LOW_LIQUIDITY`, and `POOL_CREATION` as strategy decisions outside the page.
- Never retry a failed or cancelled execute blindly; check `transactionStatus` or `recoverTransaction` first.
- Never pass private keys to the page. Provide signing through an injected wallet/signer.

## Methods

| Goal                                                   | Method                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Check v1 metadata and limits                           | `capabilities()`                                                                                                   |
| Wait for readiness                                     | `ready({ requireNode?, requireWallet?, timeoutMs? })`                                                              |
| Inspect current agent mode, node, wallet, and settings | `status()`                                                                                                         |
| Discover wallet providers                              | `refreshWallets()`                                                                                                 |
| List accounts for a provider                           | `walletAccounts({ source })`                                                                                       |
| Select a wallet account                                | `connectWallet({ source, address? })`                                                                              |
| Search tradable assets                                 | `assets({ query?, includeBalances? })`                                                                             |
| Resolve a symbol or address                            | `resolveAsset({ asset, includeBalance? })`                                                                         |
| List common route assets                               | `commonAssets({ query?, includeBalances? })`                                                                       |
| Read a swap quote                                      | `quoteSwap({ assetIn, assetOut, amount, side?, slippageTolerance?, liquiditySource?, dexId?, quoteTimeoutMs? })`   |
| Plan autonomously without wallet access                | `planSwap({ assetIn, assetOut, amount, side?, slippageTolerance?, liquiditySource?, dexId?, quoteTimeoutMs? })`    |
| Prepare a swap                                         | `prepareSwap({ assetIn, assetOut, amount, side?, slippageTolerance?, liquiditySource?, dexId?, quoteTimeoutMs? })` |
| Prepare and apply swap policy                          | `assessSwap({ assetIn, assetOut, amount, policy?, maxPriceImpact?, requireCanExecute?, allowWarnings? })`          |
| Execute a prepared swap                                | `executeSwap({ intentId, clientOrderId })`                                                                         |
| Prepare a transfer                                     | `prepareTransfer({ asset, to, amount })`                                                                           |
| Execute a prepared transfer                            | `executeTransfer({ intentId, clientOrderId })`                                                                     |
| Inspect a pool                                         | `poolInfo({ assetA, assetB })`                                                                                     |
| List LP positions                                      | `liquidityPositions({ assetA?, assetB?, timeoutMs? })`                                                             |
| Quote LP add                                           | `quoteAddLiquidity({ assetA, assetB, amountA?, amountB?, slippageTolerance?, allowPoolCreation? })`                |
| Prepare LP add                                         | `prepareAddLiquidity({ assetA, assetB, amountA?, amountB?, slippageTolerance?, allowPoolCreation? })`              |
| Execute prepared LP add                                | `executeAddLiquidity({ intentId, clientOrderId })`                                                                 |
| Quote LP removal                                       | `quoteRemoveLiquidity({ assetA, assetB, liquidityAmount?, percent?, slippageTolerance?, timeoutMs? })`             |
| Prepare LP removal                                     | `prepareRemoveLiquidity({ assetA, assetB, liquidityAmount?, percent?, slippageTolerance?, timeoutMs? })`           |
| Execute prepared LP removal                            | `executeRemoveLiquidity({ intentId, clientOrderId })`                                                              |
| Compute max transferable amount                        | `maxTransferAmount({ asset })`                                                                                     |
| Compute max swap input                                 | `maxSwapInput({ assetIn, assetOut? })`                                                                             |
| Compute max LP add                                     | `maxAddLiquidity({ assetA, assetB })`                                                                              |
| Compute max LP removal                                 | `maxRemoveLiquidity({ assetA, assetB, timeoutMs? })`                                                               |
| Check local transaction state                          | `transactionStatus({ id?, txId? })`                                                                                |
| Lookup local, indexer, or chain state                  | `lookupTransaction({ id?, txId?, lookup?, blockHash?, blockHeight? })`                                             |
| Recover interrupted idempotent state                   | `recoverTransaction({ clientOrderId?, intentId?, id?, txId?, lookup?, blockHash?, blockHeight?, limit? })`         |
| Wait for transaction status                            | `waitForTransaction({ id?, txId?, lookup?, blockHash?, blockHeight?, timeoutMs?, status? })`                       |
| Read recent local page history                         | `recentTransactions({ type?, asset?, limit? })`                                                                    |
| Subscribe to transaction updates                       | `subscribeTransactions({ source?, address?, type?, asset?, limit?, pollMs?, includeExisting? }, listener)`         |
| Subscribe to status updates                            | `subscribeStatus({ pollMs?, emitImmediately? }, listener)`                                                         |
| Export idempotency records                             | `exportState({ redacted? })`                                                                                       |
| Import idempotency records                             | `importState({ state, merge? })`                                                                                   |
| Clear idempotency records                              | `clearState({ clientOrderId? })`                                                                                   |

## Defaults

- `side`: `input`
- `slippageTolerance`: current app setting, validated from `0.01` to `10` percent
- `dexId`: `best`
- `allowPoolCreation`: `false`
- Asset refs: `{ address }` or unambiguous `{ symbol }`

## Safe Swap Pattern

```ts
const prepared = await agent.prepareSwap({
  assetIn: { symbol: 'XOR' },
  assetOut: { symbol: 'PSWAP' },
  amount: '1',
  side: 'input',
});

if (!prepared.canExecute || prepared.warnings.some((warning) => warning.severity === 'critical')) {
  throw new Error(prepared.warnings.map((warning) => warning.code).join(', ') || 'NOT_EXECUTABLE');
}

await agent.executeSwap({
  intentId: prepared.intentId,
  clientOrderId: 'agent-run-001',
});
```

`side: 'input'` spends exactly `amount` and returns `minAmountOut`. `side: 'output'` receives exactly `amount` and returns `maxAmountIn`.

## Transfer Pattern

```ts
const prepared = await agent.prepareTransfer({
  asset: { symbol: 'XOR' },
  to: 'cn...',
  amount: '0.1',
});

if (prepared.canExecute) {
  await agent.executeTransfer({
    intentId: prepared.intentId,
    clientOrderId: 'agent-transfer-001',
  });
}
```

## Liquidity Pattern

```ts
const prepared = await agent.prepareAddLiquidity({
  assetA: { symbol: 'XOR' },
  assetB: { symbol: 'PSWAP' },
  amountA: '1',
});

if (prepared.canExecute) {
  await agent.executeAddLiquidity({
    intentId: prepared.intentId,
    clientOrderId: 'agent-lp-add-001',
  });
}
```

Liquidity methods accept the pair in either order. Pool creation is disabled unless `allowPoolCreation: true` is passed.

## State And Recovery

`quote*` responses include a non-executable `quoteDigest`. `prepare*` responses include `canExecute`, `fees`, `requiredBalances`, `warnings`, `preview`, an immutable `envelope`, its current `revalidation`, and a single-use `intentId`. The envelope binds its nonce, network/runtime, signer, normalized request, quote and call digests, fee ceilings, and time/block expiry. An unavailable or invalid fee estimate returns critical `FEE_UNAVAILABLE` and forces `canExecute: false`.

Execute methods accept exactly `intentId` and `clientOrderId`. Unknown, expired, used, tampered, or context-mismatched intents fail before signing.

Pass a stable `clientOrderId` to execute calls to make retries idempotent. Duplicate retries return the original result; reusing the id for another intent throws `IDEMPOTENCY_CONFLICT`.

`transactionStatus({ id })` checks local page state by history id, tx id, or `clientOrderId`. `recoverTransaction({ clientOrderId, lookup: 'any' })` uses stored v1 idempotency state to match local or indexed history after an interrupted run.

Use `lookup: 'chain'` only with an explicit `blockHash` or `blockHeight`. `subscribeTransactions` defaults to local page history polling; pass `source: 'indexer'` or `source: 'all'` with an `address` or connected wallet to receive indexer-backed account updates.

`exportState()` and `importState({ state })` move v1 idempotency records between browser profiles; other state versions are rejected. Use `exportState({ redacted: true })` for audit logs where transaction details, signer addresses, arguments, and results should be omitted. Redacted exports are not suitable for recovery that needs preview argument matching.

## Error Actions

Errors are thrown as `PolkaswapAgentError` with a stable `code` and optional `details`. Branch on `error.code`, not localized text.

Generic runners can load `.well-known/polkaswap-agent.errors.json` for machine-readable retry guidance.

| Code                                    | Action                                                                 |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `NODE_NOT_READY`                        | Wait, reload, or switch endpoint before retrying.                      |
| `WALLET_NOT_CONNECTED`                  | Connect/select wallet and call `ready({ requireWallet: true })`.       |
| `WALLET_ACCOUNT_NOT_FOUND`              | Refresh accounts and choose a valid address.                           |
| `ASSET_NOT_FOUND`                       | Search assets or use a known address.                                  |
| `ASSET_AMBIGUOUS`                       | Retry with `{ address }`.                                              |
| `INVALID_AMOUNT`                        | Rebuild with a decimal string amount.                                  |
| `INVALID_SLIPPAGE`                      | Stay within `capabilities().limits.slippageTolerance`.                 |
| `INVALID_PERCENT`                       | Stay within `capabilities().limits.percent`.                           |
| `PATH_UNAVAILABLE`                      | Try another pair, source, DEX, or amount.                              |
| `QUOTE_TIMEOUT`                         | Retry with a longer `quoteTimeoutMs` or different route.               |
| `POOL_UNAVAILABLE`                      | Call `poolInfo` before LP operations.                                  |
| `NETWORK_CONTEXT_UNAVAILABLE`           | Wait for complete node identity and block context, then prepare again. |
| `INTENT_REQUIRED` or `INTENT_NOT_FOUND` | Call the matching `prepare*` method and use its identifier.            |
| `INTENT_EXPIRED`                        | Prepare and review a fresh envelope.                                   |
| `INTENT_ALREADY_USED`                   | Recover the existing submission or prepare a new intent.               |
| `INTENT_INTEGRITY_FAILED`               | Discard the invalid envelope and do not sign it.                       |
| `INTENT_MISMATCH`                       | Re-run the matching `prepare*` call.                                   |
| `IDEMPOTENCY_CONFLICT`                  | Recover existing state; do not reuse the id.                           |
| `SIGNING_CANCELLED`                     | Treat as cancellation and recover before retrying.                     |

## Optional Client

```ts
const client = await window.PolkaswapAgentClient.attach({ timeoutMs: 30_000 });
await client.ready({ requireNode: true });
await client.prepareAndExecuteSwap(
  { assetIn: { symbol: 'XOR' }, assetOut: { symbol: 'PSWAP' }, amount: '1' },
  { clientOrderId: 'agent-client-swap-001' }
);
```

The client is only a small same-page helper around `window.PolkaswapAgent`; it does not add policy, custody, networking, or a transport.
