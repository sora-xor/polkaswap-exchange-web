# Target-runtime state transport

`scripts/bots/goal-target-runtime-transport.ts` acquires raw storage claims
for the separately designed [target-runtime study](bots-target-runtime-study.md).
It is a Node research adapter, not browser functionality or trading authority.
It has no default network transport: callers must provide `fetch` and an
awaitable `retain` journal. The only endpoint is the existing historical
archive at `https://mof2.sora.org/`; live production RPC configuration is
unaffected.

The caller supplies a fixed source block hash, up to seven point keys and the
exact XST storage prefix from the [state codec](bots-target-runtime-state.md).
Derive pool account keys from genuine `PoolXYK.Properties` bytes at the same
block. Authenticate canonicality, finality, genesis, runtime and metadata
upstream. Neither this transport nor its journal proves those properties.

Acquisition reads the point values, prefix pages of 64 keys, each member's
value, a terminal empty prefix page, and the actual first global successor
after the last member (or the prefix when empty). It accepts at most 256
members, five prefix pages and 269 total RPC requests. It does not retry,
follow redirects, send credentials, change blocks or substitute defaults.

Every request records its exact JSON body, original response bytes, body
digest, HTTP status and request times. The journal must complete before the
next request or return. Responses are bounded to 256 KiB each and 8 MiB total;
requests have an absolute deadline of at most 30 seconds and acquisition has
a ten-minute deadline. A failed request gets a separately bounded five-second
journal cleanup opportunity. Invalid UTF-8, interrupted and oversized bodies
retain their bounded raw prefix as failure-only evidence; they never become
usable state. Cancellation or journal failure stops further acquisition.

Pass successful receipts into `codec.verify({ sourceBlock, receipts })`.
The codec independently rejects incomplete pagination, missing values,
malformed envelopes and contradictory successor claims before the read-only
WASM host can consume the state. Saved JSON must be verified again after load.

Eighty transport tests cover pagination and the maximum request count,
explicit nulls, failure retention, deadlines, cancellation, journal ordering,
input mutation and hostile accessors. An additional integration test passes
invented network responses through this transport, the codec and the exact
target131 quote/fee WASM APIs with networking denied. No real historical
market state was acquired for these tests.
