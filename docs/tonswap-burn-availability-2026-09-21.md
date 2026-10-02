# Burn availability independent of reward data

The user explicitly requested that slow blocks and indexer delays must never
prevent burning. This supersedes the freshness-based submission pause in the
earlier finality-feedback release.

The burn modal and submission no longer depend on a reward snapshot, snapshot
age, remaining rewarded allocation, or an earlier transaction awaiting finality.
The confirmation action is labelled **Burn XOR**. A complete existing snapshot
provides an advisory TS estimate; missing data displays an unavailable estimate
without inventing a reward. The entire amount can burn across or after the cap,
with zero TS for the excess. Trust burns remain excluded from rewards but may
be submitted, with an explicit zero-TS estimate.

Signing still validates the connected SORA mainnet genesis, the actual wallet
identity, the exact positive amount, and available XOR plus the transaction fee.
The balance check is independent of any reward quote. A submission in progress
is locked against duplicate clicks, but no indexer request keeps that lock held.
Reward allocation mathematics and all indexer evidence checks are unchanged.

Each pending transaction retains its own amount, hash and progress receipt when
the wallet submits another burn. Finalized eligible transactions reconcile only
against their exact account and hash in complete indexer data. A Trust receipt
finishes at chain finality with zero TS because that account is intentionally
filtered from the campaign snapshot. Local receipts never inflate reserved TS.

Validation includes real Vue-component flows in Chrome and WebKit at desktop
and mobile widths, with only wallet and indexer infrastructure mocked. Cases
cover stale, missing and hanging campaign reads; multiple pending burns; cap
crossing; a full cap; Trust zero rewards; and insufficient funds with no quote.
Evidence and deployment verification are retained in
`output/tonswap-always-burn`.

## Production verification

Deployed on 2026-09-21; final live verification completed at 13:36 UTC.

- Production CID: `QmeESy4YUpAsfogYoNZ8ctr7GtZ3HQ8vVPLpY1zfsQLjpE`.
- Production CIDv1: `bafybeihmeq5kjkk6zogs4r3ep3kec4qwsrfzywfyalwwwe6axg5t6hhhim`.
- Testnet CIDv1: `bafybeiez3sa4kxuvub5xsgw23xu6vj6qe5xrwa3idbfiayflojmfdr2ywq`.
- Both DAGs imported and recursively pinned on the dedicated MOF origin;
  pin integrity verification passed. Origin root, entry JS/CSS, and burn chunk
  returned the actual built files with HTTP 200 and no redirects.
- Bunny `polkaswap` zone 5860217 saved the production MOF origin and confirmed
  a full cache purge. The public root reports the new CIDv1. All 95 warmed
  entry and swap/burn dependency assets returned HTTP 200 and matched the build.
- 167 focused unit tests and 13 translation tests passed. All 28 real-component
  browser scenarios passed across Chrome/WebKit at desktop/mobile widths.
- Official WebKit verification passed. Independent live checks reached
  `Swap - Polkaswap` and `Burn - Polkaswap` at desktop and mobile sizes, with
  zero failed requests, HTTP errors, console errors, page errors, or GraphQL
  errors. Reward math, graph position, stable refresh status, and layout checks
  passed against the live finalized snapshot.

Compact live evidence: `output/tonswap-always-burn/production-verification-compact.json`.
No real wallet transaction was submitted during validation. The change removes
frontend availability restrictions; it does not change chain finalization time.
