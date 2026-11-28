# Embedded glob parsers

The two standalone Yarn executables and the tsx watcher include compiled copies of Picomatch. Package resolutions for a separately installed Picomatch cannot change those copies. The checked-in Yarn files contain the guard directly so that running either file from an offline checkout also enforces it. Yarn applies `.yarn/patches/tsx-npm-4.23.15-picomatch.patch` during installation.

Rollup 4.65.0 includes six copies across its CommonJS and ES module build and watch files. Prettier 3.10.1 and Playwright 1.65.1 each include one. Versioned patches in `.yarn/patches` add the same restriction to each parser. The regression suite checks the parser entries in all six affected files and exercises Rollup hook filtering and Prettier configuration matching. See the [installed package remediation and advisory monitor](../../docs/security-dependencies.md#picomatch-remediation).

The guard runs when the parser recognizes a repeating extglob opener. It permits nonempty, prefix-free alternatives made of ASCII letters, digits, spaces, dots, underscores, hyphens and slashes. For example, `+(lib|src)` remains supported. Overlapping, case-overlapping, nested or nonliteral alternatives raise a syntax error before the parser constructs a matcher. Patterns without a repeating extglob follow the original parser path. The guard runs independently of the matcher options.

## Release inputs

The standalone bundle generator in `harden-glob-cli.mjs` requires an exact SHA-256 match and one unique parser hook. The November 18, 2026 review verified each upstream archive against the SHA-512 integrity recorded by the official npm registry before extracting these input files.

| Package                                                                           | File in npm archive    | Upstream file SHA-256                                              | Patched checkout file SHA-256                                      |
| --------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [@yarnpkg/cli-dist 4.10.3](https://registry.npmjs.org/@yarnpkg%2Fcli-dist/4.10.3) | `package/bin/yarn.js`  | `cd71753d68307301d21034efaf20bd8eee81f9450af75f068477bf9011bb9ad4` | `bae43212e717c790d3e5551f078a2173c345d6c9e314cb5b89ff282659930c7c` |
| [@yarnpkg/cli-dist 4.18.1](https://registry.npmjs.org/@yarnpkg%2Fcli-dist/4.18.1) | `package/bin/yarn.js`  | `a28ad591febb769f939c11f82f89bacad0b0fac0c884d3b78fa2aaaee970907e` | `ddc27f296cee3f9fd7c95c8225c94c965e0826192f399183b6c1ad79c645c88d` |
| [tsx 4.23.15](https://registry.npmjs.org/tsx/4.23.15)                             | `package/dist/cli.mjs` | `8690135061bc49d187143493b82d26a09b7fb71d6dd817d2242cc9dc52506de9` | `12c692293f06d2b0c75eca0f93991308f392c11e158f953d3fe489e00507499e` |

The historical checked-in Yarn 4.10.3 file already lacked one formatting space from the official archive. Its pre-change SHA-256 was `3ab8877d4bfbbcfcc1b3514801a23290015dd6b5d0ec9974385bc319bf99b980`. The patch preserves that input byte-for-byte outside the inserted guard. The generator also recognizes the official 4.10.3 input for maintainers who reconstruct directly from the registry.

## Regeneration and verification

Run `node scripts/security/harden-glob-cli.mjs ORIGINAL PATCHED` on the original standalone JavaScript file. For Yarn, keep that output as its standalone CLI. For tsx, apply the generated change as a Yarn source patch against `dist/cli.mjs`. When moving to another upstream release, inspect its parser first. A version whose parser already enforces the required restriction can retire the patch after consumer tests verify the fix.

Run the offline regression checks from the repository root:

```sh
node .yarn/releases/yarn-4.18.1.cjs test:unit --project unit-scripts tests/unit/scripts/security/embedded-glob-cli.spec.ts tests/unit/scripts/security/picomatch-embedded-consumers.spec.ts
```

The checks use both Yarn executables in isolated fixtures with network access disabled, invoke the real tsx watcher, and regenerate all three installed bundles from their original bytes. Current project commands using the historical Yarn path still delegate to the active release through `yarnPath`.
