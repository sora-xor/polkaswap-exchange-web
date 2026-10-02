# Local Codex companion for Bots

The static Bots page can ask a **local**, signed-in Codex CLI for one draft of up to three distinct strategies per fresh training request. The companion never holds a wallet key, deposits tokens, starts a bot, signs a transaction, or submits a trade. A draft still has to pass the site's quote, fee, training, held-out validation, and loss-limit checks. Profit is not guaranteed.

## Start

Install Node 26 and the Codex CLI, then sign in to the CLI with your ChatGPT account (`codex login`). The companion uses that saved CLI sign-in; it does not ask for an OpenAI API key. The CLI's [documented non-interactive mode](https://learn.chatgpt.com/docs/developer-commands?surface=cli) provides the `exec`, `--ephemeral`, `--sandbox read-only`, `--ignore-user-config`, JSON output, and output-schema flags used here.

On macOS, the companion checks executable `codex` files on its PATH and in `/opt/homebrew/bin` and `/usr/local/bin`. This also works when launchd starts it with the default short PATH, provided the same user has already signed in to Codex. If the CLI is absent or not executable, the companion records only the fixed `cli_unavailable` failure stage and leaves the request for recovery; it does not look for an API key or invoke a shell.

On the Bots page, open **Connect local Codex**, choose **Download companion**, then open a terminal in your Downloads folder. On macOS or Linux:

```sh
cd ~/Downloads
node polkaswap-codex-companion.mjs
```

On Windows PowerShell:

```powershell
Set-Location "$HOME\Downloads"
node .\polkaswap-codex-companion.mjs
```

If using this repository directly, run `node scripts/bots/codex-companion.mjs`. The process listens only on `127.0.0.1:39847` and prints a 32-character pairing code only after the listener opens successfully. If the port cannot be bound, it prints the existing fixed bind error and no pairing code. Paste that code into **Connect local Codex** and choose **Pair Codex**. Chrome may ask whether Polkaswap can access other apps and services on this device; this browser permission is needed for the loopback connection and is broader than the companion's single port. Leave the terminal and page open for later hourly research. Each successful pairing consumes the displayed code, rotates the session token, and prints a fresh code in the terminal. A token expires after 24 hours; the new code can pair again. Restarting the process also creates a fresh code. The page stores its token only in memory.

If this tab reloads, the valid GO amount, token pair, and trading limits reappear for the same connected account and network for up to 24 hours. An unsigned opportunity watch also reappears as **Watching paused after reload** after the wallet and node settle. Pair Codex again, then choose **Resume watching** to rearm that saved watch; if no watch was saved, choose GO for new read-only research. Neither form recovery nor watch recovery restores the AI connection, funding review, or trading authority. Any live trade still needs separate review and approval.

The page keeps the companion's established five-field public goal payload so an already-running companion can draft after a GO target-rule update. The page itself enforces the opt-in requirement for a finalized fill and after-cost improvement over untouched opening holdings; a companion draft never changes that rule. Updated companion downloads also accept the true-only goal flag if a future client sends it.

If the local process stops during a request, the page clears its stale connected state and shows **Connect local Codex** again. Restart the companion if needed and enter the current code printed in its terminal. The still-pending, unexpired request can continue after re-pairing; otherwise wait for the next fresh hour. GO and Discover pairing requests stop after 30 seconds if the helper does not answer; cancellation also aborts a pending pair. The reconnect panel keeps the download and terminal launch instructions visible alongside the connection error. Neither a timeout nor recovery automatically pairs or resumes the watch. A failed model draft keeps the connection and uses **Retry** instead.

An explicitly reported Codex account usage limit returns only HTTP `429` with `{"error":"usage_limit"}`. The page does not automatically retry it or discard the local pairing. It keeps the usage-limit explanation visible if the unsigned task expires, so users can retry or refresh after their account limit resets. This response never contains CLI output, account details, or a guessed reset time. Unknown failures retain the generic response; the companion's own request-rate limit is a separate condition.

Switching wallets or disconnecting while a watch is active stops its timer and cancels any in-flight research. The original wallet's unsigned checkpoint stays in this tab. A different connected wallet cannot resume or evaluate it; after reconnecting the original wallet on the same chain, choose **Resume watching**. If an eligible completed hour was published while paused, the page checks the latest indexed window once after resume rather than replaying every missed hour. It rechecks the saved limits and shared holdout exposure first, and never repeats a durably claimed hour. **Stop watching** explicitly discards the checkpoint.

An open tab checks fresh indexed data at the next eligible hour. If Chrome delays its timer while the tab is in the background, returning to the tab checks an overdue watch once; missed hours are not replayed. A discarded tab, browser restart, or expired companion token still needs the visible reconnect and resume steps above. The watch does not run as a background service.

For a local Vite page, explicitly allow its exact loopback origin:

```sh
node scripts/bots/codex-companion.mjs --allow-origin http://localhost:5173
```

The production origin `https://polkaswap.io` is the only allowed browser origin by default. A local development origin must be opted in using `--allow-origin`; arbitrary public origins are rejected. The browser's private-network preflight is answered for allowed origins. No CORS credential sharing is used. A local process can forge an Origin header, so the random one-use pairing code and separate 256-bit bearer token remain mandatory.

## Protocol

All traffic is JSON over `http://127.0.0.1:39847`:

| Method and path | Input                                                                          | Success                                                                 |
| --------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `GET /health`   | None                                                                           | `{ "ok": true, "service": "polkaswap-codex-companion", "version": 1 }`  |
| `POST /pair`    | `{ "code": "<terminal code>" }`                                                | `{ "token": "<memory-only bearer>", "expiresAt": 0 }`                   |
| `POST /draft`   | `Authorization: Bearer <token>` and `{ "context": <public training context> }` | `{ "requestId": "…", "strategies": [{ … }] }` (1–3 distinct strategies) |

The companion checks Host and Origin, bounds requests to 64 KiB, rate-limits failed pairing and drafts (12 per hour), permits one Codex draft at a time, and returns fixed error codes without CLI stderr or token values. Its local stderr records only a fixed failure stage; it does not print prompts, drafts, CLI stdout, or CLI stderr. On a nonzero Codex exit it recognizes explicit CLI evidence for `cli_auth` (check the same user's Codex sign-in), `cli_usage_limit` (check remaining Codex usage), `cli_rate_limited` (retry later), `cli_network` (check connectivity), `cli_service` (check service availability), or `cli_argument_rejected` (check CLI version and supported flags). If the bounded diagnostics do not establish a cause, it records `cli_exit`; it never infers a usage limit from the exit code alone. Successful CLI exits can still produce `output_format` or `schema_rejected`. Apart from the explicit `/draft` usage-limit response above, the browser receives only `draft_failed` for these failures. It rejects expired requests, non-training purposes, extra top-level fields, malformed cost and candle data, and outputs with a wrong request ID. In a model batch it retains only individually valid, distinct strategies within the exact size and cadence limits; if none survive, it rejects the draft. The page independently validates every survivor before quoting or testing it. The page's free-text instruction, rule prose, and response schema are not forwarded to Codex. Only public token metadata, exact numeric limits/cost samples, and the 117 training candles enter the prompt. The held-out period is absent.

The page keeps the companion goal object in its original five-field wire shape so an already-running companion can handle a new GO request. The GO-only requirement to beat the unchanged opening holdings after costs stays in the site's research and live-goal checks. Updated companion downloads also accept a true-only `targetRequiresIdleOutperformance` extension for forward compatibility.

The process invokes the saved-login CLI in a fresh temporary directory with fixed arguments, `--ignore-user-config`, `--sandbox read-only`, `--ephemeral`, a fixed output schema, no shell, a scrubbed environment, and a four-minute timeout. It does not connect to the browser's wallet extension. For a fixed model-draft failure, the page retries the same pending request up to two times with short delays, stopping if the request is canceled or too close to expiry. Authentication, transport, busy, and timeout failures are not retried automatically. If Codex remains unavailable or the draft fails, the site can keep its existing manual assistant path. If a draft qualifies, the user still reviews and separately authorizes any live trading.

On the simple Bots form, the connected wallet's selected input-token balance and XOR fee reserve are read directly from SORA and compared with the entered budget. Any shortfall appears beside **GO**, with the deposit address and a refresh action. This is a setup hint, not trading approval: the final review rechecks balances and other bot allocations before enabling Start. Codex may leave a 24-hour episode idle when fees or signals do not justify a trade; the training and validation phases each still need a fill before a strategy can qualify.

When all five fresh finalized exact-size first-buy samples fail only the selected
price-impact limit, GO keeps the unsigned opportunity watch and displays the
existing price-impact explanation with the verified completed-history hour. This
is a bounded observation about those five quotes, not a qualification failure or
proof that every unquoted size is infeasible. No AI draft or holdout evaluation is
requested for that attempt. The original allocation, fee reserve and every risk
limit remain unchanged.

The same-tab checkpoint failure record stores only `stage: preflight`,
`cause: priceImpact`, `sampleCount: 5` and the failure code/hour bound to the exact
public watch intent. That diagnostic contains no numerical costs, quoted amounts,
prices or provider text. Reload still requires explicit reconnect/resume, and
research still requires a newer verified hour and the existing shared holdout guard. Missing quotes, mixed policy failures,
invalid configuration/goal and untrusted lookalike policy errors do not acquire
this recovery path. An eventual qualifying result still stops at unsigned review.
