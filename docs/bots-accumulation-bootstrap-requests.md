# Original prospective bootstrap

`scripts/bots/accumulation-bootstrap-requests.ts` constructs the missing original RPC bootstrap for the existing accumulation bridge. It performs no network access, storage, model evaluation or financial operation.

For a separately registered discovery slot, `createAccumulationBootstrapDiscoveryRequest({rpcIdStart:1}).next(receipts)` emits exactly `chain_getFinalizedHead []`, then `chain_getHeader [originalHead]`. Each successful original receipt advances the pure planner. Completion yields `target:{hash,height}` and the separate `discoveryRpc` receipts. This does not prove that the attempt was the first eligible observation; the durable acquisition owner must enforce the registered slot and attempt rule. Null, failed or malformed replies stop advancement rather than select a replacement.

Pass the target and externally selected finality anchor to `createAccumulationBootstrapRequests({target,finalizedSource,rpcIdStart:3})`. Repeatedly call `next(originalReceipts)`, record its `nextRequest` through the explicit bootstrap recorder profile, and append the unchanged successful receipt. The sequence is exactly:

1. Genesis hash, anchor-height hash, current finalized head, its header, anchor header.
2. Target-height hash and target header, parent-height hash and original parent header.
3. Target and parent runtime versions, target and parent original metadata, target `:code` hash.

These are fourteen distinct original calls. Parent and observed-head hashes are learned only from the original successful replies. The planner rejects changed target/anchor identities, reordered or omitted receipts, failed transport, digest/ID/request mismatches, ambiguous JSON, inconsistent runtime/metadata and unsupported receipt clocks. Complete output contains `identity`, `target`, `parent`, `finalizedSource`, `codeHash`, `metadataSha256`, and the fourteen `contextRpc` receipts. Metadata/profile compatibility is then checked by the quote producer's actual codecs. Root source/code/metadata pins must still be checked independently against registration; receipt consistency is not source authentication or independent consensus.

The recorder requires `profile:'bootstrap'`. This permits at most sixteen requests for the two discovery calls plus fourteen bootstrap calls, with at most 6 MiB total observed response bytes. Original `state_getMetadata` replies have a 2 MiB cap; every other reply retains the existing 64 KiB cap. Only same-process bootstrap-owned descriptors are accepted. IDs must be unique across the recorder; discovery IDs 1–2, bootstrap 3–16 and a separate quote recorder beginning at 1000 avoid overlap. Default quote-profile limits remain 28 requests and 64 KiB per response.

Retain discovery outside the bridge's `contextRpc`. Append the original seven-key query produced by `createAccumulationQuoteRequests` after the fourteen bootstrap receipts. Do not manufacture any of these receipts by trimming, relabeling or changing an existing 22-key capture. Acquisition/retention clocks stay original; later decoding does not renew freshness. Source registration, runtime pins, native storage validation, completed-hour data, deadline/freshness, durable scheduling and eventual user approval remain necessary outside this planner.

All inputs and completed outputs are detached and frozen. An unsafe object or invalid prefix throws; the external recorder already retains failed receipts and the caller must preserve the failed attempt. Descriptor ownership is only construction provenance. No returned value claims a paid fee, fill, strategy qualification or profit.

Synthetic verification:

```sh
node .yarn/releases/yarn-4.10.3.cjs exec vitest run --config vitest.config.mjs --project unit-scripts tests/unit/scripts/bots/accumulation-bootstrap-requests.spec.ts tests/unit/scripts/bots/accumulation-quote-transport.spec.ts
```
