# Assets & Web3 Composables Expansion Plan

This plan outlines how we will broaden reusable composables for asset management and web3 connection flows while consolidating duplicated formatting logic into typed helpers with dedicated tests.

## Objectives

1. Replace legacy mixins/utilities used across asset selectors, wallet dialogs, and connection flows with Composition API composables.
2. Centralise amount/price formatting and asset sorting into typed helper modules (`@/composables/utils/**`) with Vitest coverage.
3. Provide a clear migration path for components still depending on `direct-vuex` getter helpers within asset/web3 modules.

## Scope

| Area                                                     | Current state                                                       | Target                                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Asset selection tools (`useSelectAssetTools`, mixins)    | Partial composable coverage; some legacy mixins remain              | Provide unified `useAssets` and `useAssetFilters` composables powering selectors, dialogs, staking views |
| Asset formatting (amounts, suffixes)                     | Spread across `src/utils/index.ts`, component utils, wallet library | Create `useAssetFormatting` composable and supporting typed helpers                                      |
| Web3 connection (wallet connect, provider configuration) | Mix of composables + utility modules (`src/utils/connection/evm/*`) | Introduce `useWeb3Connection` composable abstraction with provider strategy pattern                      |
| Testing                                                  | Limited to specific composables                                     | Expand unit tests for new helpers, including mocking Pinia stores and provider SDKs                      |

## Deliverables

1. `useAssets` composable (wrapping `useAssetsStore`, providing computed lists, sorting, and search integration).
2. `useAssetFormatting` composable + helper utilities (formatting, suffix, fiat conversion stubs).
3. `useWeb3Connection` composable orchestrating EVM/Sora connections, reusing existing utilities via dependency injection.
4. Updated components (asset dialogs, staking views, wallet connection modals) to consume new composables.
5. Vitest suites:
   - `tests/unit/composables/useAssets.spec.ts`
   - `tests/unit/composables/useAssetFormatting.spec.ts`
   - `tests/unit/composables/useWeb3Connection.spec.ts`
   - Helper-level tests for formatting utilities under `tests/unit/utils/assetsFormatting.spec.ts`
6. Documentation updates (`roadmap.md`, relevant component notes).

## Phased Timeline

| Phase                                               | Weeks  | Focus                                                                                                   |
| --------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| Phase 1 – Discovery & scaffolding (Sprint 2 Week 1) | 1 week | Inventory remaining mixins/utilities; define composable APIs; create helper modules with initial tests. |
| Phase 2 – Asset composables (Sprint 2 Week 2)       | 1 week | Implement `useAssets`, `useAssetFilters`, migrate selectors & staking views.                            |
| Phase 3 – Formatting helpers (Sprint 2 Week 3)      | 1 week | Consolidate formatting logic, ensure tests cover suffix/precision behaviour.                            |
| Phase 4 – Web3 connection (Sprint 3 Week 1)         | 1 week | Implement `useWeb3Connection`, refactor wallet dialogs, integrate telemetry.                            |
| Phase 5 – Cleanup & QA (Sprint 3 Week 2)            | 1 week | Remove deprecated utilities/mixins, run regression tests, update docs.                                  |

## Risks & Mitigations

| Risk                                            | Impact                        | Mitigation                                                                                           |
| ----------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| Inconsistent asset formatting across components | User confusion, failing tests | Use shared helper with unit coverage and static typing.                                              |
| Web3 provider dependencies difficult to mock    | Slower tests                  | Abstract provider creation behind injectable factory; rely on vi.fn mocks.                           |
| Regression risk in wallet dialogs               | Production impact             | QA to expand regression matrix; run targeted E2E smoke tests.                                        |
| Time overlap with Order Book refactor           | Resource strain               | Sequence asset composable work before Order Book sprint if possible; share utilities where feasible. |

## Action Items

- [x] Create composable scaffolding (`useAssets`, `useAssetFormatting`); pending `useAssetFilters` and `useWeb3Connection`.
- [ ] Draft API proposal and circulate for review.
- [ ] Update affected components iteratively, pairing with relevant teams.
- [ ] Add/extend Vitest suites and ensure `yarn test:unit` remains green.
- [ ] Document new composables in `src/composables/README.md` (if available) or add module-level comments.

Track progress in the migration board under the “Assets & Web3 Composables” swimlane.
