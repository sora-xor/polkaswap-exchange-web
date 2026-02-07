# Pinia Store Parity Checklist

This checklist tracks the Pinia facade coverage for every store under `src/stores/**`. The goal is to ensure each Pinia module mirrors the legacy Vuex module’s state, getters, and actions so we can remove `direct-vuex` safely.

## Audit Summary (2025-11-18)

- Reviewed each Pinia store and matched its exported state/actions/getters against the legacy Vuex modules in `src/store/**`.
- Verified that each store either proxies legacy mutations via `requireLegacyStore`/`withLegacyStore` or maintains its own source of truth (`router`, `notification`).
- Confirmed Vitest coverage exists for every store to guard parity regressions; added missing suites where necessary (assets store parity + bridge/sub enrichment cases).

## Store Matrix

| Pinia store (path)                     | Legacy module (path)                      | Parity verification & tests                                                                                                   | Status |
| -------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------ |
| `src/stores/assets`                    | `src/store/assets`                        | Mirrors `registeredAssets`/fetch/update flow, proxies legacy bridge lookups; tested in `tests/unit/stores/assets/index.spec.ts`. | ✅     |
| `src/stores/bridge/form.ts`            | `src/store/bridge/form`                   | Keeps legacy form state/actions in sync via `withLegacyStore`; covered by `tests/unit/stores/bridge/form.spec.ts`.             | ✅     |
| `src/stores/bridge/history.ts`         | `src/store/bridge/history`                | Tracks `historyPage`/`historyId`, syncs mutations both ways; covered by `tests/unit/stores/bridge/history.spec.ts`.            | ✅     |
| `src/stores/bridge/transactions.ts`    | `src/store/bridge/transactions`           | Wraps legacy transaction watcher state; covered by `tests/unit/stores/bridge/transactions.spec.ts`.                           | ✅     |
| `src/stores/notification`              | `src/store/notification`                  | Provides notification queue helpers with parity tests in `tests/unit/stores/notification.spec.ts`.                            | ✅     |
| `src/stores/router`                    | `src/store/router`                        | Exposes loading state & navigation helpers; validated by `tests/unit/stores/router.spec.ts`.                                   | ✅     |
| `src/stores/settings`                  | `src/store/settings`                      | Keeps wallet/settings state mirrored via Pinia actions that dispatch legacy store mutations; covered in `tests/unit/stores/settings/actions.spec.ts`. | ✅     |
| `src/stores/swap.ts`                   | `src/store/swap`                          | Wraps swap state, getters, and math helpers; parity enforced via `tests/unit/stores/swap.spec.ts`.                             | ✅     |
| `src/stores/wallet`                    | `src/store/wallet`                        | Provides account/settings/transaction helpers and subscription hooks; validated by `tests/unit/stores/wallet/index.spec.ts`.   | ✅     |

## Maintenance Notes

- Add new rows (and corresponding tests) whenever a new Pinia store is introduced.
- Update the table if a store gains new state/actions so reviewers can see how parity is enforced.
- Link this document from roadmap milestones so stakeholders can verify Pinia coverage quickly.
