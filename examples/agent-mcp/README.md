# Polkaswap local MCP server

This example is a real MCP server using the standard stdio transport. The MCP client starts a local Node 26 process, which uses Playwright to call the allowlisted `window.PolkaswapAgent` API in a local Chromium session:

```text
MCP client <-- stdio --> local Node bridge --> local Chromium page --> Polkaswap data providers
```

There is no hosted or centralized MCP middleware. The browser page continues to contact the same SORA/Polkaswap endpoints it normally uses.

## Safety boundary

The server exposes exactly the shared catalogue in `src/features/agent-trading/mcp/catalogue.mjs`. Its nine current tools read account-redacted capabilities and node status, discover or resolve public assets, list common route assets, quote swaps, plan unsigned swaps, and inspect public pool data. They cannot read balances, wallet identity, positions, or transaction history; prepare executable intents; connect a wallet; sign or submit a transaction; transfer an asset; or add/remove liquidity.

Agents can call `polkaswap_plan_swap` repeatedly without a wallet connection, browser checkbox, or per-plan approval. It accepts the same precise decimal-string inputs as `polkaswap_quote_swap` and returns a fresh quote, unsigned SDK call preview, route/bounds, fee estimates, warnings, network context, and expiry. The result always has `mode: "unsigned"`, `requiresWallet: false`, and `canExecute: false`; it has no intent ID or signer-bound envelope. Refresh an expired plan before making a decision. This enables autonomous market analysis and planning, not autonomous spending.

The bridge never accepts a seed phrase, private key, wallet password, API token, signing callback, account address, or balance opt-in. Do not put secrets in its arguments or environment. The adapter forces wallet-independent request options and projects every result through the account-redaction boundary. Re-review this boundary before adding any wallet-aware or state-changing tool.

MCP stdout contains protocol messages only. Help and bounded, secret-free startup/shutdown diagnostics go to stderr. Closing the MCP client's stdin releases the browser bridge through the same idempotent cleanup path as `SIGINT`/`SIGTERM`.

Stdio opens no network listener and has no separate login flow: access is inherited from the local process and MCP client that owns the pipes. Configure this server only in clients you trust. The current catalogue is read-only and account-redacted, but it still lets the client drive live market-data requests through the dedicated browser session.

## Prerequisites

- Node.js 26
- The repository's Yarn 4 installation
- Playwright (already used by this repository)
- `@modelcontextprotocol/server` version `2.0.0`

If the MCP server package is not present in your checkout, the recommended pinned dependency is:

```sh
yarn add @modelcontextprotocol/server@2.0.0
```

Use Yarn, not `npm install`, in this repository. Install the Playwright Chromium build if the local checkout does not have it yet.

## Dedicated persistent browser mode

The default mode launches Chromium with a persistent profile. Supply an absolute path dedicated to this bridge; do not point it at a browser profile that another Chromium process is using. Validation is read-only and does not create the directory: it resolves existing symlinks and the nearest existing ancestor, and rejects the filesystem root, the home directory itself, existing non-directories, and known Chrome/Chromium/Edge stable, beta, dev, canary, and Chrome for Testing profile trees. On Linux it also protects roots relocated through `XDG_CONFIG_HOME`, `CHROME_CONFIG_HOME`, or `CHROME_USER_DATA_DIR`. A dedicated new directory below your home directory is allowed.

```sh
node /absolute/path/to/polkaswap-exchange-web/examples/agent-mcp/index.mjs \
  --profile-dir /absolute/path/to/polkaswap-mcp-profile \
  --headed
```

The bridge adds `polkaswap-agent=1` to the application URL and lazily opens the page on the first tool call. Headed mode is the default so an operator can inspect the browser session; headless mode is also suitable for the current read-only, account-redacted catalogue.

## Attach to an existing Chromium browser

CDP mode is useful when Polkaswap must run in a specific Chrome/Chromium installation. Launch that browser yourself with a dedicated profile and a loopback-only debugging port:

```sh
chromium \
  --user-data-dir=/absolute/path/to/polkaswap-mcp-cdp-profile \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port=9222

node /absolute/path/to/polkaswap-exchange-web/examples/agent-mcp/index.mjs \
  --cdp-url http://127.0.0.1:9222
```

Use the executable name or path appropriate to your platform. Current Chromium builds require a non-default user-data directory for remote debugging. A CDP endpoint controls the attached browser, so never bind or forward it beyond loopback. The bridge reuses an agent-enabled page when possible. On cleanup it closes its Playwright CDP connection, which disconnects this automation session without terminating the externally launched Chromium process. Existing contexts and unrelated pages remain open; the bridge closes only a page/context that it created itself.

## MCP client configuration

Replace every example path with an absolute path on the machine running the MCP client.

Codex-style TOML configuration:

```toml
[mcp_servers.polkaswap_local]
command = "node"
args = [
  "/absolute/path/to/polkaswap-exchange-web/examples/agent-mcp/index.mjs",
  "--profile-dir",
  "/absolute/path/to/polkaswap-mcp-profile",
  "--headed",
]
```

Claude Desktop and other clients using the common JSON stdio shape:

```json
{
  "mcpServers": {
    "polkaswap-local": {
      "command": "node",
      "args": [
        "/absolute/path/to/polkaswap-exchange-web/examples/agent-mcp/index.mjs",
        "--profile-dir",
        "/absolute/path/to/polkaswap-mcp-profile",
        "--headed"
      ]
    }
  }
}
```

For CDP mode, replace the `--profile-dir` pair with `"--cdp-url", "http://127.0.0.1:9222"`.

## Configuration

Command-line values take precedence over environment variables.

| CLI option                | Environment variable                  | Meaning                                                                            |
| ------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------- |
| `--app-url`               | `POLKASWAP_MCP_APP_URL`               | Polkaswap URL; production HTTPS or literal loopback by default                     |
| `--allow-custom-origin`   | `POLKASWAP_MCP_ALLOW_CUSTOM_ORIGIN`   | Explicitly opt in to another configured HTTPS origin                               |
| `--profile-dir`           | `POLKASWAP_MCP_PROFILE_DIR`           | Absolute dedicated profile path for persistent mode                                |
| `--cdp-url`               | `POLKASWAP_MCP_CDP_URL`               | Loopback `http://` or `ws://` CDP endpoint; mutually exclusive with a profile path |
| `--headed` / `--headless` | `POLKASWAP_MCP_HEADLESS=true/false`   | Browser visibility; headed by default                                              |
| `--navigation-timeout-ms` | `POLKASWAP_MCP_NAVIGATION_TIMEOUT_MS` | `1000..120000`; default `60000`                                                    |
| `--ready-timeout-ms`      | `POLKASWAP_MCP_READY_TIMEOUT_MS`      | `1000..120000`; default `30000`                                                    |
| `--tool-timeout-ms`       | `POLKASWAP_MCP_TOOL_TIMEOUT_MS`       | `1000..300000`; default `120000`                                                   |

The default application URL is `https://polkaswap.io/?polkaswap-agent=1#/swap`. Without an explicit opt-in, the application origin must be exactly `https://polkaswap.io` or a literal loopback address (`127.0.0.0/8` or `[::1]`); `localhost` is not a default-trusted application hostname because it requires name resolution. Other HTTPS origins require `--allow-custom-origin` or `POLKASWAP_MCP_ALLOW_CUSTOM_ORIGIN=true`. The opt-in does not permit public HTTP. URL credentials are always rejected, as are non-loopback CDP endpoints.

The bridge pins the normalized application origin, path, query, and hash. It verifies that exact location after navigation, before every agent call, and again in the page evaluation immediately before accessing `window.PolkaswapAgent`. Redirects or later navigation fail closed with a fixed error.

The tool timeout is one total deadline starting when MCP dispatches the handler, including time spent waiting behind another browser call. Client cancellation or deadline expiry returns a fixed, secret-free error promptly. If browser work already started, the bridge still waits for that underlying operation to settle before it starts the next queued call, preventing overlapping page operations.

The serial queue accepts at most 32 active-plus-queued tool calls. Further arrivals receive the fixed `MCP_QUEUE_FULL` error. A successful MCP response is limited to 1 MiB of UTF-8 JSON (including text and structured content); an oversized value is discarded and replaced with `MCP_RESULT_TOO_LARGE`. These fixed limits cap queued work and prevent unexpectedly large provider values from being propagated through MCP. They are intentionally not command-line tunables in this example.

Run `node examples/agent-mcp/index.mjs --help` for the compact CLI reference. Because help is written to stderr, redirect it explicitly if needed.
