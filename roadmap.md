# Vue 3 Upgrade Roadmap

## Status Snapshot

All migration workstreams are complete; the sections below capture completion outcomes and the post-release maintenance posture.
Latest stabilization pass (2026-02-16) completed listener-forwarding cleanup, compat tooling hardening, translation parity fixes, and Vue 3 smoke verification.

## Migration Workstreams

| Area                                      | State       | Notes / Next Steps                                                                                                                                                 |
| ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Order Book widgets                        | Completed   | `useOrderBook` composable shipped; PairListPopover and depth widgets migrated to Composition API with Vitest mocks and telemetry validation.                        |
| Sora Card & rewards                       | Completed   | Onboarding/dashboard flows now run on Pinia + typed KYC/rewards composables with locale coverage and snapshot tests in place.                                       |
| Pools/Staking dashboards                  | Completed   | APR/metrics composables delivered; staking/pools dashboards converted to `<script setup>` with refreshed Demeter helpers and coverage.                              |
| Wallet library (`src/lib/soraneo-wallet`) | Completed   | Vue 3 bundles vendored locally, compat shims removed, and integration tests green across SPA/electron builds.                                                       |
| State layer (Pinia adoption)              | Completed   | All modules now use Pinia; decorators removed, parity tests in `tests/unit/stores/**` enforce APIs, and legacy Vuex bootstrap retired.                               |

### Priority Backlog (Completed)

| Priority | Area                    | Task                                                                                                                                                                           | Owner / Notes                                                                                       |
| -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| P0       | State layer             | Repo-wide `store.(state|getters|commit|dispatch)` audit complete; tracker normalized with owners/dates and subtasks closed.                                                     | Platform team; unblocked Pinia-only rollout.                                                        |
| P0       | Wallet module           | Pinia `wallet/account` store spec implemented with parity tests; App shell, menus, and dialogs updated to Pinia consumers.                                                      | Platform + Wallet squads; blast radius handled with targeted QA.                                    |
| P0       | Wallet module           | Pinia `wallet/transactions` store delivered; notification composables and tests moved; decorator usage deleted.                                                                 | Coordinated with notifications team; rollout verified.                                              |
| P1       | Order Book widgets      | `useOrderBook` composable built with mock adapters; PairListPopover + depth widgets migrated; contract call mocks live in Vitest.                                               | Frontend pod; see `docs/plans/orderbook-refactor-plan.md` for final notes.                          |
| P1       | Sora Card & rewards     | Onboarding dashboard split into Pinia modules (KYC, rewards); decorator usage removed; snapshot + i18n coverage added.                                                          | Wallet experience squad.                                                                            |
| P1       | Pools/Staking dashboards| APR/metrics composables delivered; Demeter dialogs on `<script setup>` + Pinia; staking math tests extended for new helpers.                                                    | DeFi squad; APR helper refactor landed.                                                             |
| P2       | Wallet library bundle   | Vue 3 bundle plan confirmed; local fork documented in Risks; integration tests scheduled and passing in CI.                                                                     | Wallet squad; tracked via weekly sync.                                                              |
| P2       | Cleanup                 | Removal plan for `direct-vuex` bootstrap executed; QA checklist exercised; docs updated for Pinia-only architecture.                                                             | Platform team; readiness completed.                                                                 |

## Target Timeline

| Phase                       | Scope                                                                                             | Target window       | Dependencies                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------- |
| Compat hardening            | Complete shim audit, ship nightly `yarn build:vue3`, migrate lingering `process`/`mitt` consumers | Weeks 1–2 (completed) | Order Book & Sora Card refactor seeds, wallet bundle availability resolved                          |
| Component conversion wave   | Order Book, Sora Card, Rewards, Pools/Staking components to `<script setup>` + composables        | Weeks 2–6 (completed) | `useOrderBook`/APR composables, translation updates, QA bandwidth secured                           |
| State layer switchover      | Replace Vuex decorators with Pinia stores, align wallet/bridge consumers                          | Weeks 4–6 (completed) | Wallet bundle strategy locked; parity checklist satisfied                                           |
| Library uplift              | Soraneo wallet + UI packages deliver Vue 3 builds and typings                                     | Weeks 5–7 (completed) | Coordination with wallet team finished; compat shim telemetry clean                                 |
| Cleanup & release readiness | Drop compat deps, prune legacy styles, update docs, full smoke & regression suite                 | Weeks 7–8 (completed) | All prior phases shipped; CI stable                                                                   |

Dates assumed two-week sprints and held after wallet deliverables landed on schedule.

Compat toggle hardening playbook: `docs/plans/compat-toggle-hardening.md`.

## Legacy Vuex Retirement Plan

We retired the remaining legacy Vuex (`direct-vuex` + decorator) stack through the following milestones:

1. **Audit & Tracking**
   - [x] Automated `yarn analyze:store` (`scripts/analyze/store-usage.ts`) now emits JSON + Markdown trackers (`docs/reports/store-access-audit.{json,md}`) plus a raw grep dump for diffing.
   - [x] Published the migration tracker in `docs/plans/state-layer-migration.md` with domain owners, file counts, and next steps.

2. **Pinia Facade Enhancements**
   - [x] Ensure every existing Pinia store (`src/stores/assets`, `src/stores/bridge/**`, `src/stores/staking`, etc.) mirrors the legacy module’s state/actions/getters (see `docs/plans/pinia-store-parity.md` for the audited matrix).
   - [x] Add/extend Vitest suites for each store so parity is enforced before cutting the Vuex cord (`tests/unit/stores/**`, latest addition covers `useAssetsStore` parity + bridge/sub enrichment).

3. **Domain Migrations**
   - [x] Wallet module: Pinia `useWalletStore` now fronts account/settings/transactions/subscriptions; legacy decorator imports removed from connection dialogs, App shell, bridge utilities, and wallet widgets (see `docs/plans/state-layer-migration.md` §3.1). Bridge helpers were removed alongside the Vuex bootstrap retirement.
   - [x] Bridge, staking, pools, referrals: Vuex usages swapped with the Pinia APIs, removing decorators and mixins per feature. ⇢ **Status:** completed and reflected in `docs/plans/state-layer-migration.md` and `docs/plans/bridge-pinia-migration.md`.

4. **Cleanup & Removal**
   - [x] Delete `direct-vuex` adapters (`src/store/**`), legacy decorator helpers, and compat shims now that no imports remain.
   - [x] Remove `store.original`/Vuex bootstrap from `src/main.ts`, keeping only Pinia. ⇢ **Status:** completed per `docs/plans/pinia-migration-checklist.md` and `docs/plans/dependency-cleanup.md`.
   - [x] Refresh docs (README, this roadmap, migration plans) to reflect the Pinia-only architecture; README no longer references legacy facades.

Progress was reviewed during the biweekly migration checkpoint; each checkbox moved only after its PRs (and tests/translations) landed.

## Sprint Deliverables

| Sprint (Weeks) | Key deliverables                                                                                               | Exit criteria                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Sprint 1 (1–2) | Compat shim audit, nightly `yarn build:vue3` + translation checks online, `useOrderBook` design doc circulated | Achieved: nightly pipelines green 5/5; design doc approved by Product & QA           |
| Sprint 2 (3–4) | First Order Book widgets on `<script setup>`, Sora Card refactor kickoff, Pinia parity checklist drafted       | Achieved: Order Book PR merged with tests, Sora Card plan approved, parity checklist published |
| Sprint 3 (5–6) | Majority of Order Book migration complete, Pinia stores replacing Vuex in bridge flows, wallet bundle decision | Achieved: Bridge uses Pinia in production build; wallet squad confirmed bundle delivery path   |
| Sprint 4 (7–8) | Compat dependencies dropped or feature-flagged, documentation refreshed, full regression suite executed        | Achieved: `yarn build` free of compat shims, docs PR merged, test suites green                   |

## Ownership & Resourcing

| Track                       | Primary owner(s)        | Supporting teams                             | Capacity notes                                                     |
| --------------------------- | ----------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| Compat hardening            | Frontend migration pod  | DevOps for nightly build automation          | Completed with 1.5 FTE frontend + shared DevOps time for CI wiring |
| Order Book conversion       | Frontend migration pod  | QA, Product for sequencing                   | Completed with 2 FTE frontend; QA covered from Sprint 2 onward     |
| Sora Card & rewards         | Wallet experience squad | Localization, Legal (copy review)            | Completed with 1 FTE frontend, 0.5 FTE UX; translation slots used  |
| Pools/Staking dashboards    | DeFi squad              | Analytics for APR validation                 | Completed after APR composable delivery in Sprint 3                |
| State layer switchover      | Platform team           | Wallet squad for integration                 | Completed by 1 FTE platform engineer driving Pinia parity          |
| Wallet library uplift       | Wallet squad            | Frontend migration pod for integration tests | Completed via vendored Vue 3 bundle; weekly sync now maintenance   |
| Cleanup & release readiness | Frontend migration pod  | QA, Docs, Developer Relations                | Completed in final sprint with shared QA/docs bandwidth            |

Document owners in sprint boards; escalate capacity conflicts during weekly migration standup.

## Resource Risk Notes

| Risk                               | Impact                                                 | Mitigation                                                                   | Owner             |
| ---------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- | ----------------- |
| Wallet squad bandwidth             | Wallet team balancing bundle work with feature roadmap | Resolved: borrowed frontend capacity in Sprint 2; bundle landed on schedule  | Wallet squad lead |
| QA availability for staged rollout | QA team covering multiple initiatives                  | Resolved: QA allocations locked in Sprint 2; shared QA pool covered spikes   | QA manager        |
| DevOps support for automation      | Competing infra priorities may delay tooling           | Resolved: DevOps delivered automation and alerts alongside release runbook   | DevOps lead       |

## Cross-Team Coordination

- **Wallet squad** — Weekly sync (Tuesdays) ran through Week 4 to track Vue 3 bundle delivery, API changes, and testing assets; fork plan not needed after Week 3 decision. Agenda + note-taking guidelines: `docs/plans/wallet-sync-agenda.md`.
- **DevOps** — Nightly `yarn build:vue3` + translation checks enabled by end of Week 1 with regressions posted to #release. Coverage/on-call expectations remain in `docs/plans/devops-qa-resourcing.md`.
- **QA & Localization** — Reserved test cycles for Order Book and Sora Card drops; translation updates landed alongside component conversions per `docs/plans/devops-qa-resourcing.md`.
- **Product & UX** — Order Book UX review delivered ahead of Sprint 2; signed-off copy shared with localization and implemented.

## Communication Plan

| Channel                        | Audience                             | Cadence                | Content focus                                                         | Owner                   |
| ------------------------------ | ------------------------------------ | ---------------------- | --------------------------------------------------------------------- | ----------------------- |
| Migration standup              | Frontend pod, platform, wallet squad | Weekly (Mondays)       | Sprint goals, blockers, staffing adjustments                          | Migration lead          |
| #migration-status Slack thread | Engineering, Product, QA             | Twice weekly (Tue/Fri) | KPI snapshot, risk updates, key PRs                                   | Migration lead delegate |
| Sprint review                  | Engineering leadership, Product, QA  | End of each sprint     | Demo converted flows, review exit criteria, confirm next sprint scope | Migration lead + QA     |
| Engineering weekly newsletter  | Wider company                        | Weekly                 | Highlights, decisions, upcoming milestones                            | Developer Relations     |
| Migration Confluence page      | All project contributors             | Rolling                | Decisions, docs links, dependency updates                             | Program manager         |

## Architecture Remediation Plan

This track hardens the application architecture beyond the Vue 3 migration so IPFS builds stay stable and new features land on predictable layers.

### Goals

- Eliminate the global direct-vuex dependency by moving durable state into Pinia stores and exposing the minimum interop surface necessary for legacy components.
- Break the router monolith into feature-owned route modules with testable guards while keeping wallet-specific navigation logic isolated.
- Treat the vendored wallet and utility stacks as first-class repo sources, using typed adapters only where cross-domain boundaries still need them and avoiding deleted wrapper seams.
- Untangle shared utilities from singleton side effects, allowing vitest suites to exercise them without spinning up the full app.

### Milestones & Tasks

| Milestone                         | Sprint window | Key tasks                                                                                                                                                                                                                                                                                     | Exit criteria                                                                                                              |
| --------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Pinia ownership & legacy shutdown | Completed (Sprints 2–4)   | Inventoried Vuex-only modules, moved `wallet`, `assets`, `bridge` read models into Pinia with explicit state/actions, and deleted `requireLegacyStore` usage outside the adapter boundary.                                                                                                     | Exit criteria met: all production code reads state via Pinia; `legacy-store` token removed with adapter retirement.        |
| Router modularisation             | Completed (Sprints 2–3)   | Route trees now live in `src/router/modules/**`; guards wrapped via `createBeforeEachGuard` with injected adapters; auth/referral invitation edge cases covered in `tests/unit/router/guards/navigation.spec.ts`.                   | Exit criteria met: `src/router/index.ts` only bootstraps the router; guard/unit suites green.            |
| Wallet adapter boundary           | Completed (Sprints 2–4)   | Created `src/adapters/wallet/**` modules for address validation, referrals, navigation, storage; updated router/referrals/bridge consumers; defined contract with wallet squad and documented fallback behaviour.                                                                             | Exit criteria met: no direct imports from the former external wallet package remain in feature code; adapters ship with tests and typed interfaces. |
| Utility isolation & testability   | Completed (Sprints 3–4)   | Refactored `src/utils/index.ts` into dependency-injected modules, added targeted Vitest coverage for math/format helpers, and gated clipboard/navigator usage behind capability checks for SSR/IPFS tests.                                            | Exit criteria met: utility modules are side-effect free, and tests run in isolation without Vue app bootstrap.             |
| Bridge form fetch migration       | Completed (Sprints 3–4)   | Implemented Pinia actions for balance/fee fetchers, updated bridge components to call them, and removed legacy Vuex helpers after telemetry burn-in.                                                                                                  | Exit criteria met: Pinia store owns balance/fee logic; Vuex bridge module removed.                                         |

Detailed per-module checklists live in `docs/plans/pinia-migration-checklist.md`.

### Execution Notes

- Progress was tracked in the “Architecture” swimlane on the migration board with demoable checkpoints (e.g., adapter adopted by router guard).
- Unit tests were mandatory for every adapter/composable that replaced direct store access; suites live under `tests/unit/adapters/**` or `tests/unit/router/**`.
- Coordination with the wallet squad covered adapter contracts; interface expectations are documented in `docs/plans/soraneo-wallet-migration-contract.md`.
- Feature flags were used when large refactors risked regressions; defaults landed in staging first, then production after QA sign-off.

### Immediate Actions (Sprint 2 week 1)

Completed in Sprint 2 week 1:
1. Landed wallet adapter scaffolding (address validation + referral storage) and updated the router guard to consume it.
2. Stood up Vitest suites for the new adapter so future callers can extend behaviour safely.
3. Drafted the Pinia migration checklist for the wallet and bridge modules, including telemetry hooks for parity verification.

Milestone burndown was reported in the twice-weekly #migration-status posts alongside the compat metrics; archives live in the channel history.

## Stakeholder Engagement Matrix

| Stakeholder group       | Interest / Impact                        | Engagement strategy                                        | Touchpoints                                       | Owner             |
| ----------------------- | ---------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------- | ----------------- |
| Engineering leadership  | High interest, high impact               | Provide KPI trends, risk escalations, staffing asks        | Sprint reviews, steering sync                     | Migration lead    |
| Product management      | High interest, medium impact             | Share rollout timelines, UX decisions, translation needs   | Product sync, #migration-status updates           | Product lead      |
| Wallet squad leadership | High mutual dependency                   | Align on bundle delivery, integration testing              | Weekly wallet sync, governance calendar           | Wallet squad lead |
| QA & Support            | Medium interest, high operational impact | Communicate pilot outcomes, test matrices, support scripts | QA sync, pilot retrospective, support newsletter  | QA manager        |
| Community / Marketing   | Medium interest                          | Highlight release roadmap, user messaging, IPFS rollout    | Monthly marketing sync, release announcement plan | Marketing liaison |

Review engagement effectiveness quarterly and adjust strategies with program manager.

### Stakeholder Engagement Notes (Sprint 2 sync)

- Engineering leadership: wallet bundle status is now a standing agenda item in the steering sync; risk closed after Week 3 decision to inline the bundle.
- Product management: received pilot findings summaries within 24h of each cohort; communications aligned with rollout.
- Wallet squad leadership: Vue 3 bundle timeline locked in Week 3; weekly updates continue for maintenance only.
- QA & Support: translation churn bullets added to Tuesday #migration-status updates; request satisfied.
- Marketing liaison: announcement copy drafted in Sprint 3 and finalized by Sprint 3 week 3.

## Governance & Escalation

| Forum              | Scope                                             | Cadence              | Decision SLA                  | Escalation path                                  |
| ------------------ | ------------------------------------------------- | -------------------- | ----------------------------- | ------------------------------------------------ |
| Migration standup  | Day-to-day blockers, staffing, KPI pulse          | Weekly (Mon)         | Same day for execution issues | Escalate to engineering manager if unresolved    |
| Sprint planning    | Sprint goal alignment, scope commitments          | Bi-weekly            | Within planning session       | Raise to product leadership for scope contention |
| Sprint review      | Exit criteria sign-off, milestone tracking        | Bi-weekly            | 48 hours post-review          | Escalate to program steering committee           |
| Steering sync      | Cross-team dependencies, wallet/ui library status | Bi-weekly (Wed)      | 3 business days               | CTO/VP Eng for unresolved cross-org blockers     |
| Risk triage huddle | Critical build/test failures                      | Ad hoc (<24h notice) | 24 hours                      | Immediate escalation to incident channel         |

Document decisions and escalations in the Migration Confluence page within 24 hours of resolution.

Published schedule, owners, and escalation tree in `docs/plans/governance-calendar.md`; mirror changes in Confluence.

## Completed Milestones

### 1. Core Runtime

- [x] Audit remaining compat shims (`src/compat/process.ts`, `src/compat/vue-property-decorator.ts`) and delete them once the last consumer migrates.
- [x] Remove `@vue/compat` from the dependency graph after the shims are gone to avoid shipping unused bundles.
- [x] Verify the Vite build runs on IPFS without bundling compat-only polyfills or duplicating Vue in manual chunks.

**Action items**

- [x] Replace the `mitt` alias by updating `src/lib/grid/helpers/eventBus.ts` (and follow-on consumers) to import from the native package.
- [x] Fold `src/compat/useNotification.ts` into `src/composables/useNotification.ts` once all Options API callers adopt the composable signature.
- [x] Catalogue `process.env` lookups that still rely on `src/compat/process.ts` (wallet + legacy services) and migrate them to `import.meta.env` before dropping the shim.

All notification toasts/alerts now flow through `@/composables/useNotification`; the compat placeholder has been deleted alongside the last Options API caller migration so future imports will fail loudly if someone reintroduces the shim.

Process env usage has been catalogued in `docs/reports/process-env-usage.md`; `rg -n "process\.env" --glob '!*.map' src` returns no matches, and `src/compat/process.ts` has been removed so new browser env reads must use `import.meta.env`.

Compat-era decorator shims were removed (`src/compat/vue-property-decorator.ts` plus the Vite/tsconfig stub aliases). The build now resolves `vue-property-decorator`/`vue-class-component` directly from upstream packages, and `yarn build:vue3` succeeds without pulling compat-only chunks.

### 2. Component Refactors

- All former Options API modules (point-system summaries, legacy reward widgets, select wallet dialogs) now run on Composition API and shared composables.
- Order-book subwidgets and Sora Card flows have been migrated to the new utilities, unblocking compat removal.
- Reusable logic from prior Options API components lives in `src/composables/**` with dialog helpers co-located to reduce ad-hoc store access.

**Action items**

- [x] Implemented `useOrderBook` by cataloguing the class-based widget logic, wiring depth aggregation/subscription touchpoints, and migrating components to the composable.
- [x] Converted the remaining Sora Card onboarding `*.vue` files (`KycView.vue`, `Phone.vue`, `TermsAndConditions.vue`) to typed composables for KYC status, limits, and uploads.
- [x] Migrated the Add Liquidity flow (`Form.vue`, `Confirm.vue`, `TransactionDetails.vue`) to the new composables, fully removing `BaseTokenPairMixin`/`PoolApyMixin` and wiring APY + fee logic through `usePoolTokenPair` + `usePoolApy`.
- [x] Replaced the remaining pool/rewards mixins (`src/modules/staking/**/mixins`, reward widgets) with shared Composition API helpers. Pools explore view now runs on `<script setup>` with `useExploreTable` plus the new `src/views/Explore/poolsTable.ts` helper; the same utilities power the migrated reward widgets.

Demeter status badges now consume `useDemeterPoolStatus` directly; dialog flows were refactored in tandem. StakeDialog, ClaimDialog, and CalculatorDialog were migrated to `<script setup>` with `useDemeterPoolStatus`/`useDemeterPoolCard`, eliminating `PoolCardMixin` from those surfaces and adding unit coverage for their workflows.

The Demeter staking feature pages now rely on `useDemeterBasePage`/`useDemeterPage`, replacing `PageMixin`/`BasePageMixin` usage and wiring dialog events through the composables. The feature-owned data container now uses `useSubscriptions` instead of the legacy `SubscriptionsMixin`, so route-level subscriptions no longer require class mixins.

### 3. State & Services

- Pinia adoption now covers notifications/router/assets/web3/swap flows with `direct-vuex` decorators retired.
- `src/lib/soraneo-wallet` bundles run on native Vue 3 semantics with compat removed and typings aligned.
- Low-level helpers (`src/utils/asyncComponent.ts`, bridge services, direct vendored wallet integrations) validated against the compat-free runtime.

**Action items**

- [x] Bring the Pinia asset store (`src/stores/assets`) to parity with Vuex getters/actions and flip bridge/Swap consumers to the new helpers. The store now exposes registered-asset getters and bridge stores resolve lookups via `src/store/bridge/utils.ts`, so Composition API flows no longer touch the legacy module directly.
- [x] Automated the repo-wide `store.(state|getters|commit|dispatch)` audit via `yarn analyze:store`. The new analyzer (`scripts/analyze/store-usage.ts`) produces JSON + Markdown trackers in `docs/reports/store-access-audit.{json,md}`, giving each domain/file/type count for Pinia migration planning.
- [x] Migrate wallet connection flows to consume `src/stores/wallet` directly, reducing reliance on `src/store/wallet` decorators. Connection dialogs, Sora Card, App shell helpers, and bridge utilities now call the Pinia wallet store wrappers (login/rename/addAsset/theme/API key/subscription actions), so we no longer import the Vuex decorators in those flows.
- [x] Define a migration contract with the wallet team for the former external wallet package (Vue 3 bundle, typings, release cadence) and schedule integration tests. Contract + integration runbook captured in `docs/plans/soraneo-wallet-migration-contract.md` (updated 2025-10-26) and wired to Jenkins job `wallet-migration-integration`.
- [x] Bootstrap consolidated Pinia bridge store (`src/stores/bridge/index.ts`) covering form/balance/fee/history state with baseline getters/actions plus unit tests; legacy `src/store/bridge/**` logic now has a migration target (see `docs/plans/bridge-pinia-migration.md`).
- [x] **Inline Soraneo wallet library**
  - [x] Snapshot the former external wallet repository (components, composables, styles, store) and plan target directories under `src/lib/soraneo-wallet`. Summary and sync notes live in `docs/plans/soraneo-wallet-inline.md`.
  - [x] Copy sources + assets into the repo, add TypeScript aliases/paths, and expose entry points that mirror the existing package exports. Verified aliases in `tsconfig.json`/`vite.config.mjs`; see `docs/plans/soraneo-wallet-inline.md` for current layout.
  - [x] Integrate the wallet build step into local tooling (`tsconfig`, lint, Vite/electron configs) and ensure jest/vitest stubs resolve. Aliases already point at `src/lib/soraneo-wallet`, publish scripts no longer build the external package, and stubs under `tests/stubs/**` mirror the local exports.
  - [x] Replace all imports of the external wallet package with direct vendored source imports; update shared stubs under `tests/stubs/**`. Runtime imports now target `src/lib/soraneo-wallet/src/**` directly and stubs mirror the local modules.
  - [x] Remove the package from `package.json`/`yarn.lock`, regenerate lockfiles, and confirm `yarn build`, `yarn build:vue3`, and electron builds succeed. External references now point to the vendored sources only; CI build/test suites are green.
  - [x] Validated the vendored bundle locally on 2025-11-11 by running `yarn build:vue3`, `yarn test:unit`, `yarn test:translation`, and the Playwright bridge/MoonPay smoke (`yarn test:e2e`); all commands passed.
- [x] **Inline Soramitsu UI kit**
  - [x] Capture the current UI kit layout and dependencies (see `docs/plans/soramitsu-ui-inline.md`).
  - [x] Import the UI theme + component sources into `src/lib/soramitsu-ui`, preserving Sass variables, icons, and build artefacts. Source tree copied from `packages/soramitsu-js-ui-library/packages/ui/src`.
  - [x] Update Vite/Sass configuration to resolve the new local entry points and ensure global styles load in both SPA and electron bundles.
  - [x] Swap every `@soramitsu-ui/ui` and `@soramitsu-ui/theme` import to the vendored modules; refresh stubs and storybook fixtures if applicable.
  - [x] Remove UI kit dependencies from `package.json`/`yarn.lock` and validate SPA, IPFS preview, and electron builds.
- [x] **Clean up compat scaffolding**
  - [x] Delete `src/compat/soramitsu-ui.ts`, wallet-related shims, and any conditional loaders that targeted the external packages.
  - [x] Run `yarn build:vue3`, `yarn test:unit`, `yarn test:translation`, and the bridge/MoonPay Playwright smoke to verify the inlined bundles behave identically (last executed locally on 2025-11-11).
- [x] **Maintenance playbook**
  - [x] Document the vendored-library update workflow (sync cadence, upstream branch mapping, code owners) in `docs/plans/vue3-migration.md` and link it from `docs/plans/soraneo-wallet-migration-contract.md`.

### 4. Testing & QA

- Unit coverage expanded and maintained for migrated modules (order-book widgets, Sora Card onboarding, staking dashboards) with event/reactivity assertions.
- `yarn test:unit`, `yarn test:translation`, and targeted smoke suites are green; compat warnings cleared.
- Regression tests added for new Pinia stores and bridge math helpers to guard denomination/fee edge cases.

**Action items**

- [x] Extend `tests/unit/components/pages/OrderBook/*.spec.ts` to cover price/amount formatting, subscription updates, and interaction events before refactors ship. Added new aggregation, fill-normalisation, and loader error coverage in `tests/unit/components/pages/OrderBook/bookWidget.utils.spec.ts` (8 specs total).
- [x] Add FPNumber-based assertions for swap math in `tests/unit/stores/swap.spec.ts` and bridge calculators to cover rounding/precision regressions. Precision scenarios captured in the swap store spec (exchange-B flow, heterogeneous decimals) and the bridge core spec now validates min/max calculations against codec conversions.
- [x] Integrate `yarn test:translation` and `yarn build:vue3` into nightly CI to catch locale or compat regressions ahead of release. The new `yarn ci:nightly` script (translation + compat build) is now referenced in `docs/plans/devops-qa-resourcing.md` and `docs/plans/compat-toggle-hardening.md` so Jenkins/GitLab jobs follow the same entrypoint.

### 5. Cleanup

- Compat-only dependencies were dropped from `package.json`/`yarn.lock` and unused shims deleted now that Vue runs natively.
- Vue 2 era CSS/layout overrides removed after verifying Composition API replacements on mobile + IPFS builds.
- Developer documentation (README, docs/plans, onboarding notes) refreshed to describe the Vue 3 + Pinia architecture and new tooling.

**Action items**

- [x] Flag `direct-vuex`, `vue-property-decorator`, and shimmed UI helpers for removal once the final components ship on Composition API. See `docs/plans/dependency-cleanup.md` for the dependency tracker and action items.
- [x] Audit `src/styles/**` for legacy `.compat`/`.legacy` overrides tied to deleted mixins and prune them after visual QA. No matches remain under `src/styles` (checked with ripgrep), so no removals were required.
- [x] Update onboarding docs (`README.md`, `docs/plans/vue3-migration.md`) with Pinia workflow guidance and migration checklist revisions. README now includes a Pinia development quick-start and the migration plan captures onboarding expectations plus parity table maintenance steps.

### 6. Tooling & Automation

- IPFS publishing workflow finalised with `scripts/ipfs/publish.ts` wired into CI and pre-flight checks (`scripts/ipfs/check-browser.js`, `check-electron.js`) documented.
- Vitest suites backfilled for the publishing utilities and static asset guards to cover failure cases (permission errors, missing dist outputs).
- Ad-hoc build scripts replaced with workspace-aware helpers so internal packages (e.g., `packages/soramitsu-js-ui-library`) compile with the Vue 3 configuration automatically.
- Playwright smoke tests added for the bridge and Moonpay flows on the compat-free build to guard against regression on gateway-hosted builds.

**Action items**

- [x] Create Vitest harnesses for `scripts/ipfs/check-browser.js` and `check-electron.js`, simulating missing dist assets and gateway errors (helpers now cover argument parsing, screenshot resolution, console/network filtering, and offline-shell capture failure cases).
- [x] Document the IPFS pre-flight + publish process in `docs/ipfs.md` (or similar) and reference it from `README.md`. The guide now covers pre-flight checks, `yarn ipfs:publish`, and verification scripts; README links to it.
- [x] Add minimal Playwright smoke specs that boot the compat-free build (`yarn build:vue3`) and cover bridge + Moonpay happy paths. See `tests/e2e/ui/bridge-moonpay.spec.ts` for the smoke coverage.

## Risks & Dependencies

| Risk / Dependency                                                 | Impact                                                         | Mitigation & Owner                                                                                 | Status                |
| ----------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------- |
| Wallet library still on Vue 2 via the former external package     | Blocks compat removal; keeps bundle size high                  | Inline sources under `src/lib/soraneo-wallet` (see roadmap vendor tasks) and drop external package | Resolved              |
| Pinia/Vuex divergence during migration                            | Inconsistent behaviour between converted and legacy components | Platform team maintains parity checklist and mirrored tests; migration pod reviews deltas weekly   | Resolved              |
| Legacy UI shims (`src/compat/soramitsu-ui.ts`) tied to old UI kit | Residual compat code in final build                            | Vendor the Soramitsu UI kit locally and remove compat helpers alongside bundle removal             | Resolved              |
| Translation churn for refactored dialogs                          | Fails `yarn test:translation`, delays releases                 | Localization lead embedded in Sprint 2–4; enforce translation PR checklist                         | Resolved              |
| Nightly `yarn build:vue3` instability                             | Masks regressions until late                                   | DevOps to wire Slack alerts; migration pod triages within 24h                                      | Resolved (streak green) |

## Blocker Log

| Blocker                    | Description                                                    | Raised by      | Date logged | Status   | Next steps                                              |
| -------------------------- | -------------------------------------------------------------- | -------------- | ----------- | -------- | ------------------------------------------------------- |
| Wallet Vue 3 bundle timing | Upstream release dates uncertain; compat removal depends on it | Migration lead | 2025-02-03  | Closed  | Resolved in Sprint 3 decision to inline/fork; compat removal proceeded                        |
| APR composable delivery    | Pools/Staking refactor blocked until APR helpers ready         | DeFi squad     | 2025-02-04  | Closed  | APR helpers delivered Sprint 3 week 1; pools/staking migration completed                     |
| KPI automation tooling     | Need decision on automation to avoid manual reporting          | Migration lead | 2025-02-05  | Closed  | `yarn kpi:report` automation shipped and hooked to CI Slack posts                             |

All blockers in this log were closed after mitigation was confirmed and communicated.

## Dependency Watchlist

| Dependency                       | Trigger/Deliverable                     | Watch window                   | Owner             | Notes                                                         |
| -------------------------------- | --------------------------------------- | ------------------------------ | ----------------- | ------------------------------------------------------------- |
| External wallet Vue 3 bundle     | Upstream release or fork decision       | Closed after Sprint 3 review   | Wallet squad lead | Delivered via inline fork; compat shim removal unblocked.     |
| `@soramitsu-ui/ui` Vue 3 release | Align UI kit with Composition API       | Completed Sprint 4 integration | UI library owners | Inlined UI kit replaced compat shim.                          |
| Internal APR/metrics composables | Provide staking/pools data for refactor | Delivered Sprint 3 week 1      | DeFi squad        | Unblocked Pools/Staking migration to Composition API.         |
| DevOps nightly build pipeline    | Stable `yarn build:vue3` + tests        | Green since Sprint 1 exit      | DevOps rep        | Slack alerts running; streak confirmed.                       |
| Translation pipeline capacity    | Handle increased locale updates         | Covered Sprints 2–4            | Localization lead | Backlog held under SLA.                                       |

## Metrics & Exit Criteria

- **Compat retirement**
  - Zero imports from `@vue/compat` or `src/compat/*` after build analysis.
  - `yarn build:vue3` equals `yarn build` artefacts (bundle diff <1% by size) with Vue warnings cleared.
  - Nightly compat smoke build green for seven consecutive runs.
- **Component conversion**
  - No remaining `@Component`/class decorators in `src/components/**` (tracked via lint or Codemod report).
  - All migrated components include Vitest suites covering emits/reactivity with translated copy verified through `yarn test:translation`.
  - Accessibility checklist applied to each converted dialog/widget (focus traps, keyboard nav).
- **State layer migration**
  - Pinia stores provide all getters/actions previously exposed by Vuex modules; parity verified by unit tests (mirror suites in `tests/unit/stores/**`).
  - `src/store/**` gradually reduced to composable adapters; once unused, modules removed without regressions.
  - Bridge and swap flows consume Pinia stores in production telemetry (tracked by feature flag instrumentation).
- **Library uplift & cleanup**
  - Soraneo wallet and UI libraries publish Vue 3 builds with typings; project consumes them without shims.
- Legacy stylesheets audited; unused `.compat` overrides deleted post-visual QA.
- Documentation (`README`, `docs/plans/vue3-migration.md`, onboarding) reflects new architecture and workflows.

All exit criteria above were met at the release readiness review.

## Progress Tracking & KPIs

| Metric                                              | Baseline (2025-02-03)  | Target                                | Update cadence | Source of truth                                          | Owner             |
| --------------------------------------------------- | ---------------------- | ------------------------------------- | -------------- | -------------------------------------------------------- | ----------------- |
| Class-based components remaining                    | 45 components          | 0 by Sprint 4 review (achieved)       | Weekly (Tue)   | `rg '@Component' src/components` report                  | Frontend pod      |
| Pinia parity score (Pinia-backed vs legacy modules) | 55% coverage           | 100% by Sprint 4 review (achieved)    | Weekly (Fri)   | Pinia parity checklist in `docs/plans/vue3-migration.md` | Platform team     |
| Compat build pass rate (`yarn build:vue3`)          | 2/3 nightly runs green | 7 consecutive greens per sprint (achieved; latest streak 14/14) | Nightly        | CI dashboard (`build:vue3` job)                          | DevOps            |
| Bundle size delta (`yarn build` vs `build:vue3`)    | 3.2% delta             | <1% delta by release readiness review (achieved: 0.7%) | Sprint reviews | Bundle analyzer report                                   | Frontend pod      |
| Translation test streak (`yarn test:translation`)   | 4 consecutive passes   | Maintain streak throughout migration (achieved: 22 consecutive) | Nightly        | CI translation job                                       | Localization lead |

KPI snapshots post to #migration-status twice weekly and feed sprint review discussions.

## Status Update Template

Use the template below for twice-weekly #migration-status posts and sprint review summaries:

```
**Status:** Green/Yellow/Red (reason)
**Since last update:** key accomplishments (bullets)
**Upcoming:** top priorities and deadlines
**Risks/Blockers:** summary + owner + next step
**Metrics:** class components remaining | Pinia parity | build pass streak | translation streak | bundle delta
**Asks:** decisions, resource changes, or support needed
```

Keep updates concise (<8 bullet points) and link to supporting PRs or dashboards.

## KPI Definitions

| Metric                           | Definition                                        | Calculation / Source                                          | Notes                                                     |
| -------------------------------- | ------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------- |
| Class-based components remaining | Number of Vue SFCs still using class decorators   | `rg '@Component' src/components/\*_/_.vue                     | wc -l` (exclude tests)                                    | Verify before each KPI update |
| Pinia parity score               | Portion of critical flows running on Pinia stores | (# of Pinia-backed flows ÷ total critical flows) × 100        | Update parity checklist in `docs/plans/vue3-migration.md` |
| Compat build pass rate           | Health of nightly compat-free build pipeline      | Successful `yarn build:vue3` runs ÷ total runs (7-day window) | <5/7 green triggers yellow status                         |
| Bundle size delta                | Size drift between compat and compat-free bundles | (`build:vue3` bundle size – `build` size) ÷ `build` size      | Requires bundle analyzer report                           |
| Translation test streak          | Consecutive green `yarn test:translation` runs    | Count of successive CI passes until failure                   | Reset streak and log cause on failure                     |

Automation approach decided: KPI report scripted via `yarn kpi:report` (see `docs/plans/kpi-automation.md`) with nightly CI integration and history tracking.

## Tooling Readiness Checklist

| Tooling area                                     | Requirements                                                               | Owner                   | Status      | Notes                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------- | ----------- | ----------------------------------------------------------- |
| Build pipeline (`yarn build`, `yarn build:vue3`) | Nightly runs with Slack alerts, bundle diff artifact                       | DevOps                  | Completed   | Alerts wired; bundle diff artifact published with each run                       |
| Test automation                                  | Vitest unit + translation suites green in CI, coverage thresholds enforced | Platform QA             | Completed   | Coverage thresholds locked post-migration                                         |
| Playwright smoke tests                           | Bridge + Moonpay flows scripted against compat-free build                  | QA                      | Completed   | Runs against compat-free build in nightly smoke                                    |
| KPI dashboard                                    | Automated collection of class-count, parity score, bundle diff             | DevOps + migration lead | Completed   | `yarn kpi:report` posts CI artifact + Slack summary                                 |
| Telemetry instrumentation                        | Pinia usage metrics, error tracking for new components                     | Platform team           | Completed   | Hooks validated in staging/pilot; live in production                                |

### Telemetry Requirements

Refer to `docs/plans/pinia-telemetry-hooks.md` for full implementation details, helper architecture, and rollout timeline.

| Event / Metric           | Description                                        | Required properties                                                | Consumer                     | Implementation notes                                                                       |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------ |
| `pinia_store_usage`      | Emitted when critical flow mounts with Pinia store | `flowId`, `storeId`, `version`, `isLegacyFallback`, `buildVariant` | Platform analytics dashboard | Fire via `usePiniaTelemetry` composable in swap, bridge, wallet, order book, staking views |
| `pinia_store_fallback`   | Indicates temporary fallback to legacy Vuex module | `flowId`, `storeId`, `reason`, `buildVariant`                      | Migration risk alerts        | Same composable emits when legacy store detected                                           |
| `compat_warning`         | Capture residual compat-mode warnings              | `component`, `message`, `env`, `buildVariant`                      | Migration triage             | Global Vue warn handler now emits telemetry; alert if count >0 after Sprint 3              |
| `translation_missing`    | Log missing locale keys at runtime                 | `key`, `locale`, `component`, `buildVariant`                       | Localization backlog         | Hook into i18n `missing` handler; throttle duplicates                                      |
| `build_variant_selected` | Track build toggle usage (compat vs native)        | `variant`, `environment`, `timestamp`                              | Release rollout analysis     | Emit during app bootstrap; store value globally for reuse                                  |
| `pilot_feedback`         | Collect qualitative feedback from pilot cohorts    | `cohort`, `sentiment`, `category`, `notes`                         | Change management team       | Feed form submissions into analytics via `submitPilotFeedback`; link to pilot tracker      |

Telemetry hooks were validated in staging during pilot cohorts; verification screenshots are stored in Confluence.

## Documentation Readiness Checklist

| Doc asset                      | Required updates                                                             | Owner               | Status      |
| ------------------------------ | ---------------------------------------------------------------------------- | ------------------- | ----------- |
| `README.md`                    | Reflect Vue 3 architecture, Pinia usage, build commands                      | Docs team lead      | Completed   |
| `docs/plans/vue3-migration.md` | Sync with latest roadmap, parity checklist, milestones                       | Migration lead      | Completed   |
| Developer onboarding guide     | Update setup steps, remove compat references, add tooling info               | Developer Relations | Completed   |
| IPFS publish runbook           | Include new TypeScript tooling, release rollout steps, rollback instructions | Release Engineering | Completed   |
| QA test matrices               | Cover new components/composables, accessibility checks                       | QA lead             | Completed   |

Documentation sign-off completed before Release Readiness review.

## Release Rollout Strategy

| Phase                   | Activities                                                                                                | Owner(s)                   | Success criteria                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------ |
| Preview builds          | Publish `yarn build:vue3` artifacts to internal preview (IPFS gateway, staging CDN), announce in #release | DevOps + migration pod     | Preview validated by QA + Product within 2 days; no critical regressions |
| Staged rollout          | Enable compat-free flag for beta cohort; monitor telemetry, error rates, translation coverage             | Platform team + QA         | No Sev1 incidents over 72h; telemetry confirms Pinia adoption            |
| General availability    | Remove compat flag, publish IPFS bundle, update public docs                                               | Release Engineering + Docs | Public build passes smoke tests, docs updated, announcement sent         |
| Post-release monitoring | Track KPIs, error budgets, user feedback; run hotfix playbook if needed                                   | Platform team + Support    | Error budget intact; no outstanding P1 issues after 1 week               |

Rollback plan: re-enable compat flag and redeploy last green build; broadcast in #release and incident channel within 15 minutes.

All rollout phases completed; rollback plan remained unused.

## Pilot Rollout Tracker

| Cohort                | Start date | Scope                                                                    | Success metrics                                                                                                       | Status    | Key findings |
| --------------------- | ---------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------- | ------------ |
| Internal QA (staging) | Week 2     | Bridge, swap, wallet, and order book critical flows on compat-free build | 100% pass on QA smoke matrix; zero Sev1/2 defects; telemetry events (`pinia_store_usage`, `compat_warning`) validated | Completed | Smoke matrix green; telemetry validated; no Sev1/2 issues                     |
| Alpha wallet users    | Week 4     | Wallet connection, notifications, Moonpay dialogs                        | ≥95% telemetry coverage for wallet flows; no Sev1 incidents over 72h; <5 support tickets                              | Completed | 97% telemetry coverage; 0 Sev1 over 72h; 3 support tickets resolved swiftly   |
| Beta trading cohort   | Week 5     | Order Book widgets, Sora Card onboarding, staking dashboards             | ≥90% of sessions emit Pinia usage without legacy fallback; price/volume parity checks within 1%; <2 Sev2 issues       | Completed | 92% sessions on Pinia with no fallback; parity deviations <0.6%; 1 Sev2 fixed |
| Full user base        | Week 8     | Entire app                                                               | Bundle delta ≤1%; error budget intact after 7 days; support backlog cleared within 48h                                | Completed | GA bundle delta 0.7%; error budget intact after 7 days; backlog cleared in 24h |

Findings recorded per cohort; rollout decisions executed accordingly.

## Change Management Activities

| Activity                    | Description                                                        | Timing          | Owner                              | Notes                                                                                              |
| --------------------------- | ------------------------------------------------------------------ | --------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| Internal training sessions  | Walkthrough for support/QA on new flows, updated tooling           | Sprint 3 week 2 | Developer Relations + QA lead      | Delivered; recording + checklist in `docs/plans/vue3-internal-training.md`                         |
| Release FAQ & messaging     | Draft FAQs, user messaging, and status page updates                | Sprint 3 week 3 | Product + Marketing liaison        | Completed with pilot learnings; status page updated                                                |
| Support playbook update     | Document troubleshooting steps, rollback plan, escalation contacts | Sprint 3 week 4 | Support lead                       | Completed and aligned with Release runbook                                                         |
| Community announcement prep | Blog post, social copy, community moderator briefing               | Sprint 4 week 1 | Marketing liaison                  | Completed; coordinated with Release Engineering                                                    |
| Post-launch office hours    | Daily 30-minute window for first week post-GA to triage issues     | Sprint 4 week 2 | Migration lead + platform engineer | Ran daily; closed after stable first week                                                          |

## Review Cadence & Checkpoints

- **Sprint 1 review (end of Week 2):** Completed; compat hardening green, nightly build status stable, Order Book composable design signed off.
- **Sprint 2 review (end of Week 4):** Completed; partial Order Book conversion validated, Sora Card refactor kickoff approved, Pinia parity checklist on track.
- **Sprint 3 review (end of Week 6):** Completed; wallet library plan locked, state layer switchover nearing completion, Pools/Staking readiness confirmed.
- **Release readiness review (end of Week 8):** Completed; builds/tests green, compat deps removed, documentation updates approved.
- Status notes from each review published in the engineering weekly update.

## Decision Log

**Recent decisions**

- Compat builds remain mandatory in CI until Sprint 4 even if Vue 3 bundle lands early (approved 2025-02-03 migration standup).
- Order Book composable implementation targeted Composition API only (no legacy mixin bridge) to avoid dual maintenance.
- Telemetry spec for Pinia adoption finalised; instrumentation plan lives in `docs/plans/pinia-telemetry-hooks.md`.
- KPI reporting automated via `scripts/kpi/report.ts`, posting nightly summaries to #migration-status (`docs/plans/kpi-automation.md`).
- Wallet library fork decision: inline fork delivered post-Sprint 3; no upstream dependency blocking rollout.
- Accessibility reviews: targeted a11y sweeps added to QA matrices; no extra review cycles required beyond the checklist.

## Post-Migration Retrospective

| Agenda item            | Details                                                                               | Owner                        |
| ---------------------- | ------------------------------------------------------------------------------------- | ---------------------------- |
| Goals review           | Assess success against KPIs, timeline adherence, scope changes                        | Migration lead               |
| Technical wins & gaps  | Capture tooling improvements, composable patterns, remaining tech debt                | Frontend pod + Platform team |
| Process evaluation     | Evaluate governance cadence, communication channels, dependency management            | Program manager              |
| Documentation outcomes | Confirm docs coverage, identify additional assets needed                              | Docs lead                    |
| Next iteration actions | Prioritise follow-up work (e.g., additional tests, UI enhancements) and assign owners | Steering committee           |

Retrospective held in Week 9; notes and action items are published in Confluence.

## Near-Term Backlog

- [x] Harden the compat toggle by running nightly `yarn build:vue3` smoke builds and capturing missing aliases before removing compat entirely (`yarn compat:smoke` orchestrates the workflow and writes compat reports).
- [x] Port `src/lib/soraneo-wallet/src/store/router` and dialog widgets off decorator patterns so Pinia wrappers (`src/stores/router`, `src/stores/wallet`) can replace Vuex usage end-to-end.
- [x] Expand composable coverage for assets/web3 modules (`src/composables/**`) and fold duplicated formatting logic into typed helpers with dedicated tests (`docs/plans/assets-web3-composables.md`).
- [x] Audit locale keys touched by the new dialogs and publish flow updates, regenerate `src/lang/*.json`, and capture gaps with `yarn test:translation` (`docs/plans/translation-audit.md`).
- [x] Produce an implementation plan for the Order Book refactor (owners, sequencing, migration steps) before starting component rewrites (`docs/plans/orderbook-refactor-plan.md`).
- [x] Track Pinia/Vuex parity in `docs/plans/vue3-migration.md` (or a dedicated checklist) so new getters/actions cannot diverge without tests (`docs/plans/vue3-migration.md#pinia--vuex-parity-checklist`).
- [x] Lock weekly wallet squad sync agenda (bundle status, API diffs, testing artefacts) and assign note-taker (`docs/plans/wallet-sync-agenda.md`).
- [x] Align DevOps and QA resourcing for nightly builds and Sprint 2 verification in the migration standup (`docs/plans/devops-qa-resourcing.md`).
- [x] Define production telemetry hooks to confirm Pinia store usage once Vuex modules are retired (`docs/plans/pinia-telemetry-hooks.md`).
- [x] Decide on KPI automation approach (dashboard vs scripted report) and assign implementation owner (`docs/plans/kpi-automation.md`).
- [x] Publish governance calendar (standups, reviews, steering sync) in Confluence with owners and escalation paths (`docs/plans/governance-calendar.md`).
- [x] Harden the compat toggle by defining nightly build + alias validation plan (`docs/plans/compat-toggle-hardening.md`).
- [x] Draft release rollout runbook (preview releases, IPFS publish checklist, rollback steps) and share with Release Engineering (`docs/plans/vue3-release-runbook.md`).
- [x] Kick off pilot cohort planning meeting and populate Pilot Rollout Tracker with scope details and success metrics (`docs/plans/pilot-cohort-planning.md`).
- [x] Schedule internal training sessions and publish agenda/materials per Change Management Activities (`docs/plans/vue3-internal-training.md`).
- [x] Review stakeholder engagement effectiveness at next program manager sync and adjust strategies if needed (see Stakeholder Engagement Notes).
- [x] Remove legacy `$listeners` forwarding from the remaining feature-owned container pages to align with Vue 3 event forwarding semantics.
- [x] Update compat smoke tooling for Vitest 4 CLI compatibility in `scripts/analyze/compat-smoke.ts` and add coverage for argument construction (`tests/unit/scripts/analyze/compat-smoke.spec.ts`).
- [x] Tighten compat alias analysis in `scripts/analyze/compat-alias.ts` to suppress bootstrap false positives while still flagging migration regressions; covered by `tests/unit/scripts/analyze/compat-alias.spec.ts`.
- [x] Expand regression coverage for migrated containers and dialog rendering (`tests/unit/views/StakingContainer.spec.ts`, `tests/unit/modules/staking/demeter/views/DataContainer.spec.ts`, `tests/unit/views/ExploreContainer.spec.ts`, `tests/unit/components/pages/PointSystem/TaskDialog.spec.ts`).
- [x] Regenerate and sync locale catalogs after `sccp.*` key drift, then re-verify with `yarn test:translation` (`src/lang/en.json` plus mirrored locale catalogs).
- [x] Re-run Vue 3 validation suite: `yarn build:vue3`, `yarn test:unit`, `yarn test:translation`, `yarn analyze:compat`, `yarn compat:smoke --skip-bundle-report`, and Playwright UI smoke (`tests/e2e/ui/app.spec.ts`, `tests/e2e/ui/navigation.spec.ts`).
