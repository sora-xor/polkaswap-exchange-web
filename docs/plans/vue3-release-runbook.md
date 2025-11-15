# Vue 3 Release Rollout Runbook

This runbook captures the repeatable steps for shipping the Vue 3 migration to production, including pre-flight checks, phased rollout, communications, and rollback procedures. Use it alongside `roadmap.md`, the Migration governance calendar, and the IPFS publish tooling (`scripts/ipfs/*`).

## 1. Scope & Roles

| Role                  | Responsibilities                                                          | Primary contacts   |
| --------------------- | ------------------------------------------------------------------------- | ------------------ |
| Migration lead        | Coordinate rollout, drive status updates, own go/no-go calls              | @migration-lead    |
| DevOps representative | Execute builds, publish artifacts, monitor CI, own rollback execution     | @devops-oncall     |
| QA lead               | Validate preview/staged cohorts, track defects, sign off on GA            | @qa-lead           |
| Release engineering   | Publish IPFS artifacts, update release channels, coordinate announcements | @release-eng       |
| Support lead          | Update troubleshooting guides, coordinate post-launch office hours        | @support-lead      |
| Marketing liaison     | Prep messaging, status page updates, community announcements              | @marketing-liaison |

## 2. Pre-Flight Checklist

Complete the following before triggering the preview build:

- [ ] KPIs in `roadmap.md` are green or understood (compat build pass streak ≥5/7, translation streak active, bundle delta <1.5%).
- [ ] `yarn test:unit` and `yarn test:translation` pass locally and in CI.
- [ ] `yarn build:vue3` succeeds locally; bundle analyzer report archived under `./dist/reports`.
- [ ] Telemetry instrumentation verified in staging (events defined in _Telemetry Requirements_ section of `roadmap.md`).
- [ ] Documentation checklist items are assigned and on track for completion by GA (see `docs/plans/vue3-migration.md`).
- [ ] Release FAQ draft reviewed by product, marketing, and support.
- [ ] Rollback decision matrix (Section 5) reviewed by all on-call stakeholders.

## 3. Rollout Phases

### 3.1 Preview Builds (Week 2)

1. Run `yarn build:vue3 --mode preview` (or equivalent CI job) to generate staged assets.
2. Publish preview artifacts to the internal IPFS gateway via `yarn ipfs:publish --mode preview`.
3. DevOps posts artifact links in `#release` with version hash, checksum, and diff summary.
4. QA and Product smoke-test bridge, swap, wallet, and order-book flows within 48 hours.
5. Migration lead captures findings in the _Pilot Rollout Tracker_ (roadmap) and Confluence.

**Exit criteria**

- Zero Sev1/Sev2 issues filed during preview window.
- Critical UX copy/translation issues resolved or ticketed with owners.

### 3.2 Staged Rollout (Week 4–5)

1. Enable compat toggle flag (`VITE_DISABLE_COMPAT=true`) for alpha/beta cohorts via environment configuration.
2. Monitor telemetry dashboards for `pinia_store_usage`, `compat_warning`, and `translation_missing` events.
3. QA executes regression suite focused on wallet dialogs, order book widgets, and Sora Card flows.
4. Support lead shares updated troubleshooting notes with frontline agents.
5. Migration lead provides daily (#migration-status) updates summarising health, telemetry, and feedback.

**Exit criteria**

- No Sev1 incidents in the staged cohort after 72 hours.
- Telemetry confirms ≥90% of targeted flows emit `pinia_store_usage` with `isLegacyFallback=false`.
- Translation streak remains unbroken.

### 3.3 General Availability (Week 8)

1. Run `yarn build:vue3` in CI with GA tag (`vue3-ga-$DATE`); archive build logs and bundle report.
2. Execute `yarn ipfs:publish` to push GA artifacts; record CID in release log.
3. Release engineering updates CDN/IPFS pointers and verifies gateway availability.
4. Documentation updates (README, migration plan, onboarding guide, IPFS runbook) merged and linked in announcement.
5. Marketing publishes blog/social announcement; support posts status page update.
6. Migration lead flips feature flag for all users and monitors telemetry/error budgets.

**Exit criteria**

- `yarn build` and `yarn build:vue3` artifacts match (bundle delta ≤1%).
- Nightly build pipeline remains green for 48 hours post-GA.
- No outstanding P1/P0 tickets related to Vue 3 migration.

### 3.4 Post-Release Monitoring (Week 8+)

1. Run daily post-launch office hours (15–30 minutes) with migration lead + platform engineer.
2. Track telemetry dashboards for regressions; escalate anomalies via risk triage huddle.
3. Collect feedback from support, community managers, and pilot participants.
4. Update _Post-Migration Retrospective_ agenda with early observations.

**Exit criteria**

- Error budget intact (no increase in critical error rate over baseline).
- Support backlog for migration issues clears within 7 days.
- Retrospective scheduled within two weeks of GA.

## 4. Communications Timeline

| Day                                | Audience                   | Channel                                  | Message owner          |
| ---------------------------------- | -------------------------- | ---------------------------------------- | ---------------------- |
| Preview launch (Week 2, Day 1)     | Engineering, Product       | `#release`, #migration-status            | Migration lead         |
| Preview completion (Week 2, Day 3) | QA, Product                | Preview retro notes in Confluence        | QA lead                |
| Staged rollout start               | Alpha/beta cohort, Support | Targeted email + support brief           | Product + Support lead |
| GA announcement                    | All users                  | Blog, social, status page, in-app banner | Marketing liaison      |
| Post-release day 1                 | Engineering leadership     | Sprint review / steering sync            | Migration lead         |
| Post-release week 1                | Community moderators       | Community sync                           | Marketing liaison      |

## 5. Rollback Decision Matrix

| Trigger                                                          | Decision owner          | Rollback action                                                                                                     | Communication                                  |
| ---------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Sev1 production incident attributable to Vue 3 changes           | Migration lead + DevOps | Re-enable compat flag, redeploy last green compat build via `yarn build && yarn ipfs:publish --tag compat-rollback` | Incident channel, #release, status page update |
| Telemetry shows ≥10% flows falling back to legacy stores for >2h | Platform team lead      | Investigate; if unresolved within 2h, roll back to compat build                                                     | #migration-status (yellow), steering sync      |
| Translation failures causing user-facing errors                  | Localization lead       | Restore previous locale bundles, disable problematic flows                                                          | Support bulletin, #migration-status            |

Rollback steps must be rehearsed during staging; document completion in Confluence.

## 6. Artefact & Log Retention

- Store build logs, bundle analyzer outputs, and IPFS CIDs under `./dist/reports/YYYY-MM-DD`.
- Record all go/no-go decisions in the Migration governance Confluence page.
- Attach telemetry dashboard screenshots for each rollout phase to the Pilot Tracker.

## 7. Post-Release Retrospective Inputs

Feed the following into the retrospective meeting:

- KPI trends covering the full rollout window.
- Summary of pilot cohort findings and actions taken.
- List of incidents/alerts (including false positives) and how they were resolved.
- Feedback from support/community channels.
- Proposed follow-up work (tech debt, documentation gaps, UX enhancements).

Maintain this runbook as a living document; update after each rollout for future releases.
