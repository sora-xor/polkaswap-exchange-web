# KPI Automation Plan – Vue 3 Migration

This document outlines the agreed approach for automating KPI reporting (class component count, Pinia parity, compat build streak, translation streak, bundle delta) referenced in `roadmap.md`.

## Decision Summary

- **Approach:** Lightweight scripted report generated via `yarn kpi:report` (Node/TS script) that aggregates metrics from git, CI, and stored artifacts.
- **Owners:** Platform engineer (script implementation) + DevOps (CI integration); migration lead reviews output twice weekly.
- **Timeline:** Prototype during Sprint 2 (Week 3); integrate with CI and Slack notifications by Sprint 3 review.

## Scope & Requirements

| Metric                           | Source                                          | Automation details                                                                               |
| -------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------- |
| Class-based components remaining | Git working tree                                | Script runs `rg '@Component' src/components/\*_/_.vue                                            | wc -l` and logs result. |
| Pinia parity score               | Checklist file (`docs/plans/vue3-migration.md`) | Script parses a YAML/JSON parity checklist (to be exported) and computes percentage.             |
| Compat build pass rate           | CI API (`build:vue3` job)                       | DevOps exposes latest 7-run status via REST endpoint; script fetches and calculates streak.      |
| Bundle size delta                | Bundle analyzer reports                         | Compare `dist/reports/build/stats.json` vs `dist/reports/build-vue3/stats.json`; report % delta. |
| Translation test streak          | CI API (`test:translation` job)                 | Fetch last 7 runs; compute longest current streak.                                               |

Output format (example):

```
{
  "timestamp": "2025-02-10T08:00:00Z",
  "status": "green",
  "metrics": {
    "classComponents": 18,
    "piniaParity": 0.68,
    "compatBuildStreak": 6,
    "bundleDelta": 0.012,
    "translationStreak": 8
  },
  "notes": [
    "Compat build red on 2025-02-09 due to telemetry test flake."
  ]
}
```

The script will also render a Markdown summary appended to `docs/status/kpi-history.md` and post to #migration-status via Slack webhook.

## Implementation Tasks

- [x] **Script scaffolding** — `scripts/kpi/report.ts` (run via `yarn kpi:report`) supports `--root`, `--ci`, `--parity`, `--bundle-baseline`, and `--bundle-current`, defaulting to repo paths.
- [x] **Data adapters** — class-component scan, Pinia parity table parser, bundle delta calculator, and CI status loader from a JSON artifact (`compatBuilds`/`translationTests`).
- [x] **Output & validation** — writes JSON to `tmp/kpi-report.json`, appends Markdown rows to `docs/status/kpi-history.md`, and renders Markdown when `--output=md`.
- [ ] **CI integration** — DevOps to wire the nightly workflow to emit the CI status JSON and call `yarn kpi:report` (Slack/webhook posting unchanged for now).
- [x] **Documentation** — README + this plan updated; unit coverage lives in `tests/unit/scripts/kpi/report.spec.ts`.

## Success Criteria

- Nightly KPI report automatically posts to #migration-status before 08:30 CET.
- `docs/status/kpi-history.md` contains rolling seven-day history.
- Migration lead can reference automated metrics during sprint reviews without manual calculations.
- Alerts trigger when streak thresholds drop (compat build <5/7, translation streak <3).

## Risks & Mitigations

- **CI API access limitations:** Work with DevOps to cache summaries or store results in artifact; fallback to manual update flagged as risk.
- **Data drift (parity checklist manual edits):** Add CI validation to ensure checklist is valid JSON/YAML; fail script on parse errors.
- **Secret management:** Use existing secret store (GitHub Actions secrets); avoid printing sensitive tokens.

## Next Steps

- [x] Platform engineer: scaffold script and git metrics adapter (see `scripts/kpi/report.ts`).
- [ ] DevOps: expose CI endpoints / workflow outputs (due Sprint 2 Week 1) — pipeline should write a `ci-status.json` artifact consumable by `--ci`.
- [x] Migration lead: define parity checklist export format in `docs/plans/vue3-migration.md` (now tracked in `docs/plans/pinia-store-parity.md`).
- [x] QA automation: add smoke test verifying script output format (see `tests/unit/scripts/kpi/report.spec.ts`).

Update this plan as tasks complete; move action items to the migration board.
