# polkaswap-exchange-web

Polkaswap Exchange Web is the Vue 3 + TypeScript client for the SORA network. It runs on Vite, uses Pinia for state, and emits a static bundle that is served over IPFS—there is no server runtime. Every feature must therefore work from assets in `dist/`.

## Requirements

- Node 26.x (see `.nvmrc` and the `package.json` engine field). Use `nvm`, `fnm`, or another version manager to match the toolchain before installing dependencies.
- Yarn 4.x (Berry). The repo pins the exact release via `.yarn/releases` and `.yarnrc.yml` (`yarnPath`); use `corepack` (bundled with Node) if needed.
- `npm install` is not supported (the repo uses Yarn's `patch:` protocol for dependencies).
- Modern browsers with WebAssembly enabled for runtime usage.

## Environment configuration

The IPFS bundle reads runtime configuration from `public/env.json`. Two keys are required:

- `BASE_API_URL` — points to the target runtime (production, staging, etc.).
- `DEFAULT_NETWORKS` — array of nodes that appear in the network selector. The first entry must be a trusted SORAMITSU node because its `genesisHash` is used to validate custom connections.
- `POLKASWAP_INDEXER_ENDPOINT` — GraphQL endpoint for Polkaswap statistics and indexed history. Empty values disable indexer-backed features until an explicit endpoint is configured.
- `SORAMETRICS_API_ENDPOINT` — optional Sorametrics REST API endpoint used for fiat prices and latest block display when the configured Polkaswap GraphQL indexer is unavailable. It is not a GraphQL replacement endpoint.

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

The [Tonswap burn campaign](docs/tonswap-burn.md) at `/#/burn` reserves TS for XOR burned from block 27,720,478, separately from the SS / SORA Nexus campaign. It uses a globally ordered reward curve, caps rewarded burns at 1,753,357 XOR, and records future claims against the burning SORA wallet for Tonswap's launch.

For same-page automation from AI agents, see `docs/agent-trading.md` and `docs/agent-trading-cookbook.md`. The API is exposed as `window.PolkaswapAgent` from the static IPFS app and ships `.well-known` manifest, types, schema, examples, and optional browser client without middleware.

The [Bots workspace](docs/bot-trading.md) at `/#/bots` adds historical testing, unsigned paper trading, and consent-based live swaps using the existing wallet. The [simple start flow](docs/bots-simple-start.md) puts token selection first, previews one strategy by default, explains recorded decisions, and connects the result directly to a funded wallet review. It includes scoped session signing, reusable per-bot allocations, and optional direct OpenAI, Claude, or custom HTTPS proposal providers. Live sessions require IndexedDB and Web Locks; they pause when the browser tab is hidden or suspended.

The [public execution-evidence collector](docs/bots-execution-evidence.md) records scheduled, finalized KUSD/XOR quotes and estimated fees for research, with immutable manifests and explicit failures. It uses public RPC only and never submits trades.

The [indexer history API](docs/indexer-history-api.md) serves historical and newly completed hourly data for XOR, VAL, PSWAP, DAI, KUSD, LLD and LLM, with pagination, freshness checks and explicit missing or absent-pool statuses.

[Historical execution research](docs/bots-historical-execution.md) separates completed-hour signals from later archived quote states, with explicit timing assumptions and historical runtime fee decoding. These development tools do not change GO qualification or authorize trading.

Generic agent discovery breadcrumbs are also published as `llms.txt`, `agents.txt`, `AGENTS.md`, `robots.txt`, and HTML head tags that point at `.well-known/polkaswap-agent.json`.

Developers can use `yarn agent:runner` for a copyable Playwright runner, or open `agent-playground.html` from a deployed/static build to inspect the API in a browser.

Run `yarn test:e2e:agent:smoke` to verify the browser-native agent API against the built static app.

## Installation

```sh
nvm use
corepack enable
yarn install
```

### Known install warnings

- `@open-web3/api-mobx` is patched via `scripts/postinstall/fix-peer-deps.js` to accept the shipped `@polkadot/api` version. Yarn may still print peer metadata warnings when upstream package metadata changes; this is expected.
- `@polkadot/rpc-provider@16.5.4` is patched (`.yarn/patches/@polkadot-rpc-provider-npm-16.5.4-*.patch`) so that `WsProvider` does not keep subscription notifications forever. Upstream stores every notification that arrives after an unsubscribe in `#waitingForId` for the life of the connection; a tab that quotes repeatedly (bots, Swap) grew by about 0.5 MB per hour. The patch drops notifications for subscriptions the client closed in the last five minutes (at most 4,096 records) and caps notifications for unknown subscriptions at 256. Out-of-order notifications for pending subscriptions are still delivered. `tests/unit/lib/substrate/connection/ws-provider-subscriptions.spec.ts` covers it; re-create the patch when upgrading `@polkadot/api`.
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
| `yarn agent:runner` | Run the copyable Playwright agent example that discovers the v1 API, quotes, prepares, and optionally executes a swap. |
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

The XOR-only Community Store at `/#/store` uses the versioned Sora Pay package and a separate private merchant relay. See [Community Store](docs/community-store.md) for pricing, product assets, recovery, fulfillment and launch requirements. The IPFS bundle keeps browsing available while its relay is unconfigured.

Vitest is configured via `vitest.config.mjs` with projects for unit suites and i18n checks. Add or update unit tests under `tests/unit/**` whenever you introduce a new function, composable, or store action. Useful commands:

- `yarn test:unit` — runs every unit suite. Target a single file via `vitest run --config vitest.config.mjs --project unit path/to/spec`.
- `yarn test:translation` — validates that every locale mirrors the English catalog and that special locales (for example Akkadian) respect their constraints.
- `yarn test:e2e` — runs the default Playwright UI suite with deterministic stubs.
- `yarn test:e2e:root` — validates key UI flows when served from root path (`/`) instead of `/ipfs/<cid>/`.
- `yarn test:e2e:live` — runs real-runtime UI smoke tests without request/WebSocket stubbing.
- `yarn test:e2e:all` — runs default + root + live e2e checks in sequence.
- `yarn agent:runner` — runs the copyable Playwright agent example against a deployed or local app URL.
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

See [account balances](docs/account-balances.md) for native XOR freeze rules, total versus spendable amounts, and the snapshot/subscription lifecycle shared by the wallet, Swap, and Polkamarkt.

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

UI/UX behavior and validation: [UI refinements](docs/ui-ux-improvements.md) and [Swap quote, review and layout behavior](docs/swap-interaction.md).

The static Buy XOR flow uses an isolated MOF service for read-only conversion quotes. See [quote relay operations](docs/buy-xor-quote-relay.md) for its fixed request schema, production-origin policy, limits, deployment and verification; wallet signing stays in the frontend.

The [before-card cost review](docs/buy-xor-card-cost-review.md) checks the budget and route before opening payment. [Purchase recovery](docs/buy-xor-funding-state.md) preserves tracked funding, and [opt-in measurement](docs/buy-xor-measurement.md) counts aggregate purchase-step observations. See the [release evidence](docs/buy-xor-cost-release-2026-09-25.md) and the separate [native liquidity funding proposal](docs/native-xor-liquidity-funding-proposal.md).

[Card continuation and wallet backup fixes](docs/buy-xor-followthrough-2026-09-25.md) cover edited checkout budgets, account-safe history responses, neutral recovery after reload and confirmed encrypted Google backup writes.

[Buy XOR usability improvements](docs/buy-xor-usability-2026-09-26.md): wallet setup, cost summaries and receipt-based purchase progress.
