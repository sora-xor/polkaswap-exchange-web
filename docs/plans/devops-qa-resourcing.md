# DevOps & QA Resourcing Plan – Vue 3 Migration (Sprint 2)

This plan secures DevOps and QA coverage for nightly compat-free builds and the Sprint 2 verification window (Weeks 3–4). It is referenced by the Vue 3 roadmap and should be reviewed in the migration standup each Monday.

## Objectives

- Keep nightly `yarn build:vue3` and translation checks green, with triage < 24 hours.
- Standardise the nightly pipeline on `yarn ci:nightly` (runs `yarn test:translation && yarn build:vue3`) so Jenkins/GitLab jobs share the same entrypoint and log format.
- Ensure QA has bandwidth for preview/staged rollout validation, regression suites, and telemetry verification.
- Clarify on-call expectations, escalation paths, and hand-offs between DevOps and QA teams.

## Coverage Matrix

| Area                                             | Owner(s)                                                      | Availability                             | Responsibilities                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Nightly builds (`yarn build`, `yarn ci:nightly`) | DevOps on-call (primary: @devops-oncall, backup: @devops-alt) | Daily, 08:00–22:00 CET monitoring window | Run `yarn ci:nightly` in Jenkins/GitLab, monitor logs, investigate failures, coordinate fixes with migration pod, maintain build artifacts. |
| Translation pipeline (`yarn test:translation`)   | Localization engineer + QA automation                         | Daily                                    | Review failures, coordinate copy fixes, flag localization backlog risks.                                                                    |
| Sprint 2 verification (Weeks 3–4)                | QA lead + 2 QA engineers                                      | Weekdays, 09:00–18:00 CET                | Execute regression suites for Order Book, Sora Card, Wallet; validate telemetry dashboards; record findings in Pilot Tracker.               |
| Telemetry validation                             | Platform engineer + QA analyst                                | Align with pilot cohorts                 | Validate `pinia_store_usage`, `compat_warning`, `translation_missing` events in staging; capture evidence in Confluence.                    |
| Build artifact publishing                        | DevOps                                                        | After nightly pipeline completion        | Archive bundle analyzer reports, upload preview artifacts (as needed).                                                                      |

## Escalation & On-Call

- DevOps responds to build failures within 1 hour during monitoring window; outside that window, notify on-call via PagerDuty.
- QA escalates critical verification blockers in #migration-status and logs Sev1 defects within Jira board `MIG-###`.
- If a nightly build fails twice consecutively, migration lead convenes a risk triage huddle within 12 hours.

## Deliverables & Milestones

| Week                 | DevOps deliverables                                                                       | QA deliverables                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Week 3 (Sprint 2 W1) | Automate bundle diff artifact upload; configure Slack alerts for translation failures.    | Complete Order Book + Wallet regression suite; sign off on telemetry smoke tests.        |
| Week 4 (Sprint 2 W2) | Validate preview build publication pipeline for staged rollout; prepare GA build scripts. | Finish Sora Card + Staking regression; compile verification summary for Sprint 2 review. |

## Communication Cadence

- DevOps provides nightly build status summary in the #migration-status template (`Since last update` section) including `ci:nightly` outcome (translation + compat build) and links to artifacts.
- QA posts daily verification progress during Sprint 2 in the same thread; include pass/fail counts and blocking issues.
- Both teams attend the Tuesday wallet sync when integration issues affect build/test coverage.

## Dependencies & Risks

- Ensure telemetry helper (`telemetry.ts`) and `usePiniaTelemetry` composable are ready before Week 3 verification; QA relies on them to validate events.
- Localization backlog must remain < 2 sprints; translation failures can delay nightly pipeline stabilization.
- If DevOps bandwidth becomes constrained, identify backup engineers and update the on-call roster accordingly.

## Action Items

- [ ] DevOps: add translation failure alerts to #migration-status (due Sprint 2 Day 1).
- [ ] QA: publish updated regression matrix for Sprint 2 flows in Confluence (due Sprint 2 Day 2).
- [ ] Migration lead: confirm escalation tree with program manager and update governance calendar.

Keep this document updated as capacity or schedule changes; note adjustments in the migration standup and roadmap.
