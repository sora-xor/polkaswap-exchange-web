# polkaswap-exchange-web

## Project deploy info

There is `public/env.json` file which contains `BASE_API_URL` and `DEFAULT_NETWORKS` variables.

`BASE_API_URL` will be used for the address of the current stand.

`DEFAULT_NETWORKS` variable has the following format:

```
"DEFAULT_NETWORKS": [
    {
        "chain": "SORA-staging Testnet",
        "name": "SORA",
        "address": "wss://ws.stage.sora2.soramitsu.co.jp"
    }
]
```

`"chain"` is used as the chain name.
`"name"` is used as the node name.
`"address"` is used for the address of the node to which the frontend project will be connected.

`DEFAULT_NETWORKS[0]` must be a Soramitsu trusted node. App used it's `genesisHash` to check custom user node for connection

`CHAIN_GENESIS_HASH` should be defined for 'prod' & 'stage' environments, to not polling nodes for getting it (because genesis hash for these env's not changing).

For IPFS-specific guidance (pre-flight checklist, `yarn ipfs:publish`, and the verification scripts), see [docs/ipfs.md](docs/ipfs.md).

## Project setup

```
yarn install
```

### Known install warnings

- `@open-web3/api-mobx` and the `@polkadot/*` stack are patched via `scripts/postinstall/fix-peer-deps.js` to accept the modern `@polkadot/api` version we ship with. Yarn will still print a peer-range warning during `yarn install`; this is expected.
- `vue-class-component@7` declares a Vue 2 peer dependency. We intentionally keep it in compat mode while the wallet is migrated to Vue 3, so Yarn will report the mismatch until that work lands.
- The vendored Soraneo wallet and UI bundles now pull in their upstream runtime helpers (`vue-plugin-load-script`, `@urql/core`, `nft.storage`, `file-saver`, `base-64`, `jdenticon`, `subscriptions-transport-ws`, `graphql`, `graphql-ws`, `crypto-random-string`, `vue-observe-visibility`, `vuedraggable`, `@zxing/browser`, `@zxing/library`, `date-fns`, `react`, and `react-dom`). Make sure these stay in `package.json`, otherwise `yarn build` cannot resolve the wallet sources.

### Compiles and hot-reloads for development

```
yarn serve
```

### Compiles and minifies for production

```
yarn build
```

### Run your unit tests

```
yarn test:unit
```

### Run your end-to-end tests

```
yarn test:e2e
```

### Run all tests

```
yarn test:all
```

### Build verification

```
yarn build
```

Building the IPFS bundle is the quickest way to surface missing-runtime issues outside of Vitest. The current build completes successfully (Vite will emit a handful of warnings from the Soramitsu UI Tailwind shorthand, which are cosmetic).

### Lints and fixes files

```
yarn lint
```

## State management workflow

The application is migrating from Vuex modules to Pinia stores. New code should always use the Pinia stores located under `src/stores/**` via the `use…Store` helpers:

- `import { useAssetsStore } from '@/stores/assets'` to resolve asset metadata, registered bridge assets, and balances.
- `import { useWalletStore } from '@/stores/wallet'` for account state, login helpers, and transaction dialogs.
- `import { useSwapStore } from '@/stores/swap'` for swap form state and quote helpers.
- Additional stores (`settings`, `notification`, `router`) live in the same directory.

Legacy Vuex modules still exist under `src/store/**` and are kept as thin facades that forward to the Pinia stores while older components are migrated. Avoid adding new dependencies on `direct-vuex` decorators—prefer composables such as `useInternalConnect`, `useWalletConnect`, or the stores above. The Pinia/Vuex parity checklist lives in `docs/plans/vue3-migration.md` and the wallet library contract is documented in `docs/plans/soraneo-wallet-migration-contract.md`.

### Developing with Pinia

- Initialise stores in Composition API code using the dedicated hooks and derive reactive values with `storeToRefs` when exposing state to templates:

  ```ts
  import { storeToRefs } from 'pinia';
  import { useSwapStore } from '@/stores/swap';

  const swapStore = useSwapStore();
  const { fromValue, toValue, priceImpact } = storeToRefs(swapStore);
  const { setFromValue } = swapStore;
  ```

- Compose logic in standalone composables whenever a workflow touches more than one store (for example, see `src/composables/useBridgeCore.ts`). This keeps stores slim and reusable while avoiding circular imports.
- When you extend a store, add or update unit tests under `tests/unit/stores/<store>.spec.ts` (or a matching folder) to cover precision math, error states, and emitted side-effects. Store changes should not land without test coverage.
- Options API holdouts should read through the Vuex facades in `src/store/**`; do not create new decorator-driven modules. Instead, expose the Pinia action/getter through the facade until the component is migrated.
- Remember to run `yarn test:unit --project unit tests/unit/stores/<name>.spec.ts` (or `yarn test:unit`) before sending a PR so the Pinia/Vuex parity checklist remains trustworthy.

## Desktop scripts

### Compiles and hot-reloads for development

```
yarn electron:serve
```

### Compiles and minifies for production

```
yarn electron:build
```

### Build for all platforms

```
yarn electron:build --linux --mac zip dmg --win portable --x64 --ia32
```

Executable files (`.exe`, `.dmg` or `.snap`) will be located in `dist_electron` folder.

## How to add translations?

1. Add your translations to `src/lang/messages.ts`.
2. Run script to generate `en.json` file from `src/lang/messages.ts`. This will update `en.json` file with new translations, arranged in alphabetical order.

```
yarn lang:generate
```

3. Load updated `en.json` file to `Lokalise`.
4. Add translations for other languages in `Localise`.
5. Download translations from `Localise`, update these files in project.
6. Run script to order translations alphabetical in `en.json` file (Localise has it's own translations order).

```
yarn lang:fix
```
