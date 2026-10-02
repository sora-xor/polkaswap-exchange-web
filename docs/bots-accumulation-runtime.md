# Standalone accumulation research runtime

The research TypeScript modules must run with `scripts/bots/tsconfig.accumulation.json`. It supplies the four local source aliases that Vite normally resolves for the app: `@/*`, the math package root and subpaths, and the liquidity-proxy root. It extends the repository TypeScript settings without changing the global config or sealed sources. Package installation or an external SDK copy is not the fix for these imports.

From the repository root, use the actual Node 26 runtime and installed tsx:

```sh
node node_modules/tsx/dist/cli.mjs --tsconfig scripts/bots/tsconfig.accumulation.json <research-entrypoint.ts>
```

This configuration fixes module resolution only. It does not change trusted source bindings, registrations, file checks, model selection, transport endpoints, clocks or trading authority. A source-pinned launcher must retain/bind this config and its runtime dependency closure when authorizing a future invocation.

The bounded standalone smoke uses invented evidence and calls the actual native mark verifier, admission-result validator and completion-clock functions outside Vitest's process. It checks all four aliases, exact token math, verifier ownership, nine original outcomes, and fresh/expired synthetic completion results. It also calls the production clock entry point without backdating it to fixture time. It does not invoke the admission model, acquire market data, use a wallet or submit a transaction; synthetic buy diagnostics are not market or profit evidence.

Run the smoke directly:

```sh
node node_modules/tsx/dist/cli.mjs --tsconfig scripts/bots/tsconfig.accumulation.json tests/unit/scripts/bots/fixtures/accumulation-standalone-runtime-child.ts
```

Or run its bounded unit wrapper:

```sh
node .yarn/releases/yarn-4.10.3.cjs exec vitest run --config vitest.config.mjs --project unit-scripts tests/unit/scripts/bots/accumulation-standalone-runtime.spec.ts
```

The wrapper uses an argument array, no shell, a minimal environment, a 10-second child timeout and a 64 KiB output bound. It requires exit zero, no signal, no unexpected stderr diagnostics, and the exact small JSON smoke receipt. Known warnings from the retained minimal synthetic metadata (missing Event/u16 lookup definitions) and Node 26/tsx deprecation are bounded and checked explicitly without suppressing them. This smoke-only allowance does not change the admission worker’s empty-stderr requirement. It does not inherit `NODE_OPTIONS`, tsx config overrides or the Vitest environment into the child.
