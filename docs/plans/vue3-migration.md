# Vue 3 Migration Plan

## Current State

- Runtime builds natively against Vue 3.5; `configureCompat` and the `@vue/compat` alias have been removed from the boot process.
- Almost every SFC still relies on class components (`vue-class-component@7` + `vue-property-decorator@9`) and Vue 2–only options such as `beforeDestroy`, `.sync`, and `.native`.
- Store access goes through decorator glue supplied by `direct-vuex`, which injects getters/actions as class fields.
- Shared widgets inside `src/lib/soraneo-wallet` mirror the same Vue 2 patterns and ship pre-built bundles that expect compat mode.
- Tests already run on Vue 3 tooling (Vitest + `@vue/test-utils@2`), but they indirectly exercise compat behaviours.
- Wallet bundle delivery expectations and integration cadence are codified in `docs/plans/soraneo-wallet-migration-contract.md`; treat that document as the working agreement with the wallet squad.

## Migration Goals

1. Remove the dependency on `@vue/compat` and run the whole UI on the standard Vue 3 runtime.
2. Replace class-based components with Composition API or Options API equivalents that work natively in Vue 3.
3. Retire legacy patterns (`.sync`, `.native`, deprecated lifecycles, implicit `$listeners`) across app and wallet packages.
4. Preserve or improve unit test coverage for every migrated flow and keep translation tooling green.

## Proposed Stages

### Stage 1 – Compat Exit Foundations

1. Upgrade to `vue-class-component@8` and `vue-property-decorator@10` (or remove them entirely) so existing classes can run without compat.
2. Update global shims (`src/compat/**`) to expose Vue 3 friendly helpers, replacing `$listeners` with explicit `emits` contracts.
3. Convert the application shell (`App.vue`, global widgets, router-view wrappers) to Composition/Options API and remove `.native`/`.sync` usage.
4. Create shared utilities (store hooks, dialog factories) that allow Composition API components to talk to the existing Vuex modules without decorators.

### Stage 2 – Feature Module Refactors

1. Migrate high-traffic modules (Swap, Bridge, Staking) to Composition API incrementally, removing compat-dependent mixins.
2. Replace `.sync` with `v-model` and update emitters in every dialog, notification, and widget.
3. Align lifecycle hooks to Vue 3 (`beforeUnmount`, `unmounted`) and remove implicit event forwarding by wiring `emits` metadata.
4. Expand unit tests around each migrated module to cover emitted events, reactivity, and edge cases (e.g. redenomination math).

### Stage 3 – Library Synchronisation

1. Port `src/lib/soraneo-wallet` components to Vue 3 semantics or swap to the upstream library version that already ships Vue 3 bundles.
2. Remove deprecated decorator glue once no class components depend on it; prefer Pinia/composable-based accessors.
3. Delete the `src/compat` fallbacks that become redundant once every consumer uses the new utilities.
4. Run bundle analysis to ensure tree shaking works as expected and adjust manual chunk configuration if needed.

### Stage 4 – Cleanup and Optimisation

1. Audit the build outputs to ensure no compat artifacts remain and remove the `@vue/compat` package when the shims disappear.
2. Simplify the state layer (evaluate moving from Vuex to Pinia) once the UI no longer relies on decorator helpers.
3. Audit documentation and developer tooling for Vue 3 assumptions (lint rules, component templates, scaffolding commands).
4. Perform regression QA on critical user journeys and re-run `yarn test:unit`, `yarn test:translation`, and smoke tests before release.

## Near-Term Backlog

- Convert the App shell and navigation components to native Vue 3 patterns.
- Introduce composables that wrap the most-used store selectors/actions to ease refactors.
- Inventory all `.sync` consumers and define the `v-model` contracts each dialog must emit.
- Track compat-specific warnings during development to ensure none remain once the alias is removed.

## Pinia / Vuex Parity Checklist

Maintain this section as the source of truth for Pinia parity. The KPI automation script (`yarn kpi:report`) will parse the YAML block to compute coverage. Update statuses as modules reach parity and add new entries for emerging stores.

| Module       | Pinia store               | Legacy Vuex module        | State parity | Actions/Mutations parity | Unit tests                                 | Status note                                                                                                                 |
| ------------ | ------------------------- | ------------------------- | ------------ | ------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Assets       | `src/stores/assets`       | `src/store/assets`        | Majority     | Partial                  | `tests/unit/stores/assets/*.spec.ts`       | Pinia store owns registered assets; Vuex facade delegates to Pinia (see `docs/plans/soraneo-wallet-migration-contract.md`). |
| Swap         | `src/stores/swap.ts`      | `src/store/swap`          | Majority     | Partial                  | `tests/unit/stores/swap.spec.ts`           | Pinia handles UI state; liquidity provider actions still rely on Vuex wrappers.                                             |
| Settings     | `src/stores/settings`     | `src/store/settings`      | Partial      | Planned                  | `tests/unit/stores/settings/**/*.spec.ts`  | Pinia store covers user prefs; admin/debug settings remain in Vuex.                                                         |
| Router       | `src/stores/router`       | `src/store/router`        | Partial      | Planned                  | `tests/unit/stores/router.spec.ts`         | Basic navigation parity achieved; route guards still depend on Vuex decorators.                                             |
| Wallet       | `src/stores/wallet`       | `src/store/wallet`        | Planned      | Planned                  | _TBD_                                      | Awaiting wallet bundle updates before porting actions.                                                                      |
| Notification | `src/stores/notification` | `src/store/notifications` | Complete     | Complete                 | `tests/unit/stores/notification/*.spec.ts` | Fully migrated; Vuex module deprecated.                                                                                     |

### Pinia onboarding guidance

- **Prefer store hooks in Composition API components.** Import the relevant `use…Store` function, convert reactive state with `storeToRefs`, and call actions directly. When multiple stores participate in a flow, extract a composable (e.g., `useBridgeCore`, `useBridgeTransaction`) that orchestrates them.
- **Keep legacy facades thin.** If an Options API component still consumes `src/store/**`, expose the Pinia action/getter through the facade temporarily. Avoid adding new decorator-heavy modules or accessing Vuex-specific helpers from fresh code.
- **Extend the parity table when you touch store behaviour.** Every mutation to a store should be reflected in this document—update the table and the YAML block so automation stays accurate.
- **Backfill unit tests alongside store changes.** Place scenarios in `tests/unit/stores/<store>.spec.ts` (or the mirrored folder). Cover precision math, rounding, and boundary conditions with `FPNumber` when dealing with token amounts.
- **Verify state migrations in PRs.** Run `yarn test:unit --project unit tests/unit/stores/<store>.spec.ts` (or `yarn test:unit`) locally before opening a PR. Nightly CI depends on these specs to detect parity regressions early.

```yaml
piniaParity:
  - module: assets
    pinia: src/stores/assets
    vuex: src/store/assets
    stateParity: majority
    actionParity: partial
    unitTests:
      - tests/unit/stores/assets
    status: 'Pinia drives registered assets; Vuex facade forwards to Pinia for compatibility while legacy consumers migrate.'
  - module: swap
    pinia: src/stores/swap.ts
    vuex: src/store/swap
    stateParity: majority
    actionParity: partial
    unitTests:
      - tests/unit/stores/swap.spec.ts
    status: 'Most UI state in Pinia; transaction actions still proxied.'
  - module: settings
    pinia: src/stores/settings
    vuex: src/store/settings
    stateParity: partial
    actionParity: planned
    unitTests:
      - tests/unit/stores/settings
    status: 'Need to migrate debug & network settings actions.'
  - module: router
    pinia: src/stores/router
    vuex: src/store/router
    stateParity: partial
    actionParity: planned
    unitTests:
      - tests/unit/stores/router.spec.ts
    status: 'Guard integration pending wallet bundle refactor.'
  - module: wallet
    pinia: src/stores/wallet
    vuex: src/store/wallet
    stateParity: partial
    actionParity: planned
    unitTests: []
    status: 'Core composables now consume Pinia (`useWalletStore`); pending full action migration once new wallet bundle lands.'
  - module: notification
    pinia: src/stores/notification
    vuex: src/store/notifications
    stateParity: complete
    actionParity: complete
    unitTests:
      - tests/unit/stores/notification
    status: 'Legacy Vuex module scheduled for removal.'
```

## Vendored Library Maintenance

### Soraneo Wallet (`src/lib/soraneo-wallet`)

- **Owners:** Frontend migration pod (primary), Wallet squad (review). Escalations roll through the migration lead → platform manager.
- **Cadence:** Weekly sync aligned with Thursday RC drops. Hotfix branches follow the same playbook on demand.
- **Branch naming:** `chore/wallet-sync/<YYYY-MM-DD>-<tag>` (e.g., `chore/wallet-sync/2025-11-07-vNext-rc.3`).
- **Upstream source:** Tagged archives from the private `wallet-web` repository. Capture commit hash and tag in the PR description.
- **Sync workflow:**
  1. Create the sync branch from `develop`.
  2. `rsync --delete --exclude "lib/" <upstream-src>/ src/lib/soraneo-wallet/src` to copy source files; copy built artefacts (CSS/types) into `src/lib/soraneo-wallet/lib` once upstream build passes.
  3. Update translations or assets that moved upstream (keep aliases intact).
  4. Run the verification matrix locally or via Jenkins: `yarn test:unit`, `yarn build`, `yarn build:vue3`, `VITE_DISABLE_COMPAT=true yarn test:e2e --project chromium`.
  5. Update `docs/plans/soraneo-wallet-migration-contract.md` Appendix with the new tag + hash and note any local deviations.
  6. Request review from wallet squad code owners; merge after both teams sign off.
- **Artifacts:** Attach build/test logs to the PR (or link to Jenkins job) and drop status in `#wallet-migration`.

### Soramitsu UI Kit (`src/lib/soramitsu-ui`)

- **Owners:** Design systems team (primary), Frontend migration pod (integration).
- **Cadence:** Monthly sync or when upstream ships blocking fixes.
- **Branch naming:** `chore/soramitsu-sync/<YYYY-MM-DD>-<tag>`.
- **Sync workflow:**
  1. Mirror the upstream `packages/ui` sources into `src/lib/soramitsu-ui`.
  2. Keep Sass token files in lockstep and validate Storybook snapshots if the design team provides them.
  3. Re-run the UI regression matrix: `yarn test:unit --project unit tests/unit/components/shared`, `yarn build`, and the UI Playwright smoke suite (`yarn test:e2e --project chromium --grep @ui-smoke`).
  4. Document token or component diffs in the PR body and notify design systems in `#design-system`.

Keep this section updated when owners change or when the verification matrix evolves so the roadmap checklist remains an accurate source of truth. Link the appropriate subsection when onboarding engineers to vendored-library duties.
