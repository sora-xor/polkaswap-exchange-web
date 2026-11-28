# Dependency security checks

Run these checks from the repository root using Node 26 and the pinned Yarn release:

```sh
node .yarn/releases/yarn-4.18.1.cjs security:audit
```

The aggregate runner executes all four checks even if an earlier check fails. Each has a 60-second deadline. The individual commands are

```sh
node .yarn/releases/yarn-4.18.1.cjs npm audit --all --recursive --no-deprecations
node scripts/security/audit-vendor.mjs
npm audit --package-lock-only --prefix scripts/ucan
node scripts/security/audit-picomatch.mjs
```

Open findings, unexpected parser bytes and incomplete registry checks return a nonzero exit code. The commands submit package names and versions to npm's public registry without credentials. Unit tests for the advisory checks use an offline transport.

The November 18, 2026 review updated compatible direct dependencies and copied input/focus packages and fixed the follow-redirects, Glob and Minimatch advisories. The subsequent Picomatch remediation is described below. The [initial review](reports/dependency-security-2026-11-18.md) records the other dependency changes and compatibility constraints.

The [October 24 review](reports/dependency-security-2026-10-24.md) records the earlier removal of Elliptic with the blanket Node polyfill dependency and the AppKit/CDP migration to patched Zod 4.6.7. Those protections remain; see [Zod migration maintenance notes](zod-migration.md) and [browser compatibility notes](../scripts/build/README.md).

The production build rejects the original and replacement Picomatch, Elliptic, crypto-browserify, and legacy Zod modules, including the `/v3` entrypoint still published inside Zod 4. This checks the implementation actually bundled in web and Electron renderers, including lazy chunks.

The shared build-only `productionCspPlugin.mjs` also removes development loopback wildcards from the web and Electron HTML policies. Production keeps the approved companion origin `http://127.0.0.1:39847`; an already stricter input policy remains stricter. Development templates keep local node/indexer and HMR support. Missing or ambiguous CSP directives fail the build. This protects static HTML independently of the production CDN header.

The scoped `js-beautify/glob` and `editorconfig/minimatch` resolutions cross their consumers' declared major versions because the older versions remain vulnerable. `tests/unit/scripts/security/glob-consumers.spec.ts` exercises native consumer resolution, real CLI file selection, EditorConfig precedence and cancellation during filesystem traversal. Keep these regressions when changing or removing the overrides. The Polkadot RPC-provider update retains the bounded-subscription patch and its wallet connection tests.

Yarn 4.18.1 is pinned in both the manifest and `.yarnrc.yml`. The former checked-in CLI remains for historical commands; it follows the current `yarnPath`. Lifecycle scripts and package-age selection retain their previous behavior. Git dependency sources have an empty allowlist; the current lockfile needs none.

## Picomatch remediation

On 18 November 2026 the original package still had no release fixing GHSA-fc5q-39xc-vjpf. Yarn now resolves both previously installed versions (2.3.2 and 4.0.7) to the exact fork `@ryotsu/picomatch@4.0.7-a`. The reviewed npm archive corresponds to commit `3ab5a7627d480259e3d9ca67fbc14c125d374f0e`. [Upstream advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) · [Fork source](https://github.com/ryotsu-kankichi/secured-picomatch/tree/3ab5a7627d480259e3d9ca67fbc14c125d374f0e)

The fork and local patch allow unbounded extglob repetition only for nonempty ASCII literals where no alternative is a prefix of another, ignoring case. A simple filename pattern containing one wildcard, such as `+(logo-*.svg)`, compiles without an outer repetition. Other repeated forms raise a syntax error before the matcher is built. The guard applies even when a caller disables the recursion limit.

Rollup, Prettier, Playwright, tsx and the two checked-in Yarn executables also embed copies of the parser. Their patches restrict repeated extglobs to unambiguous literal alternatives. For example, `+(lib|src)` remains valid. Rejected patterns raise a syntax error before regex compilation. Ordinary glob patterns continue through the existing parser. When updating these tools, review each embedded copy and run the consumer regression tests. [CLI patch maintenance](../scripts/security/README.md)

The supplemental audit verifies the installed fork name, version and SHA-256 of the patched parser. It queries advisories for both the fork and its original upstream version. It reports this upstream advisory as addressed only for the reviewed parser, and fails on other upstream findings, any fork finding or changed parser bytes. The ordinary recursive Yarn audit runs independently. Both the full and production-only dependency audits passed after installation.

## Coverage

The Yarn audit covers the application's resolved package graph, including dependencies of the locked Sora Pay archive. The standalone UCAN utility has its own npm lockfile and is audited separately; see [its maintenance notes](../scripts/ucan/README.md).

`audit-vendor.mjs` recursively reads named, versioned `package.json` files under `vendor/`, deduplicates versions, and submits those installed identities to npm's bulk advisory API. This catches copied packages that Vite aliases directly, such as `vendor/lodash-es`, even if a newer root dependency exists. It fails on malformed manifests, symlinks, unknown response shapes, HTTP errors, and timeouts. A finding prints all inventoried versions of the affected package; consult the linked advisory for its exact vulnerable range.

The vendor checker does not treat manifest dependency ranges as installed versions, traverse nested `node_modules`, unpack archives, or inspect compiled code. Sora Pay's `.tgz` is covered by the root lockfile audit rather than by this copied-manifest inventory. The separate retained UI-library development manifests under `packages/` are not root workspaces and are outside these checks. Audit that project separately before installing or publishing it.

Advisory databases do not prove that source code, modified vendored packages, bundled third-party code, or unpublished packages are secure. For a flagged package, establish whether its vulnerable API is reachable, apply a compatible patched release, and retain tests for any override that crosses a dependency's declared major version. Keep repository patches when updating their target packages, and test wallet signing, amount handling, IPFS encoding, and production builds after dependency changes. Do not suppress findings merely to obtain a passing audit.

## Public configuration and upload credentials

Every file shipped by this static application is public. Keep `API_KEYS.nftStorage`
empty in checked-in environment configurations; a service bearer token cannot be
kept secret in a browser build. NFT uploads require explicitly supplied runtime
credentials, including the existing scoped marketplace delegation flow. Missing
credentials or a failed delegation request clear any previous client and fail
through the existing error notification before an upload can start. Minting from
an existing IPFS link does not require an upload credential.

The October 25 merge review removed previously committed NFT.Storage bearer
tokens from the current configuration. Their owner must revoke or rotate them;
removing current files does not remove historical exposure. A historical local
Kubo identity key was also found in removed workspace files. Do not reuse that
identity. Raw scans remain outside the public repository, and shared history
must not be rewritten without a coordinated remediation plan.
