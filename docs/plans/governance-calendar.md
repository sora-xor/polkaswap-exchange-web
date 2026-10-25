# Vue 3 Migration Governance Calendar

This calendar captures recurring governance ceremonies, escalation paths, and primary owners for the Vue 3 migration. Publish this page to Confluence and keep it in sync with `roadmap.md`.

## Recurring Ceremonies

| Meeting                                 | Cadence                        | Time (CET)  | Participants                                                        | Owner                    | Notes                                                                  |
| --------------------------------------- | ------------------------------ | ----------- | ------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| Migration standup                       | Weekly (Mon)                   | 10:00–10:30 | Migration pod, platform, wallet squad reps                          | Migration lead           | Cover blockers, KPIs, staffing; update backlog items.                  |
| Steering sync                           | Bi-weekly (Wed)                | 15:00–15:45 | Engineering leadership, wallet squad lead, product, program manager | Program manager          | Focus on cross-team dependencies (wallet bundle, UI kit).              |
| Sprint planning                         | Bi-weekly (Mon, alt weeks)     | 11:00–12:00 | Migration pod, product, QA, DevOps                                  | Migration lead           | Review sprint goals, capacity, and risk mitigation.                    |
| Sprint review                           | Bi-weekly (Fri, end of sprint) | 15:00–16:00 | Engineering leadership, product, QA                                 | Migration lead + QA lead | Demo converted flows, review exit criteria, confirm next sprint scope. |
| Risk triage huddle                      | Ad hoc (<24h notice)           | As needed   | Migration lead, DevOps on-call, affected owners                     | Migration lead           | Convened for Sev1 incidents, build failures, or telem anomalies.       |
| Wallet squad sync                       | Weekly (Tue)                   | 14:00–14:30 | Wallet lead, migration lead, platform engineer, QA lead             | Wallet squad lead        | See `docs/plans/wallet-sync-agenda.md`.                                |
| QA verification standup (Sprint 2 only) | Daily (Weeks 3–4)              | 09:30–09:45 | QA team, migration lead                                             | QA lead                  | Track regression progress and telemetry verifications.                 |

## Governance Contacts

| Role              | Primary          | Backup            | Contact channel      |
| ----------------- | ---------------- | ----------------- | -------------------- |
| Migration lead    | @migration-lead  | @migration-backup | #migration-status    |
| Program manager   | @program-manager | —                 | Confluence / email   |
| DevOps on-call    | @devops-oncall   | @devops-alt       | PagerDuty / #release |
| QA lead           | @qa-lead         | @qa-alt           | QA Slack channel     |
| Wallet squad lead | @wallet-lead     | @wallet-alt       | Wallet squad Slack   |

## Escalation Flow

1. Identify issue (build failure, telemetry regression, risk).
2. Notify migration lead and appropriate owner via Slack.
3. If unresolved within agreed SLA (see roadmap), escalate to:
   - Engineering manager (for staffing/blockers).
   - Program manager (for cross-team coordination).
   - CTO/VP Eng (for major delivery risks).
4. Log decision/mitigation in Confluence within 24 hours.

## One-Time Milestones & Reviews

| Event                        | Date (target) | Owner                        | Description                                               |
| ---------------------------- | ------------- | ---------------------------- | --------------------------------------------------------- |
| Sprint 1 review              | Week 2 Friday | Migration lead               | Compat hardening check, design doc confirmation.          |
| Sprint 2 review              | Week 4 Friday | Migration lead + QA lead     | Order Book progress, Sora Card kickoff, parity checklist. |
| Sprint 3 review              | Week 6 Friday | Migration lead               | Wallet bundle decision, state layer switchover status.    |
| Release readiness review     | Week 8 Friday | Migration lead + DevOps + QA | Green builds/tests, docs done, decision to ship GA.       |
| Post-migration retrospective | Week 10 (TBD) | Program manager              | Review outcomes, capture lessons, plan follow-ups.        |

## Publishing Instructions

- Export this calendar to Confluence under “Engineering Programs > Vue 3 Migration”.
- Link the Confluence page in roadmap communications and #migration-status topic.
- Update when cadences change or new governance meetings are added.
