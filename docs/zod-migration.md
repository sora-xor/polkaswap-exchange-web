# Patched Zod consumers

The application resolves `@reown/appkit-wallet@1.8.19` and
`@coinbase/cdp-sdk@1.60.0` to Zod **4.6.7**, with maintained source patches for
their Zod 3 APIs and generated declarations. CDP also resolves `abitype@1.3.0`,
whose published peer range supports Zod 4 and whose runtime imports `zod`
directly. A scoped abitype patch bounds its collections and regenerates its
published Zod 3 declarations against Zod 4. No runtime import is redirected to
`zod/v3`.

The upstream [Zod migration guide](https://zod.dev/v4/changelog) documents the
two-argument `record` API and required `any` object properties. These are real
consumer migrations, accompanied by schema behavior tests, rather than a
dependency override that assumes major versions are interchangeable.

## Source and patch provenance

- `.yarn/patches/@reown-appkit-wallet-npm-1.8.19-zod4.patch` uses the exact
  [AppKit 1.8.19 schema source](https://raw.githubusercontent.com/reown-com/appkit/@reown/appkit@1.8.19/packages/wallet/src/W3mFrameSchema.ts).
  The original UTF-8 file has SHA-256
  `b345c4b5ef126fd39163a029c920f7902012603ef0abc03c0fb78f10a592f19a`.
  The patch includes the migrated `src/W3mFrameSchema.ts` inside the package,
  plus regenerated ESM JavaScript, its source map, and declaration.
- `.yarn/patches/@coinbase-cdp-sdk-npm-1.60.0-zod4.patch` starts from the published
  package's `src/policies/{evmSchema,solanaSchema,types}.ts`. It updates EVM and
  Solana source, both ESM and CommonJS outputs and source maps, and all three
  affected declaration files and their declaration maps.
- `.yarn/patches/abitype-npm-1.3.0-zod4-bounds.patch` starts from the published
  `abitype@1.3.0` package's `src/zod.ts`. It updates that source, both ESM and
  CommonJS outputs and maps, and its Zod declaration and declaration map. It is
  scoped to CDP's dependency; other consumers' abitype versions are unchanged.

The package-manifest hunks document the new dependencies. Yarn patch manifest
changes do not determine resolution, so the root manifest also contains explicit
consumer-scoped resolutions for AppKit/Zod, CDP/Zod, and CDP/abitype. Keep those
resolutions and patches together.

## Exact source transformations

1. In AppKit, call `z.config({ jitless: true })` immediately after its imports,
   before constructing any schemas. Zod's default dynamic `Function` probe
   triggers a CSP violation even when its error is caught. This configuration
   uses Zod's interpreter and preserves the application's script CSP. The
   schema module's only runtime dependencies are Zod and the constants module;
   neither constructs a schema before this configuration runs.
2. In AppKit, add `.optional()` to `RpcResponse` and the `params: z.any()` fields
   of `WalletRevokePermissionsRequest` and `WalletGetAssetsRequest`. This retains
   their existing accepted omitted/undefined behavior under Zod 4. Other schemas
   retain their upstream required/optional semantics.
3. In CDP's `SignEvmTypedDataFieldCriterionSchema`, change the single-argument
   EIP-712 `types` record to `z.record(z.string(), valueSchema)`.
4. Append `.max(2048)` directly to every otherwise-unbounded `z.array(...)`
   expression in these source files. Inspect the expression's method-call chain;
   if it already has `.max(...)` or `.length(...)`, preserve that existing bound.
   This adds 42 AppKit bounds and 17 CDP bounds (7 EVM, 10 Solana). Existing limits
   such as 100 policy rules, 300 addresses, and 10 criteria remain unchanged.
5. Flatten the three long AppKit `.or(...)` chains (app events, frame events, and
   nested RPC requests) into ordered `z.union([...])` tuples with the same
   alternatives in the same order. Preserve the RPC `.and(...)` intersection.
   This avoids Zod 4 public declaration instantiation-depth failures. It does not
   switch to discriminated unions, deduplicate alternatives, or change acceptance.
6. Append `.max(2048)` to all 11 abitype `z.array(...)` expressions. This covers
   the imported root ABI, function inputs/outputs, constructors, events, errors,
   recursive tuple components, and typed-data field arrays. Preserve their
   `.readonly()` wrappers and all existing transforms.
7. In CDP, import the public `Abi` type as `AbiType` and declare
   `const EvmAbiSchema: z.ZodType<AbiType> = Abi`; use this alias in
   `EvmDataCriterionSchema`. This keeps the same parser and exact public ABI
   output type while preventing declarations from naming private abitype paths.
8. In abitype, retain the typed-data record as `TypedDataFields`, then annotate
   `TypedData` as `z.ZodPipe<typeof TypedDataFields,
z.ZodTransform<TTypedData, z.output<typeof TypedDataFields>>>`. Keep the
   existing transform callback. This preserves the upstream public `TTypedData`
   alias rather than emitting an expanded mapped type with invalid index
   signatures. There is no validation or parsed-value change.
9. Regenerate declarations from the migrated TypeScript source. Do not hand-edit
   generated generic arguments or replace exported types with `any`.

The bound of 2,048 matches the wallet ingress collection limit. The patched Zod
version can reject a collection that exceeds an explicit maximum before
allocating an issue for each element. Zod's fix does **not** make unbounded
collections or arbitrary application payloads safe automatically; the separate
origin, total-node, depth, string-byte and discriminator checks in
`src/security/w3mMessageGuard.ts` remain in place.

## Rebuilding the generated files

Use Node 26 and the repository's TypeScript **5.9.3**. Work in a staging directory
whose `node_modules` resolves Zod **4.6.7**, abitype **1.3.0**, and the installed
AppKit common types. First compile abitype's patched `src/zod.ts` with its other
published source files available for imports, and copy its generated Zod
declarations into the abitype package that CDP's staging directory resolves.
The upstream declaration still names Zod 3 APIs such as `ZodEffects`, so merely
upgrading abitype's runtime is insufficient. Copy the patched source files there. For AppKit also copy
the unchanged `dist/types/src/W3mFrameConstants.d.ts` alongside its schema source;
this preserves the exact literal discriminator types without compiling unrelated
wallet modules. The following commands assume the staging directories are
`/tmp/polkaswap-zod-abitype`, `/tmp/polkaswap-zod-appkit`, and
`/tmp/polkaswap-zod-cdp`:

```sh
node node_modules/typescript/bin/tsc /tmp/polkaswap-zod-abitype/src/zod.ts --target ES2022 --module ESNext --moduleResolution Bundler --strict --skipLibCheck --esModuleInterop --declaration --declarationMap --sourceMap --rootDir /tmp/polkaswap-zod-abitype/src --outDir /tmp/polkaswap-zod-abitype/out
node node_modules/typescript/bin/tsc /tmp/polkaswap-zod-abitype/src/zod.ts --target ES2022 --module CommonJS --moduleResolution Node --strict --skipLibCheck --esModuleInterop --sourceMap --rootDir /tmp/polkaswap-zod-abitype/src --outDir /tmp/polkaswap-zod-abitype/out-cjs
node node_modules/typescript/bin/tsc /tmp/polkaswap-zod-appkit/src/W3mFrameSchema.ts --target ES2022 --module ESNext --moduleResolution Bundler --strict --skipLibCheck --esModuleInterop --declaration --sourceMap --rootDir /tmp/polkaswap-zod-appkit/src --outDir /tmp/polkaswap-zod-appkit/out
node node_modules/typescript/bin/tsc /tmp/polkaswap-zod-cdp/src/policies/evmSchema.ts /tmp/polkaswap-zod-cdp/src/policies/solanaSchema.ts /tmp/polkaswap-zod-cdp/src/policies/types.ts --target ES2022 --module ESNext --moduleResolution Bundler --strict --skipLibCheck --esModuleInterop --declaration --declarationMap --sourceMap --rootDir /tmp/polkaswap-zod-cdp/src --outDir /tmp/polkaswap-zod-cdp/out
node node_modules/typescript/bin/tsc /tmp/polkaswap-zod-cdp/src/policies/evmSchema.ts /tmp/polkaswap-zod-cdp/src/policies/solanaSchema.ts /tmp/polkaswap-zod-cdp/src/policies/types.ts --target ES2022 --module CommonJS --moduleResolution Node --strict --skipLibCheck --esModuleInterop --sourceMap --rootDir /tmp/polkaswap-zod-cdp/src --outDir /tmp/polkaswap-zod-cdp/out-cjs
```

Copy the generated files into the paths named above in a Yarn patch workspace.
Copy only abitype's `zod.js`, `zod.js.map`, `zod.d.ts`, and `zod.d.ts.map` outputs
into the respective published directories; compilation also emits its unchanged
imported helper modules, which do not need patching. Set abitype map `sources`
to `["../../src/zod.ts"]` for each published output directory.
CDP maps already refer to `../../src/policies/<name>.ts`. AppKit's generated map
must have `sources: ["../../../src/W3mFrameSchema.ts"]` because its published ESM
directory is three levels below the package root. Preserve maps only when they
describe the regenerated code. No original map is retained for changed code.

The large patch diff primarily replaces Zod 3's expanded declarations: the four
schema declarations shrink from about 1.37 MB to 293 KB, with another 6.4 KB for
abitype's regenerated declaration. TypeScript checks the
migrated sources before emitting their corresponding Zod 4 declarations.

## Verification and retirement

Run `yarn test:unit`, `yarn build`, and `yarn npm audit --all --recursive`. The
offline real-consumer tests in `tests/unit/scripts/security/zodConsumers.spec.ts`
load actual installed AppKit and CDP schemas. They verify genuine Zod 4 instances,
EVM/Solana policy parsing, EIP-712 records, optional wallet RPC fields, malformed
input rejection, and bounded errors through ESM and CommonJS. ABI tests preserve
tuple parsing and deprecated mutability defaults, and verify root and nested
parameter collections reject oversized arrays without reading their elements.
Fresh-process tests block and count every `Function` construction before loading
either the wallet's direct schema module or its full public entrypoint. Both
must initialize and parse valid/invalid messages synchronously and asynchronously
with zero attempts, so a cached Zod module cannot hide a CSP regression.

The Chromium regression in `tests/e2e/ui/wallet-schema-csp.spec.ts` bundles the
installed wallet schemas and loads them in an independent, offline route fixture
with `default-src 'none'; script-src 'self'`. It verifies valid requests and
oversized collections in both parsing modes, then checks queued CSP violation
events as well as console and page errors. This catches blocked dynamic code
generation even when Zod catches the browser's exception. An in-memory negative
control with the `jitless` setting removed produced the expected blocked `eval`
violation; the installed patch produces none. No CSP permission is relaxed.

The same suite compiles `tests/fixtures/security/zod-consumers.typecheck.ts` and
checks all five regenerated declarations with strict TypeScript and
`skipLibCheck: false`; the expected-error assertions ensure discriminators have
not become `any`. This targets the migrated declarations and public consumer
fixture, not all unrelated vendor declarations. Synchronous and asynchronous
schema tests also verify that an
oversized array is rejected before any element getter is accessed. The build gate
rejects emitted Zod 3 modules, including the compatibility implementation
packaged inside Zod 4.

Retire a consumer patch when an upstream version adopts a patched Zod runtime
with equivalent behavior and bounds; rerun the same tests before removing its
scoped resolution. Keep application ingress checks as defense in depth.
