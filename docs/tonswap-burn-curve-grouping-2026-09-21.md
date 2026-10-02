# Reward curve grouping — 2026-09-21

The numeric axis origin sat directly above the generic “XOR burned” label,
which could be read as a current total of zero. The endpoints now use their
explicit campaign roles (“At the start” and “At the cap”), while current burned
XOR and the reward cap live in separately labeled summary groups. Each quantity
stays adjacent to its own label inside a padded region, separate from the plot.

This applies the principles of [proximity](https://www.nngroup.com/articles/gestalt-proximity/)
and [common region](https://www.nngroup.com/articles/common-region/): spacing and
boundaries should reinforce the intended relationship between a label and its
value. Responsive checks must assess that relationship, not only overflow.

The chart still uses the finalized eligible burn total and exact reward-rate
helpers. No campaign, allocation, or signing behavior changes. Existing locale
keys cover the labels. Local checks use mocked data and send no transactions.
Evidence is under `output/tonswap-curve-grouping`.

## Verification and release

The 11 curve tests and target ESLint pass. Chromium and WebKit desktop,
390 px, and 360 px checks cover actual six-XOR progress, start, midpoint, cap,
and unavailable data. Final checks also confirm near-cap numbers remain intact
and within the grouped panel; its columns stack below 380 px. Root reviewed
mobile screenshots before deployment. Existing translated labels are reused.

- Production CID: `QmdRcvZgA3TGRHuTxUUCRM5yBEYPZTqyRpngjrhjb7z2V1`
- Production CIDv1: `bafybeihaeuyhx63ssrb52426uxglwmfkufqwn7kfoixfedxcn6aosv5hqq`
- Testnet CID: `QmTUAwxC2S2GxuHgrz1YCxZyNYrMYVbXyrtrtT6ghx9WYy`
- Testnet CIDv1: `bafybeicmg6ypvivocittrev64oo3fyio7nivwheky6ydiihjteh2g5nbii`
- Production origin: `https://mof.sora.org/ipfs/bafybeihaeuyhx63ssrb52426uxglwmfkufqwn7kfoixfedxcn6aosv5hqq`
- Host header: `mof.sora.org`

Both release DAGs were imported and recursively pinned on MOF, and all 124
retained pins passed integrity verification. Root, entry JS/CSS, and burn chunk
returned 200 with correct content types and exact built bytes, without
redirects. Bunny displayed both origin-update and full-zone-purge success
confirmations. The live root serves the new CIDv1. All 95 required assets were warmed and byte-verified. Official WebKit and
strict production checks passed for swap at 1440 px and burn at 1440/390 px.
The expected titles and new root CID were present; grouped totals matched the
current finalized snapshot; axis-role, padding, and overflow checks passed.
All routes reported zero failed requests, HTTP errors, console errors, and
page errors. Root reviewed the production curve screenshot after dismissing
the orientation notice. Live screenshots dismiss
the unrelated browser orientation notice through its Close button before
capturing the curve itself. Local visual evidence is under
`output/tonswap-curve-totals`; deployment evidence is under
`output/tonswap-curve-grouping`.
