# Agreed refund validation — 27 September 2026

Frontend source `d88fa333e2cf32ba8f9cecdd3598b95e2c9e6169` supports a separately recorded agreement for one unsigned legacy refund while preserving its original policy. The tested example is **5.453596 XOR received − 0.11 XOR agreed deduction = 5.343596 XOR returned**. The actual SORA network fee is separate evidence and is never deducted again. Pending receipts show a transfer amount; returned/completed wording requires finalized evidence. Standard refunds remain unchanged.

This report records local validation with synthetic orders. It does not establish that consent was applied to a live order or that a real refund was signed, sent or finalized. Public checkout remains closed: the source and built `community-store.json` both have `relayUrl: null`.

## Package and build

- Vendored Sora Pay: `vendor/sora-pay/sora-pay-0.2.1.tgz`, SHA-256 `5560ab44b4047fd722a89cef8d28323e84dcb5cafc0185f43e3258cb55942bb5`, Yarn locator `91914e`. Package validation records strict compilation, **196 toolkit tests** and the 135-file public allowlist.
- `node .yarn/releases/yarn-4.10.3.cjs install --immutable` passed in 1.526 seconds. Dependency review found only the expected Sora Pay 0.2.0 → 0.2.1 archive, locator and checksum changes. Log: `/tmp/community-store-agreed-deduction-install.log`.
- Playwright's isolated web server ran `yarn build --logLevel error` successfully once, then copied the resulting assets to a fresh snapshot on `127.0.0.1:41733`. Entry: `assets/index-WvHAsdv3.js`; CSS: `assets/style-DTy58wIg.css`.
- Served snapshot and `dist/index.html` matched byte for byte: SHA-256 `0872ab83495ccd3f3c72f283e3f27344c32b169d415b19601a965bab7f8d2cbf`. Local evidence: `/tmp/community-store-agreed-deduction-build-evidence.json`.

## Checks

The focused source checks before the 0.2.1 package integration passed **56 Store tests** across seven suites and **13 translation checks** across four suites. Scoped source/unit/browser ESLint and `git diff --check` passed. All 31 locale catalogs add only the three amendment messages; existing public, pending and historical refund wording remains unchanged. Logs: `/tmp/community-store-agreed-deduction-store-tests.log`, `/tmp/community-store-agreed-deduction-translations.log`, `/tmp/community-store-agreed-deduction-lint.log` and `/tmp/community-store-agreed-deduction-browser-lint.log`.

The final production bundle with installed 0.2.1 passed **8/8 browser cases in 10.6 seconds**: net-fee, legacy, fee-exempt correction and agreed-deduction recovery in both Chromium and WebKit. Every case uses mocked private recovery, verifies finalized evidence and exact displayed amounts, forbids order mutations, checks overflow and checks console errors. The agreed case shows 0.11 XOR separately from its synthetic actual fee of 0.100026012589707326 XOR, and returns 5.343596 XOR. Both agreed-refund screenshots were visually reviewed.

The final invocation reused only the fresh, owned static snapshot:

```sh
PS_PLAYWRIGHT_REUSE_SERVER=1 PS_IPFS_TEST_PORT=41733 \
  /opt/homebrew/bin/node .yarn/releases/yarn-4.10.3.cjs test:e2e \
  tests/e2e/ui/community-store.spec.ts \
  --grep 'refund recovery|completed v2 correction recovery' --workers=1
```

Final log: `/tmp/community-store-agreed-deduction-production-browser-current.log`. Screenshots: `output/playwright/community-store/{chromium,webkit}-{net,legacy,fee-exempt,agreed}-refund-recovery.png`. The test server was stopped afterward; the private rehearsal server on port 41829 was left untouched.

## Environment repair: pinned Chromium extraction

The initial run built successfully and passed all four WebKit cases; Chromium could not launch because headless shell revision 1208 was absent. Its official Playwright download completed, but Node-based extraction stalled. An early retry encountered the same missing executable. Only the verified installer processes belonging to this run were stopped. The downloaded ZIP passed its CRC check and was extracted with native `ditto`; the binary reported Chrome for Testing 145.0.7632.6. The final eight-case run above passed without another build or source change. Earlier setup failures remain in `/tmp/community-store-agreed-deduction-production-browser.log` and `/tmp/community-store-agreed-deduction-production-browser-final.log`; the download log is `/tmp/community-store-agreed-deduction-browser-install.log`.
