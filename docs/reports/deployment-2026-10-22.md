# Polkaswap deployment — 22 October 2026

Status: **deployed and publicly verified**. The rebuilt release passed all five candidate and public WebKit checks, was separately replicated for production and testnet, and passed full origin pin integrity and complete-body checks. Bunny's saved origin persisted after a fresh page reload, the full pull-zone cache was purged, and all 410 sequential public delivery checks passed. The final browser title was `Swap - Polkaswap`, with the new production CID, zero failed requests and zero console errors.

## Release identity

| Artifact | Previous deployed CIDv1 | Candidate CIDv1 |
| --- | --- | --- |
| Production | `bafybeiadarzvjgpyrs2dl5irgaevsogf5gszbaiwvaz7mgriap3bhx4l3i` | `bafybeicjwe24zlmugkwtmtue6ynybsyqfcnzfjyeipdbonsinv7gt2ig7i` |
| Paired testnet | `bafybeihrbwmcavfmrqwi2q3ceidypfzhkjl4b3qvliflrwgr46i45i7nxe` | `bafybeice6og6ia5vtmx7bj4vnqjo6kotrqlplr6sse4pomwzwnqip2mumy` |

Production CIDv0 is `QmTJKCP5CvGraU73t5WoLYShr6zJZ13t3Uq3HJd7jPgXxM`; testnet CIDv0 is `QmSyoqJWcgEnQ738Zyh3q5yciLdAzWzCLx8T3kSQadEkUM`. The production Bunny origin is `https://pi.soramitsu.io/ipfs/bafybeicjwe24zlmugkwtmtue6ynybsyqfcnzfjyeipdbonsinv7gt2ig7i`, with Host header `pi.soramitsu.io`. The [publisher log](../../output/playwright/liquidity-deploy-20261022/publish.log) and [CID receipt](../../output/playwright/liquidity-deploy-20261022/release-cids.json) retain both publications.

## Source isolation and feature preservation

The release fixes the remove-liquidity percentage field: its numeric container now reserves enough width for `100` before the `%` suffix, and the slider wrapper spans the available width. The compiled CSS and form chunk passed the [compiled-fix check](../../output/playwright/liquidity-deploy-20261022/compiled-liquidity-fix.json).

The candidate was assembled in `/private/tmp/ps-liquidity-release-20261022` from the [October 10 deployed source manifest](../../output/playwright/redeploy-20261010/source-evidence.json), at baseline HEAD `0fbddf49939e2936b48daece66aaa53fb513ca5d`. The original checkout's existing edits were preserved. Six bot source files, 31 locale catalogs, and five bot test files were restored to their exact deployed hashes in the isolated directory, excluding the unshipped live-only bot changes. The percentage fix and its new regression suite were then retained. The [baseline-restoration receipt](../../output/playwright/liquidity-deploy-20261022/baseline-restoration.json) records all 42 verified restorations.

Across 9,292 recorded build inputs, the only change from production is `src/modules/pool/components/RemoveLiquidity/Form.vue`. Swap, Bots, Store, Buy XOR and Get TS retain their shipped assembly, configuration and payment dependencies. The [feature-provenance receipt](../../output/playwright/liquidity-deploy-20261022/feature-provenance.json) records these comparisons, including the unchanged production configuration, Store configuration and `@sora/sora-pay` 0.2.2 archive. The payment archive SHA-256 remains `096edc1cddd706902bde50ed83feb6b80c374caf9b692ead30899665d7842a4a`.

The candidate [source manifest](../../output/playwright/liquidity-deploy-20261022/source-evidence.json) records 13,085 files, including the new regression test. The retained [source archive](../../output/playwright/liquidity-deploy-20261022/source-snapshot.tar.gz) is 872,034,689 bytes with SHA-256 `a6c5cc9aed9b852783eb8cf6926e6b120b9e8f4328d5e628b749dc5305bbbdde`; its [receipt](../../output/playwright/liquidity-deploy-20261022/source-archive.json) records Node 26.12.0, pinned Yarn 4.10.3 and app version `1.46.0-0fbddf49939e`. The [post-build source verification](../../output/playwright/liquidity-deploy-20261022/source-verification.json) found no changed candidate files.

## Candidate validation

| Gate | Result |
| --- | --- |
| Focused remove-liquidity/input unit suites | 8 files, 32 tests passed |
| Translation consistency | 4 files, 13 tests passed |
| Combined static feature parity | 839 reachable modules, 8,576 relative imports checked, all 45 required route fragments and five page bindings present |
| Compiled percentage layout fix | Numeric container width, full-width slider wrapper and compiled form markup verified |

The [focused unit log](../../output/playwright/liquidity-deploy-20261022/candidate-focused-unit.log), [translation log](../../output/playwright/liquidity-deploy-20261022/candidate-translation.log) and [static parity receipt](../../output/playwright/liquidity-deploy-20261022/static-feature-parity.json) retain the results. Unit validation for this release was focused on the affected form and input controls. Existing readonly-computed template-ref warnings appeared in the form suite without failing its tests.

All five candidate checks used the official WebKit checker against the frozen production build before promotion. Each remained on its requested route, mounted its feature UI, removed the bootstrap loader, verified the official mainnet RPC and reported zero failed requests and zero console errors. The [candidate summary](../../output/playwright/liquidity-deploy-20261022/candidate-summary.json) links each report and screenshot.

| Candidate route | Final title | Failed requests | Console errors |
| --- | --- | ---: | ---: |
| `/#/swap` | Swap - Polkaswap | 0 | 0 |
| `/#/bots` | Bots - Polkaswap | 0 | 0 |
| `/#/store` | Store - Polkaswap | 0 | 0 |
| `/#/buy-xor` | Buy XOR - Polkaswap | 0 | 0 |
| `/#/get-ts` | Get TS - Polkaswap | 0 | 0 |

## Separate DAG replication and origin delivery

The publisher used `IPFS_PUBLIC_GATEWAY_URL=https://pi.soramitsu.io`. Production and testnet were exported separately and imported into the approved origin at `207.254.29.218`, using the isolated offline `pi-ipfs` repository from [the origin runbook](../ipfs-origin.md). Both imports and recursive root pin checks passed. Full pin integrity reported all 11 retained pins `ok` in the [integrity log](../../output/playwright/liquidity-deploy-20261022/origin-pin-integrity.log).

| Retained CAR | Bytes | SHA-256 |
| --- | ---: | --- |
| [Production](../../output/playwright/liquidity-deploy-20261022/production.car) | 42,847,894 | `5d0435976b8554ed169e50686902387baf56e8d9df144dc398f0676e012506a4` |
| [Testnet](../../output/playwright/liquidity-deploy-20261022/testnet.car) | 42,846,057 | `f385dc54c585b6c8dfd51399674e03978fbf6baa9403b59c20346e28182dee5b` |

The [CAR receipt](../../output/playwright/liquidity-deploy-20261022/car-evidence.json), separate [production import](../../output/playwright/liquidity-deploy-20261022/import-production.log) and [testnet import](../../output/playwright/liquidity-deploy-20261022/import-testnet.log), and [production](../../output/playwright/liquidity-deploy-20261022/pin-production.log) and [testnet](../../output/playwright/liquidity-deploy-20261022/pin-testnet.log) root listings retain the replication evidence.

All 15 origin requests returned HTTP 200 with no redirects, appropriate content types and complete bodies matching frozen build sizes and SHA-256 hashes. These cover production root/index, configuration, Store configuration, entry JavaScript/CSS, favicon/loader, all five page chunks, and the paired testnet root and configuration. The [origin delivery receipt](../../output/playwright/liquidity-deploy-20261022/delivery-origin.json) retains every header and body path.

The initial checker attempt rejected `index.html` because its valid `x-ipfs-roots` header lists the root CID followed by the resolved file CID. The helper was corrected to require the exact root CID for `/` and the same first CID for `index.html`; all byte, MIME and redirect gates remained intact. The [initial failed receipt](../../output/playwright/liquidity-deploy-20261022/delivery-origin-attempt1.json) and [log](../../output/playwright/liquidity-deploy-20261022/origin-delivery-attempt1.log) are preserved alongside the successful rerun.

## Bunny promotion and public verification

Authenticated Safari inspection verified the `polkaswap` pull zone, ID `5860217`, and hostname `polkaswap.io`. The new origin was saved and confirmed by a fresh page reload and exact origin-value readback. The [Bunny receipt](../../output/playwright/liquidity-deploy-20261022/bunny-evidence.json) records this confirmation, observed settings/rules and the subsequent purge.

| Setting | Observed value |
| --- | --- |
| Host header | `pi.soramitsu.io` |
| Forward host header | Off |
| Follow redirects | On |
| Verify origin SSL certificate | On |
| Cache error responses | Off |
| Smart Cache | On |

`RawDwebOriginHeaders` adds `Sec-Fetch-Dest: empty` on origin requests for `*://polkaswap.io/*`. `SetPolkaswapCSP` uses Cache Origin Set Response Header for `Content-Security-Policy` under the same host condition; its full effective value matches [AGENTS.md](../../AGENTS.md).

The full pull-zone purge was submitted through the authenticated Safari UI after the saved-origin readback. Its optional tag was blank and the purge confirmation dialog closed after submission. The immediate [public root headers](../../output/playwright/liquidity-deploy-20261022/immediate-live-root.headers) report HTTP 200 and `x-ipfs-roots: bafybeicjwe24zlmugkwtmtue6ynybsyqfcnzfjyeipdbonsinv7gt2ig7i`; the [root body](../../output/playwright/liquidity-deploy-20261022/immediate-live-root.html) matches the frozen 4,529-byte index, SHA-256 `ceb8c375f338f3b666cac829ce96e94bf2507a1f95974e41f393ee1d66837155`.

Public root/index, configuration and entry JavaScript/CSS passed complete-body checks before lazy asset warming. Sequential warming then covered entry assets, the candidate Swap request list, and the remaining observed route assets. All 410 public delivery checks passed with HTTP 200, no redirects, appropriate content types and complete matching build bodies, as recorded in the [public delivery receipt](../../output/playwright/liquidity-deploy-20261022/delivery-live.json) and [warming log](../../output/playwright/liquidity-deploy-20261022/live-delivery.log).


All five public checks used the official WebKit checker with a 30-second settling interval and no static preview. Each retained its requested route, mounted its feature UI without the bootstrap loader, verified the approved mainnet RPC, and reported the new production CID. The [live summary](../../output/playwright/liquidity-deploy-20261022/live-summary.json) links the individual reports and screenshots.

| Public route | Final title | Failed requests | Console errors |
| --- | --- | ---: | ---: |
| `/#/bots` | Bots - Polkaswap | 0 | 0 |
| `/#/store` | Store - Polkaswap | 0 | 0 |
| `/#/buy-xor` | Buy XOR - Polkaswap | 0 | 0 |
| `/#/get-ts` | Get TS - Polkaswap | 0 | 0 |
| `/#/swap` | Swap - Polkaswap | 0 | 0 |

The final independent public root check at 17:52 JST returned HTTP 200, the new production CIDv1, and the exact frozen HTML bytes. The [headers](../../output/playwright/liquidity-deploy-20261022/final-root.headers), [body](../../output/playwright/liquidity-deploy-20261022/final-root.html) and [final verification receipt](../../output/playwright/liquidity-deploy-20261022/final-verification.json) retain that evidence. The temporary MOF authentication helper was removed and the dedicated SSH connection closed after validation.
