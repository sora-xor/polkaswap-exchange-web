# Production live RPC selection

The production `public/env.json` and matching root `env.json` expose only
`wss://ws.mof.sora.org` as an automatic live default. `NodesConnection` selects
by measured latency and retries configured defaults; placing an endpoint first
in a multi-node list does not make it a fixed primary. A failed production
primary must remain a failure rather than silently opening the archive node.
See the MOF RPC runbook in [AGENTS.md](../AGENTS.md).

The existing dedicated `mof2.sora.org` historical archive readers remain
unchanged. Buy XOR / Get TS pruning recovery retains its exact canonical block,
genesis and runtime checks, and Bots retains its raw historical verification.
Archive reads do not select the live wallet RPC. Store configuration and its
payment package are unchanged. Taira and development configuration are preserved.

On the next bootstrap, `setDefaultNodes` removes a persisted default that is no
longer configured unless the same address belongs to the user's custom-node
list. An old automatically selected archive default therefore cannot remain the
silent live selection. Explicit manual custom choices remain intact. This is
configuration migration through existing behavior, not a storage reset or a
rewrite of generic automatic/manual selection.

Release checks use a fresh browser context without forcing local storage or
intercepting RPC traffic. A mounted route and an HTTP200 from ws.mof are
insufficient: the checker must also establish the current successful selected
endpoint and a live ws.mof WebSocket at the final observation boundary. All
existing route, HTTP, request and console error checks remain required.
The output-only checker proposal describes that additional gate; this document
does not claim it has been implemented or passed. A changed production config
requires new source/environment provenance and a new candidate build; do not
mutate a frozen candidate build or reuse its old pin.
