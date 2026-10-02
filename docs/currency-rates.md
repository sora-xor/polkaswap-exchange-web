# Fiat reference rates

Both the exchange and embedded wallet use `src/services/currency/rates.ts`
for daily DAI-relative fiat reference rates. The static IPFS application fetches
[the currency-api DAI snapshot](https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/dai.min.json)
from jsDelivr with CORS enabled. These are daily indicative conversions for
fiat displays, not live execution quotes. DAI/USD is the published rate; it is
not assumed to equal one. SORA prices and swap quotes retain their existing
indexer and chain sources.

The previous direct CoinGecko request intermittently returned HTTP 429 without
`Access-Control-Allow-Origin`, causing browser CORS failures. On 2026-09-15 the
replacement served HTTP 200 with `Access-Control-Allow-Origin: *` and covered
all 49 selectable currencies other than chain-local XOR, including VEF, XAG,
and XAU. There is no credential, proxy, new server runtime, or dependency.

## Refresh and failure behavior

- Existing adapters refresh after 15 minutes and share one in-flight request.
- Requests have a ten-second timeout and a one-minute retry backoff on failure.
- Each refresh revalidates the browser cache: the provider's `@latest` URL can
  advertise a seven-day browser TTL. CDN freshness is checked separately through
  the payload's UTC date; snapshots more than three calendar days old or dated
  in the future are rejected.
- Accept only positive finite three-letter rates, an exact DAI base of one,
  and a valid USD conversion. No token-amount arithmetic is performed here.
- A failed refresh can reuse cached rates fetched within three days. It keeps
  their original fetch timestamp and provider publication timestamp rather than
  marking stale values as refreshed. Both age limits must pass, so a recently
  fetched snapshot cannot outlive the provider's publication-age limit. Legacy
  caches without source metadata retain the fetch-age bound.
  A cache outside this bound follows the existing DAI-only display fallback.

## Verification

`tests/unit/services/currency/rates.spec.ts` covers payload validation, real
DAI-relative values, concurrency, HTTP failure/backoff, timeout, and recovery.
Both adapter suites cover cache age and fallback behavior. The IPFS browser
checker treats CoinGecko CORS and request failures as errors; they are no longer
exempted from release validation.

Source and delivery documentation:
[currency-api](https://github.com/fawazahmed0/exchange-api),
[publishing script](https://github.com/fawazahmed0/exchange-api/blob/main/currscript.js),
[jsDelivr caching](https://github.com/jsdelivr/jsdelivr#caching).
