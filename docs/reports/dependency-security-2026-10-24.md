# Dependency and security review — October 24, 2026

The dependency refresh and follow-up remediation reduce the application's npm advisory results from **229 to zero**. The recursive Yarn graph, copied vendor inventory, and standalone UCAN package all pass their audits. The earlier Zod and Elliptic findings are resolved through consumer migration and dependency removal; no advisories are ignored or suppressed. A clean advisory audit does not establish that all application code is vulnerability-free.

Work was performed in the existing checkout with unrelated modifications preserved. The security changes were subsequently published through an isolated release that retained the shipped application features; see the [October 24 deployment report](deployment-2026-10-24.md).

## Audit results

| Inventory                                | Before                                               | Initial refresh           | After follow-up |
| ---------------------------------------- | ---------------------------------------------------- | ------------------------- | --------------- |
| Recursive application Yarn graph         | 229 rows: 2 critical, 102 high, 110 moderate, 15 low | 2: Zod high, Elliptic low | 0               |
| Copied vendor packages, 47 package names | 3 Lodash ES advisories                               | 0                         | 0               |
| Standalone `scripts/ucan` lockfile       | 1 high base-x advisory                               | 0                         | 0               |

Counts are package/advisory rows, not proven exploitable paths. The original Yarn output also contained 14 deprecation notices, excluded from these counts. `yarn security:audit` executes all three inventories and now exits **0**. It still fails on any finding, registry failure, subprocess error, or timeout.

The [JSON evidence summary](dependency-security-2026-10-24.json) records the baseline, intermediate findings, final versions, patches, production module inventory, and validation. Raw logs are retained locally under `/tmp/polkaswap-security-20261024/` for the initial refresh and `/tmp/polkaswap-residual-security-20261024/` for the follow-up.

## 1. Zod resource exhaustion — resolved

[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) affects versions before 4.6.6. The two consumers formerly requiring Zod 3 now use **4.6.7**:

- `@reown/appkit-wallet` 1.8.19: source patch migrates schema semantics and regenerates ESM JavaScript, source maps, and declarations. Previously optional `any` fields remain optional. Three long nested union chains become ordered union tuples, preserving alternatives and intersection metadata while avoiding TypeScript recursion failures.
- `@coinbase/cdp-sdk` 1.60.0: source patch migrates the EIP-712 record API and regenerates ESM, CommonJS, maps, and declarations. Its `abitype` dependency moves to **1.3.0** with a scoped patch: all 11 ABI/typed-data arrays receive limits, and its stale Zod 3 declarations are regenerated for the actual Zod 4 runtime. Recursive tuple components are covered as well as the outer ABI array.

The AppKit and CDP patches add explicit 2,048-element limits to previously unbounded arrays: 42 AppKit arrays and 17 CDP arrays. Existing stricter limits, including 100 policy rules, 300 addresses, and 10 criteria, remain intact. The patched validator rejects excessive collections before parsing their elements. Origin, depth, total-node, byte-count, and discriminator limits in `src/security/w3mMessageGuard.ts` remain as defense in depth.

AppKit configures Zod's interpreter before constructing schemas, avoiding dynamic `Function` calls under the existing content security policy. Fresh-process tests cover both direct schema imports and the public wallet entrypoint. The policy was not relaxed.

This is a tested consumer migration, not an unverified major-version override. The patch files and scoped resolutions must be maintained together. [Migration notes](../zod-migration.md) document exact source provenance, transformations, compiler commands, public declaration checks, and retirement criteria.

Zod 4 still ships a legacy `/v3` entrypoint. Runtime schema tests verify actual Zod 4 instances, and `scripts/build/dependencySecurityPlugin.mjs` rejects legacy Zod modules in emitted web and Electron chunks, including lazy chunks. No dependency is redirected to `/v3`.

## 2. Elliptic signing vulnerability — resolved by removal

[GHSA-848j-6mx2-7j84](https://github.com/advisories/GHSA-848j-6mx2-7j84) affects Elliptic through 6.6.1 and has no patched upstream release. The entire installed path was removed:

`vite-plugin-node-polyfills → node-stdlib-browser → crypto-browserify → browserify-sign/create-ecdh → elliptic`

`scripts/build/browserNodePolyfillsPlugin.mjs` supplies only the browser APIs the app uses: assert, Buffer, events, process, and util, with the same implementations in development and production. Buffer remains version 6.0.3, which the former plugin embedded. No signing or hashing algorithm was replaced.

Only previously audited Node fallbacks in crypto-js, TweetNaCl, and brorand receive an empty Node crypto module. Their browser implementations use Web Crypto and fail when secure randomness is unavailable. Every other Node crypto import fails the browser build or development optimizer. Regression probes verify actual bundled hashing, signing-key derivation, randomness, Buffer behavior, and development-server module loading. [Browser compatibility notes](../../scripts/build/README.md) explain the boundary.

Vite's optimizer uses explicit browser-global references and initializes them before application dependencies. This avoids a reproduced Buffer initialization cycle when dependencies become separate optimized entries. Development scanning is restricted to the actual `index.html`; retained report HTML is excluded. Production and development behavior are both covered by regression tests.

## Other completed dependency work

The root manifest contains **61 updated declarations, seven added dependencies, and three removals** compared with the initial checkout. Updates include Vue/compiler 3.5.44, Vite 7.3.7, Vitest 4.1.12, Playwright 1.64.1, Electron 43.8.3, Axios 1.20.0, ethers 6.17.0, and WalletConnect provider 2.26.0. Exact changes are in the JSON evidence.

The first refresh also updated the copied Lodash ES package to 4.18.1, repaired the standalone UCAN lockfile, and removed the critical protobuf/archive-parser advisories. Scoped compatibility tests preserve UnixFS wire bytes and content identifiers, string timeouts, and offline Sora Pay mail construction. Existing CedeLabs, Open Web3, and Polkadot patches and the local Sora Pay 0.2.2 artifact remain intact.

The optional Electron renderer is sandboxed with context isolation and no Node integration or generic preload IPC bridge. Navigation stays within the application document, and external URLs are restricted to HTTP(S) without embedded credentials. The prior wallet-message input hardening remains enabled.

## Follow-up verification

| Check                                                     | Final result                                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Security/build/Electron script regressions                | 104 tests in 11 files passed, including 13 real Zod consumer tests                   |
| Wallet/security/shim regressions                          | 100 tests in 10 files passed                                                         |
| Vite configuration after the development-entry correction | 10 tests passed                                                                      |
| Translation consistency                                   | 13 tests in four files passed                                                        |
| Production web build                                      | Passed, 1m 43s                                                                       |
| Electron build                                            | Main and renderer passed; renderer 1m 36s                                            |
| Static IPFS-prefixed browser checks                       | 11 Chromium checks passed in 13.1s                                                   |
| Cold Vite development browser check                       | Swap UI mounted in 23.37s; zero console/page errors, failed requests, or HTTP errors |
| Immutable Yarn install                                    | Passed, 1.67s; existing upstream peer warnings remain                                |
| Scoped ESLint, formatting, and diff whitespace checks     | Passed                                                                               |
| Application, copied-vendor, and UCAN audits               | All passed with zero advisories                                                      |

The browser checks cover the Swap shell, direct IPFS index URL, Swap/Bridge/Wallet/Kensetsu/Explore/Stats/Rewards routes, the logged-out wallet connection view, and real wallet schemas under a strict no-eval CSP. The CSP check records zero violations or runtime errors for synchronous and asynchronous valid/oversized inputs. An isolated in-memory negative control that removed `jitless` triggered the expected blocked-eval violation.

Strict TypeScript checks cover all five regenerated declarations and the public consumer fixture with `skipLibCheck: false`. Independent comparisons also preserved 198 AppKit parsed-value fixtures and 13 ABI fixtures per module format, with 44 ABI early-rejection checks across ESM/CommonJS and synchronous/asynchronous parsing.

The final emitted web inventory contains 7,477 module IDs, including 18 patched Zod modules and eight AppKit wallet modules. It contains zero Elliptic, crypto-browserify, browserify-sign, or legacy Zod modules. The shared build gate passed for both web and Electron output. The JSON summary keeps initial full-suite history separate from these final focused checks; the full suite was not rerun after the follow-up migration.

## Initial full-suite validation history

Before the follow-up consumer/polyfill migration, the full unit command covered 14,242 tests: all 10,960 application tests passed; the script project had 3,279 passes and three initial failures. One obsolete Electron preload assertion was updated. Two expensive replay tests passed unchanged in isolation and received their fixture's existing 60-second budget. All three passed focused reruns. The initial full command exited 1, and the entire suite was not repeated after those test-only corrections. This history is retained rather than presented as a clean final full-suite run.

## Maintenance and scope

Run [the three dependency checks](../security-dependencies.md) after dependency updates. Keep the consumer source patches, actual-schema tests, and emitted-module check together. Retire patches only when an upstream release provides compatible patched validation with equivalent bounds.

The audit covers resolved package identities and copied manifests; it does not prove the safety of arbitrary prebundled code or unpublished archives. Separately retained UI-library development manifests under `packages/` are outside the root graph and require auditing before their separate installation or publication. Vite still uses the separately inventoried copied VueUse 13.9.0 modules despite the root VueUse update.

NFT.Storage Classic's upload service [was decommissioned](https://classic-app.nft.storage/docs/); dependency updates do not restore it. Deployed relays, smart contracts, live signing transactions, and a full penetration test were outside this remediation. The subsequent frontend/IPFS publication and CDN verification are documented in the linked deployment report.
