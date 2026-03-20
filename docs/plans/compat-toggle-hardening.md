# Compat Removal Hardening Plan

Goal: keep the native Vue 3 runtime healthy while the remaining compat shims are removed, using nightly `yarn build:vue3` smoke builds, compat import reporting, and regression triage.

## Objectives

- Nightly `yarn build:vue3` pipeline runs with smoke tests and alerts on failure.
- Missing compat alias usage and legacy shim imports are reported and tracked.
- Outcomes are surfaced in #migration-status and logged in Confluence.
- Provide go/no-go criteria for dropping compat shims.

## Checklist

| Area               | Tasks                                                                                                                                                                                                                                                                                                                                    | Owner          | Status |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| CI pipeline        | - Ensure `build:vue3` workflow runs nightly. <br> - Add smoke step: `yarn compat:smoke` (wraps build/test/alias report generation for the native runtime). <br> - Trigger `yarn ci:nightly` (translation + native Vue 3 build) in the same job so localization regressions fail fast. <br> - Publish bundle analyzer + alias report artifacts from smoke run outputs. | DevOps         | ☐      |
| Alias detection    | - Extend `scripts/analyze/compat-alias.ts` (or new script) to list remaining compat imports (`@vue/compat`, legacy shims). <br> - Fail build if new compat usage appears outside allow-list.                                                                                                                                             | Migration pod  | ☐      |
| Alerting           | - Configure Slack notifications to `#migration-status` when nightly build fails or alias script finds issues. <br> - Track failure count in KPI automation (`compatBuildStreak`).                                                                                                                                                        | DevOps         | ☐      |
| Dashboard          | - Create Confluence page summarising nightly results (build status, alias counts). <br> - Link dashboards in roadmap KPI section.                                                                                                                                                                                                        | Migration lead | ☐      |
| Smoke verification | - Define smoke runbook (manual) for fallback in case CI issues: run `yarn build:vue3` locally, load preview in QA environment, execute sanity flows (swap, bridge, wallet).                                                                                                                                                              | QA lead        | ☐      |
| Exit criteria      | - Achieve 7 consecutive green nightly builds with zero compat alias findings. <br> - Document readiness and notify stakeholders prior to removing compat dependencies.                                                                                                                                                                   | Migration lead | ☐      |

## Failure Triage Process

1. Nightly build fails → DevOps on-call investigates log.
2. Determine category: build error, alias violation, smoke test failure.
3. Create ticket in migration board (label `vue3-hardening`) with root cause and ETA.
4. Update #migration-status template and Confluence dashboard.
5. Migration lead reviews during standup; escalate via risk triage huddle if Sev1.

## Supporting Scripts & Artefacts

- `yarn ci:nightly` (translation + native Vue 3 build entrypoint used by Jenkins/GitLab).
- `yarn build:vue3` (native Vue 3 build alias).
- New script (planned): `tsx scripts/analyze/compat-alias.ts` producing JSON/Markdown report.
- Bundle analyzer outputs stored under `dist/reports/build-vue3/`.
- KPI automation (`yarn kpi:report`) tracks the native Vue 3 build streak.

## Timeline

| Sprint          | Milestones                                                                              |
| --------------- | --------------------------------------------------------------------------------------- |
| Sprint 1 Week 2 | CI job scheduled; smoke subset defined; alias script prototype.                         |
| Sprint 2 Week 1 | Slack alerts live; alias script enforcing allow-list.                                   |
| Sprint 2 Week 2 | Dashboard published; manual smoke runbook validated.                                    |
| Sprint 3 Week 1 | Goal: 7 consecutive green builds + zero alias violations; prep final compat shim removal proposal. |

## Notes

- Coordinate with DevOps to ensure CI usage stays within resources (build caching recommended).
- QA should rehearse manual smoke test weekly in case of CI outages.
- Once exit criteria met, move to remove compat shims and update roadmap milestones.

Keep this plan updated; mark checklist items in Confluence or migration board when complete.

## Tooling Updates

- `yarn compat:smoke` runs the Vue 3 build, executes the `Smoke`-tagged Vitest subset, generates the bundle report, and writes a compat alias report to `dist/reports/compat-alias-report.json`. Use `--skip-tests` or `--skip-bundle-report` flags for quick triage runs.
