# Community Store isolated validation — 2026-09-26

The isolated frontend passes its automated validation. The original baseline is recorded below, followed by the Sora Pay 0.1.1 update. This does not establish a live purchase or public launch.

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

Remaining launch evidence: real purchase and finalized payment, private delivery of that real order, procurement/packed-weight and destination checks, physical shipment/tracking, finalized full-XOR refund with a funded fee reserve, supported mobile-wallet signing, and public pilot/production rollout. The isolated base also retains older deployment tooling; use the approved MOF/Bunny runbook rather than its legacy default publisher.

## Sora Pay 0.1.1 follow-up

A real private order exposed an unclear insufficient-balance error. Version 0.1.1 now shows a bounded, translatable explanation when native XOR cannot cover payment and fees. Unknown wallet errors remain generic; uncertain submission outcomes retain their reconciliation instructions. The frontend supplies the new key in all 31 catalogs, reusing established short balance wording for special-script locales. A regression test compares all catalogs with the installed package's actual message keys.

The vendored archive has SHA-256 `4aecd9659548aa14518872c04dc9e2caf0b77a0acb01ba2737f9c6848ab3f7dc`, Yarn locator `5c8e05`, and 123 allowlisted public files. Toolkit source commit `2b89b11` passed strict compilation and 118 tests. Production remains independent of the sibling checkout.

- Store unit suites: **50 tests in seven files passed**; the two new catalog tests also passed after the final import-style adjustment. Logs: `/tmp/community-store-011-unit.log` and `/tmp/community-store-011-widget-locales.log`.
- Translation checks: **13 tests in four files passed**. `lang:fix` produced no semantic changes; existing formatting was retained. Log: `/tmp/community-store-011-translations.log`.
- Production build and targeted test-file lint: passed. Logs: `/tmp/community-store-011-build.log` and `/tmp/community-store-011-lint.log`.
- Packaged checkout flows: WebKit passed on the first run. Chromium exceeded the unchanged 60-second whole-test timeout, then passed unchanged in 39 seconds on a focused rerun. Logs: `/tmp/community-store-011-browser.log` and `/tmp/community-store-011-chromium-rerun.log`. These remain mock wallet/relay flows.
- Production scan: 832 text assets, no private refund-rehearsal markers, new balance message present, and `relayUrl:null`. Built index SHA-256: `f0cc8e8bec61e473ed08f153ba9aee97ae61569b7808be844f629a3c0d3d419c`. Evidence: `output/community-store-011-production-scan.json`.

The earlier full 3,698-test application run applies to the baseline; this follow-up ran the affected suites. The real order was saved with accepted terms, its private receipt downloaded, and its exact record verified in an encrypted off-host backup. Its payment window expired while the payer lacked sufficient XOR; no payment or signing attempt occurred. The backup's manual restore passed, but two scheduled attempts timed out during local restore or verification after successful export. Scheduled-backup reliability and the remaining launch evidence above are still open.
