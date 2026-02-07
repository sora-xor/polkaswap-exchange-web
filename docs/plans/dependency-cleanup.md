# Dependency Cleanup Tracker

This document flags the remaining Vue 2 era dependencies that must be removed before the repository can run without compat shims. Each section lists the current footprint, the blockers, and the action items required to finish the migration.

## `direct-vuex`

**Current usage**

- Still imported across the legacy Vuex modules under `src/store/**` (add/remove liquidity, order book, pool, rewards, staking, soraCard, demeter farming, vault, web3, etc.).
- `src/store/index.ts` bootstraps the entire store via `createDirectStore`.
- README plus several migration plans remind contributors to avoid adding new `direct-vuex` usage, but we do not yet have a removal checklist.

**Risks / blockers**

- Components that still rely on class-style decorators consume `store.dispatch.*` helpers injected by `direct-vuex`.
- Some Vuex modules (order book, staking, sora card) lack Pinia equivalents, so consumers cannot be flipped yet.

**Actions**

1. Track module-by-module parity in a shared checklist (see `docs/plans/vue3-migration.md`) and migrate the remaining stores to Pinia (`useOrderBookStore`, `useStakingStore`, etc.).
2. Once a module has a Pinia replacement, swap the consumers to the new store, then delete the legacy Vuex module and its `direct-vuex` decorators.
3. After the last module migrates, remove `direct-vuex` from `package.json`/`yarn.lock` and update `src/store/index.ts` to drop the direct-store shim.

## `vue-property-decorator`

**Current usage**

- Frontend components that still ship Options API/class mixins (e.g., `src/views/Explore/*`, `src/views/StakingContainer.vue`, `src/components/pages/SoraCard/**`) import `Component`/`Mixins` from `vue-property-decorator`.
- The embedded wallet package (`src/lib/soraneo-wallet`) continues to expose decorator-based components until the upstream Vue 3 builds land.
- The compat shim and stub aliases have been removed; imports now target the upstream `vue-property-decorator` package directly.

**Risks / blockers**

- Some wallet components are sourced from upstream packages and still require class decorators.
- Class components keep the decorator dependency in the bundle until all callers migrate.

**Actions**

1. Continue the component conversion wave (see roadmap Component Refactors). Each converted component should drop `vue-property-decorator` imports in favor of `<script setup>` or `defineComponent`.
2. Coordinate with the wallet team to deliver Vue 3 builds that no longer depend on decorators. Once they land, remove the `src/lib/soraneo-wallet` class mixins and rely on Composition API wrappers.
3. When no files import `vue-property-decorator`, remove the dependency from `package.json`/`yarn.lock` and clean up any lingering decorator mocks in tests or setup files.

## Legacy compat shims / UI helpers

**Current usage**

- `src/compat/empty.ts`, `src/compat/mitt.ts`, and other helpers exist solely to backfill Vue 2 era APIs for Options API components. (`src/compat/soramitsu-ui.ts` has been removed and consumers now import directly from the vendored UI kit.)
- Several components still import from `@/components/mixins/**` or the remaining `src/compat/*` shims, preventing removal.

**Risks / blockers**

- Removing a shim prematurely breaks Options API holdouts that still read from it (e.g., Sora Card, Order Book tables, wallet dialogs).
- Some shims (e.g., `soramitsu-ui`) are bundled into IPFS builds even when unused, increasing bundle size.

**Actions**

1. For each shim file under `src/compat`, open a tracking issue noting the remaining import sites (`rg -n "compat/..."`).
2. As part of each component conversion, replace shim imports with native equivalents (`mitt`, `@wallet`, Pinia stores, etc.).
3. Once the shim has zero imports, delete the file and remove any related alias from Vite/TS configs to ensure future imports fail loudly.

---

Keep this document updated as modules are converted. When an item is fully migrated, strike the corresponding bullet in the roadmap Cleanup section.
