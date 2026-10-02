# Agent Trading Cookbook

This cookbook gives automation runners practical patterns for the static, browser-native Polkaswap agent API. All snippets run in the Polkaswap page context after a browser has opened the app.

Use `docs/agent-trading.md` for the full API reference. Use `.well-known/polkaswap-agent.json` when a generic runner needs to discover docs, schemas, examples, and the optional helper client from a deployed static build.

For a runnable starting point, use `examples/agent-runner/`:

```sh
yarn agent:runner
```

## Runner Mental Model

Treat the page API as a signer-aware trading terminal:

1. Discover v1 metadata from `.well-known/polkaswap-agent.json`.
2. Open the app and wait for `window.PolkaswapAgent`.
3. Call `ready({ requireNode: true })`.
4. Plan without a wallet; connect or select a wallet only when signing is needed.
5. Resolve symbols to addresses once, then reuse addresses.
6. Call `planSwap` for autonomous quote-plus-call planning, or `quote*` for a quote alone; neither is executable.
7. Call `prepare*` before every signature and review its envelope, revalidation, executability, and warnings.
8. Execute with exactly `{ intentId, clientOrderId }`; never repeat economic fields.
9. Persist `exportState()` after signer handoff.
10. Recover with `transactionStatus`, `lookupTransaction`, or `recoverTransaction` before retrying.

The API never takes private keys. If a runner owns keys directly, expose them through a Polkadot-compatible injected signer and keep custody policy outside the page.

The public WebMCP and stdio MCP profile is intentionally narrower than this browser API. It exposes nine account-redacted discovery, quote, unsigned planning, and pool tools. It does not expose executable preparation, execution, balances, positions, or account history.

## Autonomous Planning Without Wallet Access

Agents can resolve canonical assets, find the best supported route, quote, estimate the public fee, and obtain unsigned SDK-call metadata in one call. No prior quote, account permission, or per-call review is needed:

```ts
const plan = await agent.planSwap({
  assetIn: { symbol: 'XOR' },
  assetOut: { symbol: 'PSWAP' },
  amount: '1',
  side: 'input',
  dexId: 'best',
  slippageTolerance: '0.5',
});
if (Date.now() >= plan.expiresAt) throw new Error('Refresh the plan');
console.log(plan.quote.route, plan.preview.args, plan.fees, plan.warnings);
```

The same request is available through `polkaswap_plan_swap` on public WebMCP and local MCP. Plans always have `canExecute: false` and `requiresWallet: false`, contain no signer or executable intent, and persist no authorization. `preview` is SDK-call metadata, not a SCALE transaction. Canonical symbols do not depend on a connected account; use explicit addresses for assets outside the canonical catalogue. An expired plan is refreshed by calling `planSwap` again. Financial execution remains a separate, explicitly authorized signer workflow.

## Bootstrap Helper

```ts
async function loadPolkaswapAgent(options = {}) {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const api =
    window.PolkaswapAgent ??
    (await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('PolkaswapAgent timeout')), timeoutMs);

      window.addEventListener(
        'polkaswap-agent-ready',
        (event) => {
          window.clearTimeout(timeout);
          resolve(event.detail.api);
        },
        { once: true }
      );
    }));

  const capabilities = api.capabilities();
  if (capabilities.version !== 'v1') {
    throw new Error(`Unsupported PolkaswapAgent version: ${capabilities.version}`);
  }

  await api.ready({ requireNode: options.requireNode ?? true, timeoutMs });
  return api;
}

const agent = await loadPolkaswapAgent();
```

`ready({ requireNode: true })` proves the app has a working node connection. Use `ready({ requireWallet: true })` only after selecting a wallet.

## Wallet Selection

```ts
async function connectWalletIfAvailable(agent, source, address) {
  const wallets = await agent.refreshWallets();
  const wallet = wallets.find((item) => item.source === source);

  if (!wallet?.available) {
    throw Object.assign(new Error(`Wallet unavailable: ${source}`), { code: 'WALLET_NOT_FOUND', wallet });
  }

  const accounts = await agent.walletAccounts({ source });
  const selected = address ? accounts.find((account) => account.address === address) : accounts[0];

  if (!selected) {
    throw Object.assign(new Error(`Wallet account unavailable: ${address || source}`), {
      code: 'WALLET_ACCOUNT_NOT_FOUND',
      accounts,
    });
  }

  await agent.connectWallet({ source, address: selected.address });
  await agent.ready({ requireWallet: true, timeoutMs: 10_000 });
  return selected;
}
```

Injected wallets can still require a human or extension approval popup. The agent API does not bypass wallet policy.

## Canonical Assets

```ts
const xor = await agent.resolveAsset({ asset: { symbol: 'XOR' }, includeBalance: true });
const pswap = await agent.resolveAsset({ asset: { symbol: 'PSWAP' }, includeBalance: true });

const assetIn = { address: xor.address };
const assetOut = { address: pswap.address };
```

Use `{ symbol }` for discovery and `{ address }` for repeated execution. If a symbol maps to more than one asset, the API throws `ASSET_AMBIGUOUS`; retry with an address, not a guessed symbol.

## Warning Policy

`prepare*`, `assessSwap`, and `max*` return warnings. Warnings are data, not thrown exceptions.

| Warning code           | Default runner action                                                              |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `FEE_UNAVAILABLE`      | Stop; preparation fails closed until a positive network-fee estimate is available. |
| `INSUFFICIENT_BALANCE` | Stop; amount or fee funding is not executable.                                     |
| `WALLET_NOT_CONNECTED` | Stop; connect/select wallet and call `ready({ requireWallet: true })`.             |
| `SIGNER_NOT_READY`     | Stop; selected wallet cannot sign yet.                                             |
| `PATH_UNAVAILABLE`     | Stop; try another pair, source, DEX, or amount.                                    |
| `HIGH_PRICE_IMPACT`    | Stop unless strategy policy explicitly allows it.                                  |
| `LOW_LIQUIDITY`        | Stop unless strategy policy explicitly allows it.                                  |
| `POOL_CREATION`        | Stop unless the strategy explicitly intends to create a pool.                      |
| `NON_CANONICAL_ASSET`  | Resolve and retry with addresses.                                                  |
| `STALE_INTENT`         | Re-run the matching `prepare*` call.                                               |

```ts
function assertExecutable(prepared, allowWarnings = []) {
  const rejectedWarnings = prepared.warnings.filter(
    (warning) =>
      warning.severity === 'critical' || (warning.severity === 'warning' && !allowWarnings.includes(warning.code))
  );

  if (!prepared.canExecute || rejectedWarnings.length) {
    const error = new Error(rejectedWarnings.map((warning) => warning.code).join(', ') || 'NOT_EXECUTABLE');
    error.prepared = prepared;
    error.warnings = rejectedWarnings;
    throw error;
  }

  return prepared;
}
```

Every successful `prepare*` result also contains an immutable `envelope` and a `revalidation` result. The envelope binds its random nonce, network/runtime, signer, normalized request, quote and call digests, fee ceilings, and time/block expiry. `intentId` is derived from that envelope and can be consumed once. A `quoteDigest` from `quote*` cannot be passed to `execute*`.

## Exact-Input Swap

`side: 'input'` spends exactly `amount` and protects the result with `minAmountOut`.

```ts
const prepared = assertExecutable(
  await agent.prepareSwap({
    assetIn,
    assetOut,
    amount: '1',
    side: 'input',
  })
);

const result = await agent.executeSwap({
  intentId: prepared.intentId,
  clientOrderId: 'strategy-42-swap-001',
});
```

## Exact-Output Swap

`side: 'output'` receives exactly `amount` and protects the spend with `maxAmountIn`.

```ts
const prepared = assertExecutable(
  await agent.prepareSwap({
    assetIn,
    assetOut,
    amount: '100',
    side: 'output',
  })
);

await agent.executeSwap({
  intentId: prepared.intentId,
  clientOrderId: 'strategy-42-swap-002',
});
```

Use decimal strings for amounts. Do not use JavaScript floating-point arithmetic for token math in the runner.

## Risk Assessment

```ts
const assessment = await agent.assessSwap({
  assetIn,
  assetOut,
  amount: '1',
  maxPriceImpact: '3',
  requireCanExecute: true,
});

if (!assessment.approved) {
  throw Object.assign(new Error(assessment.reasons.map((reason) => reason.code).join(', ')), { assessment });
}
```

`assessSwap` never signs. It creates a single-use prepared intent and packages it with runner-provided policy so the agent can make one approval decision before execution.

## Transfer

```ts
const prepared = assertExecutable(
  await agent.prepareTransfer({
    asset: assetIn,
    to: 'cn...',
    amount: '0.1',
  })
);

await agent.executeTransfer({
  intentId: prepared.intentId,
  clientOrderId: 'strategy-42-transfer-001',
});
```

Validate recipients before signing. `INVALID_RECIPIENT` means the destination address failed the app's address validation.

## Add Liquidity

```ts
const prepared = assertExecutable(
  await agent.prepareAddLiquidity({
    assetA: assetIn,
    assetB: assetOut,
    amountA: '1',
  })
);

await agent.executeAddLiquidity({
  intentId: prepared.intentId,
  clientOrderId: 'strategy-42-lp-add-001',
});
```

Pool creation is disabled by default. Set `allowPoolCreation: true` only when the strategy explicitly intends to create a new XYK pool.

## Remove Liquidity

```ts
const positions = await agent.liquidityPositions({ assetA: assetIn, assetB: assetOut });

if (!positions.length) {
  throw new Error('NO_LIQUIDITY_POSITION');
}

const request = {
  assetA: assetIn,
  assetB: assetOut,
  percent: '25',
};

const prepared = assertExecutable(await agent.prepareRemoveLiquidity(request));

await agent.executeRemoveLiquidity({
  intentId: prepared.intentId,
  clientOrderId: 'strategy-42-lp-remove-001',
});
```

Use `percent` when the strategy is position-relative. Use `liquidityAmount` when it already knows the LP token amount.

## Max Helpers

```ts
const maxTransfer = await agent.maxTransferAmount({ asset: assetIn });
const maxSwap = await agent.maxSwapInput({ assetIn, assetOut });
const maxLp = await agent.maxAddLiquidity({ assetA: assetIn, assetB: assetOut });
const maxRemove = await agent.maxRemoveLiquidity({ assetA: assetIn, assetB: assetOut });
```

Max helpers are read-only planning tools. Treat critical warnings as blockers before using their amounts in `prepare*`.

## Idempotent Recovery

```ts
async function executeSwapWithRecovery(agent, request, clientOrderId) {
  const existing = agent.transactionStatus({ id: clientOrderId });
  if (existing.source !== 'none') return existing;

  const prepared = assertExecutable(await agent.prepareSwap(request));

  try {
    const result = await agent.executeSwap({
      intentId: prepared.intentId,
      clientOrderId,
    });

    return result;
  } catch (error) {
    if (error.code !== 'SIGNING_CANCELLED' && error.code !== 'IDEMPOTENCY_CONFLICT') {
      throw error;
    }

    return agent.recoverTransaction({ clientOrderId, lookup: 'any' });
  } finally {
    sessionStorage.setItem('polkaswap-agent-state', JSON.stringify(agent.exportState()));
  }
}
```

`transactionStatus` is local and synchronous. `recoverTransaction` uses stored v1 idempotency state and the stored preview to match local or indexed history. If the runner already knows the block, use `lookupTransaction({ txId, lookup: 'chain', blockHash })` or `lookupTransaction({ txId, lookup: 'chain', blockHeight })`.

## Subscriptions

```ts
const stopLocal = await agent.subscribeTransactions({ source: 'local', pollMs: 1_000, limit: 20 }, (tx) => {
  console.log(tx.id, tx.status);
});

const stopIndexer = await agent.subscribeTransactions(
  {
    source: 'indexer',
    address: agent.status().wallet.address,
    includeExisting: true,
    limit: 20,
  },
  (tx) => console.log(tx.id, tx.status)
);

stopLocal();
stopIndexer();
```

Use `source: 'all'` when a runner wants local immediacy plus indexer confirmation. Indexer subscriptions require a connected wallet or an explicit `address`.

## Portable State

```ts
const fullState = agent.exportState();
const redactedState = agent.exportState({ redacted: true });

agent.importState({ state: fullState, merge: true });
agent.clearState({ clientOrderId: 'strategy-42-swap-001' });
```

Only v1 state is accepted. Full state is for moving idempotency records between browser profiles; it never contains private keys. Redacted state is better for logs because it omits signer addresses, call arguments, transaction refs, and execution results. Redacted state is not enough for recovery that needs preview argument matching.

## Optional Browser Client

Generic runners can load `.well-known/polkaswap-agent-client.js` when they want a tiny prepare-and-execute wrapper:

```ts
const client = await window.PolkaswapAgentClient.attach({ timeoutMs: 30_000 });
await client.ready({ requireNode: true });

await client.prepareAndExecuteSwap(
  { assetIn, assetOut, amount: '1', side: 'input' },
  { clientOrderId: 'strategy-42-client-swap-001' }
);

await client.prepareAndExecuteAddLiquidity(
  { assetA: assetIn, assetB: assetOut, amountA: '1' },
  { clientOrderId: 'strategy-42-client-lp-add-001' }
);
```

The client does not add policy, custody, networking, or a transport. It is only a same-page helper around `window.PolkaswapAgent`.

## Error Actions

Branch on `error.code`, not text.

| Error code                    | Runner action                                                          |
| ----------------------------- | ---------------------------------------------------------------------- |
| `NODE_NOT_READY`              | Wait, reload, or switch endpoint before retrying.                      |
| `WALLET_NOT_CONNECTED`        | Select a wallet and call `ready({ requireWallet: true })`.             |
| `WALLET_ACCOUNT_NOT_FOUND`    | Refresh accounts and choose a valid address.                           |
| `ASSET_NOT_FOUND`             | Search assets or use a known address.                                  |
| `ASSET_AMBIGUOUS`             | Resolve by address.                                                    |
| `INVALID_AMOUNT`              | Rebuild the request with a decimal string amount.                      |
| `INVALID_SLIPPAGE`            | Stay within `capabilities().limits.slippageTolerance`.                 |
| `INVALID_PERCENT`             | Stay within `capabilities().limits.percent`.                           |
| `PATH_UNAVAILABLE`            | Try another pair, DEX, liquidity source, or amount.                    |
| `QUOTE_TIMEOUT`               | Retry with a longer `quoteTimeoutMs` or different route.               |
| `POOL_UNAVAILABLE`            | Call `poolInfo` before LP operations.                                  |
| `NETWORK_CONTEXT_UNAVAILABLE` | Wait for complete node identity and block context, then prepare again. |
| `INTENT_REQUIRED`             | Call the matching `prepare*` method first.                             |
| `INTENT_NOT_FOUND`            | Use an intent from the same browser profile or prepare again.          |
| `INTENT_EXPIRED`              | Prepare and review a fresh envelope.                                   |
| `INTENT_ALREADY_USED`         | Recover the prior submission or create a new intent.                   |
| `INTENT_INTEGRITY_FAILED`     | Discard the envelope and do not sign it.                               |
| `INTENT_MISMATCH`             | Re-run `prepare*` and sign the new intent.                             |
| `IDEMPOTENCY_CONFLICT`        | Recover existing state; do not reuse the id for another intent.        |
| `SIGNING_CANCELLED`           | Treat as cancellation, then recover before retrying.                   |

## Browser Smoke

```sh
yarn test:e2e:agent:smoke
```

The smoke verifies discovery files, ready event, API installation, schema samples, wallet status, asset resolution, quotes, prepare previews, max helpers, liquidity helpers, subscriptions, redacted state export, and no-wallet execution failure.
