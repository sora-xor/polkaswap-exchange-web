# Store refunds after SORA network fees

The store's current refund policy returns the XOR received for an unfulfillable order, including shipping, minus the outgoing SORA network fee. The original payment's network fee was never received by the store and is not refunded or subtracted again. Product and shipping prices remain fixed in XOR.

Sora Pay 0.2.0 snapshots the policy on each new order. Existing orders retain their original full-refund terms. A draft refund has a gross obligation but no signable net amount until the relay obtains a trusted fee quote. Finalized chain evidence establishes the actual fee; corroborating fee events are counted once. A larger actual fee is absorbed by the store, and a smaller or unproven fee leaves a separate correction owed to the customer without another deduction. An unresolved signing attempt stays locked.

Receipts show the amount before fees, estimated or deducted fee, amount returned after finalization, and any correction still owed. Pending transfers do not claim that XOR has already been returned. All 31 locale catalogs retain the old wording for historical receipts and include the new policy and amount labels.

## Verified release

- Toolkit source: `6ed1bf0`, strict TypeScript build and **140 offline tests passed**.
- Archive: `vendor/sora-pay/sora-pay-0.2.0.tgz`, **124 allowlisted files**, SHA-256 `af4a287bb4b3cca73645c1a1af18ee48f2c8e51f675247d683fb197dda55e9a2`; Yarn locator `aedf29`.
- Frontend: **54 Store unit tests**, **13 translation checks**, scoped lint and production build passed. The build took **29.42 seconds**.
- Browser checks: all **12 distinct scenarios** passed: six in WebKit and six in installed Chrome. These cover desktop/mobile browsing, checkout ordering, private receipt recovery, net refunds and historical full refunds. The initial Chromium launch failed because the bundled headless executable was absent; rerunning those six cases with `PS_STORE_CHROMIUM_CHANNEL=chrome` passed. No live order or transfer is used by these tests.
- Production scan: **832 text assets**, no private refund-rehearsal markers, `relayUrl:null`. Built index SHA-256: `653b4caca153d173afbd7014e31a685d5f40be06e67d41059c770ec4a37a829a`.

Logs are `/tmp/sora-pay-net-refund-full-tests.log`, `/tmp/community-store-net-refund-final-unit.log`, `/tmp/community-store-net-refund-final-translations.log`, `/tmp/community-store-net-refund-build.log`, `/tmp/community-store-net-refund-browser.log`, and `/tmp/community-store-net-refund-chrome.log`. The production scan is in `output/community-store-net-refund-production-scan.json`; screenshots are under `output/playwright/community-store/`.

## Deployment and rehearsal state

The private MOF relay now runs **Sora Pay 0.2.0**, and the merchant configuration selects **version 2 / `net-network-fee`** for subsequently admitted orders. Both the code and policy transitions completed successfully. The two saved orders remain unchanged under version 1 / full-refund terms. Private runtime data and the public gate were preserved; this maintenance did not authorize new admissions or public launch.

The installed manifest is `05bb4a14af771cd77877e1e42cf7cc966f7ff3fc42b77e4d679c346f79bcea55`; the merchant configuration hash is `4913184480094186ad1eac016518dc8a80c318754681489eaccd10ed79b07e0a`. The saved cursor advanced from **27,788,909** to **27,788,911**, preserving two orders, one payment and one outbox record. Post-update manual backup `20260926T141141Z-0cb290fcdf45406aabf7d57a01471211` and independent scheduled backup `20260926T141146Z-0c31c6ed3e4a44dd99c335821a0ad38d` both passed restore verification against the current revision. The hourly job is resumed and still depends on the operator Mac being awake and logged in. Safe aggregate evidence: `/Users/takemiyamakoto/dev/sora-pay/output/refund-fee-update/activation-summary.json`.

The real purchase finalized at **13:19:48 UTC** for **5.453596 XOR**, and its volunteer notification was delivered. A paid-state encrypted backup restored successfully at **13:30 UTC**. The order remains in shipping review, assigned to `community-volunteers`; no shipment or refund has been recorded. It retains its original full-refund terms. The receiving wallet is not among the connected Polkadot.js accounts, and its controlling wallet/app has been requested without requesting secrets.

The earlier **13:51:19 UTC** check found 7.65 GiB free before backup/release allowances. The completed maintenance check recorded **8,118,607,872 bytes free**, leaving **7,547,973,392 bytes (about 7.03 GiB)** after the backup allowance and full 32 MiB maintenance-artifact reserve; no production or testnet CAR was imported. This met the explicitly bounded **5 GiB private-maintenance reserve** under policy commit `b6da252`. It remains below the **10 GiB public-admission reserve**. The exception permits this closed maintenance only, not new orders or public opening. Do not remove unrelated node data, IPFS pins, or logs to make room.

A live Chrome check of the restarted private preview confirmed that general terms deduct the outgoing SORA fee, while the paid order’s receipt retains its original full-refund terms and shows the delivered volunteer notification. This did not send a refund or ship the order.

Public checkout remains closed. Lawful destination/carrier confirmation, shipment and group-wallet refund rehearsals, supported mobile-wallet signing, capacity and the production IPFS/MOF/Bunny checks remain launch work. Quotes use calculated parcel weights; volunteers confirm weight at dispatch, without an additional physical-weighing launch approval gate.
