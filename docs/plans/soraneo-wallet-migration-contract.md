# Soraneo Wallet Vue 3 Migration Contract (Historical)

**Owners:** Wallet squad lead (delivery), Frontend migration lead (integration)  
**Last updated:** 2025-10-26  
**Related docs:** `docs/plans/wallet-sync-agenda.md`, `docs/plans/vue3-migration.md`, `roadmap.md`

> Historical record: this contract describes the pre-inline migration window before the exchange repo cut over to direct vendored imports under `src/lib/soraneo-wallet/src/**`.

## Objectives

- Deliver a Vue 3–compatible build of `@wallet` without relying on the Vue 2 compat layer.
- Guarantee API stability for the bridge, swap, staking, Sora Card, and notification flows during the migration window.
- Provide test artefacts and integration hooks so the exchange repo can validate each bundle before publishing.

## Scope & Deliverables

| Area                  | Wallet Squad Responsibilities                                                                                               | Migration Pod Responsibilities                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Build outputs**     | Publish `esm`, `cjs`, and UMD bundles built on Vue 3, plus type declarations. Ship as prerelease until contract acceptance. | Consume prerelease in `src/lib/soraneo-wallet` sandbox branch, report regressions within 1 business day.  |
| **API surface**       | Freeze public exports listed in Appendix A. Breaking changes require two-week notice and a migration note.                  | Track consumption points, update adapters/composables as needed, and confirm contract compatibility.      |
| **Release cadence**   | Weekly tagged builds (`vNext-rc.X`) every Thursday 12:00 UTC. Hotfix window Mon–Wed with prior notice.                      | Pull latest RC within 4 hours, run integration suite, and send sign-off or blocker summary by end of day. |
| **Docs & change log** | Update CHANGELOG.md + migration notes per release; include breaking-change callouts.                                        | Mirror key items into `docs/plans/vue3-migration.md#wallet-library` checklist.                            |
| **Support window**    | Provide Slack/Teams coverage 10:00–18:00 CET on release day, 4-hour SLA for critical blockers.                              | Log issues in shared board (`wallet-migration` label) and escalate blockers during daily stand-up.        |

## Acceptance Criteria

1. New bundle passes the integration test suite defined below on the exchange repo.
2. Type definitions align with `strict` TypeScript settings (`noImplicitAny`, `strictNullChecks`).
3. All exchanges of account/transaction data continue to resolve via stable interfaces (`WalletApi`, `NotificationService`, `SubConnector`).
4. Release artifacts published to private registry with integrity hashes and signed checksums.

## API Contract (Appendix A)

| Module                | Exposed surface                                                 | Notes                                                                                  |
| --------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `@wallet/components`  | `TokenLogo`, `FormattedAmount`, `DialogBase`, etc.              | Props/events unchanged; use Composition API emit signatures.                           |
| `@wallet/composables` | `useTranslation`, `useNotification`, `useWallet`, `useHistory`. | Must remain tree-shakable; mark deprecated functions with JSDoc tags.                  |
| `@wallet/api`         | `walletApi`, `bridgeApi`, `historyApi`.                         | Promise interfaces stay consistent; error enums new values allowed with documentation. |
| `@wallet/store`       | `walletModules`, `settingsModules`.                             | Retain module names for backward compatibility; Pinia-specific helpers optional.       |

## Integration Test Matrix

| Suite                        | Command                                                                                                                            | Frequency              | Owner             | Exit criteria                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| Bridge smoke                 | `yarn vitest run --project unit tests/unit/components/pages/Bridge/*.spec.ts`                                                      | Every RC (Thu)         | Frontend QA       | All specs green; manual spot check of asset selector                                           |
| Swap smoke                   | `yarn vitest run --project unit tests/unit/components/pages/Swap/Widget/*.spec.ts`                                                 | Every RC + hotfix      | Frontend QA       | No new failures vs baseline                                                                    |
| Wallet connect flow          | `yarn vitest run --project unit tests/unit/composables/useInternalConnect.spec.ts tests/unit/composables/useWalletConnect.spec.ts` | Every RC               | Wallet squad QA   | Ensure connect/disconnect + provider selection unaffected                                      |
| E2E integration (Playwright) | `yarn test:e2e --project chromium`                                                                                                 | Weekly (Fri 20:00 UTC) | QA lead           | Bridge + Moonpay happy path succeed in the native Vue 3 build; report posted to `#wallet-migration` |
| Type & build check           | `yarn build:vue3` with bundle override                                                                                             | Every RC               | Platform engineer | No TS compile errors, bundle diff < 5% unless pre-approved                                     |

**Scheduling:** Wallet squad posts the new RC in `#wallet-migration` by 12:00 UTC Thursdays. Migration pod runs the first three suites immediately; E2E and build checks run overnight via Jenkins job `wallet-migration-integration`. Blockers reported via shared board before 10:00 UTC Friday. Acceptance or rollback decision announced during Friday stand-up.

### Integration Runbook

1. Wallet squad publishes the tagged RC to the private registry and drops release notes plus checksum bundle in `#wallet-migration` by 12:00 UTC Thursday.
2. Migration pod kicks off Jenkins job `wallet-migration-integration` at 13:00 UTC. The pipeline executes, in order:
   - `yarn vitest run --project unit tests/unit/components/pages/Bridge/*.spec.ts`
   - `yarn vitest run --project unit tests/unit/components/pages/Swap/Widget/*.spec.ts`
   - `yarn vitest run --project unit tests/unit/composables/useInternalConnect.spec.ts tests/unit/composables/useWalletConnect.spec.ts`
   - `yarn test:e2e --project chromium`
   - `yarn build:vue3 --mode production --report`
3. Jenkins pushes the HTML summary and artefacts to the `wallet-migration-integration` job history and posts a condensed status (green, amber with blockers, red with failure logs) to `#wallet-migration`.
4. Migration pod reviews results and files any regressions under the shared `wallet-migration` Jira board before 09:00 UTC Friday; acceptance or rollback call happens during the Friday stand-up.

The shared maintenance workflow for vendored libraries is tracked in `docs/plans/vue3-migration.md#vendored-library-maintenance`; use it when planning wallet RC syncs or assigning ownership changes.

## Communication & Escalation

- **Daily sync:** 10-minute huddle if a release candidate is blocked; otherwise revert to weekly agenda (`docs/plans/wallet-sync-agenda.md`).
- **Escalation path:** Migration lead → Platform manager → Steering committee.
- **Documentation:** Store final contract and updates in Confluence `Wallet Migration` space; this Markdown file is the source of truth for repo changes.

## Open Items

- [ ] Tag the Playwright bridge and Moonpay smoke scenarios with `@wallet-smoke` so the integration job can target a bounded subset as coverage expands.
- [ ] Automate package integrity verification (`pnpm audit-signature` or equivalent) in CI.
- [ ] Backfill mocks for legacy mixin APIs slated for removal once contract is fully “green.”
