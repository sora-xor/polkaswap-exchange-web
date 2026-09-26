# Community Store isolated validation — 2026-09-26

This report records the isolated frontend baseline, the Sora Pay 0.1.1 update and subsequent root-cause repairs. Results are tied to the stated code and runs below; they do not establish a live purchase or public launch.

- Branch: `codex/community-store`, based on `893783ba6a19c33043eb5dabe42d949c14d0f257`.
- Reviewed head: `928a30c23f9e1d6d273dc9b4dc2cd943744d2d0a`; [draft PR #1623](https://github.com/sora-xor/polkaswap-exchange-web/pull/1623).
- Production source is unchanged from `915e8df96`; the later commit only corrects a layout-test assertion.
- Vendored Sora Pay archive SHA-256: `48f5c9ba3aa19ba5d1c484a3f8b8978b150acc69f2e979944a383a5ec94407ca`. No sibling-directory dependency.

| Check | Result and evidence |
| --- | --- |
| Production build | Passed in 63 seconds after the image-normalization and desktop-sidebar fixes. `/tmp/community-store-isolated-build.log`. |
| Focused frontend suites | 70 tests in eight files passed. `/tmp/community-store-isolated-final-focused.log`. |
| Rehearsal development scripts | 93 tests in two files passed; this is the targeted rehearsal suite, not the full Node-script project. `/tmp/community-store-isolated-scripts.log`. |
| Translation consistency | 13 tests in four files passed; Store keys are present in all 31 locale catalogs. `/tmp/community-store-isolated-translations.log`. |
| Layout assertion correction | 13 tests passed in `tests/unit/views/App.source.spec.ts`. The assertion now checks Store/Polkamarkt membership in the sidebar-flow rule without coupling selector order. |
| Full application unit project | **Passed:** `yarn test:unit`, 3,698 tests in 776 files, exit 0, 1,126.30 seconds at head `928a30c23`. The standard serial-worker settings were preserved and source/tests stayed unchanged throughout the run. Log: `/tmp/community-store-isolated-unit-layout-final.log`. The preceding run exposed the obsolete selector-adjacency assertion; the corrected assertion and full rerun now pass. |
| Targeted lint | Changed-source lint and the separate AppShell/image-normalizer lint passed according to the recorded terminal results. Production source has not changed since those checks; the later layout-test edit is separate. Logs: `/tmp/community-store-isolated-lint.log`, `/tmp/community-store-isolated-shell-lint.log`. |
| Browser flows | All four distinct Chromium/WebKit cases passed across two runs. The first run passed three cases; Chromium checkout exceeded its 60-second whole-test limit. That unchanged case passed on rerun in 29.4 seconds under the same limit. Logs: `/tmp/community-store-isolated-browser-final.log`, `/tmp/community-store-isolated-chromium-rerun.log`. |

Browser coverage uses deterministic wallet/relay mocks and checks IPFS-prefix browsing, loaded product images, desktop/mobile layout, private order persistence before payment, exact totals, receipt download and header-based recovery. It does not demonstrate real wallet signing or actual Telegram order delivery. Screenshots are under `output/playwright/community-store/`.

The production scan inspected **832 text assets** and found none of the seven private refund-rehearsal markers. Built `community-store.json` retains **`relayUrl:null`**. Built index SHA-256: `9d3c331f0fc84ee15d10ac706114920f497e5524d2a97a88f1aecdc8b1c22342`. Evidence: `output/community-store-isolated-production-scan.json`. Public checkout remains disabled.

The separate MOF observation at **00:54 UTC** found the enabled relay caught up at both samples, with the same process running for over nine hours, intact identity/key/integrity checks, zero orders/payments/outbox and the public gate preserved. The matching hourly backup had succeeded. These are sampled idle-service observations, not load or fulfillment evidence; backups depend on the operator Mac. Evidence in the toolkit: `output/private-rehearsal/enabled-idle-capacity-2026-09-26T0054Z.json`.

The **01:34 UTC** read-only refund preflight found **zero spendable XOR** in the store wallet and estimated **0.100025912589707326 XOR** network fee for a prospective **5.453596 XOR** refund. After receiving that purchase amount, the wallet would still need a separately funded fee reserve. The corresponding total amount plus fee was **5.553621912589707326 XOR**. This used a synthetic reference, created no refund obligation and submitted nothing; refresh the estimate before signing. Toolkit evidence: `output/private-rehearsal/refund-public-preflight-2026-09-26T01-33-53-111Z.json`.

Remaining launch evidence: real purchase and finalized payment, private delivery of that real order, procurement/packed-weight and destination checks, physical shipment/tracking, finalized full-XOR refund with a funded fee reserve, supported mobile-wallet signing, and public pilot/production rollout. The approved MOF/Bunny tooling was subsequently integrated as recorded below; public rollout and its live checks remain pending.

## Sora Pay 0.1.1 follow-up

A real private order exposed an unclear insufficient-balance error. Version 0.1.1 now shows a bounded, translatable explanation when native XOR cannot cover payment and fees. Unknown wallet errors remain generic; uncertain submission outcomes retain their reconciliation instructions. The frontend supplies the new key in all 31 catalogs, reusing established short balance wording for special-script locales. A regression test compares all catalogs with the installed package's actual message keys.

The vendored archive has SHA-256 `4aecd9659548aa14518872c04dc9e2caf0b77a0acb01ba2737f9c6848ab3f7dc`, Yarn locator `5c8e05`, and 123 allowlisted public files. Toolkit source commit `2b89b11` passed strict compilation and 118 tests. Production remains independent of the sibling checkout.

- Store unit suites: **50 tests in seven files passed**; the two new catalog tests also passed after the final import-style adjustment. Logs: `/tmp/community-store-011-unit.log` and `/tmp/community-store-011-widget-locales.log`.
- Translation checks: **13 tests in four files passed**. `lang:fix` produced no semantic changes; existing formatting was retained. Log: `/tmp/community-store-011-translations.log`.
- Production build and targeted test-file lint: passed. Logs: `/tmp/community-store-011-build.log` and `/tmp/community-store-011-lint.log`.
- Packaged checkout flows: WebKit passed on the first run. Chromium exceeded the unchanged 60-second whole-test timeout, then passed unchanged in 39 seconds on a focused rerun. Logs: `/tmp/community-store-011-browser.log` and `/tmp/community-store-011-chromium-rerun.log`. These remain mock wallet/relay flows.
- Production scan: 832 text assets, no private refund-rehearsal markers, new balance message present, and `relayUrl:null`. Built index SHA-256: `f0cc8e8bec61e473ed08f153ba9aee97ae61569b7808be844f629a3c0d3d419c`. Evidence: `output/community-store-011-production-scan.json`.

The earlier full 3,698-test application run applies to the baseline; this follow-up ran the affected suites. The real order was saved with accepted terms, its private receipt downloaded, and its exact record verified in an encrypted off-host backup. Its payment window expired while the payer lacked sufficient XOR; no payment or signing attempt occurred. The remaining launch evidence above is still open.

## Background backup repair

Encrypted exports succeeded, but background restore verification timed out. Phase-specific diagnostics reproduced a restore timeout even with a temporary 120-second bound. The CLI eagerly loaded the relay's RPC, HTTP and messaging dependencies before selecting the restore command, and the local verifier used the full merchant runtime.

Toolkit commit `263f0e09ffff67d8d8db7217f4d52d579db4e75f` selects restore before importing the serving stack. The operator backup job now uses an 18-file, hash-verified restore runtime with the same approved Node binary. The original **60-second** restore limit is restored. The live relay, database keys, remote deployment bindings, hourly schedule and original merchant stage are unchanged.

- Strict compilation and **119 toolkit tests passed**, including a real compiled-CLI regression that rejects serving-stack imports and checks restore integrity, restrictive permissions, invalid keys and overwrite protection.
- **19 offline backup guard tests** passed, and the CLI regression passed against the exact local restore runtime.
- The existing LaunchAgent was triggered with its normal background/low-priority settings and exited **0** at **03:28:35 UTC**. Restore took **10.269 seconds** and database verification **8.585 seconds**, each within its original 60-second limit. The restored archive passed integrity, original-key and encrypted-record checks and contained **one order, zero payments and zero notification jobs**.
- Failed archives and phase-specific diagnostic records are retained. Safe failure summaries omit credentials, private record contents and subprocess output.

Toolkit evidence: `output/private-rehearsal/backup-runtime-root-cause-fix-2026-09-26.json`. This verifies the exercised background path; the hourly job still depends on the operator Mac being awake and logged in. No payment, refund, dispatch or customer notification occurred during this repair.


## Deployment tooling repair

Commit `18535e46` brings the isolated branch's publisher, purge command, browser checker and deployment instructions into line with the approved MOF/Bunny workflow. The publisher defaults to `https://mof.sora.org`, emits matching CIDv1 origin/host settings and rejects retired or browser-only gateway overrides. The separate purge command verifies the fixed Polkaswap zone identity and takes an existing API key only through the environment. Publishing does not purge or change Bunny settings.

The browser checker now requires the mounted Swap form and `Swap - Polkaswap` title, rejects a remaining bootstrap loader, captures the final settled state and reports failed optional-endpoint requests. The checked-in runbook retains pin/import verification, origin validation, standing purge authorization and live CID/WebKit checks. The publisher builds this worktree's `dist` without a sibling Sora Pay dependency.

**140 offline tests in three files passed**, along with scoped lint, JavaScript syntax checks and diff checks. Logs: `/tmp/community-store-deployment-unit.log` and `/tmp/community-store-deployment-lint.log`. No remote service, public origin, cache, production assets or live relay was changed by these checks. These results establish the tooling behavior under mocks, not a completed deployment.


## Browser-test repair

The original checkout test manually launched Chromium, exercised desktop order creation/download/recovery, then created a separate mobile context under one 60-second test budget. A timed reproduction measured 16.035 seconds for browser launch and 9.365 seconds for the first page alone; the independent mobile check exhausted the remaining budget. The prelaunch test had the same combined desktop/mobile structure.

Each browser now uses Playwright-managed fixtures. Desktop and mobile prelaunch checks, checkout/recovery, and mobile delivery layout are independent cases, retaining all existing assertions. Managed contexts also make configured failure traces cover the tested pages. A later diagnostic exposed an omitted `ensureAppLoaded` after receipt-page reload; the same readiness check used by the initial navigation now runs after reload. Test, assertion and action timeouts and retry settings are unchanged.

The diagnostic run with always-on tracing additionally exhausted fixture teardown time. The normal configuration retains traces only on failure. Additional startup and tool-routing failures occurred during substantial concurrent host load; a read-only sample at 13:07 JST found load averages of 550.18 / 474.98 / 418.09, with 2 TiB disk space available and 50% system-wide free memory. No unrelated process was stopped or changed. Individual failed-run logs and timings are retained rather than discarded as flaky reruns.

**All eight distinct Store cases pass across the final focused runs**, with the original timeouts and no retries:

- Chromium checkout/recovery passed in **20.841 seconds**, Chromium mobile checkout in **10.035 seconds**, and WebKit mobile checkout in **18.534 seconds** during the six-case run. That run also recorded the old combined WebKit prelaunch timeout and a WebKit initial-app-readiness failure; it is not reported as an overall passing run. Log: `/tmp/community-store-root-cause-final.log`.
- After splitting prelaunch contexts, the four changed desktop/mobile prelaunch cases and the unresolved WebKit checkout/recovery case all passed in a single **five-case run, exit 0, 4.5 minutes**. Log: `/tmp/community-store-root-cause-scoped.log`; fresh results: `output/playwright/store-root-final-scoped-results/`.
- The original failing reproduction is retained at `output/playwright/store-original-timings.json`; diagnostic fixture timings are in `output/playwright/store-isolated-fixed-timings.json`. Existing successful assertions were preserved, and only changed or previously failed cases were rerun.

Scoped ESLint and `git diff --check` also pass (`/tmp/community-store-root-cause-spec-lint.log`). These remain deterministic mock-wallet/relay browser checks. They do not establish a real payment, mobile-wallet signature or shipment. No production application source or built assets changed during this test repair.
