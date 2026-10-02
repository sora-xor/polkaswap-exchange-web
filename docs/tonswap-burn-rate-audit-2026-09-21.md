# TS rate verification and live curve refresh — 2026-09-21

The campaign's marginal reward rate is `r(B) = 50 - 45B / 1,753,357`,
where `B` is finalized eligible XOR burned in this campaign, capped at
1,753,357. Time does not reduce the rate. A burn spanning eligible interval
`[B, B + A]` earns the area under the rate curve, equivalently
`A * (r(B) + r(B + A)) / 2`. The implementation floors cumulative entitlement
to one TS atom and subtracts those entitlements so splitting a burn does not
change the combined reward. Its full-cap integral is 48,217,317.5 TS.

An independent Decimal calculation of the complete two-page live snapshot at
block 27,724,139 found 20 qualifying burns totaling 9,420.4 XOR. The marginal
rate was 49.758224936507511020… TS/XOR, with
469,881.191095937678407762 TS reserved. The trust account was absent. This is
0.5372779188…% of the cap, so the marker moves only 1.7193 SVG units along a
320-unit horizontal scale. The full schedule remains fixed; the current marker
and rate change with finalized burns. Reward math and eligibility are unchanged.

The prior block-triggered refresh ran only while the viewer had a pending burn;
other viewers waited for the 30-second interval. Public campaign statistics now
refresh on new chain blocks and every five seconds while visible, and catch up
when the tab becomes visible or focused. Reads are coalesced while a request or
signing operation is active, and listeners are removed on unmount. Pending burns
retain their two-second reconciliation and transaction evidence. The grouped
burned total also shows percentage of the cap using exact FPNumber arithmetic
and the existing four-decimal truncation (0.5372% for this snapshot).

Evidence is retained under `output/tonswap-rate-audit`. Unit coverage includes
public block updates without a wallet, polling without block events, tab return,
hidden-tab behavior, overlapping triggers, listener cleanup, reactive graph
coordinates, and percentage states. Local browser verification uses mocked
wallet/indexer data and never submits a transaction.

## Deployment

152 focused unit tests and 13 translation tests passed; target ESLint is clean.
Chrome and WebKit checks at 1440, 390, and 360 px verified block, timer, and focus
updates with the wallet disconnected. All states updated the same graph instance;
percentage, padding, and overflow checks passed. Root reviewed the mobile renders.

- Production CID: `QmfVY5U98JFKuym9PjhLXZLaHXaLPRa4Fkiw3eq52KF8t7`
- Production CIDv1: `bafybeih63vubifc4hntumtqstyiv4yqrhwfidlpmdujxnzzks46lq7pqqa`
- Testnet CID: `QmWxqyYMGDPBk8kGhRyah16rDTm3566UEfCNA8hV9VCLkn`
- Testnet CIDv1: `bafybeieaemskofzma25qdsr7pv7aed6bj264twfsrhywmimlt5iubgwob4`
- Origin: `https://mof.sora.org/ipfs/bafybeih63vubifc4hntumtqstyiv4yqrhwfidlpmdujxnzzks46lq7pqqa`
- Host header: `mof.sora.org`

Both DAGs were replicated and recursively pinned on MOF; all 130 retained pins
passed integrity verification. The candidate origin returned exact built HTML,
entry JS/CSS, and burn chunk bytes with 200 responses, correct MIME types, and no
redirects. Required Bunny options and header rules were verified. Both origin
save and full-zone cache purge success confirmations were observed. The live root
served the new CID, and 95 required assets were sequentially warmed and verified.

Official WebKit verification passed. Strict live WebKit checks for swap at
1440 px and burn at 1440/390 px reached the correct page titles with zero failed
requests, HTTP errors, console errors, or page errors. Both burn contexts fetched
eight public snapshots during the observation window, and their rates, totals,
percentages, and marker positions matched the finalized indexer data. Root
reviewed the production mobile curve screenshot. The release is complete.
