# Tonswap burn release — 2026-09-21

**Status:** deployed and verified, including the desktop sidebar correction,
Bunny save/purge, and final live desktop/mobile WebKit checks. See final
acceptance below for the completed evidence.
See [campaign behavior](tonswap-burn.md) and the [origin runbook](ipfs-origin.md).

## Corrected static release

The minimal burn-page layout correction passed **3 focused files / 97 tests**.
`yarn ipfs:publish` completed successfully again, producing these replacement CIDs:

| Build | CIDv0 | CIDv1 |
| --- | --- | --- |
| Production | `QmNVoWhNAU2LKUT47CTDr5ATJgZdvFQkGeNp19nktqDn61` | `bafybeiaclaxgdtguwcu5d5ah7pafddmivck4splfehywxtgtbax34kxnoy` |
| Testnet | `QmSMZSmCG1F9ewdYGZvxDPZ6BV5yduPBWpPowBKwzM1rPc` | `bafybeib3vjqdr7vn4eujgt7hux46ay5i2hmnbe4my3pz7tqj3m5xscelmm` |

Replacement production origin:
`https://mof.sora.org/ipfs/bafybeiaclaxgdtguwcu5d5ah7pafddmivck4splfehywxtgtbax34kxnoy`

Host header: `mof.sora.org`. Both replacement DAG imports and CIDv0 recursive-pin
checks succeeded. Complete MOF pin integrity verification reports **116 pins,
all OK**, retaining the initial rollout and older releases.

At **2026-09-21T01:47:08.967361+00:00**, the replacement root, entry JavaScript, and burn
page lazy chunk returned **200 without redirects**, correct content types, and
bytes identical to the current `dist` files. All carried the replacement
production CIDv1 in `X-Ipfs-Roots`.

| Candidate path | Bytes | SHA-256 |
| --- | ---: | --- |
| `/` | 4,529 | `4dec90d60bd0f11733ae0d25da54dd88593dbd27f75446ef4086876728f2fe93` |
| `/assets/index-ysJXwZD0.js` | 138,599 | `e4f562826e138270d1d8b44bbd9ee77bd64028bf70aff2b62433932d2314a8fe` |
| `/assets/BurnPage-DVQfJTnO.js` | 35,079 | `a52ffe11f2994c5fe6c57abc527f86b6e73fe5a5360c009d8546923a270eec99` |

Candidate captures, import/pin results, and digests are retained as
`final-origin-*`, `final-pin-verification.json`, and
`final-candidate-sha256-manifest.json` under `output/tonswap-release`.
These checks authorize proceeding to the documented Bunny save/purge sequence;
final live layout acceptance is still required.

## Initial published static release

Built with Node 26.9.0 / Yarn 4.10.3 using `yarn ipfs:publish` (invoked through
`node .yarn/releases/yarn-4.10.3.cjs`). Both production and testnet were published.

| Build | CIDv0 | CIDv1 |
| --- | --- | --- |
| Production | `QmberHXsDUgGEsjr2xgykAo2pAiKR7N4ZN8vvhUKDrAGev` | `bafybeigf2f4votz5km6ykfihnmlijbzp6344smydqp72hoey65ezomxovm` |
| Testnet | `QmdxWCZ9k95ec7LvkbykrfdtKL2PXCkd7RNf6gA2P6gSs6` | `bafybeihib2lv5rtsludtdaldnbyibsea5mspbkstdvacikip343bvt62yu` |

Production origin:
`https://mof.sora.org/ipfs/bafybeigf2f4votz5km6ykfihnmlijbzp6344smydqp72hoey65ezomxovm`

Host header: `mof.sora.org`. Target Bunny zone: `polkaswap`, ID `5860217`,
hostname `polkaswap.io`. Keep both `RawDwebOriginHeaders` and `SetPolkaswapCSP`
edge rules and the settings required by the origin runbook.

Both DAGs were imported into the dedicated MOF repository with root pinning.
Independent CIDv0 recursive-pin checks passed, and `ipfs pin verify --verbose`
reported **114 pins, all OK**. Existing release pins were retained.

The candidate responses below returned **200 without redirects**, matched the
built files byte for byte, and contained the production CIDv1 in `X-Ipfs-Roots`.
The root was real application HTML; both scripts had JavaScript content types.

| Candidate path | Bytes | SHA-256 |
| --- | ---: | --- |
| `/` | 4,529 | `61e8206bc1814fda9b2455697abe3b2d06835d7843beb4039054df8bc4bc0fd6` |
| `/assets/index-CZl2eHiU.js` | 138,599 | `9d0b91fbc1df3a6515f348e10350b03fb2047ec4749c3563c686178891bb9dbd` |
| `/assets/BurnPage-yRrjR2ug.js` | 35,079 | `e82c9c53f55354df3b538b412672d86dc16c92692e35565053da6ac8d081060a` |

## Deployed indexer source

The compatible port is based on indexer commit
`1049c02c410ce4bd506d68a6dc91ed6157546c6d`, matching the prior live baseline.
The complete seven-file change, including new source, tests, and documentation,
is retained in [tonswap-indexer-1049c02.patch](tonswap-indexer-1049c02.patch).
It excludes dependencies and credentials and has SHA-256:

```text
4cadbe762d064a8cef879ff030ee748440dd67322b5afe82fe87849a076da93f
```

`git apply --check` and actual application to a clean archive of that base
succeeded. All seven resulting files matched the deployed-source checkout byte
for byte. To reproduce, prepare an isolated indexer checkout at the full base
commit, apply this patch, then use its pinned Yarn toolchain to run
`yarn install --immutable`, `yarn test`, and `yarn build`. No dependency manifest
or lockfile changes are required by the patch. No commit was created.

MOF release directory:
`/Users/administrator/apps/polkaswap-indexer/releases/release-2026-09-21.tonswap-burn.1049c02`.
The `current` symlink selects this release. The retained prior release is
`release-2026-09-20.hourly-coverage.1049c02`; service label is
`org.polkaswap.indexer`. Staging included Node 24 syntax checks of the compiled
campaign, worker, schema, and resolver modules.

A fresh read-only request to `https://pi.soramitsu.io/graphql` at
**2026-09-21 01:36:13 UTC** returned HTTP 200 with no GraphQL errors:

- `_health.ok`, `repositoryReady`, and `workerReady`: `true`; `workerLag`: `0`.
- Finalized, indexed, and campaign coverage/checkpoint block: **27,720,811**.
- Campaign start: **27,720,478**; checkpoint timestamp: `1789954542`.
- Genesis: `0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5`.

This verifies live service and snapshot availability. This sample requested one
page and reported more pages. A separate complete snapshot at **01:33:51 UTC**
covered block **27,720,792** with no qualifying TS burns; legacy SS/Nexus queries
remained available (82 rows, 68 eligible burns, 48 Nexus recipient records).

## Validation

- Focused frontend campaign/integration suites: **7 files, 150 tests passed**.
- Translation suites: **4 files, 13 tests passed**; Akkadian cuneiform enforcement passed.
- Broad frontend unit run: **7,692 of 7,699 passed** while edits were in progress.
  All three files containing the seven earlier-revision failures subsequently
  passed against current sources: **62 of 62 tests**. The entire frontend suite
  was not repeated after those edits.
- Complete Node script unit project: **68 files, 1,310 tests passed**.
- Live-baseline indexer port: focused **155 tests passed**; full run
  **1,097 passed, 25 skipped**, with one unrelated restore timeout. That restore
  file passed all **13 tests** when rerun alone. Final TypeScript build passed.
- Production/testnet static publisher build completed successfully.
- The bundled Tonswap SVG was verified byte-identical to the official
  `https://tonswap.org/icon.svg`.

All 35 campaign strings exist in all 30 non-English catalogs, with runtime
placeholders and financial numbers checked. Akkadian and Egyptian use abbreviated
existing glossary phrases and explicit numerical relations; specialist linguistic
review is still needed. Six existing English fallback labels were localized to
satisfy the translation drift gate: Dzongkha `bots.autopilot.title`; Mongolian
`.title` and `.begin`; Burmese `.title`, `.begin`, and `.connectTitle`.

## Initial rollout runtime verification

Bunny displayed a successful origin-save toast and the new production origin
with host header `mof.sora.org`. Forward host header is off; follow redirects and
SSL verification are on; cache error responses are off. The authenticated UI
completed a full-zone purge under standing authorization.

The live root returned HTTP 200, the expected production `x-ipfs-roots`, and HTML
identical to `dist/index.html`. Entry JS/CSS returned 200; sequential warming of
83 entry/swap modules returned 200 and byte-identical content. Durable local
first-rollout evidence is preserved under
[initial-layout-review](../output/tonswap-release/initial-layout-review/): live
root headers/HTML, complete backend snapshot, later backend health snapshot, and
a SHA-256 manifest. These are public response captures and contain no credentials.

- [x] Save the validated production origin/host and confirm Bunny success.
- [x] Purge the production pull-zone cache under standing authorization.
- [x] Confirm live root `x-ipfs-roots` equals the production CIDv1 above.
- [x] Verify live entry JS/CSS, then warm entry and required swap chunks sequentially.
- [x] Run the official WebKit check with `IPFS_CHECK_SETTLE_MS=30000`: exit 0,
      WebKit 26.0, no failed requests or console errors, and real node/fee UI.
      See [initial official capture](../output/tonswap-release/initial-layout-review/webkit-official.log).
- [x] Confirm title `Swap - Polkaswap`, real swap UI, zero failed requests, and
      zero console errors; verify the live burn page shows the separate TS card.

Independent fresh-context WebKit captures passed for both `/#/swap` and
`/#/burn`: exact titles `Swap - Polkaswap` and `Burn - Polkaswap`, the expected
production CID, real rendered UI, and zero raw failed requests, HTTP errors,
console errors, or page errors. The burn capture confirms the official SVG,
50 TS/XOR current rate, 1,753,357 XOR cap, and block 27,720,478. First-visit
legal notices were left untouched; no wallet was connected and no real burn
was signed. The wallet-gated single-amount modal is covered by unit tests.
Evidence: `production-swap-webkit.json`, `production-burn-webkit.json`, their
screenshots, and `strict-webkit-check.cjs` under
`output/tonswap-release/initial-layout-review`. These passing runtime checks did
not establish desktop layout correctness; the 1440 px screenshot exposed the
sidebar overlap described above.

## Layout correction follow-up

The initial root headers/HTML, complete and health backend snapshots, strict
WebKit JSON/PNG captures, checker source, official WebKit log, and this record's
initial snapshot have been copied into
`output/tonswap-release/initial-layout-review`. An archive SHA-256 manifest
records their exact bytes. Preserve this evidence when replacing top-level
captures for the corrected release.

- [x] Apply and test the minimal burn-page layout correction: 97 tests passed.
- [x] Publish replacement production/testnet CIDs and replicate both DAGs to MOF;
      all 116 pins passed integrity verification and candidate static checks passed.
- [x] Validate the replacement static origin, save Bunny (success toast observed),
      and complete another full-zone purge.
- [x] Recheck live CID/assets and repeat official plus strict WebKit captures.
- [x] Visually verify both campaign cards are clear of the sidebar at desktop
      width, check the narrower layout, and record final acceptance.

## Final acceptance

The corrected production CID `bafybeiaclaxgdtguwcu5d5ah7pafddmivck4splfehywxtgtbax34kxnoy` is live on
`polkaswap.io`. The root HTML and all 84 sequentially warmed entry CSS/JS and
swap dependencies match the published build. The final official WebKit check
passed. Independent fresh-context swap and burn checks confirm the exact titles,
real UI, expected CID, and zero raw failed requests, HTTP errors, console errors,
or page errors. Production screenshots at 1440×1200 and 390×844 confirm both
campaign cards stay inside the content area, with no sidebar overlap or
horizontal overflow. The official Tonswap SVG, campaign amounts, starting block,
and future-claim wording are verified. No real wallet transaction was submitted.

Final evidence is under `output/tonswap-release`: `webkit-official.log`,
`production-webkit-strict-summary.json`, `production-{swap,burn}-webkit.json`,
`production-burn-layout-{1440,390}.json`, corresponding PNGs, and
`warm-verified-assets.json`. The initial deployment evidence remains archived
separately. The implementation, validation, and deployment goal is complete.
