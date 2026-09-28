# Polkaswap Community Store operator tools

This standalone Node 26 package owns Polkaswap's tea product, merchant configuration, destination decisions and frozen shipping prices. The reusable Sora Pay package supplies payment, relay, exact-pricing and carrier-provider APIs; it contains no tea catalog.

These are operator tools, separate from the static website build. They do not deploy anything, contact a carrier, send notifications or sign payments. All example configurations remain disabled. Local operational secrets and customer records do not belong here.

From this directory, install the versioned archive committed under `vendor/sora-pay/` and run the offline tests:

```sh
node ../../.yarn/releases/yarn-4.10.3.cjs install --immutable
node ../../.yarn/releases/yarn-4.10.3.cjs test
```

The dependency is `file:../../vendor/sora-pay/sora-pay-0.2.5.tgz`; no sibling Sora Pay checkout or unpublished build is used. Tests exercise synthetic orders in memory, including quotes for all 203 published destinations and the historical Taiwan limits. They verify that the three tariff/eligibility input files remain byte-identical. Each merchant JSON differs from its original only by the explicit `storageResumeFreeBytes: "10737418240"` setting; removing that field in the original formatting reproduces its recorded hash.

Rebuild the reviewed worldwide configuration into a new file:

```sh
node build-catalog.mjs \
  --base config/merchant.polkaswap-worldwide.json.example \
  --output /absolute/path/to/new-merchant.json
```

The output must not already exist. The builder preserves merchant/payment/FX/refund settings and reconstructs shipping from `shipping/tea-destinations.json`, `shipping/japan-post-rates.json` and `shipping/japan-post-availability.json`. Rebuilding the current worldwide example produces the same configuration. The historical `merchant.polkaswap.json.example` and `merchant.disabled.json.example` remain available as historical inputs; they are not the current worldwide destination decision list.

`shipping-rates.ts` contains this merchant's tariff grouping and two-tea-bags-per-Letter-Pack packing policy. Product-specific legal limits and carrier service exclusions belong in this package. Changes to these frozen inputs require their evidence and expected artifact digests to be updated intentionally. Current carrier acceptance and shipment paperwork must still be checked before dispatch; a published quote is not evidence that a permit or shipment has been completed.
