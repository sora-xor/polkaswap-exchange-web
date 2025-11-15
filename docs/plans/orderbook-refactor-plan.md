# Order Book Refactor Implementation Plan

Purpose: migrate the Order Book module (widgets, dialogs, tables) from class-based Options API components to Composition API with Pinia support, as part of the Vue 3 upgrade.

## Scope

Components under `src/components/pages/OrderBook/**` and `src/views/OrderBook.vue`, including:

- Core widgets: `BookWidget.vue`, `BookChartsWidget.vue`, `HistoryOrderWidget.vue`, `MarketTradesWidget.vue`, `SetLimitOrderWidget.vue`.
- Dialogs: `Dialogs/CancelOrders.vue`, `Dialogs/CustomisePage.vue`, `Dialogs/PlaceOrder.vue`.
- Tables: `Tables/AllOrders.vue`, `Tables/OpenOrders.vue`.
- Supporting popovers and utilities.

Key goals:

1. Replace `@Component` class syntax with `<script setup>` Composition API.
2. Centralise shared logic in a new `useOrderBook` composable (depth aggregation, subscription management, formatting).
3. Ensure state consumption via Pinia stores and new composables (swap, assets) rather than legacy mixins.
4. Maintain and expand unit test coverage.
5. Update telemetry hooks (`usePiniaTelemetry`) for Order Book flows.

## Owners & Team

| Role           | Responsibility                           | Owner                          |
| -------------- | ---------------------------------------- | ------------------------------ |
| Technical lead | Overall plan delivery, code reviews      | @frontend-lead                 |
| Implementers   | Component conversions, composables       | @frontend-dev1, @frontend-dev2 |
| QA liaison     | Test matrix updates, regression suite    | @qa-lead                       |
| Product/UX     | Approve UI/UX adjustments                | @product-owner                 |
| Localization   | Verify copy changes, translation updates | @localization-lead             |

## Phases & Timeline

| Phase                                             | Weeks   | Deliverables                                                                                                                      |
| ------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 – Prep (Sprint 1 Week 2)                  | 1 week  | - Inventory class components & mixins. <br> - Define `useOrderBook` API surface. <br> - Align telemetry requirements.             |
| Phase 1 – Composable foundation (Sprint 2 Week 1) | 1 week  | - Implement `useOrderBook` composable (subscriptions, depth calc). <br> - Add unit tests for composable.                          |
| Phase 2 – Core widgets (Sprint 2 Weeks 1–2)       | 2 weeks | - Refactor `BookWidget`, `BookChartsWidget`, `HistoryOrderWidget`, `MarketTradesWidget`. <br> - Add tests with `@vue/test-utils`. |
| Phase 3 – Dialogs & tables (Sprint 3 Week 1)      | 1 week  | - Convert dialogs and tables to `<script setup>`. <br> - Ensure Pinia telemetry integrated.                                       |
| Phase 4 – Integration & QA (Sprint 3 Week 2)      | 1 week  | - Run regression suite, update snapshots. <br> - Validate telemetry and translation.                                              |
| Phase 5 – Cleanup (Sprint 3 Week 3)               | 1 week  | - Remove obsolete mixins/utilities. <br> - Update documentation, roadmap status.                                                  |

## Technical Plan

1. **Composable (`useOrderBook`)**
   - Responsibilities: subscribe to order book feeds, compute cumulative totals, manage throttling, expose computed properties for bid/ask lists.
   - Inputs: selected trading pair, filters, store references.
   - Outputs: `bids`, `asks`, `spread`, `isLoading`, `selectPrice`.
   - Utilities moved from class mixins into `/composables/useOrderBook.utils.ts`.

2. **Store Integration**
   - Consume Pinia asset/swap stores (`src/stores/assets`, `src/stores/swap.ts`).
   - Use `usePiniaTelemetry('orderBook', [...])` to emit telemetry.
   - Replace `direct-vuex` dependencies with injection of Pinia stores.

3. **Testing**
   - Unit tests mirror composable logic (`tests/unit/composables/useOrderBook.spec.ts`).
   - Component tests for widgets verifying formatted output, user interactions, and emitted events.
   - Regression tests for dialogs (using mocks for subscriptions).

4. **Styling & Layout**
   - Ensure refactored components retain existing CSS classes.
   - Remove compatibility-specific CSS overrides after QA sign-off.

5. **Localization & Copy**
   - Review translation keys touched by the refactor; ensure `yarn test:translation` remains green.

## Risks & Mitigations

| Risk                                 | Impact                         | Mitigation                                                                            |
| ------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------- |
| Subscription performance regressions | Users may see stale data       | Benchmark composable with production datasets; throttle watch effects.                |
| Telemetry gaps                       | Hard to confirm Pinia adoption | Validate `pinia_store_usage` events in staging; unit tests to assert telemetry fired. |
| QA bandwidth                         | Regression coverage may slip   | Lock QA resources in Sprint 2 plan; share daily progress.                             |
| UX changes                           | Unexpected layout shifts       | Product/UX review after Phase 2; maintain visual diffs.                               |

## Deliverables Checklist

- [ ] `useOrderBook` composable & utilities.
- [ ] Converted components (`BookWidget`, etc.) to `<script setup>`.
- [ ] Dialogs & tables migrated; telemetry integrated.
- [ ] Updated tests (unit + component) and snapshots.
- [ ] Documentation updates (`roadmap.md`, component-level README if applicable).
- [ ] QA regression report and sign-off.
- [ ] Removal of legacy mixins and unused utilities.

## Communication

- Provide updates in #migration-status after each phase.
- Demo refactored widgets during Sprint 2 & Sprint 3 reviews.
- Log decisions and risks in Confluence using this plan as canonical reference.

Maintain this document; note progress and adjustments as tasks complete.
