# Pinia Store Parity Checklist

This checklist tracks the final Pinia ownership model for every store under `src/stores/**`. The goal is to keep each Pinia module as the direct runtime owner after the repo-local compatibility layer has been removed.

## Audit Summary (2025-11-18)

- Reviewed each Pinia store and matched its exported state/actions/getters against the legacy Vuex modules in `src/store/**`.
- Verified that the remaining runtime stores now own their state directly, with only documented legacy references left in archival planning docs.
- Confirmed Vitest coverage exists for every store to guard regressions; added missing suites where necessary (assets store parity + bridge/sub enrichment cases).

## Store Matrix

| Pinia store (path)                     | Legacy module (path)                      | Parity verification & tests                                                                                                   | Status |
| -------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------ |
| `src/stores/assets`                    | `src/store/assets`                        | Mirrors `registeredAssets`/fetch/update flow, proxies legacy bridge lookups; tested in `tests/unit/stores/assets/index.spec.ts`. | ✅     |
| `src/stores/bridge`                    | `src/store/bridge/*`                      | Canonical owner for bridge form/history/notification/sign-dialog state plus bridge actions; covered by `tests/unit/stores/bridge/index.spec.ts`. | ✅     |
| `src/stores/notification`              | `src/store/notification`                  | Provides notification queue helpers with parity tests in `tests/unit/stores/notification.spec.ts`.                            | ✅     |
| `src/stores/router`                    | `src/store/router`                        | Exposes loading state & navigation helpers; validated by `tests/unit/stores/router.spec.ts`.                                   | ✅     |
| `src/stores/settings`                  | `src/store/settings`                      | Keeps wallet/settings state mirrored via Pinia actions that dispatch legacy store mutations; covered in `tests/unit/stores/settings/actions.spec.ts`. | ✅     |
| `src/stores/swap.ts`                   | `src/store/swap`                          | Wraps swap state, getters, and math helpers; parity enforced via `tests/unit/stores/swap.spec.ts`.                             | ✅     |
| `src/stores/wallet`                    | `src/store/wallet`                        | Provides account/settings/transaction helpers and subscription hooks; validated by `tests/unit/stores/wallet/index.spec.ts`.   | ✅     |

## Maintenance Notes

- Add new rows (and corresponding tests) whenever a new Pinia store is introduced.
- Update the table if a store gains new state/actions so reviewers can see how parity is enforced.
- Link this document from roadmap milestones so stakeholders can verify Pinia coverage quickly.
