# polkaswap-exchange-web

Polkaswap Exchange Web is the Vue 3 + TypeScript client for the SORA network. It runs on Vite, uses Pinia for state, and emits a static bundle that is served over IPFS—there is no server runtime. Every feature must therefore work from assets in `dist/`.

## Requirements

- Node 24.x (see `.nvmrc` and the `package.json` engine field). Use `nvm`, `fnm`, or another version manager to match the toolchain before installing dependencies.
- Yarn 4.x (Berry). The repo pins the exact release via `.yarn/releases` and `.yarnrc.yml` (`yarnPath`); use `corepack` (bundled with Node) if needed.
- `npm install` is not supported (the repo uses Yarn's `patch:` protocol for dependencies).
- Modern browsers with WebAssembly enabled for runtime usage.

## Environment configuration

The IPFS bundle reads runtime configuration from `public/env.json`. Two keys are required:

- `BASE_API_URL` — points to the target runtime (production, staging, etc.).
- `DEFAULT_NETWORKS` — array of nodes that appear in the network selector. The first entry must be a trusted SORAMITSU node because its `genesisHash` is used to validate custom connections.

```json
{
  "BASE_API_URL": "https://example.api",
  "DEFAULT_NETWORKS": [
    {
      "chain": "SORA-staging Testnet",
      "name": "SORA",
      "address": "wss://ws.stage.sora2.soramitsu.co.jp"
    }
  ],
  "CHAIN_GENESIS_HASH": "0x..."
}
```

For IPFS publish guidance (pre-flight checklist, `yarn ipfs:publish`, verification scripts) see `docs/ipfs.md`. For SoraFS/Torii packaging and publish commands see `docs/sorafs.md`.

## Installation

```sh
nvm use
corepack enable
yarn install
```

### Known install warnings

- `@open-web3/api-mobx` is patched via `scripts/postinstall/fix-peer-deps.js` to accept the shipped `@polkadot/api` version. Yarn may still print peer metadata warnings when upstream package metadata changes; this is expected.
- The app-owned source no longer imports the class-component stack directly, but the vendored Soraneo wallet/UI sources still require the Vue 3-compatible release lines: `vue-class-component@8.0.0-rc.1`, `vue-property-decorator@10.0.0-rc.3`, and `vuedraggable@4.1.0`. npm `latest` still points at Vue 2 lines for several of these packages, so do not replace them with the `latest` tag by default.
- The vendored Soraneo wallet/UI bundles rely on browser helpers such as `vue-plugin-load-script`, `vue-observe-visibility`, `@urql/core`, `nft.storage`, `subscriptions-transport-ws`, `graphql`, and `@zxing/browser`. Keep these dependencies in `package.json` or `yarn build` will fail to resolve the wallet sources.

## Scripts

| Command | Description |
| --- | --- |
| `yarn serve` | Start the Vite dev server against the native Vue 3 app shell. |
| `yarn build` | Build the production bundle (`dist/`) for the native Vue 3 runtime. |
| `yarn build:vue3` | Compatibility alias for `yarn build`; kept for CI/release scripts that still reference the old migration name. |
| `yarn preview` | Serve the last build locally to mirror the IPFS bundle. |
| `yarn ci:nightly` | Convenience alias for `yarn test:translation && yarn build:vue3`; used by nightly jobs. |
| `yarn lint` | Run ESLint across the repo. |
| `yarn analyze:store` | Produce the Vuex-to-Pinia usage audit (`docs/reports/store-access-audit.*`). |
| `yarn test:unit` | Execute the Vitest unit suites (`tests/unit/**`). |
| `yarn test:ipfs` | Serve the built `dist/` under an IPFS-style path and run a Playwright smoke check for runtime errors/blank pages. |
| `yarn test:translation` | Ensure locale catalogs mirror `en.json` and detect missing keys. |
| `yarn test:e2e` | Run the default Playwright UI suite under an IPFS-style prefix with deterministic network stubs. |
| `yarn test:e2e:root` | Run key UI app/navigation specs with root prefix (`PS_IPFS_TEST_PREFIX=''`) to catch `/` deployment regressions. |
| `yarn test:e2e:live` | Run live-runtime UI smokes without network stubs (`PS_E2E_LIVE_NETWORK=1`) and fail on browser console/page errors. |
| `yarn test:e2e:all` | Run the full e2e matrix (`default` + `root-prefix` + `live`). |
| `yarn test:all` | Alias for `yarn test:unit`. |
| `yarn lang:generate` | Build `src/lang/en.json` from `src/lang/messages.ts` (keeps wallet bundles in sync). |
| `yarn lang:fix` | Alphabetize and format `src/lang/en.json`. |
| `yarn lang:diff` | Show translation key/value changes vs. a Git ref (defaults to `origin/main`). |
| `yarn lang:mt` | Machine-translate missing locales; see `scripts/lang/mt.ts` flags. |
| `yarn kpi:report` | Generate the nightly KPI snapshot (`tmp/kpi-report.json` + `docs/status/kpi-history.md`). |
| `yarn ipfs:publish` | Publish the static bundle to IPFS. Use together with `yarn ipfs:check` or `yarn ipfs:check:electron` for verification. |
| `yarn sorafs:package` | Build the static bundle, swap in `public/env.taira.json`, and emit SoraFS artefacts under `artifacts/sorafs/<host>/<timestamp>/`. Defaults to `https://taira.sora.org`. |
| `yarn sorafs:publish` | Run the SoraFS package flow and submit the manifest to the configured Torii endpoint. |
| `yarn sorafs:probe` | Verify the live host serves `/`, `/.well-known/sorafs/manifest`, `/status`, and `/v1/sumeragi/status`. |
| `yarn taira:package` | Shortcut for `yarn sorafs:package` pinned to `https://taira.sora.org`. |
| `yarn taira:publish` | Shortcut for `yarn sorafs:publish` pinned to `https://taira.sora.org`. |
| `yarn taira:probe` | Shortcut for `yarn sorafs:probe` pinned to `https://taira.sora.org`. |

## Testing

Vitest is configured via `vitest.config.mjs` with projects for unit suites and i18n checks. Add or update unit tests under `tests/unit/**` whenever you introduce a new function, composable, or store action. Useful commands:

- `yarn test:unit` — runs every unit suite. Target a single file via `vitest run --config vitest.config.mjs --project unit path/to/spec`.
- `yarn test:translation` — validates that every locale mirrors the English catalog and that special locales (for example Akkadian) respect their constraints.
- `yarn test:e2e` — runs the default Playwright UI suite with deterministic stubs.
- `yarn test:e2e:root` — validates key UI flows when served from root path (`/`) instead of `/ipfs/<cid>/`.
- `yarn test:e2e:live` — runs real-runtime UI smoke tests without request/WebSocket stubbing.
- `yarn test:e2e:all` — runs default + root + live e2e checks in sequence.
- `yarn test:all` — alias for unit tests, handy for CI hooks.

Always keep `yarn test:unit` and `yarn test:translation` green locally before opening a PR. They are also part of `yarn ci:nightly`, so failures break the nightly Vue 3 smoke streak.

## Build & IPFS

- `yarn build` produces the production-ready native Vue 3 bundle.
- `yarn build:vue3` is an alias for the same native Vue 3 build and remains available for existing CI jobs and release checklists.
- `yarn preview` serves the generated bundle so you can smoke-test the IPFS artifacts locally.
- `yarn ipfs:publish` runs the publish workflow described in `docs/ipfs.md` (publishes to the configured gateway/IPFS node and logs the CID in `ipfs_publish.log`). `yarn ipfs:check` and `yarn ipfs:check:electron` verify the browser/electron bundles after a publish.

Vite currently emits a few warnings from Soramitsu UI Tailwind shorthand classes during `yarn build`; they are cosmetic but still reviewed during release readiness.

## State management workflow

The app is mid-migration from Vuex facades to Pinia. The old `direct-vuex` package has been removed; `src/store/direct-vuex.ts` is now a narrow repo-local compatibility layer, with `src/store/app-store-bridge.ts` and `src/utils/app-store.ts` providing the current bootstrap/access surface while feature stores move to Pinia. New code must import Pinia stores from `src/stores/**` and avoid referencing the Vuex facades directly. Key stores include:

- `useAssetsStore` (`src/stores/assets`) — asset metadata, registered bridge assets, balances.
- `useWalletStore` (`src/stores/wallet`) — account state, login helpers, transaction dialogs.
- `useSwapStore` (`src/stores/swap`) — swap form state and quote helpers.
- `useSettingsStore`, `useNotificationsStore`, `useRouterStore`, `useBridgeStore`, and the staking/pools stores under `src/stores/**`.

Legacy Vuex modules remain in `src/store/**` simply as facades while Options API components are migrated. Avoid adding new decorator usage; instead, expose the needed Pinia action/getter through the facade until the component is converted. Progress and owners are tracked in `docs/plans/state-layer-migration.md`.

## Developing with Pinia

- Initialise stores in Composition API code via their `use…Store` helpers and expose reactive state with `storeToRefs`:

  ```ts
  import { storeToRefs } from 'pinia';
  import { useSwapStore } from '@/stores/swap';

  const swapStore = useSwapStore();
  const { fromValue, toValue, priceImpact } = storeToRefs(swapStore);
  const { setFromValue } = swapStore;
  ```

- Compose shared workflows inside `src/composables/**` when multiple stores are involved (for example see `useBridgeCore`, `useInternalConnect`, `useOrderBook`).
- Update or create tests under `tests/unit/stores/<store>.spec.ts` whenever you extend store logic; cover precision math, error states, and emitted side-effects.
- For Options API holdouts, route through the existing facades in `src/store/**` rather than creating new decorator-based stores.
- Run `yarn test:unit --project unit tests/unit/stores/<store>.spec.ts` (or the full suite) before sending PRs so the Pinia/Vuex parity checklist remains reliable.

## Desktop (Electron) scripts

Electron builds live under `electron/` and share the same Vite-based toolchain:

```sh
yarn electron:serve        # dev/watch mode
yarn electron:build        # production bundle
yarn electron:build --linux --mac zip dmg --win portable --x64 --ia32
```

Built artifacts are emitted to `dist_electron/`. Use `yarn ipfs:check:electron` to smoke-test the IPFS bundle in the Electron shell.

## Internationalization

Locale catalogs live under `src/lang/*.json` (SPA) and `src/lang/card/*.json` (embedded Sora Card widgets). Runtime English strings originate from `src/lang/messages.ts`, which merges wallet bundle strings with Polkaswap-specific keys, and `yarn lang:generate` keeps `src/lang/en.json` aligned with that source. Follow this workflow when editing copy:

1. Update or add the string in `src/lang/messages.ts`. Reuse existing keys whenever possible.
2. Run `yarn lang:generate` to rebuild `src/lang/en.json` from the TypeScript definitions.
3. Run `yarn lang:fix` so the English catalog stays alphabetized and normalized.
4. Update every locale JSON file (mirror `en.json` in `src/lang/*.json` and `src/lang/card/*.json`). Use Lokalise exports, `yarn lang:diff` to preview the changed keys, or `yarn lang:mt --languages=…` for placeholders, but do not leave missing keys.
5. Run `yarn test:translation` to ensure catalogs stay in sync and special locales (for example Akkadian via `tsx scripts/lang/enforce-cuneiform.ts --locales=akk`) respect their requirements.

All translation changes must land with regenerated locale files and passing `yarn test:translation`.
