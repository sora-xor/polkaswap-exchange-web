# Burn interface spacing — 2026-09-21

The Tonswap dialog placed its first input at the top of an overflow-clipped
content region. TokenInput's 2 px focus outline plus 2 px offset extended 4 px
outside that region, clipping the top of the ring beneath the header. The dialog
now reserves 8 px above its content at desktop and mobile widths, leaving the
complete focus ring visible. Keyboard and pointer focus are checked separately.

Burn cards reserve explicit inner padding. The Tonswap transaction history uses
neumorphic transaction panels and the existing burn icon. XOR burned and TS
reserved are grouped together; block and full copyable transaction ID sit below.
Pending receipts retain their confirmation status and transaction identity in
the same panel design. Statistic rows have space above and below their dividers.
History amounts keep their digits together; compact displayed rewards retain
the complete quantity in their title and accessible label. Tiles stack below
380 px instead of shrinking numbers further. The Nexus history panels use 16 px inner padding and their amount tiles use
12 px, replacing the cramped 8 px and 4 px insets.

The project's Sass breakpoint helper is also named `minmax`. Unescaped native
CSS grid expressions were being compiled into invalid media-query text, so the
browser discarded the intended amount columns. The two burn history grids now
preserve native CSS `minmax` explicitly; actual computed column sizes are checked
in both browser engines.

These are presentation changes. Campaign eligibility, curve/cap arithmetic,
signing, transaction tracking, and claim ownership are unchanged. Local focused
browser checks use the real components with mocked wallet/indexer data and do
not submit transactions. Verification evidence is retained under
`output/tonswap-focus-fix`.

## Release

Local verification passed: 56 component tests, focused ESLint, eight keyboard/
pointer focus checks, four card/history checks, and 12 full-cap/near-cap amount
checks across Chromium and WebKit at desktop, 390 px, and 360 px widths. The
focus outline has 4 px positive clearance inside the content clip. The longest
near-cap reward remains intact with its required cell padding.

- Production CID: `QmQFzQj5pqrot1U4B4EVSmBeyxmvBAhgkycb66Rf6R1kRt`
- Production CIDv1: `bafybeia4qw7lxufwj5gctv3c6qxlpymk3tyggi4c7vkrqzgchlqwpuaqz4`
- Testnet CID: `QmSxxUv41zgaiXVg84fxJWWYzWzFKNqmQCEtioK2AeEATJ`
- Testnet CIDv1: `bafybeicexpajslko6ctfgb6l2hclatmpew7moyhtx2yrf4mciltmxslvoe`
- Production origin: `https://mof.sora.org/ipfs/bafybeia4qw7lxufwj5gctv3c6qxlpymk3tyggi4c7vkrqzgchlqwpuaqz4`
- Host header: `mof.sora.org`

Production and testnet DAGs were imported and recursively pinned on MOF. All
120 retained root pins passed integrity verification. The candidate root,
entry JS, CSS, and burn chunk returned 200 with the exact built bytes and no
redirects. Bunny now points at the new production root, retains the required
origin options and edge rules, and displayed “Pull Zone was successfully
purged.” The live root reports the new CIDv1; 95 entry, swap, and burn assets
were warmed and byte-verified. Official WebKit and strict production checks passed for swap at 1440 px and
burn at 1440/390 px, with the new root CID, the expected titles, actual UI,
correct indexed statistics, padded cards, no overflow, zero failed requests,
and zero console/page errors.
