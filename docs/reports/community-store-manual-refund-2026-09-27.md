# Community Store manual refund — 27 September 2026

The internal rehearsal refund is complete. The user sent **5.343596 XOR** from the store wallet to the original payer, after an explicitly agreed **0.11 XOR** deduction from **5.453596 XOR** received. The finalized transaction is `0xc1af40ceabafbc33b059c3e1dd2b3cd06e02c09d2962c7256340298f55970e57`, block **27,800,809**, canonical assets event **3**, finalized at **12:01:54.001 UTC**. Its actual outgoing network fee was **0.100018412589707326 XOR**; this is separate from the agreed deduction and is not charged again.

The regular wallet produced `assets.transfer` with no comment. Sora Pay 0.2.2 adds a protected operator reconciliation endpoint that independently reads canonical finalized evidence and matches the existing owner, signing lease, refund reference, gross amount and exact return amount. It records the actual `reference:null` and a separate operator binding. Ordinary checkout payment verification still requires the exact public reference. Physical event consumption, accounting and notification work commit atomically; a replay cannot produce another refund or notification.

At **12:21:37 UTC**, the private relay recorded this refund as finalized. The original incoming payment, saved v1/full policy, and explicit deduction agreement remain unchanged and auditable. The refund notification was delivered to the configured private Telegram destination. Chrome recovered the completed receipt, showing the gross amount, agreed deduction, actual network fee, returned XOR and refund transaction. The actual downloaded receipt retains the null reference and explicit reconciliation metadata. A private copy is preserved outside the repository and public assets.

At **12:33 UTC on September 27**, the user replied “sure, it is done” to the test-shipment question. The shipment rehearsal is accepted as **operator-confirmed complete**. No destination country, carrier or tracking was supplied or independently verified; no destination approval or refunded-order state changed. Private evidence: `/Users/takemiyamakoto/dev/sora-pay/output/private-rehearsal/shipment-rehearsal-user-confirmation-2026-09-27.json`.

## Release and validation

Sora Pay source commit: `160d91551389d55d0cb8ae8984925fee2b77b6e3`.

- Strict TypeScript compilation and **222 toolkit tests** passed. Cases include wrong amounts, later payments, changed owner/lease/amount, canonical and archive evidence, mirror-event rejection, duplicate event consumption, restart/replay, atomic rollback, and saved policy/fee accounting.
- Versioned archive `vendor/sora-pay/sora-pay-0.2.2.tgz` passed its **135-file public allowlist**. SHA-256: `096edc1cddd706902bde50ed83feb6b80c374caf9b692ead30899665d7842a4a`. Yarn locator: `2c9841`; immutable installation passed.
- **57 Store tests** and **13 translation checks** passed. No user-visible copy or locale keys changed in this release.
- The full repository suite passed at frontend source `fbc5e3775e673444aae87c6bf5bc64cc85e8ba2d`: **777 files / 3,707 tests**, exit `0`, in **340.64 seconds** using Node **26.10.0**, pinned Yarn **4.10.3** and normal repository settings, with no retries. This checkpoint precedes the documentation-only shipment-confirmation update.
- A fresh production build and **10 Chromium/WebKit refund recovery cases** passed. Synthetic downloaded receipts preserve the real reference and binding fields. Build index SHA-256: `0db8ea6d887aed0233d811883e10790899ca0aa53db09c031a4d23feaf57b903`; entry `index-TqpPMno6.js`.
- Independent review and **16 Python + 10 Node** maintenance checks passed before deployment.

Validation logs: `/tmp/sora-pay-manual-refund-full.log`, `/tmp/community-store-manual-refund-store-tests.log`, `/tmp/community-store-manual-refund-translations.log`, `/tmp/community-store-manual-refund-production-browser.log`, and `/tmp/community-store-0.2.2-full-unit.log`.

## Private deployment and recovery

Attempt `519986d372a54473909b12c4db9d534c` replaced 19 existing artifacts across the payment core and relay. Merchant bytes, credentials, schema and original rows were preserved during the code update. The scan cursor advanced **27,800,973 → 27,800,975**; it was never reset. Relay PID **744** passed readiness under manifest `3a598d541c6ce4391681bbbb3b72586aac12c941c12f3828979e4b60b3a5c352` and unchanged merchant `5ff934a17398084964036796f3e84a066ade7c43c2bbab0675f4de360680f819`.

Manual restore `20260927T122050Z-221e8a9b6f264e0b959d8d649072cacc` and distinct scheduled restore `20260927T122057Z-14f079cbfb224ace92116cf4a5b6cdca` passed for the updated code revision. After reconciliation and notification delivery, encrypted backup `20260927T122211Z-4beed8076595412885d21bb139381cfb` restored **2 orders, 2 payment events and 4 outbox records**, verifying the original key, database integrity and encrypted records. Hourly off-host backups remain dependent on the operator Mac being awake and logged in.

The code update measured **64,430,563,088 bytes** remaining after its recorded storage allowances. Public checkout remains closed: `relayUrl:null`, catalog-only ingress, and `approvedShippingCountries: []`. This work did not publish IPFS assets or change Bunny. A selected lawful destination route, actual mobile-wallet signing or an explicit desktop-only pilot scope, and public pilot rollout remain. Capacity/private storage have bounded checks and a deployed guard; recheck the 10 GiB reserve against actual production/testnet CAR sizes before import. No additional refund transfer or top-up is needed for this completed order.
