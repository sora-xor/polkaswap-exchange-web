# Pilot Cohort Planning – Vue 3 Migration

This playbook outlines the planning session required to launch the staged pilot cohorts defined in `roadmap.md`. Use it to confirm participants, agenda, deliverables, and follow-up items prior to the Week 2 preview rollout.

## Session Details

| Item          | Details                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------- |
| Meeting title | Vue 3 Pilot Cohort Planning                                                                        |
| Objective     | Align on pilot cohort scope, success metrics, timelines, and owners before preview builds go live. |
| Duration      | 60 minutes                                                                                         |
| Proposed date | Sprint 1 – Week 2, Day 1 (immediately after migration standup)                                     |
| Facilitator   | Migration lead                                                                                     |
| Note-taker    | QA lead                                                                                            |

## Attendees & Roles

| Team                   | Representatives                          | Responsibility                                                   |
| ---------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| Frontend migration pod | Migration lead, senior frontend engineer | Present migration status, outline pilot requirements.            |
| QA                     | QA lead, automation engineer             | Confirm test coverage, acceptance criteria, regression plan.     |
| Platform               | Platform engineer                        | Validate telemetry hooks and feature-flag rollout.               |
| Wallet squad           | Wallet tech lead                         | Coordinate wallet-specific scenarios and metrics.                |
| Product                | Product manager                          | Approve cohort scope, user selection, communication touchpoints. |
| Support                | Support lead                             | Prepare support scripts and escalation process.                  |
| Marketing/Comms        | Marketing liaison                        | Align on messaging for alpha/beta users.                         |

## Agenda (60 minutes)

1. **Status snapshot (10 min)** – Migration lead reviews current KPIs, outstanding risks, and readiness of preview build.
2. **Pilot cohort objectives (10 min)** – Product manager validates business goals for each cohort (QA staging, alpha wallet, beta trading).
3. **Scope & success metrics (15 min)** – Cross-functional walk-through of:
   - Features included per cohort.
   - Success/fail criteria and telemetry dashboards.
   - Data capture requirements (feedback forms, issue triage).
4. **Operational readiness (10 min)** – QA/support confirm test suites, runbooks, and response plans.
5. **Timeline & assignments (10 min)** – Confirm start dates, owner handoffs, and update cadence (#migration-status, Confluence notes).
6. **Risks & decisions (5 min)** – Capture open questions, blockers, and required approvals.

## Pre-Reads & Inputs

- Current `roadmap.md` (focus on Pilot Rollout Tracker, Telemetry Requirements, Change Management Activities).
- `docs/plans/vue3-release-runbook.md` for rollout phases and rollback plan.
- Latest build status (CI dashboard) and telemetry validation notes.
- Draft support FAQ and translation status.

## Expected Outcomes

- Signed-off success metrics for each pilot cohort.
- Updated Pilot Rollout Tracker in `roadmap.md` with cohort scope, start dates, and metrics.
- Action item list with owners and due dates (record in Confluence).
- Confirmation of daily update cadence during staged rollout.

## Follow-Up Actions

- Publish meeting notes in the Migration Confluence page within 24 hours.
- Update `#migration-status` with pilot planning outcomes and any new blockers.
- Queue calendar invitations for each cohort kickoff and daily standups during staged rollout.
- Ensure telemetry dashboards are bookmarked and accessible to all stakeholders.

Keep this document up to date as cohorts evolve; revise agenda and attendee list if pilot composition changes.
