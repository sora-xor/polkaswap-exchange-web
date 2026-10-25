# Journal joins to native witnesses

`joinAccumulationJournalNativeWitnesses(snapshot, trustedSchedule, throughAtMs, witnesses, currentBridge = null)` is a pure consistency check over supplied bytes and same-process verifier results. It neither reads files nor runs a reducer, model, transport or wallet. It adds no acquisition or trading authority. Inputs representing the source registration, journal head and schedule still require an independently trusted parent.

Each witness has exactly `{sequence, native, evidence}`. `native` must be an actual frozen result recognized by `isVerifiedAccumulationNativeMark`; cloned JSON, a caller's operation result or a boolean cannot substitute for that object. `evidence` is the exact `{purpose, artifactId, sha256}` reference appearing on that journal record. Its purpose is `native-mark-witness`.

Before appending a record, the parent can retain `accumulationNativeWitnessManifestBytes(native)` through the existing durable evidence store. The returned bytes are a fresh small canonical ASCII JSON manifest plus LF. It binds the owned native result's original raw digest, complete source digest and source registration, complete registered slot/digest, full mark, runtime, denomination, timing mode and separate boundary confirmation. The join recomputes the manifest digest internally and compares the complete evidence reference with the journal reference.

Manifest presence does **not** prove that the original raw receipt files were retained, fetched from the claimed server, or selected according to the registered acquisition rule. Those remain separate owner responsibilities. The manifest preserves source/timing claims without promoting them into independently authenticated history.

## Exact joins

The existing hourly coverage checker first verifies bounded canonical journal lines, record ordering, hash chain/head, schedule identity and chronology. The join then requires one and only one witness for every retained `opening`, `valuation` and `terminal` record. Extra witnesses, witnesses assigned to other event kinds, duplicate sequence numbers, artifact IDs or slot identities fail. Evidence arrays have at most 16 distinct artifact IDs; the witness array has at most 512 entries.

For each mark record, all five mark fields match exactly: block hash, height, native timestamp, original receipt timestamp and exact price ratio. Opening's separate price also matches. Registered role, episode, control time, original opening and original 24-hour deadline must match the journal and schedule. The registered slot identity is retained uniquely with its complete digest; this does not independently authenticate the slot-selection rule. The original receipt and any later boundary confirmation must both be available by `throughAtMs`. A retrospective H-minus proof is never backdated to opening or substituted for the original price receipt.

The check joins rejected mark records too and retains their `claimedResultStatus`. It reports the coverage check's missing/failed controls and decision slots; it does not remove them or declare an incomplete schedule complete. Native consistency cannot authenticate `record.result`, its state digest or any reducer transition.

## Optional bridge comparison

When supplied, `currentBridge` must be an actual same-process result recognized by `isVerifiedAccumulationDecisionPacket`. Its full block hash/height/native timestamp/original context receipt/price tuple and denomination must match the last listed native mark. Its decision time must follow the retained event chronology and be no later than the join cutoff.

This optional comparison is restricted to opening/valuation and observational prefixes. Execution events, terminal records and rejected or otherwise incompatible result claims reject the comparison. This restriction does not turn acceptable caller claims into reducer proof: the output calls it only `bridgeComparison`, not a current-state projection. The parent must separately run the real `session.inspect(bridge)` and retain the authenticated worker/runtime and durable-head evidence before relying on actual current accounting or eligibility.

## Result and limitations

The detached frozen result includes prefix/count/cutoff identity, joined marks and manifests, original slot/source bindings, structural coverage and the optional bridge comparison. `isJoinedAccumulationJournalNativeWitnesses` recognizes only results created by this module; a serialized copy loses that ownership.

The flags `sourceAcquisitionVerified`, `rawArtifactRetentionVerified`, `selectionRuleVerified`, `reducerResultsVerified`, `profitabilityVerified`, `admissionAuthority`, `qualificationAuthority` and `financialActions` remain false. A matching manifest or owned consistency object is not a complete acquisition owner, a live observation, a profitable strategy or permission to trade. Validation errors throw `AccumulationNativeWitnessJoinError`; the caller must preserve the original records and failure evidence.

Run the invented-evidence tests with:

```sh
node .yarn/releases/yarn-4.10.3.cjs exec vitest run --config vitest.config.mjs --project unit-scripts tests/unit/scripts/bots/accumulation-native-witness-join.spec.ts
```

They exercise actual native and bridge verifiers over synthetic SCALE receipts, exact tuple/reference/slot joins, owned versus cloned results, missing/rejected records, retrospective availability, canonical journal tampering and bridge chronology. No market, model or source-artifact data is read. Standalone use requires the research aliases documented in `docs/bots-accumulation-runtime.md`.
