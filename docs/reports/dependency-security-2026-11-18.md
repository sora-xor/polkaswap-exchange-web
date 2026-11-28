# Dependency and security review — 18 November 2026

**Follow-up on 18 November.** The subsequent patch replaced both installed Picomatch versions, hardened the embedded tool copies and passed the full and production-only dependency audits. The results below record the earlier review before that fix. See [Picomatch remediation](../security-dependencies.md#picomatch-remediation).

During remediation the full unit runs passed 11,282 application and 3,497 script tests. After the last parser change, the immutable install, both audits, 98 focused security and build tests, 13 translation tests, the web and Electron builds, and 21 local Chromium checks passed. The changes are in the local checkout.

The local checkout has 25 direct dependency updates, three copied vendor updates and Yarn 4.18.1. Three known advisory families were fixed without suppressing findings. **One high-severity Picomatch advisory remains without an upstream fix, so this is not a clean security audit or a guarantee that the application is safe.** Changes preserve the existing dirty checkout and were not published to production.

## Remaining finding

**SEC-01 — High upstream severity: Picomatch denial of service.** `picomatch` 2.3.2 and 4.0.7 remain in the resolved graph. Attacker-controlled repeated extglob patterns can cause excessive regular-expression work. npm still publishes 4.0.7 as latest; the reviewed advisory lists no patched release. [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), [official registry](https://registry.npmjs.org/picomatch).

The full Yarn audit remains nonzero. The production dependency graph also reaches Picomatch through `unstorage` → `anymatch`; a production-only package audit is therefore not a substitute for checking emitted code. `scripts/build/dependencySecurityPlugin.mjs:11` rejects Picomatch in entry and lazy renderer chunks, including copied vendor modules. Both web and Electron builds must pass this guard. This bounds the browser exposure; it does not fix local tooling that uses the affected matcher. No advisory exclusions, severity filters or fabricated patched versions were added. Revisit when upstream ships a fix, test the dependent tools, and remove the temporary renderer prohibition only after verifying the actual bundled implementation.

## Fixed findings and compatibility evidence

| ID     | Finding                                                          | Remediation                                                                                                                |
| ------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| SEC-02 | High: follow-redirects cross-realm sensitive header handling     | Axios 1.21.1 and follow-redirects 1.16.3 throughout the graph, including the patched CDP SDK's compatible Axios range.     |
| SEC-03 | Moderate: Glob continues filesystem traversal after cancellation | Scoped `js-beautify/glob` 14.0.6; Yarn's injected node-gyp refreshed to 13.1.0, removing the obsolete cacache/Glob branch. |
| SEC-04 | Moderate: Minimatch pattern amplification                        | TypeScript ESLint 8.73.0 uses the patched major; `editorconfig/minimatch` is scoped to 11.0.9.                             |

Sources: [follow-redirects advisory](https://github.com/advisories/GHSA-mrwp-f3q8-3g9p), [Glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), [Minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249).

The new native-consumer tests reproduce nine extra directory reads after cancellation on the original Glob and zero on the updated Glob, for both `glob()` and `globStream()`. They also exercise real js-beautify CLI globbing, exclusions, EditorConfig brace patterns, nested precedence and unset semantics. The scoped overrides cross declared major versions and must keep these tests. Existing UnixFS byte/CID, timeout, Nodemailer and patched Zod compatibility checks remain enabled.

## Updated direct dependencies

| Package                    | Before                        | After                                   |
| -------------------------- | ----------------------------- | --------------------------------------- |
| `@babel/runtime`           | `^7.29.10`                    | `^7.29.14`                              |
| `@polkadot/api`            | `16.5.4`                      | `16.5.6`                                |
| `@polkadot/rpc-provider`   | `16.5.4 + subscription patch` | `16.5.6 + unchanged subscription patch` |
| `axios`                    | `^1.20.0`                     | `^1.21.1`                               |
| `graphql`                  | `^16.14.2`                    | `^16.15.0`                              |
| `graphql-ws`               | `6.4.1`                       | `6.4.3`                                 |
| `vue`                      | `3.5.44`                      | `3.5.45`                                |
| `vue-i18n`                 | `^11.4.16`                    | `^11.4.22`                              |
| `vue-router`               | `^4.6.4`                      | `^4.6.5`                                |
| `@playwright/test`         | `^1.64.1`                     | `^1.65.1`                               |
| `@types/node`              | `26.6.5`                      | `26.6.6`                                |
| `@vitejs/plugin-vue`       | `^6.0.10`                     | `^6.0.11`                               |
| `@vue/compiler-dom`        | `3.5.44`                      | `3.5.45`                                |
| `@vue/compiler-sfc`        | `3.5.44`                      | `3.5.45`                                |
| `@vue/test-utils`          | `^2.5.1`                      | `^2.6.0`                                |
| `baseline-browser-mapping` | `^2.11.32`                    | `^2.11.38`                              |
| `electron`                 | `43.8.3`                      | `43.8.10`                               |
| `eslint-plugin-vue`        | `10.11.1`                     | `10.12.1`                               |
| `playwright`               | `^1.64.1`                     | `^1.65.1`                               |
| `postcss`                  | `^8.5.31`                     | `^8.5.33`                               |
| `prettier`                 | `^3.9.10`                     | `^3.10.1`                               |
| `sass`                     | `1.106.1`                     | `1.108.2`                               |
| `typescript-eslint`        | `8.72.0`                      | `8.73.0`                                |
| `vite`                     | `7.3.7`                       | `7.3.8`                                 |
| `vue-eslint-parser`        | `^10.4.1`                     | `^10.4.2`                               |

Yarn moved from 4.10.3 to 4.18.1. Its downloaded CLI was checked against the official registry's SHA-512 integrity. `.yarnrc.yml` and `packageManager` agree; older checked-in launchers remain for existing documentation and use the new `yarnPath`. The new Yarn migration's wildcard Git-source approval was replaced by an empty allowlist because this graph has no Git dependencies. Lifecycle scripts and package-age selection preserve the existing behavior.

Copied packages actually used by Vite were updated from their official, integrity-verified archives: `tabbable` 6.2.0 → 6.5.2, `maska` 3.2.0 → 3.2.2, and `focus-trap` 7.6.5 → 7.8.0. All 59 copied files match the upstream packages, with licenses and Maska's required new chunks retained. Existing local differences were formatting-only. Real vendor tests cover disabled/inert controls, focus containment and restoration, Escape, mask typing/deletion/cleanup and long numeric strings.

## Deliberate version constraints

Registry metadata was checked for all 105 direct declarations. “Latest compatible” does not mean every npm `latest` dist-tag. The attached JSON records current tags and every deferred major/compatibility exception. In particular:

- TypeScript 7.0.2 is outside TypeScript ESLint's supported `<6.1.0` peer range; TypeScript 5.9.3 and the existing patch declaration workflow remain.
- Vue 2 is still the `latest` tag for vuedraggable and vue-observe-visibility. The app retains its Vue 3-compatible selections.
- Major migrations for Vite 8, Vue Router 5, Pinia 4, MobX 7, Electron 45, Vitest 5, and the wallet/chain packages need their own integration work. Financial arithmetic stays on the validated BigNumber 9 line.
- The root VueUse 14.4.0 declaration is overridden by copied VueUse 13.9.0 modules in Vite. Those copies and the retained virtual-scroller implementation are not claimed to be latest; their registry audit passes.
- The local Sora Pay archive and maintained CDP/AppKit Zod patches remain. The Polkadot API/RPC-provider patch update preserves bounded subscription bookkeeping; the old API-MobX 5.x peer declaration remains a known warning, not a new compatibility claim.

## Production HTML hardening

**SEC-05 — Fixed configuration gap:** the web and Electron HTML templates included development loopback wildcard permissions in production. In `index.html:10` and `src/renderer/index.html:9`, a static origin could contact arbitrary local HTTP/WebSocket ports under the meta policy. The prescribed Bunny response header is narrower, so this review does not assert a live Bunny policy bypass.

`scripts/build/productionCspPlugin.mjs:24` now transforms only build output. Both verified outputs contain exactly `connect-src 'self' https: wss: http://127.0.0.1:39847`. The transform preserves other directives, preserves already-stricter input policies and fails closed for missing, duplicated or unreviewed declarations. `productionCspPlugin.mjs:70` applies this to the shared web/Electron build configuration. Development templates retain local node/indexer and HMR access. Twenty focused tests, both builds and the 21 browser checks passed with this boundary.

## Test-framework compatibility adjustment

The first full updated application run passed 11,281 tests and exposed one stale test selector in `tests/unit/components/pages/Bridge/NodeIcon.source.spec.ts:55`. The suite declared an icon stub rendering a `span`, but asserted the shared stub's `i` markup. Vue Test Utils 2.6.0 honors that local stub. Assertions now inspect the declared component's status class and icon prop for disconnected, connecting and connected states. Both tests pass in the focused rerun; the final full-project results are recorded below. The original application baseline passed 11,276 tests before dependency installation; its separate script-project run was stopped once that baseline was captured, so it is not counted as a completed all-project baseline.

## Source security review and limits

Targeted inspection covered HTML sinks and links, WalletConnect messages, wallet password storage/encryption, SORA Nexus account generation, Electron isolation/navigation, and the optional loopback companion. Existing escaping/sanitization, exact-origin validation, bounded messages, expiring in-memory passwords, secure randomness and companion pairing/token checks remain. No additional confirmed exploit was found in those inspected paths. Representative reviewed controls: `src/utils/sanitize.ts:153`, `src/security/w3mMessageGuard.ts:58`, `src/stores/wallet/passphrase.ts:46`, `src/features/misc/lib/nexusAccountGenerator.ts:145`, `electron/main/index.ts:21` and `public/.well-known/polkaswap-codex-companion.mjs:1489`.

The audit covers the root resolved graph, 47 named copied vendor packages, and the standalone UCAN lockfile. It does not prove that modified or unpublished source is secure, certify all financial/business logic, inspect credentials, or attest to live infrastructure/CDN configuration. Retained UI-library development manifests under `packages/` are not installed root workspaces and are outside this inventory. No production deployment was performed.

## Validation

Final unit coverage: **1,285 files / 14,752 tests passed** across the two isolated projects.

| Check                               | Result                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Immutable Yarn install              | Passed; existing API-MobX/Polkadot peer-range warning retained.                                           |
| Application unit project            | 1,107 files / 11,282 tests passed after the test-stub correction.                                         |
| Script unit project                 | 178 files / 3,470 tests passed.                                                                           |
| Focused security/consumer checks    | 11 files / 103 tests passed; new CSP suite separately passed 20 tests.                                    |
| Translations                        | 4 files / 13 tests passed.                                                                                |
| Chromium static-IPFS browser checks | 21 passed: app shell, direct routes, desktop/mobile layout and wallet overlays; external services mocked. |
| Production web and Electron builds  | Passed with dependency and CSP guards enabled; local assets exist and use relative URLs.                  |
| Lint / formatting / diff whitespace | Passed for changed code.                                                                                  |
| Full Yarn advisory audit            | Fails on the remaining Picomatch advisory only; no suppression.                                           |
| Copied vendor audit                 | 47 package names; zero advisories.                                                                        |
| Standalone UCAN audit               | Zero vulnerabilities.                                                                                     |

Commands use `node .yarn/releases/yarn-4.18.1.cjs` because this shell has no global `yarn`. The application and script projects are run separately with `test:unit --project unit` and `test:unit --project unit-scripts`; both are required. Other commands: `security:audit`, `test:translation`, `build`, `electron:build`, and the existing `app.spec.ts` / `wallet-overlays.spec.ts` Playwright suites against a dedicated loopback static preview server. The preview server was stopped after the checks. Builds report nonfatal upstream Rollup annotation notices; no compilation errors.

[Machine-readable inventory and integrity evidence](dependency-security-2026-11-18.json) retains direct-version comparisons, compatibility exceptions, vendor archive/file hashes, source hashes and validation results. Full local logs are in `/tmp/polkaswap-dependency-review-20261118/`. These local checks are not the production release/browser gates, and do not certify unrelated unshipped working-tree features for publication.
