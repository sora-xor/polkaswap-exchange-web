# Polkaswap worldwide shipping launch — 27 September 2026

This report records the Store deployment on the stated date. Merchant policy and deployment evidence are maintained in the Polkaswap application repository, separately from the reusable Sora Pay toolkit. See the [Store overview](../community-store.md).

The public Store now offers **203 destinations and 664 frozen shipping bands** through Sora Pay relay **0.2.4**. Each 100 g bag of Shizuoka sencha remains **1.759225 XOR**. Tea is purchased on demand with no stock cap; destination and carrier parcel limits still apply. Shipping prices are fixed XOR amounts, with daily carrier-availability checks that do not reprice orders.

The frontend remains bundled with **Sora Pay 0.2.2**. Its existing catalog/order interface is compatible with the new relay. This update changed neither the frontend assets nor the production IPFS root:

`bafybeibfifc6u7rt6iuzhnxiuyidm4ly3fobkhcb45xl7faz537yn532ve`

## Release and preservation evidence

| Item | Verified result |
| --- | --- |
| Toolkit validation | 237 tests passed |
| Operational validation | 42 checks passed |
| Package contents | 151 public files; private/output artifacts excluded |
| Package SHA-256 | `f50dd811a9450354079648ff8e62b4f71c5742cd52e189fe583faf9a122ed318` |
| Deployed manifest SHA-256 | `72c4789b5df883c1b875718565a020560945119ac5253ef238cbd8d2fdfa83c9` |
| Merchant SHA-256 | `367265f06db9ba886ab514a8613eea1ac524b428b8cc18ac11e5ea61b6d44503` |
| Preserved records | 2 orders, 2 payment records, 4 outbox records; completed refund intact |
| Reconciliation cursor | 27,802,221 → 27,802,223 |
| Runtime boundaries | Existing private runtime and public routing preserved; live database never restored |

The manual backup/restore run `20260927T144224Z-c93fd0b442f6437dae90f1a55b86a4a1` and independent scheduled run `20260927T144230Z-814b5089faf94558b9371dd3d6e39199` both verified the exact new revision. Customer identifiers, recovery capabilities, credentials and private record digests are intentionally omitted from this report.

## Live verification

At **14:44:05 UTC**, all **nine public API checks** passed: catalog and allowed-origin preflight, rejection of an unapproved origin, public operator denial, private health isolation, invalid-query rejection and authenticated recovery of the existing completed receipt. Responses retained the expected CORS and no-store behavior.

Live WebKit reached **Store - Polkaswap**, with **zero console errors and zero failed requests**, on the unchanged production CID. Chrome showed **203 destination options**, one ordinary terms checkbox and no additional personal-use confirmation. The following one-bag quotes were observed; the wallet's network fee is separate.

| Destination/service | Shipping (XOR) | Tea + shipping (XOR) |
| --- | ---: | ---: |
| France — Air Parcel | 4.515342 | 6.274567 |
| Fiji — Surface Parcel | 2.932041 | 4.691266 |
| Japan — Letter Pack Plus | 0.703690 | 2.462915 |
| United States — EMS | 4.573983 | 6.333208 |

These release checks created no order or payment. The earlier real purchase, notification, shipment confirmation and completed refund remain separate historical evidence; this update preserved them.

## Destination and fulfillment limits

The catalog uses reviewed EMS, parcel, small-packet and domestic Letter Pack routes. Five destinations with carrier service remain excluded for product/route reasons: **China** has an unresolved radiation-certificate requirement that cannot currently be satisfied; **Algeria** has unresolved tea classification/permission handling; **Colombia** prohibits tea on the reviewed postal routes; **Morocco** and **Turkey** restrict the recipient to designated authorities rather than the proposed individual customer. These are distinct from destinations whose carrier service is unavailable. See the [destination runbook](../community-store/shipping-destinations.md) for the classifications and sources.

Volunteers still complete destination paperwork, confirm actual packing and carrier coverage, and dispatch sealed tea. New orders retain the existing version 2 refund policy: refund the received tea/shipping XOR less the outgoing SORA network fee, without deducting the original payment fee again. Existing orders retain their saved terms and any separately recorded agreement. This release does not claim every destination has been physically trial-shipped or that mobile-wallet signing has been validated; desktop-wallet support remains the published scope.

Detailed deployment results and restore evidence remain in protected operator storage. Local public-check evidence is retained as `output/worldwide-update/public-verification.json`, `store-live-webkit.log` and `store-live-webkit.png`; these are not packaged with the public library.
