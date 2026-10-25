# Weekly Wallet Squad Sync Agenda

Purpose: align the migration pod and wallet squad on Vue 3 bundle delivery, API changes, testing artefacts, and outstanding integration work. Use this agenda for the Tuesday sync referenced in `roadmap.md`.

## Meeting Details

| Field        | Value                                                                                 |
| ------------ | ------------------------------------------------------------------------------------- |
| Cadence      | Weekly (Tuesday)                                                                      |
| Duration     | 30 minutes                                                                            |
| Chair        | Wallet squad lead                                                                     |
| Note-taker   | Migration pod delegate (rotates; default @qa-lead)                                    |
| Participants | Wallet squad lead, migration lead, platform engineer, QA lead, product representative |

## Standard Agenda

1. **Status round (5 min)**
   - Wallet Vue 3 bundle progress (build status, blockers, ETA).
   - Migration pod updates (integration needs, upcoming deadlines).
2. **API & integration changes (10 min)**
   - New/changed endpoints or contracts.
   - Required updates in `src/lib/soraneo-wallet` and adapters.
   - Test artefacts: fixtures, mocks, release notes.
3. **Testing & validation (5 min)**
   - Results from latest bundle tests (unit, integration, E2E).
   - Pending QA tasks or environment needs.
4. **Action items & decisions (5 min)**
   - Review open action items from previous sync.
   - Assign new owners and due dates.
5. **Risks & escalations (5 min)**
   - Identify issues needing steering sync or leadership attention.
   - Confirm items to highlight in #migration-status.

## Pre-Read Checklist

- Latest wallet bundle changelog / release notes.
- CI results for wallet Vue 3 builds.
- Updated Pilot Rollout Tracker entries (if applicable).
- Telemetry anomalies impacting wallet flows.

## Post-Meeting Follow-Up

- Note-taker posts summary and action items in the Migration Confluence page within 24 hours.
- Update the Stakeholder Engagement Notes and #migration-status with critical decisions or blockers.
- Ensure action items are tracked in the shared migration board (labels: `wallet-sync`).

Keep this agenda updated as the migration progresses. Adjust timing or topics when the wallet bundle ships or integration risk profile changes.
