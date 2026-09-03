# Polkaswap Agent API

Polkaswap exposes a same-page browser automation API at `window.PolkaswapAgent` and registers nine account-redacted, read-only WebMCP tools on the top-level page.

Use `.well-known/polkaswap-agent.json` as the canonical discovery manifest. It links the v1 quick reference, TypeScript definitions, JSON schema, error catalog, examples, and optional browser helper client.

Browser API agents run inside the page context. There is no hosted server API, centralized middleware, URL command mode, `postMessage` command bridge, or delegated custody layer. Generic MCP clients can launch the source repository's local Node 26 stdio bridge with `yarn agent:mcp --profile-dir /absolute/path/to/a/dedicated/profile`.

The WebMCP and local MCP surfaces expose only public capabilities/node readiness, asset discovery/resolution, swap quotes, unsigned swap plans, and pool reads. Call `polkaswap_plan_swap` (same-page `planSwap`) to resolve, quote, and obtain public SDK-call metadata without a wallet or prior manual quote. Plans always return `canExecute: false` and `requiresWallet: false`; they are not SCALE transactions and persist no executable intent. These surfaces cannot inspect wallet identity, balances, positions, or history; create an executable intent; connect a wallet; sign; submit; transfer assets; mutate liquidity; or alter portable state. Autonomous MCP execution remains disabled until the local policy-limit and kill-switch gates are complete.

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
