# Official live RPC browser evidence

The browser checker automatically requires `wss://ws.mof.sora.org` for every
`https://polkaswap.io` route. Omission of a flag cannot disable the gate and an
explicit `--expected-live-rpc` may name only that same approved root endpoint.
The existing official WebKit command therefore retains its required behavior:

```sh
IPFS_CHECK_SETTLE_MS=30000 node scripts/ipfs/check-browser.js --url 'https://polkaswap.io/#/swap' --no-spawn-gateway --browser=webkit
```

The same check is required for Bots, Store, Buy XOR and Get TS on the combined
candidate and after the validated origin update/purge. For a local candidate
URL, add `--expected-live-rpc=wss://ws.mof.sora.org` to the existing static
preview invocation. Other untargeted URLs retain the original checks and report
`officialMainnetRpcVerified: false`; they do not constitute official mainnet
endpoint evidence. The endpoint boolean also requires the final requested-route UI observation.
HTTP and console failures still fail the complete check independently.

The checker opens only the existing footer node reference. It requires no
visible preexisting footer tooltip, clicks the successful node reference, then
reads exactly one newly visible success popup and its direct description span.
The final popup address, reference connected class, actual hash path and title,
app children, bootstrap loader and required mounted feature are read together
in one locator callback after all footer presentation awaits. Earlier hydration
remains diagnostic; only this final atomic state drives the final hydration gate. This follows AppFooter's `node.address` default slot,
FooterPopper's click trigger and SPopoverPanel's conditional popup mounting.
An old version/indexer/other popup, a disconnected node, a hidden node or an
ambiguous popup cannot supply the selected address. It never clicks Test
latency, Select node, wallet controls or a transaction action.

On a fresh Swap visit, the app's full legal notice can cover the node reference.
The checker recognizes only that single visible app dialog with the original
terms/privacy links, unchecked acknowledgement, disabled acceptance button and
visible overlay. It sends the existing Enter presentation event only to the
successful footer node reference, then applies the same fresh visible popup and atomic DOM
checks. The legal notice remains visible and unaccepted; its controls and stored
approval are never changed. Other dialogs use the ordinary footer click path.

The exact `/buy-xor` and `/get-ts` routes intentionally omit AppFooter in their
immersive checkout layout. For these two routes only, the final DOM observation
requires one visible `.app-main--checkout` shell containing the exact visible
feature workspace, no `.app-status` footer, the requested hash and title, and no
bootstrap loader. Evidence reports `intentional-checkout-no-footer` with the
layout, footer absence and hydration observation explicitly. This exception
does not apply to Swap, Bots, Store, arbitrary routes or checkout subpaths. It
still requires the same active approved WebSocket and correlated mainnet genesis
response below; a missing, hidden or wrong checkout layout fails the check.

Before navigation, the checker observes genuine Playwright WebSocket events.
On the newest approved socket it requires a sent `chain_getBlockHash` request
with exactly `[0]`, a same-socket/same-type request ID response with JSON-RPC2,
no error and the exact production genesis. The current SDK initializes with
`getBlockHash(0)`. A created socket, HTTP200 probe, unmatched response, old log,
old socket's success or a response delivered after cleanup starts is insufficient.
The socket must still be active at the final observation boundary. Existing
financial chain/state/runtime/proof/accounting checks remain independent.

Evidence contains normalized/redacted endpoint identity, lifecycle sequences
and counts. It stores no raw RPC payload, result, parameters, accounts or
credentials. Request IDs are held privately only for bounded correlation.
Frames above 64 KiB and batch members beyond 64 cannot provide positive evidence;
pending tracked genesis requests are limited to 1,024. Socket, lifecycle, cleanup
and failure arrays have no aggregate cap, so the observer has no fixed total
memory bound. Footer click and popup rendering share a separate 2,500 ms
presentation budget, independent of the existing 200 ms content-poll interval.
Original hydration/load, route settling and test deadlines remain unchanged.
Mocked presentation-delay cases cover the action deadline contract. Each release
still requires the real browser checks; mocked results cannot establish browser timing.

The observer seals detached evidence synchronously before cleanup. Cleanup
closes are recorded separately and cannot retrospectively invalidate an active
snapshot. Active WebSocket errors remain fatal; only exact cancellation strings
delivered after cleanup starts are diagnostic. Other late socket errors remain
fatal. This delivery boundary does not prove what caused a late cancellation.

Active request aborts remain fatal, all cleanup diagnostics are retained, and late HTTP/console/
non-cancellation failures remain fatal. The final DOM observation precedes the
same synchronous WebSocket/HTTP observation boundary before any cleanup close.
Browser and Node event transport are asynchronous; this is a final observed DOM
state, not a proof that the page can never change after its observation.

Advanced explicit user custom RPC selection remains an application feature.
This fresh-context official release probe deliberately verifies the default
approved mainnet endpoint; it does not force storage, redirect traffic, change
environment configuration or grant wallet/signing authority.
