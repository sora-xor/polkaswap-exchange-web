# Public execution evidence

`yarn bots:collect:quotes` records prospective **development data** for the exact KUSD/XOR pool. It uses public RPC calls at `wss://ws.mof.sora.org`; it does not discover accounts, connect a wallet, create an executable trading intent, use a private key, or broadcast a transaction.

The collector fixes the input at **5 KUSD**, representing a partial allocation within the 10 KUSD research budget. It records both directions at one finalized block on DEX 0 using only the direct XYK pool. By default the reverse quote uses the forward quote's **rounded-down 0.5% slippage minimum**. This is a same-snapshot round-trip screen, not a retained position or proof of an executable arbitrage. The reverse quote does not apply a hypothetical forward trade to the pool first, so it cannot by itself price an executed sequential round trip.

## Run a bounded collection

Choose a new output directory and an explicit future UTC start time. For example, replace the start below with a future timestamp before running:

```sh
yarn bots:collect:quotes --out output/execution-quotes/development-001 \
  --start 2026-09-20T00:00:00.000Z --slots 5 --cadence-ms 60000
```

The manifest is written and synced before the first market connection. It freezes the schedule, exact assets, amount, source policy, reverse-lot rule, slippage, public fee-envelope assumptions and SHA-256 hashes of the collector, schema, custom chain types, package file and dependency lock. All datasets are labeled `development`; this command cannot declare an acceptance or validation dataset.

Each scheduled observation has a 25-second deadline, including connection setup. Starting more than five seconds late produces an explicit `missed` record. Failed attempts produce `error` records retaining the stage and available public quote/fee responses. Successful records preserve:

- Finalized hash, height, timestamp, genesis, denominator, pool identity, metadata hash and pinned runtime versions.
- Exact input, output, impact-free output, route fees, route, raw RPC JSON, rounded-down minimum and price impact as an integer fraction.
- Pinned `queryInfo` and `queryFeeDetails`, exact encoded call, envelope byte length and hash, and normalized fee components.
- Separate start/finish times for each buy and sell request, including its fee queries. These intervals are ordered within the whole snapshot and required by new manifests. Older snapshots without intervals remain readable. They do not measure transaction inclusion, or establish that a live quote is less than five seconds old.

Fee queries use the existing SDK `signFake` mechanism with a public dummy address, nonce zero, zero tip and an immortal era. It produces an estimation envelope, not a real signature. **Fees are estimates**, not charges from finalized trades. A real account, nonce, era, runtime, or call can change the fee. Network fees debit the separate XOR reserve; route fees are already reflected in the quote output and must not be charged twice.

Both asset precisions and the direct pool are checked at the pinned state. Encoding metadata and runtime must agree with that state and remain unchanged through collection. Runtime upgrade boundaries, stale finalized timestamps, unexpected routes, changed raw amounts and missing fee details fail the sample. Exact token arithmetic uses integer codecs.

## Observe a fixed retained lot

Choose an explicit zero-based slot from a prior complete observation and a new output directory. For example, replace the schedule with a future timestamp:

```sh
yarn bots:collect:quotes --out output/execution-quotes/retained-001 \
  --start 2026-09-21T00:00:00.000Z --slots 5 --cadence-ms 30000 \
  --lot-from output/execution-quotes/development-001 --lot-slot 1
```

Before connecting to the market, the command validates the source dataset's entire existing journal, selects only that slot, and freezes its exact forward minimum. A missing, failed, corrupted or future-dated source is rejected; no later slot is substituted. The new manifest includes the source manifest/record hashes, source slot/receipt times, denomination, finalized block identity/time and fixed lot identity. Every subsequent reverse quote must use that original amount even if a new forward quote changes. The new forward notional remains 5 KUSD.

A changed denomination, older finalized state, or conflicting hash at the source height produces a retained error observation. The collector never silently rescales the lot. Equal source height/hash is only a repeated same-state observation; a later execution experiment must independently require an advancing block. Saving and reopening also reject complete records that violate the frozen source context.

This is an observed hypothetical acquisition, not evidence of wallet ownership or an executed entry. The source selection is development information. The mode supplies the correct retained amount for later exit research but does not simulate the original buy's pool impact or a transaction's inclusion. Do not infer a profitable executed round trip from it. Resume uses only the frozen new manifest and does not reselect a source lot.

Metadata is read with `Metadata_metadata_at_version` using the SDK's loaded encoding format. The format, method and hash are retained. The older `state_getMetadata` method can return version 14 while this SDK loads version 16 for the same runtime; comparing those different representations would incorrectly reject a valid observation. The collector compares the same format at pinned and current states and still rejects actual metadata changes.

## Resume and inspect

```sh
yarn bots:collect:quotes --out output/execution-quotes/development-001 --resume
```

Resume requires exactly the same source hashes and fee assumptions. It validates the entire record chain, skips retained slots and records already-passed slots as missed. It never re-queries or replaces an outcome. `manifest.json` is immutable; `observations.jsonl` is append-only, synced after each record, with each SHA-256 bound to the previous record and the first record bound to the manifest. These hashes provide consistency checks, not a third-party attestation of the endpoint or process.

An exclusive `.collector.lock` prevents cooperating writers from using the same dataset. If a process crashes, preserve the dataset, verify the recorded process has stopped and remove only that dataset's stale lock before resuming. An incomplete journal tail is rejected rather than truncated or repaired. Preserve it for diagnosis and start a new dataset. Changed code also requires a new dataset; never rewrite an old manifest to make a resume pass.

Missing or failed samples remain part of completeness calculations. Samples inspected while designing a strategy are development data. Acceptance requires a separately frozen strategy, cost model and future observation window. This collector does not rescue a previously rejected strategy, establish profitability, or authorize trading.

Tests live in `tests/unit/scripts/bots/{execution-evidence,execution-reader,execution-rpc,execution-store,collect-execution-quotes}.spec.ts`. They use mock public transports and temporary files, with no network or wallet access.

Use [offline execution episodes](bots-execution-episodes.md) to compare fixed partial-entry controls against idle holdings across a retained journal. That evaluator separates decision and execution observations and distinguishes prefixes, incomplete episodes and complete sampled days. It does not qualify a strategy or submit trades.
