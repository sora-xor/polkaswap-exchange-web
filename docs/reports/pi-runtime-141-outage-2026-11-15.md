# Pi stats API outage after SORA Nexus runtime 141 — diagnosis, 15 November 2026

From 13 November 07:02 UTC until about 17:10 UTC on 15 November,
`https://pi.soramitsu.io/graphql` returned `502 Bad Gateway` for every request.
During that time Public Stats, Explore, Burn totals and Points activity were
unavailable on polkaswap.io. The static IPFS origin, Bunny and both production
RPC nodes stayed healthy. The diagnosis below changed nothing on the host; every
check was read-only. The restoration is summarised at the end.

## Timeline (UTC)

| Time | Event |
| --- | --- |
| 12 Nov 18:11:24 | SORA Nexus mainnet enacts the runtime upgrade from spec 138 to spec 141 (transaction version 134) at block 28,343,400. `state_getRuntimeVersion` reports 138 at block 28,343,399 and 141 at 28,343,400. |
| 12 Nov 18:11:27 | The writer logs `Runtime version updated to spec=141, tx=134`, plus the new `AuthorizeCall` signed extension and runtime APIs BeefyApi/6, MmrApi/3 and SessionKeys/2. |
| 12 Nov 18:11:46 onward | It repeatedly logs `Failed to index finalized block 28343400 Error: Recovery metadata cache witness mismatch` and indexing stops advancing. |
| 13 Nov 07:01:57 | The process exits with status 1 on the same error, thrown from `account-creations-20261111/release/dist/src/recovery-metadata-cache.js:87`. |
| 13 Nov 07:02:08 | systemd reaches the start limit (`Start request repeated too quickly`). `pi-canonical-stats-live.service` is now `failed` and nothing listens on `127.0.0.1:4039`. |
| 15 Nov 15:14 | Public POSTs and the CORS preflight return `502`. The read-only rollback `pi-canonical-hold.service` (port 4010) is active but not routed. |

## Cause

The writer decodes each block with metadata read at the parent state. It
accepts that metadata only if its BLAKE2-256 hash matches the witness pinned for
that block range in the approved recovery policy (`src/recovery-metadata.ts`,
`recoveryMetadataWitness`, `src/worker/chain.ts` `fetchBlockPayloadFromApi`).
No reviewed witness exists for the spec-141 metadata. The writer therefore fails
closed, as designed.

A plain restart cannot fix this. Restoring the API needs:

1. a reviewed spec-141 witness range at the correct boundary;
2. a check of the 138→141 changes that affect decoding, including the
   `AuthorizeCall` extension;
3. any policy change the user must authorize;
4. a controlled rollout under the existing runbooks.

Entitlements are a separate matter. Personal Points, burn claims and TS
estimates stayed unavailable before this outage too, because the canonical
writer does not certify entitlement history. The 1 November fail-closed guards
remain correct and unchanged.

## Release-gate impact

The official WebKit checker on the live site (CID
`bafybeidalmpedv6tpwjcu6kuimrg5ulwiwniib6m2izzbxyqzcehoavazq`) mounts every page
with the correct title. It still fails:

| Route | Console errors | Failed requests |
| --- | --- | --- |
| `/#/swap` | 93 | 31 |
| `/#/burn` | 90 | 30 |
| `/#/stats` | 180 | 60 |

The Swap failures are 28 Pi `/graphql` requests (`502`) and three
`sorametrics.org` requests. `sorametrics.org` returns `200` for `/tokens` and
`/staking/recent-blocks` but no `Access-Control-Allow-Origin` header, so browsers
block both. The 11 November release passed with zero failures, so both breaks
happened after that release.

While Pi returned 502, the zero-failure live gate could not pass for any release.
It passed again once Pi answered (see Restoration).

## Restoration

At the user's go-ahead, a separate session reviewed a spec-141 witness layer and
rolled it out through the indexer runbook. Its record is in the polkaswap-indexer
repository. By about 17:10 UTC on 15 November, `/graphql` answered `200` again and
sent the CORS preflight for `https://polkaswap.io`.

At 17:30 UTC the writer was still catching up: block 28,348,406 indexed of
28,381,170 finalized, with `statsReady` and `historyReady` still false. Recent
Stats intervals stay unavailable until it is fresh.

The official live WebKit checker then passed on `/#/swap`, `/#/burn` and
`/#/stats`, each with zero failed requests and zero console errors. Its output is
in `output/playwright/pi-outage-20261115/after-restore/`.

`sorametrics.org` still sends no CORS header. The wallet store asks it for token
prices only when the indexer returns no data (`src/stores/wallet/index.ts`). The
break therefore shows only while Pi is down, and during an outage there is no
working price fallback.

## Evidence

- Live checker output: `output/playwright/pi-outage-20261115/{swap,burn,stats}.log`.
- Service state, effective drop-ins (through `zz-112-account-creations.conf`) and
  journal excerpts were read through the approved `target_ssh.py` route with
  `systemctl show`, `systemctl cat` and `journalctl`. No credential material was printed.
- Runtime boundary: binary search with `chain_getBlockHash` and
  `state_getRuntimeVersion` against `https://ws.mof.sora.org/`. The block
  timestamp was read from `Timestamp.Now` at block 28,343,400.
