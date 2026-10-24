# Dependency security checks

Run these checks from the repository root using Node 26 and the pinned Yarn release:

```sh
node .yarn/releases/yarn-4.10.3.cjs security:audit
```

The aggregate runner executes all three inventories even if an earlier audit fails. It fails if any command reports advisories, cannot run, or exceeds its 60-second deadline. To run the checks individually:

```sh
node .yarn/releases/yarn-4.10.3.cjs npm audit --all --recursive --no-deprecations
node scripts/security/audit-vendor.mjs
npm audit --package-lock-only --prefix scripts/ucan
```

Each command exits nonzero when advisories are found. Run all three even when an earlier check fails, so the result covers each inventory. Registry failures are incomplete checks, not a clean result. These commands contact npm's public registry and submit package names and versions; they do not need credentials. Unit tests for the vendor checker inject an offline transport.

The October 24, 2026 follow-up audit passes all three inventories with zero known advisories. Elliptic was removed with the blanket Node polyfill dependency; AppKit and CDP were migrated to patched Zod 4.6.7 using tested source patches. See the [dated security report](reports/dependency-security-2026-10-24.md), [Zod migration maintenance notes](zod-migration.md), and [browser compatibility notes](../scripts/build/README.md). No advisory is suppressed.

The production build also rejects emitted Elliptic, crypto-browserify, and legacy Zod modules, including the `/v3` entrypoint still published inside Zod 4. This checks the implementation actually bundled in web and Electron renderers, beyond the registry package-version audit. Keep this check enabled for lazy chunks as well as the entry bundle.

## Coverage

The Yarn audit covers the application's resolved package graph, including dependencies of the locked Sora Pay archive. The standalone UCAN utility has its own npm lockfile and is audited separately; see [its maintenance notes](../scripts/ucan/README.md).

`audit-vendor.mjs` recursively reads named, versioned `package.json` files under `vendor/`, deduplicates versions, and submits those installed identities to npm's bulk advisory API. This catches copied packages that Vite aliases directly, such as `vendor/lodash-es`, even if a newer root dependency exists. It fails on malformed manifests, symlinks, unknown response shapes, HTTP errors, and timeouts. A finding prints all inventoried versions of the affected package; consult the linked advisory for its exact vulnerable range.

The vendor checker does not treat manifest dependency ranges as installed versions, traverse nested `node_modules`, unpack archives, or inspect compiled code. Sora Pay's `.tgz` is covered by the root lockfile audit rather than by this copied-manifest inventory. The separate retained UI-library development manifests under `packages/` are not root workspaces and are outside these checks. Audit that project separately before installing or publishing it.

Advisory databases do not prove that source code, modified vendored packages, bundled third-party code, or unpublished packages are secure. For a flagged package, establish whether its vulnerable API is reachable, apply a compatible patched release, and retain tests for any override that crosses a dependency's declared major version. Keep repository patches when updating their target packages, and test wallet signing, amount handling, IPFS encoding, and production builds after dependency changes. Do not suppress findings merely to obtain a passing audit.
