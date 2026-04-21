# Dependency Cleanup Tracker

This document flags the remaining Vue 2 era dependencies that must be removed before the repository can run without compat shims. Each section lists the current footprint, the blockers, and the action items required to finish the migration.

## `direct-vuex`

**Current usage**

- The external package has been removed from `package.json` and `yarn.lock`.
- The remaining Vuex facade now imports a repo-local compatibility shim at `src/store/direct-vuex.ts`.
- `src/store/index.ts` and `src/lib/soraneo-wallet/src/store/index.ts` still bootstrap legacy Vuex stores through that shim while Pinia parity work continues.

**Risks / blockers**

- Options API holdouts still consume nested `store.getters.*`, `store.commit.*`, and `store.dispatch.*` helpers exposed by the compatibility shim.
- Some Vuex modules (order book, staking, vault/pool flows, wallet bundle) still lack full Pinia parity, so the shim cannot be deleted yet.

**Actions**

1. Track module-by-module parity in a shared checklist (see `docs/plans/vue3-migration.md`) and migrate the remaining stores to Pinia (`useOrderBookStore`, `useStakingStore`, etc.).
2. Once a module has a Pinia replacement, swap the consumers to the new store, then delete the matching legacy Vuex facade under `src/store/**`.
3. After the last module migrates, delete `src/store/direct-vuex.ts`, `src/store/index.ts`, and the related `app-store.ts` / compatibility bridge code.

## `vue-property-decorator`

**Current usage**

- The app-owned `src/**` tree no longer imports `vue-property-decorator`; remaining usage is isolated to the embedded wallet package and the build/test stubs that support it.
- The embedded wallet package (`src/lib/soraneo-wallet`) continues to expose decorator-based components until the upstream Vue 3 builds land.
- The app bundle still carries build/test aliases for the vendored wallet sources, so dependency removal remains blocked on the wallet migration.

**Risks / blockers**

- Some wallet components are sourced from upstream packages and still require class decorators.
- The dependency cannot be removed until the vendored wallet bundle stops importing those packages.

**Actions**

1. Keep the app regression test (`tests/unit/source/vue3-modernization.spec.ts`) green so class/decorator imports cannot return to `src/**`.
2. Coordinate with the wallet team to deliver Vue 3 builds that no longer depend on decorators. Once they land, remove the `src/lib/soraneo-wallet` class mixins and rely on Composition API wrappers.
3. When the vendored wallet sources stop importing `vue-property-decorator`, remove the dependency from `package.json`/`yarn.lock` and clean up the lingering aliases/mocks in build and test setup.

## Legacy compat shims / UI helpers

**Current usage**

- `src/compat/empty.ts`, `src/compat/mitt.ts`, and other helpers exist solely to backfill Vue 2 era APIs for Options API components. (`src/compat/soramitsu-ui.ts` has been removed and consumers now import directly from the vendored UI kit.)
- Several components still import from `@/components/mixins/**` or the remaining `src/compat/*` shims, preventing removal.

**Risks / blockers**

- Removing a shim prematurely breaks Options API holdouts that still read from it (e.g., Sora Card, Order Book tables, wallet dialogs).
- Some shims (e.g., `soramitsu-ui`) are bundled into IPFS builds even when unused, increasing bundle size.

**Actions**

1. For each shim file under `src/compat`, open a tracking issue noting the remaining import sites (`rg -n "compat/..."`).
2. As part of each component conversion, replace shim imports with native equivalents (`mitt`, direct vendored wallet sources, Pinia stores, etc.).
3. Once the shim has zero imports, delete the file and remove any related alias from Vite/TS configs to ensure future imports fail loudly.

---

Keep this document updated as modules are converted. When an item is fully migrated, strike the corresponding bullet in the roadmap Cleanup section.
