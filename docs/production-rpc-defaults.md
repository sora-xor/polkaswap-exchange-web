# Production live RPC selection

The production `public/env.json` and matching root `env.json` expose both
`wss://ws.mof.sora.org` and `wss://mof2.sora.org` in the network node selector.
MOF2 was restored at the user's explicit request on 7 November 2026, superseding
the earlier single-node restriction. `NodesConnection` selects by measured
latency and retries configured defaults; list order does not establish a fixed
primary. Users can explicitly select either endpoint. Both endpoints must match
the configured SORA Nexus mainnet genesis before the wallet accepts a connection.
See the MOF RPC runbook in [AGENTS.md](../AGENTS.md).

The dedicated historical archive readers retain their exact canonical block,
genesis and runtime checks. Archive reads do not change the selected live wallet
RPC. Store configuration, its payment package, entitlement availability guards,
and Taira/development configuration are preserved.

On bootstrap, `setDefaultNodes` removes a persisted default that is no longer
configured unless the same address belongs to the user's custom-node list.
Explicit manual custom choices remain intact. Restoring MOF2 does not reset
wallet storage or rewrite automatic/manual selection behavior.

Release checks use fresh browser contexts without forcing local storage or
intercepting RPC traffic. They require a mounted route, the rendered connected
node, and an active socket to that same approved endpoint with a correlated
successful mainnet-genesis response. Both configured endpoints must be verified
explicitly as well. Existing route, HTTP, request and console error checks remain
required. Changes to production configuration require new source/environment
provenance and a new candidate build; do not mutate a frozen candidate build or
reuse its old pin.
