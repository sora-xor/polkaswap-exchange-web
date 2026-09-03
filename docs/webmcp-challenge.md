# Polkaswap WebMCP: judge guide

Polkaswap gives browser agents a wallet-independent way to discover SORA assets, obtain live swap quotes, and build unsigned swap plans. An agent can call the planner directly; it does not need a preceding page click, wallet connection, or per-plan approval. The optional playground displays the same planning information and refreshes it automatically as inputs change.

This guide describes the submitted source build. It does not establish that the stable production site already serves that build. Before judging a deployment, inspect its `.well-known/polkaswap-mcp-tools.json`: this contribution contains nine tools, including `polkaswap_plan_swap`. An eight-tool deployment is an earlier version.

## Existing project and this contribution

The comparison baseline is commit `893783ba6a19c33043eb5dabe42d949c14d0f257` on `ui-updates`. That commit already contains the open-source Polkaswap exchange, Vue/Vite application, SORA integration, and browser agent API. This contribution does not present the exchange itself as newly built.

The additions and changes beyond that baseline are:

- A shared, strict nine-tool catalogue registered through `document.modelContext.registerTool()` on top-level application pages.
- A top-level playground adapter that forwards calls to its same-origin application iframe. It does not rely on tools inside the iframe being discoverable.
- A Node.js stdio MCP bridge exposing the same tool names, input schemas, and account-redacted results to generic local MCP clients.
- `polkaswap_plan_swap`: one wallet-independent call that waits for node readiness, resolves assets, obtains a fresh quote, and returns route/bounds, fee estimates, warnings, expiry, chain context, and unsigned SDK-call metadata.
- Automatic playground planning after input changes and expiry, with serialized requests, stale-result suppression, bounded transient retries, and suspension while the page is hidden.
- Stronger separation between public planning and the existing private, wallet-aware browser API, plus preparation-integrity and execution-contract hardening of that existing API.

The application still builds to static files suitable for IPFS. No hosted MCP middleware or Polkaswap server runtime is added. The local bridge runs only when a user or their MCP client starts its Node.js process; browser JavaScript does not open a localhost listening port. Market-data requests use the application's existing providers.

## Public tool catalogue

| Tool | Purpose |
| --- | --- |
| `polkaswap_capabilities` | Discover public capabilities, defaults, and limits. |
| `polkaswap_status` | Read account-redacted application and node status. |
| `polkaswap_ready` | Wait for public node readiness. |
| `polkaswap_assets` | Search public asset metadata. |
| `polkaswap_resolve_asset` | Resolve a symbol or address to a canonical asset. |
| `polkaswap_common_assets` | List common route assets. |
| `polkaswap_quote_swap` | Obtain a non-executable swap quote and route. |
| `polkaswap_plan_swap` | Build a fresh, unsigned swap plan in one call. |
| `polkaswap_pool_info` | Inspect public pool information. |

The authoritative [source catalogue](../src/features/agent-trading/mcp/catalogue.mjs) and [published JSON catalogue](../public/.well-known/polkaswap-mcp-tools.json) are checked for parity. All nine descriptors are read-only, non-destructive, and idempotent. Market data can change between calls: idempotence does not mean identical quotes forever.

These tools cannot access wallet identities, balances, positions, or account history; connect a wallet; issue an executable intent; sign or submit a transaction; transfer assets; or mutate liquidity. The local MCP bridge has the same restrictions and does not contain an autonomous signer. No wallet, funds, API key, seed phrase, or private key is needed for judging this public workflow.

Every successful plan explicitly reports:

```json
{
  "mode": "unsigned",
  "canExecute": false,
  "requiresWallet": false
}
```

Its preview is SDK-call metadata, not a SCALE-encoded transaction or signing authorization. It contains no signer-bound envelope or intent ID. Amount inputs are decimal strings; token calculations use precise numeric helpers rather than JavaScript floating-point arithmetic. A missing fee estimate is reported as a warning, not treated as permission to spend. Expired plans must be refreshed.

## Run the source build

Use Node.js 26 and the repository-pinned Yarn 4.10.3. `npm install` is unsupported because dependencies use Yarn's `patch:` protocol. From the repository root:

```sh
node --version
node .yarn/releases/yarn-4.10.3.cjs install --immutable
node .yarn/releases/yarn-4.10.3.cjs build
node .yarn/releases/yarn-4.10.3.cjs vite preview --host 127.0.0.1 --port 4173 --strictPort
```

Confirm the first command reports `v26.x`. The preview serves the built `dist/` assets. On that preview origin, open `/#/for-agents` or `/agent-playground.html`. For an IPFS-style deployment prefix, resolve both paths relative to that build's base rather than discarding the prefix.

The page can be used in a regular browser. Native agent discovery additionally requires a browser-agent environment that provides the supported `document.modelContext` API. A working playground in an ordinary browser does not, by itself, prove native WebMCP discovery.

For the optional standard MCP path, install the repository's Playwright Chromium build if needed:

```sh
node .yarn/releases/yarn-4.10.3.cjs playwright install chromium
```

Configure the MCP client to launch `node` with `examples/agent-mcp/index.mjs`, an absolute dedicated `--profile-dir`, and `--app-url` pointing to the submitted application build. Do not use an everyday browser profile. See the [local MCP bridge guide](../examples/agent-mcp/README.md) for the exact stdio configuration and loopback constraints. Local stdio MCP is a separate integration path; it is not proof of native WebMCP discovery.

## Native browser judging walkthrough

1. Open the submitted build's `agent-playground.html` in a native WebMCP-capable browser-agent environment. Leave **Allow wallet data for this session** unchecked. Keep the page visible and wait for its application and SORA connection to become ready.
2. Inspect the agent's actual discovered site tools and confirm the nine names above. Do not inject a replacement `modelContext` object for this native check.
3. Ask the agent:

   > Use Polkaswap's discovered WebMCP tools to plan swapping 1 XOR for VAL with 0.5% slippage. Show the route, minimum output, fee estimate, warnings, expiry, and whether the result can execute. Do not connect a wallet or submit a transaction.

4. Confirm an actual native invocation of `polkaswap_plan_swap`, not merely a description of the tool. Its arguments should be equivalent to:

   ```json
   {
     "assetIn": { "symbol": "XOR" },
     "assetOut": { "symbol": "VAL" },
     "amount": "1",
     "side": "input",
     "slippageTolerance": "0.5",
     "dexId": "best"
   }
   ```

5. Inspect the structured result for the three safety fields shown above, the resolved assets, quote, warnings, network context, and expiry. Output amounts depend on current liquidity; there is no fixed expected exchange rate.
6. Separately exercise the playground scheduler: set its pair to XOR → VAL, use **Spend exactly**, and keep **Plan automatically** enabled. Starting with **Amount to spend** equal to `1`, change it to `2`. Wait for the fresh plan and confirm its request and quote use `2`, without clicking **Plan swap** or enabling wallet data. The agent's direct tool arguments do not need to modify the form automatically.
7. Disable **Plan automatically** to stop future automatic requests. The scheduler also pauses while the page is hidden. Manual page controls are optional inspection tools, not prerequisites for calling the public planner.

If the node is unavailable or liquidity cannot be quoted, report that condition rather than replacing a live result with fabricated data. A tool discovery failure, a provider failure, and an older deployed catalogue are distinct outcomes.

## Reproduce validation

The commands below use `yarn` as shorthand for the pinned runner: `node .yarn/releases/yarn-4.10.3.cjs`.

Focused unit tests:

```sh
yarn vitest run --config vitest.config.mjs --project unit \
  tests/unit/features/agent-trading \
  tests/unit/examples/agent-mcp \
  tests/unit/examples/agent-runner \
  tests/unit/features/misc/for-agents.spec.ts \
  tests/unit/app/bootstrap.spec.ts \
  tests/unit/lib/substrate/sdk/assets/connection-guards.spec.ts \
  tests/unit/lib/substrate/sdk/poolXyk/index.spec.ts \
  tests/unit/lib/substrate/sdk/swap/index.spec.ts
yarn test:translation
yarn vitest run --config vitest.config.mjs --project unit-scripts \
  tests/unit/scripts/playwright/preview-server-helper.spec.ts
yarn build
```

The focused unit tests use mocked providers and signers; they do not make network calls or spend funds. Coverage includes tool/schema parity, account redaction, unsigned planning, preparation/execution boundaries, expiry, cancellation, retries, and stale-result handling. Script tests run separately because they belong to the `unit-scripts` project.

For the built-site Chromium smoke, ensure Playwright Chromium is installed. This script can start a loopback static preview of the existing `dist/` build; keep its port free:

```sh
AGENT_SMOKE_BASE_URL=http://127.0.0.1:8988 \
AGENT_SMOKE_PREFIX=/ipfs/webmcp-challenge-clean/ \
AGENT_SMOKE_AMOUNT=1 \
AGENT_SMOKE_OUTPUT=output/playwright/agent-trading-smoke-clean-source.json \
node scripts/playwright/agent-trading-smoke.mjs
```

This smoke uses a real Chromium browser, the built static application, and live market-data requests. It injects a test `document.modelContext` registrar, captures the registered descriptors, and invokes their callbacks. It also edits the real playground amount field and observes automatic replanning. It does not connect a wallet or perform a valid execution; negative execution checks use missing or invalid identifiers only.

That harness validates browser integration and tool callback behavior. It is **not** evidence that a native browser agent discovered or invoked the tools. Native evidence requires the separate walkthrough above, with the browser agent's real tool invocation visible.

## Isolated source-build evidence

Validation on September 3, 2026:

| Check | Result |
| --- | --- |
| Focused unit coverage | 21 files, 306 tests passed, including the mocked pool-creation history-ID test. |
| Translation checks | 4 files, 13 tests passed. |
| Preview-helper checks | 1 file, 9 tests passed. |
| Independent static build | Passed from the isolated source checkout. |
| Real Node stdio handshake | `initialize` and `tools/list` passed: nine tools, exact catalogue schemas, all read-only; exit code 0 and empty stderr. |
| Built Chromium integration smoke | Passed at `2026-09-03T12:59:41Z` under the `/ipfs/webmcp-challenge-clean/` prefix. |
| Native browser-agent discovery/invocation | Not established by the injected-registrar smoke; verify separately. |

The successful Chromium run reached title **Swap - Polkaswap**, registered nine read-only tool descriptors, invoked public status and unsigned planning, obtained real-chain quotes, and reported zero schema-parity errors. A real amount edit from `1` to `2` produced a fresh latest plan whose request and quote used `2`; completed-plan history and request revision advanced from `1` to `2`. Wallet consent remained off. The run recorded **zero failed requests, zero HTTP errors, and zero console errors**.

The generated JSON report is a local validation artifact, not a claim that the stable production domain has been redeployed. Verify the submitted deployment's catalogue and native tool invocation before treating a live URL as evidence of this nine-tool build.
