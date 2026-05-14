# Vue 3 Support Playbook

This playbook equips support and on-call engineers with the concrete steps required to triage and resolve issues reported during the Vue 3 migration rollout. Use it in tandem with the Release Runbook (`docs/plans/vue3-release-runbook.md`), the Pilot Rollout tracker in `roadmap.md`, and the incident playbook managed by DevOps.

## 1. Contacts & Escalation

| Role / Team         | Primary contact      | Escalation channel                         | Notes                                                                 |
| ------------------- | -------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| Support lead        | @support-lead        | #support-oncall (Slack)                    | Owns frontline responses, templates, Zendesk macros                   |
| Migration lead      | @migration-lead      | #migration-status / incident bridge        | Decides on go/no-go, coordinates cross-team response                  |
| Platform engineer   | @platform-oncall     | #migration-status / #release               | Handles Pinia store regressions, telemetry fixes                      |
| QA lead             | @qa-lead             | QA War Room (Slack huddle)                 | Verifies repro steps, updates regression matrix                       |
| DevOps on-call      | @devops-oncall       | PagerDuty (Release – Vue3)                 | Executes rollback, IPFS publish, monitors CI/nightly jobs             |
| Localization lead   | @l10n-lead           | #l10n                                       | Handles translation gaps flagged by `yarn test:translation` or agents |

Escalate Sev1 issues immediately via #release and start an incident call. For Sev2/Sev3, log in Zendesk/Jira and sync during the daily post-launch office hours (Sprint 4 Week 2).

## 2. Severity Matrix

| Severity | Examples                                                                                  | Response target        | First actions                                                                                 |
| -------- | ----------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------- |
| Sev1     | Swap/Bridge unusable for majority of users, wallet connection blocked, data corruption    | Immediate (≤15 minutes)| Page migration lead + DevOps, capture telemetry snapshot, prepare rollback option             |
| Sev2     | Localised component failure (Order Book widget, Sora Card step), translation blocker      | 1 hour                 | Reproduce, create Jira, notify owner squad, evaluate feature flag or selective rollback path  |
| Sev3     | Cosmetic/UI bug, intermittent warning, telemetry mismatch without customer impact        | Same business day      | Collect logs/screenshots, document in support backlog, schedule fix with responsible squad    |
| Sev4     | Questions, doc feedback, enhancement requests                                             | 2 business days        | Reply with FAQ link or doc, route to product backlog                                          |

## 3. Intake Checklist

When a ticket or alert arrives:

1. **Classify** severity using the matrix above.
2. **Gather context**:
   - User wallet address or account ID (if permission granted).
   - Environment (preview, staged flag, GA).
   - Browser/device and timestamp.
   - Screenshots or console errors.
   - Build variant / release hash (for example `window.__PS_BUILD_VARIANT__` or the deployed CID/hash).
3. **Check telemetry**:
   - `pinia_store_usage` events (confirm `isLegacyFallback` and `storeName` fields).
   - Native Vue 3 runtime/bootstrap logs for regressions around legacy wallet shims.
   - `translation_missing` events for locale gaps.
4. **Review monitoring**:
   - Nightly `yarn build:vue3` job status.
   - `yarn ci:nightly` logs for translation/test regressions.
5. **Log pilot feedback when applicable**:
   - If the report comes from a pilot cohort, capture structured feedback via the global helper exposed in the app: `window.__PS_SUBMIT_PILOT_FEEDBACK__({ cohort: '<cohort>', sentiment, category, notes })` (see `src/utils/telemetry.ts`). Any form annotated with `data-pilot-feedback` will auto-wire on load; default field names: `cohort`, `sentiment`, `category`, `notes`, `source`.
   - Use `?telemetryStub=1` in staging to verify the event emits (`[telemetry stub] pilot_feedback ...` in console); avoid entering PII in notes.

Log findings in the shared Zendesk/Jira template and tag the relevant squad.

## 4. Common Scenarios & Playbooks

### 4.1 Wallet / Connection Issues

1. Verify wallet store telemetry (Pinia `wallet` vs legacy). If `isLegacyFallback=true`, instruct user to refresh; capture logs.
2. Ask user to clear cached `public/env.json` (Ctrl+F5) to ensure updated network list.
3. Check the vendored Soraneo wallet source status (see `docs/plans/soraneo-wallet-inline.md`). If regression confirmed, hand off to wallet squad and prepare either a targeted wallet hotfix or a rollback to the last verified release artifact.
4. Escalate Sev1 connection outages to migration lead + DevOps immediately.

### 4.2 Bridge Flow Failures

1. Collect details (direction, asset, selected network ID) and confirm `useBridgeStore` state via telemetry.
2. Run internal repro using `yarn serve` with same network combination; monitor console for Pinia warning.
3. If failure is due to Vuex decorator usage, log domain/file referencing `docs/reports/store-access-audit.md` and assign to platform team (bridge domain).
4. If EVM/sub fee computation fails, coordinate with bridge squad to patch Pinia store actions; reference `docs/plans/bridge-pinia-migration.md`.

### 4.3 Order Book / UI Widgets

1. Confirm whether the affected component already uses `useOrderBook`. If still on legacy mixin, note the file and escalate to frontend pod (per `docs/plans/orderbook-refactor-plan.md`).
2. Capture `yarn test:unit` status for `tests/unit/components/pages/OrderBook/*.spec.ts`. If failing, coordinate with QA to bisect latest PR.

### 4.4 Translation Gaps

1. Run `yarn lang:diff --base origin/main` to list key differences.
2. Regenerate English catalog (`yarn lang:generate && yarn lang:fix`) if copy changed.
3. Update locale files (via Lokalise or manual patch) and rerun `yarn test:translation`.
4. Notify localization lead and reference `docs/plans/translation-audit.md`.

### 4.5 Performance/Telemetry Alerts

1. Review dashboards for `pinia_store_usage` counts. If they dip >10% for >2h, follow rollback decision matrix.
2. Validate bundle size deltas using analyzer output in `dist/reports`.
3. Check `scripts/kpi/report.ts` output in #migration-status to confirm automation is still running.

## 5. Response Templates

**Initial acknowledgement (Zendesk / email):**

```
Thanks for reporting this issue. We’re currently investigating and will update you within <target window>.
Could you confirm the following so we can reproduce the problem?
- Wallet/account ID (if you’re comfortable sharing)
- Browser + version
- Network/asset you selected
- Approximate time the issue occurred

Appreciate your patience while we look into this.
```

**Update after escalation:**

```
Quick update: our migration team identified the root cause (details below) and is preparing a fix.
Impact: <summary>
Next steps: <pending fix/deploy time>, workaround (if any).
We’ll follow up once the fix is live.
```

## 6. Knowledge Base & References

- Release runbook: `docs/plans/vue3-release-runbook.md`
- Compatibility toggle playbook: `docs/plans/compat-toggle-hardening.md`
- Pinia telemetry hooks: `docs/plans/pinia-telemetry-hooks.md`
- KPI automation status: `docs/plans/kpi-automation.md`
- Pilot cohort tracker: `roadmap.md` → Pilot section
- Training materials: `docs/plans/vue3-internal-training.md`

Keep this playbook updated as new scenarios or mitigations are identified. After each incident or significant ticket, append a short post-mortem summary or link to the relevant Confluence page so future responders have context.
