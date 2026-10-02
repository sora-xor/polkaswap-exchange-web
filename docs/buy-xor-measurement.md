# Buy XOR anonymous purchase-step counts

The existing `src/utils/telemetry.ts` forwards arbitrary events to an optional global client and otherwise writes to the console. Source inspection found no production collector installation or analytics consent setting. The new Buy XOR flow therefore uses a separate, strict counter transport. It neither installs nor changes a global telemetry client. The isolated collector and production frontend are deployed as part of the [25 September release](buy-xor-cost-release-2026-09-25.md).

## Browser integration

`useBuyXorFunnel({ enabled: () => buyingXor.value, route: () => view.value.source })` exposes:

- `consent`: a read-only boolean, false by default. `setConsent(boolean)` changes the explicit preference. Only `yes`/`no` is persisted in local storage; it is not an identifier. Storage denial keeps a choice in memory. Changes in another tab are observed.
- `privacyBlocked`: DNT/GPC information for the control. Every `record` call independently rechecks the current browser signals, which veto even a saved opt-in.
- `record(step, reason = 'none')`: submits a fixed enum event. No account, amount, transaction hash, provider error text, page URL, referral, timestamp, or arbitrary property is accepted.
- `delivery`: `disabled`, `pending`, `recorded`, or `unavailable`. `recorded` requires an actual HTTP 204; it does not indicate a completed purchase. Errors are isolated from wallet actions.

The parent renders an optional checkbox explaining aggregate purchase-step counts. Do not infer consent from visiting, connecting a wallet, accepting financial terms, or buying. The parent can observe consent to record a `view` when a user opts in, along with the current plan's already-restored submitted stages and currently verified progress. It does not enumerate unrelated wallet history or request a wallet action. Consequently these counters can include restored/current stages and do not represent only transitions that happened after opt-in. Disable the control, or explain its effect, when DNT/GPC applies.

The transport sends only from `https://polkaswap.io` to `https://mof.sora.org/api/buy-xor/events`. Development, testnet, and direct IPFS contexts do not send production observations. Fetch uses `credentials: omit`, `referrerPolicy: no-referrer`, no redirects, no cache, and a five-second timeout. There is no retry queue, beacon, session replay, analytics SDK, fingerprint or identifier. Uncertain network delivery is not retried because that could double count.

One mounted page attempts each `(step, route, reason)` tuple at most once. This suppresses 30-second quote refresh inflation and repeated receipt polling without identifying users. A remount/reload can count again. These are **step observations, not unique visitors, transactions, conversion rates or revenue**. Consent coverage, browser blocking, unavailable transport and public endpoint spoofing limit interpretation.

## Exact integration points

| Step | Call site/evidence |
| --- | --- |
| `view` | Buy XOR page mounted or explicit consent enabled; route may be `unset` |
| `quote_requested` | Parent receives preview state `loading` for the currently matching source/amount/asset |
| `quote_available` | Matching fresh preview is `ready` and feasible |
| `quote_blocked` | Matching preview is `blocked`; coarse `buyXorFunnelReason(preview.reason)` |
| `quote_unavailable` | Matching preview is `unavailable`; same coarse reason mapper |
| `wallets_ready` | Current required wallets and production network become ready |
| `provider_handoff` | Explicit card-widget opening; the child-owned TON external-provider link is not instrumented in this integration |
| `conversion_submitted` | Actual valid adapter-returned hash successfully bound to the current plan |
| `conversion_received` | Canonical exact Ethereum conversion receipt reports `received` |
| `conversion_failed` | The matching tracked conversion's canonical evidence reports `failed` |
| `bridge_submitted` | Exact reviewed bridge history row supplies its actual external hash |
| `bridge_received` | The tracked transfer's finalized SORA bridge evidence reports `received` |
| `bridge_failed` | The matching tracked bridge evidence reports `failed`; recovery may still be required |
| `swap_submitted` | Exact reviewed swap row supplies its actual chain hash |
| `swap_failed` | The matching tracked swap's finalized evidence reports `failed` |
| `xor_received` | Tracked swap has finalized canonical XOR-received evidence |

The full card-route review's current `checked` result also supplies quote observations: allowed is `quote_available`; budget/liquidity failure is `quote_blocked`; other explicit reasons are `quote_unavailable`. A silent invalidation without a reason emits no quote result. Reasons are reduced to the same coarse categories, and the shared tuple deduplication prevents a second count when the initial preview already reported that tuple.

Routes are `unset`, `ethereum`, `card`, `ton`, `sora`. Reasons are `none`, `amount`, `liquidity`, `fees`, `provider`, `network`, `other`; only blocked/unavailable quotes may carry a non-`none` reason. The TS campaign remains separate. The helper must never receive a full plan or receipt object.

## Collector and report

`scripts/ops/buy-xor-collector.mjs` uses Node 24 standard libraries, including SQLite and native TypeScript stripping for its shared schema import. It imports `src/features/misc/lib/buyXorFunnel.ts`; deploy both files preserving that relative structure. No npm/Yarn install is needed on MOF.

The service listens only on `127.0.0.1:5188`. Its write-only POST accepts the exact four fields `{v,step,route,reason}`, production Origin, JSON, and at most 256 bytes. Credentials and unexpected schemas are rejected. DNT/GPC request headers suppress collection. There is a global 600 accepted requests/minute limit and 32 connection cap, without per-IP keys. HTTP failures never echo the submitted payload.

SQLite stores only `(UTC day, step, route, reason, count)`. Each counter update is an atomic transaction. No request/event logs are produced by the Node service. Records older than the current 90 UTC-day window are deleted on startup, hourly, and when a new day's events arrive. The default process umask is 077. A fixed `verification` probe is stored separately and excluded from purchase rows in every report.

Environment:

```text
BUY_XOR_COUNTER_DB=/Users/administrator/apps/polkaswap-buy-xor/data/counters.sqlite
BUY_XOR_COUNTER_PORT=5188
```

Service command (use an isolated launchd service, not the SORA RPC or IPFS process):

```sh
/opt/homebrew/bin/node scripts/ops/buy-xor-collector.mjs serve
```

Minimal isolated `/Library/LaunchDaemons/org.polkaswap.buy-xor-counts.plist` (operator installs it after copying the two source files, creating the application directory, and verifying ownership):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>org.polkaswap.buy-xor-counts</string>
  <key>UserName</key><string>administrator</string>
  <key>WorkingDirectory</key><string>/Users/administrator/apps/polkaswap-buy-xor</string>
  <key>ProgramArguments</key><array>
    <string>/opt/homebrew/bin/node</string>
    <string>scripts/ops/buy-xor-collector.mjs</string><string>serve</string>
  </array>
  <key>EnvironmentVariables</key><dict>
    <key>BUY_XOR_COUNTER_DB</key><string>/Users/administrator/apps/polkaswap-buy-xor/data/counters.sqlite</string>
    <key>BUY_XOR_COUNTER_PORT</key><string>5188</string>
  </dict>
  <key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>/dev/null</string>
  <key>StandardErrorPath</key><string>/Users/administrator/apps/polkaswap-buy-xor/service.err.log</string>
</dict></plist>
```

Startup errors can describe service configuration; HTTP handlers never log request data. Do not add request logging to this service. With the approved operator's access, validate `plutil -lint` and the exact service command before bootstrapping this isolated label. No other service is stopped.

Install the exact-location snippet `scripts/ops/buy-xor-nginx.conf.example` in the existing `mof.sora.org` HTTPS server. Check `nginx -t` before reloading. It disables access/error logs and removes upstream IP, user-agent and referrer headers for these two routes. Do not expose the local database or report endpoint. No DNS change, new server or hosting purchase is required on the existing approved MOF host. The deployed snippet is `/opt/homebrew/etc/nginx/snippets/polkaswap-buy-xor.conf`.

The only public read route is `/api/buy-xor/health`, returning service name and schema version. Report over existing verified SSH access, locally on MOF:

```sh
BUY_XOR_COUNTER_DB=/Users/administrator/apps/polkaswap-buy-xor/data/counters.sqlite \
  /opt/homebrew/bin/node scripts/ops/buy-xor-collector.mjs report 2026-09-25 2026-09-25
```

## Required production evidence

1. Verify the health route is HTTP 200 and the exact allowed-origin JSON OPTIONS request is 204. Other origins, extra fields and oversize bodies must fail.
2. Read the local report, POST the fixed probe below, and read the report again. `verificationCount` must increase by exactly one while `rows` remains unchanged. Save the small response/report evidence without request headers containing visitor data.
3. Verify DNT/GPC and opt-out produce no browser event requests. Verify the production UI's explicit opt-in and fixed payload. Browser tests with mocked wallets do not establish a real purchase.
4. Observe actual opted-in production step counts separately; report zero when none have occurred. A probe demonstrates transport and persistence, not an acquired buyer or financial outcome.

```sh
curl --fail-with-body -i https://mof.sora.org/api/buy-xor/events \
  -H 'Origin: https://polkaswap.io' -H 'Content-Type: application/json' \
  --data '{"v":1,"step":"verification","route":"unset","reason":"none"}'
```

There is no public report, customer join, financial transaction verification, cash accounting or claim that anonymous observation ratios are cohort conversion rates. This implementation is a product-measurement mechanism, not a legal conclusion about consent requirements.

## Validation

Focused local checks pass: 26 browser-helper tests and 21 collector tests, plus scoped ESLint. Collector tests use temporary local SQLite databases and mocked HTTP streams; no external requests, purchases or wallet signing occur. Run the two Vitest projects separately because this repository disables browser Node polyfills based on the selected project:

```sh
yarn vitest run --config vitest.config.mjs --project unit tests/unit/features/misc/buyXorFunnel.spec.ts
yarn vitest run --config vitest.config.mjs --project unit-scripts tests/unit/scripts/ops/buy-xor-collector.spec.ts
```

These checks validate the implementation. The separate production evidence above is required to establish real collection.

That production evidence was captured on 25 September 2026. The collector probe incremented `verificationCount` exactly once with unchanged empty purchase rows (`output/tonswap-growth/buy-xor-cost-release/counter-verification.json`). The activated frontend passed all seven consent/payload scenarios in both WebKit and Chromium; all browser event POSTs were intercepted locally to avoid contaminating production observations (`output/playwright/buy-xor-measurement/report.json`). These checks establish the deployed mechanism, not any acquired buyer.

The scoped locale update adds 35 strings across the 31 catalog files: card-route review (32) and the optional aggregate-count control (3). Ordinary translations are machine-assisted with placeholders and asset symbols protected. Specialized `akk`, `egy`, and `pis` additions use the repository's dictionary/fallback workflow; script and placeholder checks do not establish faithful financial meaning. These additions still need expert semantic review. The saved flat-key baseline audit verifies that unrelated catalog values were preserved.
