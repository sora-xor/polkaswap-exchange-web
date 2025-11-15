# Process Environment Usage Audit

## Goal

Identify every `process.env` reference in the repository, highlight whether it
runs in the browser runtime, and decide which ones still need to be migrated to
`import.meta.env` so we can delete the legacy `src/compat/process.ts` shim.

## Method

```
rg -n "process\.env" --glob '!*.map' src electron packages scripts tests
```

We also ran the command scoped to `src/**` to ensure no SPA code relies on
`process.env` any longer — that search returned no matches.

## Findings

| File                                                           | Env vars                                                                            | Runtime                         | Notes                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| `vite.config.mjs`                                              | `VITEST`                                                                            | Node (Vite config)              | Used to toggle testing mode; fine to keep as-is.   |
| `electron.vite.config.ts`                                      | `VITEST`                                                                            | Node (Vite config for electron) | Controls stub selection under Vitest.              |
| `playwright.config.ts`                                         | `PS_IPFS_TEST_PREFIX`, `CI`                                                         | Node (Playwright runner)        | Normal test harness usage.                         |
| `electron/main/index.ts`                                       | `ELECTRON_RENDERER_URL`                                                             | Electron main process           | Loads renderer during dev; no browser impact.      |
| `electron/background.ts`                                       | `NODE_ENV`, `ELECTRON_NODE_INTEGRATION`, `VITE_DEV_SERVER_URL`, `IS_TEST`           | Electron main process           | Currently commented code; still Node-only.         |
| `packages/soramitsu-js-ui-library/packages/ui/vite.config.mts` | `NODE_ENV`, `GENERATE_AUTO_IMPORT_FILES`                                            | Node                            | Build-time toggles.                                |
| `packages/.../scripts/run-cypress.cjs`                         | (forwards entire env)                                                               | Node                            | Passes host env to Cypress; no change needed.      |
| `packages/.../cypress.config.mjs`                              | `NODE_ENV`                                                                          | Node                            | Picks serve mode; fine.                            |
| `scripts/analyze/bundle.ts`                                    | `BUNDLE_REPORT_DIST`, `BUNDLE_REPORT_BASENAME`, `BUNDLE_REPORT_LIMIT`               | Node                            | CLI script configuration.                          |
| `scripts/analyze/compat-smoke.ts`                              | (spread of env)                                                                     | Node                            | Pass-through to spawned process.                   |
| `scripts/ipfs/check-browser.js`                                | `IPFS_CHECK_TIMEOUT`, `IPFS_CHECK_IPFS_TIMEOUT`, `HOME`, `USERPROFILE`, `IPFS_PATH` | Node                            | Diagnostics script.                                |
| `scripts/ipfs/publish.ts`                                      | `VITEST`                                                                            | Node                            | Skips publish logic while tests run.               |
| `scripts/lang/mt.ts`                                           | `LIBRE_TRANSLATE_URL`, `LIBRE_TRANSLATE_API_KEY`, `MYMEMORY_EMAIL`                  | Node                            | External translation tooling.                      |
| `scripts/testing/ipfs-preview-server.mjs`                      | `PS_IPFS_TEST_HOST`, `PS_IPFS_TEST_PORT`, `PS_IPFS_TEST_PREFIX`                     | Node                            | Local preview server configuration.                |
| `scripts/ucan/generateNftServiceKeypair.js`                    | `API_KEY`                                                                           | Node                            | Keypair generation tool.                           |
| `tests/e2e/ui/support/ipfs.ts`                                 | `PS_IPFS_TEST_PREFIX`                                                               | Node (Playwright fixtures)      | Support helper for IPFS E2E runs.                  |
| `packages/.../scripts/run-cypress.cjs`                         | `process.env` spread                                                                | Node                            | (already covered; included here for completeness). |

Additional notes:

- `src/lib/soraneo-wallet/lib/index-CgrbEUSl.mjs.map` contains `process.env`
  strings because it is a compiled artefact, not source. The corresponding
  TypeScript in `src/lib/soraneo-wallet/src/**` does **not** reference
  `process.env`.
- `src/**` (including SPA code and wallet adapter sources) currently has **zero**
  `process.env` references, so nothing inside the browser bundle depends on the
  compat shim.

## Conclusions

- All remaining `process.env` references execute in Node contexts (tooling,
  tests, Electron main process). None run in the browser bundle, and
  `rg -n "process\.env" --glob '!*.map' src` still returns zero matches.
- `src/compat/process.ts` has been removed; any new browser `process.env`
  lookups will fail at build time, forcing `import.meta.env` adoption.
- For documentation, ensure contributors add new browser env reads via
  `import.meta.env` only; Node scripts can continue using `process.env`.
