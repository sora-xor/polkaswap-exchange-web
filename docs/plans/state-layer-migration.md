# State Layer Migration Tracking

This document captures the live audit results and action items required to retire the remaining Vuex-backed facade usage. The external `direct-vuex` package and app-owned decorators are gone; the remaining debt lives in the repo-local Vuex compatibility shim plus the facades still mounted under `src/store/**`.

## 1. Audit Snapshot

- Command: `yarn analyze:store`
- Outputs:
  - JSON (`docs/reports/store-access-audit.json`) for scripts/dashboards.
  - Markdown (`docs/reports/store-access-audit.md`) for humans.
  - Legacy grep dump kept at `docs/plans/state-layer-migration-audit.txt` for quick diffing.
- Latest run (2025-11-19) flagged **926** direct store references across **168** files.

### Top Domains (from `store-access-audit.md`)

| Domain               | Files | Refs | Owner Squad        | Notes / Next Steps                                                |
| -------------------- | ----- | ---- | ------------------ | ----------------------------------------------------------------- |
| `lib/soraneo-wallet` | 26    | 137  | Wallet             | Inline bundle still mirrors Vuex API. Proceed with Pinia adapter. |
| `composables`        | 17    | 78   | Platform           | Build Pinia-aware helpers (swap, bridge, wallet connect).         |
| `components/App`     | 12    | 74   | Platform           | App shell + menus blocked on wallet/settings Pinia stores.        |
| `modules/pool`       | 11    | 74   | DeFi               | Remove pool mixins; finish `usePool*` composables.                |
| `app-store bridge`   | 2     | 72   | Platform           | Remaining bootstrap glue; delete once Pinia parity lands.         |
| `modules/vault`      | 11    | 65   | DeFi               | Vault dialogs still read Vuex; migrate after pool work.           |
| `modules/staking`    | 9     | 58   | DeFi               | Demeter + Sora staking watchers still tied to Vuex.               |
| `App.vue`            | 1     | 44   | Platform           | Root shell still dispatches via legacy helpers; migrate to Pinia. |
| `pages/SoraCard`     | 11    | 42   | Wallet Experience  | KYC/onboarding mixins pending Pinia stores.                       |
| `views/Rewards`      | 1     | 29   | Wallet Experience  | Rewards view still binds directly to Vuex state/getters.          |

> Use the Markdown report for the full domain/table breakdown; link it in sprint docs when filing subtasks.

## 2. Domain Action Tracker

| Domain / Scope            | Owner squad        | Key files (from audit)                        | Immediate tasks                                                                 | Target sprint |
| ------------------------- | ------------------ | --------------------------------------------- | ------------------------------------------------------------------------------- | ------------- |
| App shell + menus         | Platform           | `src/App.vue`, `components/App/**`            | Ship Pinia wallet/settings facades; update header/menu/login flows.             | S1 W2         |
| Wallet bundle             | Wallet             | `lib/soraneo-wallet/**`                       | Finish Pinia-compatible store + remove decorators; sync with wallet team.       | S1 W3         |
| Order Book widgets        | Frontend pod       | `pages/OrderBook/**`, `views/OrderBook.vue`   | Keep migrating widgets to `useOrderBook`; cover history + charts next.          | S2 W1         |
| Pools + Vaults            | DeFi               | `modules/pool/**`, `modules/vault/**`         | Finalise APR helpers; port dialogs/views to Pinia/composables.                  | S2 W1–W2      |
| Staking / Demeter         | DeFi               | `modules/staking/**`, `views/Explore/Demeter` | Convert remaining mixins to `useDemeter*`; hook telemetry + tests.              | S2 W2         |
| Sora Card onboarding      | Wallet Experience  | `pages/SoraCard/**`, `views/SoraCard.vue`     | Create Pinia KYC/rewards stores, drop decorators, add snapshot/i18n coverage.   | S2 W3         |
| Bridge flows              | Bridge + Platform  | `views/Bridge*.vue`, bridge composables       | Wrap legacy bridge state with Pinia (accounts, forms, transactions). `useBridgeStore` scaffolding landed (form/balance/fees/history); next migrate legacy actions and consumers. | S3 W1         |
| Vuex bootstrap cleanup    | Platform           | `src/store/**`, `app-store.ts`, compat shims  | After above migrations, remove the repo-local Vuex compatibility shim and final bootstrap glue.        | Post S3       |

Owners should open subtasks per domain referencing the relevant subset of `docs/reports/store-access-audit.json` so we can track burn-down in Jira/Linear.

## 3. Migration Action Items

1. **Wallet Account Store Migration (P0)**
   - Draft Pinia `walletAccount` store spec (state, computed, actions, subscriptions).
   - Implement store alongside parity unit tests.
   - Update top-level consumers:
     - `src/App.vue`
     - Header/Menu components
     - Login/logout dialogs (`src/components/App/**`)
     - `src/views/ReferralBonding.vue` and `src/views/Rewards.vue`
   - Remove direct `store.state.wallet.account` usage in those files.

2. **Wallet Transactions Store Migration (P0)**
   - Spec Pinia transaction store covering dialogs + notifications.
   - Port `store.commit.wallet.transactions.*` mutations to Pinia actions.
   - Update composables (`useTransaction`, `useNotification`) and dialogs.
   - Delete decorator usage in transaction views/tests.

3. **Order Book Refactor (P1)**
   - Build `useOrderBook` composable and Pinia adapters.
   - Migrate `PairListPopover`, order widgets, and watchers off Vuex.
   - Add contract-call mocks in Vitest (`tests/unit/components/pages/OrderBook/*.spec.ts`).

4. **Sora Card & Rewards (P1)**
   - Split onboarding dashboard into `useSoraCardStore`/`useRewardsStore`.
   - Replace decorator usage in `src/modules/soraCard` views.
   - Add snapshot + i18n coverage for new stores.

5. **Pools/Staking (P1)**
   - Ship APR/metrics composables.
   - Migrate Demeter dialogs to Pinia + `<script setup>`.
   - Extend staking math tests.

6. **Cleanup (P2)**
   - Once domains above are Pinia-only, remove:
     - `src/store/**` legacy Vuex facade modules.
     - Decorator helpers.
     - `store.original` bootstrapping.
   - Update docs/README to reference the Pinia-only architecture.

## 4. Next Steps

- [ ] Re-run `yarn analyze:store` after every large migration (at minimum once per sprint) and commit the refreshed `store-access-audit.{json,md}`.
- [ ] Keep `docs/plans/state-layer-migration-audit.txt` only for quick grep diffs; the JSON/Markdown outputs are canonical.
- [ ] Link the relevant domain rows in `roadmap.md` summaries so stakeholders can see real-time progress.
- [ ] Track each domain as its own issue with owners/ETA aligned to the table above.
