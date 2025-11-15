# Pinia Migration Checklist

This checklist tracks every module we migrate from the legacy `direct-vuex` stack to first-class Pinia stores. Treat it as the contract for engineers who take ownership of a module—no module counts as “Pinia-native” until every box below is checked.

## Workflow

1. **Inventory state + actions**
   - List each state field, getter, mutation, and action in the legacy module.
   - Categorise them as UI-only, derived/computable, side-effect/async, or legacy-only (to be deleted).
2. **Define Pinia store contract**
   - Create/extend `src/stores/<module>` with typed state, getters, and actions mirroring the inventory.
   - Replace decorator-driven access with composables/hooks (e.g., `useBridgeStore`).
3. **Legacy interop layer**
   - Until the legacy module disappears, add sync glue (see router + bridge history patterns) so commits in either store keep the other in parity.
   - Guard sync with `enterPiniaSync` / `enterLegacySync` helpers to avoid infinite loops.
4. **Update call sites**
   - Replace `store.state.<module>`/`store.commit.<module>` usage with Pinia hooks or adapters.
   - Keep surface area minimal—feature code should never reach into `direct-vuex`.
5. **Unit tests**
   - Mirror legacy coverage under `tests/unit/stores/<module>/*.spec.ts`.
   - Add adapter tests if the store still proxies to legacy logic during the transition.
6. **Telemetry & rollout**
   - Instrument critical flows (e.g., bridge submit) to ensure the Pinia path is exercised in production.
   - Monitor error logs for regressions; fall back via feature flag if required.
7. **Legacy retirement**
   - Once no code reads from the legacy module, delete it and remove the sync shim.

## Module Status Template

Use the table below to track each module. Copy it into sprint notes or update inline as work progresses.

| Module   | Owner        | State parity         | Action parity | Tests                                  | Telemetry hook                                                   | Notes                                                                                         |
| -------- | ------------ | -------------------- | ------------- | -------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Bridge   | _Unassigned_ | Fields documented ✅ | Actions WIP   | History, transactions & form stores ✅ | `bridge.pinia.historyPage.changed` / `bridge.pinia.form.updated` | Pinia stores mirror history, transaction flags, and fee/balance state; transfer actions next. |
| Swap     | _Unassigned_ | Inventory pending    | Not started   | Pending                                | Pending                                                          | Kickoff planned Sprint 2 week 2 (collect state/action list).                                  |
| Assets   |              |                      |               |                                        |                                                                  |                                                                                               |
| Settings |              |                      |               |                                        |                                                                  |                                                                                               |
| Wallet   |              |                      |               |                                        |                                                                  |                                                                                               |

Fill in the empty rows per module and keep the table alphabetised. “State parity” reaches ✅ when every legacy state field has a Pinia equivalent; “Action parity” when mutations/actions are implemented or explicitly retired.

### Swap Module Inventory (Sprint 2 – Week 1)

**State surface (Pinia `useSwapStore`)**

- Token selection/balances: `tokenFromAddress`, `tokenToAddress`, `tokenFromBalance`, `tokenToBalance`, cached `tokenFromCache`/`tokenToCache`.
- Form values: `fromValue`, `toValue`, `amountWithoutImpact`, `isExchangeB`, `selectedDexId`, `allowLossPopup`.
- Quote output: `liquidityProviderFee`, `rewards`, `route`, `distribution`, `swapQuote`, `liquiditySources`, `isAvailable`.

**Key actions**

- Token/balance management: `setTokenFromAddress`, `setTokenToAddress`, `setTokenFromBalance`, `setTokenToBalance`, `switchTokens`, `updateTokenSubscription`, `updateSubscriptions`, `resetSubscriptions`.
- Form updates: `setFromValue`, `setToValue`, `setAmountWithoutImpact`, `setExchangeB`, `setLiquidityProviderFee`, `setAllowLossPopup`.
- Quote handling: `setRewards`, `setRoute`, `setDistribution`, `setSubscriptionPayload`, `setLiquiditySource`, `selectDexId`, `reset`.

**Dependencies & follow-ups**

- Relies on `settingsStorage`, `TokenBalanceSubscriptions`, and multiple legacy getters (`requireLegacyStore().getters.settings`, wallet balances) that must be abstracted before the Vuex module can be deleted.
- Next actions: extract balance subscription helpers into a composable, mirror legacy swap quotes/actions in Pinia (currently still triggered via Vuex), and plan telemetry hooks per `docs/plans/pinia-telemetry-hooks.md`.

## Telemetry Hooks

Every migrated module must expose at least one telemetry event to confirm the Pinia code path is running in production. Suggested hooks:

- `bridge.pinia.historyPage.changed` — fired when `useBridgeHistoryStore.setHistoryPage` updates the page number.
- `bridge.pinia.transfer.submitted` — wraps the new Pinia action responsible for transfer submission.
- `swap.pinia.quote.requested` — emitted when swap quote composable calls into Pinia actions.

Record emitted events (name + payload) in the module README or store file header so analytics can build dashboards without code spelunking.

## Review Checklist

Before marking a module as “Pinia-native,” confirm:

- [ ] Pinia store exports typed state, getters, and actions.
- [ ] All production imports reference Pinia/composables/adapters, not `direct-vuex`.
- [ ] Vitest suites cover new getters/actions with edge cases (fees, precision, error states).
- [ ] Translation updates (if any) ran through `yarn lang:fix` and `yarn test:translation`.
- [ ] Telemetry emits at least one event tied to business KPIs.
- [ ] Legacy module deleted or reduced to a no-op façade slated for removal.

Document exceptions in this file with owner + resolution timeline so nothing falls through the cracks.
