# Pinia Telemetry Hooks Implementation Plan

This document defines the production telemetry required to verify Pinia adoption and compat-free usage once legacy Vuex modules are retired. It supports the “Telemetry Requirements” section of `roadmap.md` and should be referenced when wiring instrumentation in the app and analytics pipeline.

## Goals

- Track whether critical user flows mount with the new Pinia stores rather than legacy Vuex modules.
- Detect residual compat-mode warnings or translation gaps after the Vue 3 rollout.
- Provide rollout telemetry (build variant selection, pilot feedback) for phased releases.
- Ensure metrics flow into the existing analytics pipeline (Amplitude/DataDog) without introducing PII.

## Instrumentation Overview

| Event key                | Purpose                                  | Trigger location                                                                                    | Required properties                                                |
| ------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `pinia_store_usage`      | Confirm flow is using Pinia store        | `onMounted`/`onActivated` hooks of page-level components (Swap, Bridge, Wallet, OrderBook, Staking) | `flowId`, `storeId`, `version`, `isLegacyFallback`, `buildVariant` |
| `pinia_store_fallback`   | Signal temporary fallback to legacy Vuex | Same locations as above when `isLegacyFallback=true`                                                | `flowId`, `reason`, `storeId`, `buildVariant`                      |
| `compat_warning`         | Capture unexpected compat-mode warnings  | Global Vue app warning handler                                                                      | `component`, `message`, `stack`, `buildVariant`                    |
| `translation_missing`    | Log missing locale keys                  | `i18n` missing handler                                                                              | `key`, `locale`, `component`, `buildVariant`                       |
| `build_variant_selected` | Track whether compat toggle is active    | During app bootstrap (`src/main.ts`)                                                                | `variant`, `environment`, `timestamp`                              |
| `pilot_feedback`         | Collect structured pilot feedback        | Pilot feedback form submission handler                                                              | `cohort`, `sentiment`, `category`, `notes`                         |

See the implementation checklist for additional fields (e.g., correlation IDs) required by analytics.

## Implementation Checklist

1. **Shared telemetry helper**
   - Create `src/utils/telemetry.ts` exporting `trackEvent(event, payload)` that routes to the analytics SDK (Ampli/DataDog).
   - Ensure helper is tree-shakeable and safe in SSR/offline contexts.

2. **Build variant instrumentation**
   - In `src/main.ts`, determine `buildVariant` (`compat` vs `vue3-native`) based on `import.meta.env.VITE_DISABLE_COMPAT`.
   - Emit `build_variant_selected` when the app mounts; attach variant to a global context (e.g., `window.__PS_BUILD_VARIANT__`) for reuse.

3. **Pinia store usage**
   - Implement composable `usePiniaTelemetry(flowId, storeRefs)` that:
     - Checks whether the provided stores originate from Pinia (`instanceof` or metadata flag).
     - Emits `pinia_store_usage` with `isLegacyFallback=false` when the stores are Pinia-based.
     - Emits `pinia_store_fallback` when a legacy store is detected (for incremental migrations).
   - Adopt composable in the following entry components:
     - Swap: `src/views/Swap.vue`
     - Bridge: `src/views/BridgeTransactionsHistory.vue`, `src/components/pages/Bridge/*.vue`
     - Wallet: `src/views/Wallet.vue`, wallet dialogs
     - Order Book: `src/views/OrderBook.vue`, `src/components/pages/OrderBook/*.vue`
     - Staking dashboards: `src/views/StakingContainer.vue`, related child components

4. **Compat warning handler**
   - Register a global Vue warning handler via `app.config.warnHandler`.
   - Emit `compat_warning` when the warning message contains `"@vue/compat"` or known compat shim markers.
   - Include stack traces only in non-production environments to avoid leaking sensitive details.
   - Implemented via `src/plugins/compatWarnings.ts` and installed in `src/main.ts`; trace capture disabled in production.

5. **Translation missing handler**
   - Extend the i18n plugin (`src/lang/index.ts`) with a `missing` handler that calls `trackEvent('translation_missing', payload)`. **Status:** Implemented with a 30s per key/locale throttle and component name capture.
   - Throttle repeated emissions per key/locale pair to reduce noise.

6. **Pilot feedback integration**
   - Update pilot feedback form (support portal) to emit `pilot_feedback`.
   - Ensure feedback is linked to cohorts defined in the Pilot Rollout Tracker.
   - Use the shared `submitPilotFeedback` helper (`src/utils/telemetry.ts`) to enforce sanitized payloads and build variant tagging; `registerPilotFeedbackBridge` exposes `window.__PS_SUBMIT_PILOT_FEEDBACK__` and auto-binds any `<form data-pilot-feedback>` (fields `cohort`, `sentiment`, `category`, `notes`, `source`) for support/pilot portals.

7. **Analytics routing**
   - Map telemetry events to Amplitude/DataDog dashboards:
     - `pinia_store_usage` → Pinia adoption dashboard.
     - `pinia_store_fallback` → Migration risk alerts.
     - `compat_warning`/`translation_missing` → Error triage board.
     - `build_variant_selected` → Release rollout metrics.
     - `pilot_feedback` → Change-management report.
   - Confirm logging complies with the no-PII guideline (use hashed identifiers only when required).

## Testing Strategy

| Layer              | Tests                                                                                                                              | Notes                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Unit               | Add Vitest specs for `usePiniaTelemetry` and `telemetry.ts`. Mock analytics SDK to verify payloads.                                | Place under `tests/unit/utils/telemetry.spec.ts` (to be created). |
| Component          | Extend existing component tests (e.g., `tests/unit/views/Swap.spec.ts`) to assert telemetry hooks fire when Pinia stores mount.    | Use spy on `trackEvent`.                                          |
| Integration        | Create e2e smoke tests (Playwright) for pilot cohorts to assert telemetry network calls (if feasible) or rely on mocked endpoints. | Add tags to tie into staged rollout pipeline.                     |
| Staging validation | Dashboard spot-checks during preview and staged rollout. Capture screenshots and attach to Pilot Tracker.                          | QA + Platform responsible.                                        |

## Rollout Timeline

| Sprint   | Tasks                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------- |
| Sprint 1 | Implement telemetry helper, build variant event, initial `usePiniaTelemetry` for Swap + Bridge. |
| Sprint 2 | Extend telemetry to Wallet, Order Book, Staking; add warning/missing handlers.                  |
| Sprint 3 | Verify events in preview + staged cohorts; build dashboards.                                    |
| Sprint 4 | Monitor during GA; transition fallback alerts to incident thresholds.                           |

## Ownership

- **Implementation:** Platform team (primary), with support from migration pod for component integration.
- **Analytics pipeline:** Data engineering.
- **QA validation:** QA lead.
- **Maintenance:** Platform team post-migration; review events quarterly.

Update this plan when events change or new flows adopt Pinia. Keep a changelog at the bottom of the file for traceability.
