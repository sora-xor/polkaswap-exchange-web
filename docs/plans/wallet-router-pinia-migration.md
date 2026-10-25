# Wallet Router & Dialog Migration Plan

Goal: migrate `src/lib/soraneo-wallet/src/store/router` and associated dialog widgets from legacy decorator-based Vuex usage to the new Pinia wrappers (`src/stores/router`, `src/stores/wallet`), enabling removal of decorator glue and compat shims.

## Scope

Components and modules:

- Wallet router store (`src/lib/soraneo-wallet/src/store/router`).
- Wallet dialogs/components consuming the legacy store (connection dialogs, account selection, notification widgets).
- Application-level wrappers (`src/stores/router`, `src/stores/wallet`) that will replace direct `store` imports.
- Telemetry and localization updates tied to wallet flows.

## Objectives

1. Provide Pinia equivalents for router state, actions, and guards currently inside the wallet library.
2. Update wallet dialogs to consume Pinia stores via composables rather than `@Component` decorators.
3. Ensure navigation guard logic (route syncing, deep links) moves out of decorator mixins into Composition API helpers.
4. Maintain unit test coverage with new Pinia-driven stores.

## Deliverables

- `src/stores/router` and `src/stores/wallet` extended with APIs matching legacy wallet router behaviours.
- New composables (`useWalletRouter`, `useWalletDialogs`) encapsulating navigation and dialog orchestration.
- Wallet dialogs converted to `<script setup>` with Pinia store usage.
- Updated unit tests:
  - `tests/unit/stores/router.spec.ts` enhanced for new actions.
  - New specs for `useWalletRouter` under `tests/unit/composables`.
  - Wallet dialog component tests ensuring emitted events/state remain intact.
- Documentation updates (roadmap, migration plan).

## Progress

- 2025-10-25 – Pinia router store mirrors legacy Vuex state with bidirectional sync guards. Core wallet surfaces (`src/views/Wallet.vue`, `src/lib/soraneo-wallet/src/components/WalletSend.vue`, `SelectAsset.vue`, `WalletConnection.vue`, `WalletAssets.vue`, `WalletAssetDetails.vue`, `WalletHistory.vue`, `ReceiveToken.vue`, and token creation flows) now route through Pinia instead of Vuex decorators, with shared mixins updated accordingly.

## Migration Steps

| Phase                          | Tasks                                                                                                | Owner                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------- |
| Phase 1 – API mapping          | Inventory existing router store state/actions; define Pinia equivalents; draft migration sheet.      | Platform engineer            |
| Phase 2 – Store implementation | Extend `src/stores/router` + `src/stores/wallet` with new state/actions; add Pinia tests.            | Platform engineer            |
| Phase 3 – Composable layer     | Create `useWalletRouter`, `useWalletDialogs` to abstract guard logic + navigation side effects.      | Frontend migration pod       |
| Phase 4 – Component migration  | Convert wallet dialogs/components to `<script setup>` consuming new composables/stores.              | Frontend migration pod       |
| Phase 5 – Cleanup              | Remove legacy `src/lib/soraneo-wallet/src/store/router` usage, decorator mixins, and update imports. | Migration pod + wallet squad |
| Phase 6 – QA & Telemetry       | Validate navigation flows, run wallet-specific regressions, confirm telemetry events.                | QA + Platform                |

## Risks & Mitigations

| Risk                                                  | Impact                            | Mitigation                                                              |
| ----------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------- |
| Wallet library updates conflict with upstream changes | Merge conflicts, divergence       | Coordinate with wallet squad; plan joint review before merging to main. |
| Navigation guard regressions                          | Broken deep links/route sync      | Add integration tests for key routes; QA to verify staging builds.      |
| Telemetry updates missed                              | Loss of visibility post-migration | Ensure telemetry plan references wallet routing events; add unit tests. |
| Time overlap with Order Book refactor                 | Resource contention               | Sequence work to avoid sprint overlap or assign separate owners.        |

## Testing Strategy

- Unit tests for new Pinia store methods.
- Component tests for dialogs using `@vue/test-utils`.
- Integration tests (Playwright) covering wallet connection and navigation flows once refactor completes.
- Manual QA on staging (wallet flows, cross-tab navigation).

## Dependencies

- Pinia parity checklist (`docs/plans/vue3-migration.md#pinia--vuex-parity-checklist`).
- Telemetry hooks (`docs/plans/pinia-telemetry-hooks.md`) to instrument wallet flows after migration.
- Assets/web3 composable expansion plan (`docs/plans/assets-web3-composables.md`) for shared helpers.

Keep this document updated as tasks complete; note decision points and status in the migration board under “Wallet Router Migration”.
