# Tonswap burn eligibility and confirmation feedback — 2026-09-21

This follow-up excludes SORA Trust account
`cnRus2m2Rn776v88H5RUtyiaXtr3daN6ePn6yenLKepx1SqYo` from TS rewards, every burn
total, cap usage, and movement along the reward curve. SS already used this
exclusion; both frontend campaigns now share the same AccountId32 comparison.
SS58 prefix changes and hexadecimal encodings do not change eligibility.
The indexer's TS snapshot also filters this account, while keeping raw burn
history and continuous finalized coverage for audit.

The reported transaction
`0x0e302df6e88e4c0a6f208df146a3bab41f1d3d39de0198f6653f2b8dc0749896`
burned 2 XOR successfully in block 27,721,093, extrinsic 1. It was correctly
indexed and reserves 99.999948669894379752 TS. Recorded API/chain fixtures and
an offline parser/allocation regression are under `tests/fixtures/tonswap` and
`tests/unit/indexer/queries/tonswapBurn.fixture.spec.ts`.

Six paired RPC/indexer observations showed zero finalized-head indexing lag.
The finalized checkpoint's age was 24–42 seconds, and the best head was two
blocks ahead. This is observed finality lag, not a guaranteed confirmation time.
No attribution repair or chain replay was needed. The frontend previously
refreshed at 30-second intervals without tracking the submitted burn's lifecycle.

The UI now follows the specific signed transaction through submission, inclusion,
final confirmation, and indexed TS reservation. Wallet/history and block updates
trigger immediate reconciliation, with short retries while indexing catches up.
The burn amount and hash remain visible; rewards remain based on complete
finalized data. The claim notice is bold and reads exactly:

> TS will be claimable on tonswap.org at launch.

## Backend deployment

The runtime overlay changes only `src/tonswap-burn.ts`,
`src/graphql/resolvers.ts`, and their compiled JavaScript. The current release
was cloned to
`release-2026-09-21.tonswap-burn.1049c02.trust-exclusion`, validated against
before/after SHA-256 digests, and activated by an atomic symlink switch followed
by a graceful restart of the verified `org.polkaswap.indexer` service.

Both backend builds passed; 7 focused exclusion/pagination tests passed per tree.
The service became healthy with zero lag, and a complete snapshot through block
27,721,189 retained the user's 2 XOR burn with no Trust rows. The source patch is
[tonswap-indexer-trust-exclusion.patch](tonswap-indexer-trust-exclusion.patch).
Local public verification evidence is under `output/tonswap-trust-feedback`.

## Interface and graphics

The compact confirmation dialog gives the XOR input and TS estimate visual
priority, shortens supporting copy, and uses a full-width 46 px action. The
account history lists every finalized burn from the complete campaign snapshot
with its own amount, reward, block, and copyable transaction hash. An unresolved
receipt is visible immediately, before the next network read, and becomes the
indexed row without duplication.

The campaign marks render as blue Tonswap-shaped and red SORA-shaped WebGL fire.
Actual GPU browser tests verified changing frames, both logo shapes, static
reduced-motion fallback, and recovery from simulated context loss. GPU animation
is limited to 224 × 224 pixels and 30 fps, stops off-screen/backgrounded, and
falls back on constrained devices. The shader uses browser-rasterized official
SVG artwork rather than a replacement logo.

The final TS lifecycle/history suite passed 56 tests. The preceding combined burn
regression passed 197 tests across 14 suites; the new graphics integration gate
passed 103 tests across 4 suites. All 13 translation tests passed after updating
31 locale catalogs. Changed source and tests passed targeted ESLint. Actual
component previews on desktop and 390 × 844 mobile had no horizontal overflow,
0 browser errors, and 0 warnings; mobile dialog dimensions were 358 × 645.7 px.
Screenshots and graphics tests are retained under `output/playwright`, with the
isolated preview documented in `output/playwright/tonswap-preview/verification.md`.
No real transaction was submitted for validation.

## Frontend release

- Production CID: `QmdxU4jvDTprTyPhdAXsGzcQoTtQZZssvHLQaDSTMhfSUB`
- Production CIDv1: `bafybeihibqwxg3eqvllxkbkr2zqy7qgp24ddwmfxgppoulos6b3ayeootq`
- Testnet CID: `Qmeb6Ys5TZTyfc1dkLoUhzVagJpK8DNoiR3n4ReeoWRkdc`
- Testnet CIDv1: `bafybeihrnzlrw3l3savhu7rxyz63em6un2fy5yfyydcpx4gtois3chpem4`

Both DAGs were imported and recursively pinned on the dedicated MOF origin;
all 118 retained recursive pins passed integrity verification. Production root,
entry JS, CSS, and BurnPage chunk returned 200 with correct content types and
byte-identical build output before the switch. Bunny zone 5860217 saved
`https://mof.sora.org/ipfs/bafybeihibqwxg3eqvllxkbkr2zqy7qgp24ddwmfxgppoulos6b3ayeootq`
with host `mof.sora.org`, then the full zone cache was purged. Required origin,
cache, and CSP/request-header rules were verified unchanged.

Live root verification returned the new CIDv1 and byte-identical HTML; 95 entry,
swap, and burn dependencies were warmed sequentially and matched the build.
The official WebKit check passed. Strict WebKit captures passed for desktop swap,
desktop burn, and 390 px mobile burn, each with 0 failed requests, 0 HTTP errors,
0 console errors, and 0 page errors. Swap reached `Swap - Polkaswap` with real
UI. Burn reached `Burn - Polkaswap`; both fire components, exact launch notice,
cap/start block, live statistics, official logo artwork, and overflow/sidebar
geometry checks passed. Current live totals were verified against the snapshot:
4 XOR and 199.9997 displayed TS reserved across two qualifying burns.

Final indexer verification remained healthy with zero finalized-block lag through
block 27,721,425. The originally reported burn remained present and Trust burns
were absent. Full release, origin, live asset, backend, and strict browser evidence
is under `output/tonswap-trust-feedback`. The isolated preview server was stopped
after screenshot review. Deployment is complete.
