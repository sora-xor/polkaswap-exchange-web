# Polkaswap Agent API

Polkaswap exposes a same-page browser automation API at `window.PolkaswapAgent`.

Use `.well-known/polkaswap-agent.json` as the canonical discovery manifest. It links the v1 quick reference, TypeScript definitions, JSON schema, error catalog, examples, and optional browser helper client.

Agents must run inside the page context. There is no server API, middleware process, MCP server, URL command mode, `postMessage` command bridge, or delegated custody layer.

The safe execution loop is:

1. Open the app with `?polkaswap-agent=1` before the hash route.
2. Wait for `window.PolkaswapAgent` or the `polkaswap-agent-ready` event.
3. Call `ready({ requireNode: true })`.
4. Select a wallet with `refreshWallets`, `walletAccounts`, and `connectWallet` when signing is needed.
5. Resolve symbols to addresses.
6. Call the matching `prepare*` method.
7. Review `canExecute`, `warnings`, `requiredBalances`, `fees`, and `preview`.
8. Call the matching `execute*` method with `intentId` and a stable `clientOrderId`.
9. Use `transactionStatus`, `lookupTransaction`, or `recoverTransaction` before retrying uncertain submissions.
