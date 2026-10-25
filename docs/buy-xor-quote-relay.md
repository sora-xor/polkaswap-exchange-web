# Buy XOR read-only conversion quote relay

The static app requests conversion quotes through `https://mof.sora.org/api/buy-xor/quote`. Symbiosis's server API accepts the existing request, but its browser preflight currently returns HTTP 404 without an allowed origin. This isolated MOF service performs a normal server-side POST to the fixed official `https://api.symbiosis.finance/crosschain/v2/quote` endpoint. It does not spoof browser headers, bypass a provider challenge, or proxy arbitrary URLs. The approved MOF Node 24 probe returned HTTP 200 JSON on 2026-09-25 at 13:29 UTC; that establishes current upstream access, not continuous availability or executed swaps.

## Request and transaction boundary

`scripts/ops/buy-xor-quote-relay.mjs` accepts the adapter's existing provider JSON: `tokenAmountIn`, `tokenOut`, `from`, `to`, `fallbackReceiver`, fixed `slippage: 100`, and the exact existing `disabledProviders` string for Ethereum sources. TON requests omit that last field. No extra keys are accepted, including within token metadata. The service reconstructs the forwarded object from fixed token presets and validated fields. It never forwards caller headers, cookies, authorization or an unregistered partner ID.

Allowed pairs are Ethereum ETH → Ethereum DAI; Ethereum USDT → Ethereum ETH/DAI; and TON USDT → Ethereum ETH/DAI. Token addresses, networks and decimals must match the presets exactly (EVM address case is immaterial). Codec amounts must be positive integer strings no larger than uint256. EVM accounts must be nonzero 20-byte addresses; TON accounts must use mainnet workchain zero with a valid friendly-address checksum or a valid raw address. The friendly zero-address sentinel used by the existing public indicative preview remains accepted. `fallbackReceiver` must equal the Ethereum destination. These format checks do not prove address ownership.

Successful provider JSON is size checked and parsed for a top-level object, then returned as its original text. Large monetary numeric lexemes are not reserialized or rounded. Provider transaction data remains subject to the frontend's existing token, recipient, allowance, gateway, expiry and wallet-context checks. The relay has no order, approval, signing, sending or custody endpoint. A relay quote does not enable on-site TON signing, which remains disabled pending its separate verifier.

## Bounds and availability

- Node 24 standard libraries only; no dependency installation, secret or API key.
- Listener is fixed to `127.0.0.1`, default port `5189`; only `BUY_XOR_QUOTE_PORT` is configurable.
- Exact POST `/api/buy-xor/quote`; GET `/api/buy-xor/quote-health` returns only service name and version.
- CORS permits only `https://polkaswap.io`, POST and `Content-Type`; no credentials. Missing, null, development, testnet and direct IPFS origins are rejected. Those contexts must show the existing unavailable/retry state or use the canonical production site; there is no automatic alternative origin or upstream fallback.
- At most 4096 request bytes and 128 KiB of decoded response bytes. JSON content types only; compressed request bodies, cookies, authentication and unknown schemas are rejected.
- Global limit 60 admitted POST attempts per minute and four in flight; no client/IP/session keys. The HTTP server additionally caps connections at 32 and request headers at 4 KiB.
- One absolute 12-second operation budget aborts the provider operation and destroys an unfinished request body. A slow body can disconnect without a JSON error; a provider timeout normally returns HTTP 504. Client disconnect aborts upstream work. No retry or cache.
- HTTP 400 from the provider becomes a generic `NO_ROUTE`; 429 remains a bounded unavailable response; other provider failures and malformed/oversized responses become generic 502. Request-bearing provider error bodies are never returned or logged. The upstream redirect mode is `error`.
- The service stores no request data and emits no request logs. Addresses/amounts exist transiently only to obtain the requested quote. The provider necessarily receives the validated quote request. The nginx snippet suppresses access/error logs for these two locations, strips IP/referrer/user-agent forwarding and buffers the ≤4 KiB request in memory. Do not add access logs, body tracing, analytics or disk caching.

The rate limit is intentionally global and may make quotes temporarily unavailable during a traffic burst. Public callers can reproduce the allowed Origin; CORS is a browser restriction, not authentication or abuse-proof identity control. Health proves the local process responds, not upstream liquidity or provider health. The static app and existing wallet flows remain available when this service is unavailable.

## Isolated MOF deployment

The isolated relay is deployed on the already approved MOF host in `/Users/administrator/apps/polkaswap-buy-xor-quotes`, with launchd label `org.polkaswap.buy-xor-quotes` and nginx snippet `/opt/homebrew/etc/nginx/snippets/polkaswap-buy-xor-quotes.conf`. No new host, DNS record or paid account was required. The existing aggregate collector, IPFS and SORA RPC services remain separate. A production-origin browser check at 13:41:33 UTC on 2026-09-25 returned OPTIONS 204 with the exact allowed origin and POST 200 JSON, with zero failed requests (`output/playwright/buy-xor-live-relay-synthetic-quote.log`). It used only a synthetic ETH → DAI quote, with no wallet, order or signature. The new static frontend was activated and its Bunny cache purged in the [25 September release](buy-xor-cost-release-2026-09-25.md).

Command:

```sh
/opt/homebrew/bin/node /Users/administrator/apps/polkaswap-buy-xor-quotes/scripts/ops/buy-xor-quote-relay.mjs serve
```

Example `/Library/LaunchDaemons/org.polkaswap.buy-xor-quotes.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>org.polkaswap.buy-xor-quotes</string>
  <key>UserName</key><string>administrator</string>
  <key>WorkingDirectory</key><string>/Users/administrator/apps/polkaswap-buy-xor-quotes</string>
  <key>ProgramArguments</key><array>
    <string>/opt/homebrew/bin/node</string>
    <string>scripts/ops/buy-xor-quote-relay.mjs</string><string>serve</string>
  </array>
  <key>EnvironmentVariables</key><dict><key>BUY_XOR_QUOTE_PORT</key><string>5189</string></dict>
  <key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>/dev/null</string>
  <key>StandardErrorPath</key><string>/dev/null</string>
</dict></plist>
```

Validate ownership and `plutil -lint`, then bootstrap only this isolated launchd label. Install `scripts/ops/buy-xor-quote-nginx.conf.example` inside the existing `mof.sora.org` HTTPS server, run `nginx -t`, and reload nginx. The example uses exact paths and does not modify `ws.mof.sora.org`. Do not put wallet data into a command-line argument or an operational log; any live validation payload must use public preview sentinel addresses and be passed through a protected file/stdin.

Readiness checks:

```sh
curl --fail --max-time 5 https://mof.sora.org/api/buy-xor/quote-health
curl --max-time 5 -i -X OPTIONS https://mof.sora.org/api/buy-xor/quote \
  -H 'Origin: https://polkaswap.io' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
curl --max-time 5 -i -X POST https://mof.sora.org/api/buy-xor/quote \
  -H 'Origin: https://polkaswap.io' -H 'Content-Type: application/json' --data '{}'
```

Expected results: health 200 with only service/version, preflight 204 with the exact production allowed origin and no credentials header, invalid request 400 without contacting the provider. Then submit a fixed public-sentinel quote payload to verify real 200 quote JSON and check a browser preflight/POST from the production page. Do not sign or purchase for relay validation. Static IPFS deployment still uses the repository runbook; serving this service alone does not update the frontend or prove the release is live.

## Focused verification

```sh
./node_modules/.bin/vitest run --config vitest.config.mjs --project unit-scripts tests/unit/scripts/ops/buy-xor-quote-relay.spec.ts
```

The 54 initial tests use mock fetch and local streams: fixed upstream/header/schema reconstruction; all allowed pairs; network/token/checksum rejection; exact uint256 bounds; preflight and credential rejection; malformed/oversized requests and replies; exact large numeric response preservation; generic upstream errors; request/provider timeout; client disconnect; and global rate/concurrency limits. They perform no network requests or transactions. Deployment/live verification evidence is separate from these unit tests.
