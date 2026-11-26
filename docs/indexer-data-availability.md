# Indexer data availability

The selected indexer supplies public statistics, market observations and personal
reward evidence through separate readers. A ready statistics worker does not
certify Points, referral rewards, burn claims or TS estimates.

## Personal rewards and estimates

Call `requireEntitlements` from `src/indexer/queries/capabilities.ts` before an
entitlement query and use the returned indexer session for every page of that
read. It captures the selected endpoint with network-only requests and verifies
the connected chain, capability schema, recovery policy and finalized checkpoint.
`requireEndpointEntitlements` provides the same admission for raw HTTP consumers.
Recheck admission when a flow requires it before presenting or using a result.

Treat `EntitlementsUnavailableError` as unavailable data, never as zero. Do not
substitute cached responses, wallet-local history, a raw GraphQL query, RPC data
or another endpoint. `pointOwnership.ts` additionally checks account ownership
and matching recovery evidence before exposing a Points history or balance.

The TONSWAP card alone may keep a reading verified within the last 60 seconds
while its replacement is in flight. Failure, expiry or a network/endpoint change
withdraws that reading. See [TONSWAP Burn](tonswap-burn.md) for the UI contract.

## Public observations

`publicBurnActivity.ts` reads finalized public burn events with explicit block
coverage. The ongoing recent interval and historical campaign interval are
displayed separately. Neither public count establishes a personal entitlement.

`network/archivedCounts.ts` merges verified UTC counter days only when coverage
and the selected recovery policy qualify them. Conflicting or incomplete days
remain unknown. See [network counter days](network-counter-days.md) and
[volume and fee history](stats-network-flow-history.md) for the interval rules.

The footer reads the canonical `chainState` checkpoint. Its bounded retry must
not substitute the price stream or an unbounded history scan for that checkpoint.

## Market observations

Explore readers paginate every bounded asset filter. The wallet's
`marketPrice.ts` accepts an exact qualified price, preserves a genuine zero and
small positive decimal quotes, and keeps unsourced values unavailable. The
`StatsCoreNotReadyError` marker identifies a price generation that is still
being reconciled; it does not authorize an older generation as a fallback.

Regression coverage is under `tests/unit/indexer/queries`,
`tests/unit/lib/soraneo-wallet/services/indexer`, and the Burn and Stats component
test directories. These tests mock providers and do not certify a live indexer's
retained history.
