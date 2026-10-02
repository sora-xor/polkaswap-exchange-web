# Opt-in execution evidence sessions

`scripts/bots/collect-execution-session.ts` is a separate read-only development collector. It reuses one healthy public reader between sequential observations and discards that connection after any failure or timeout. Every observation still obtains fresh finalized context and performs the existing metadata, denomination, quote, fee and continuity checks. A failed slot is retained once; the next slot may reconnect, without retrying the failed observation.

Run it directly through the existing Yarn/tsx runtime; no package script or existing collector was changed:

```sh
yarn exec tsx scripts/bots/collect-execution-session.ts \
  --out output/NEW-SESSION-DATASET \
  --start FUTURE-UTC-TIMESTAMP-WITH-MILLISECONDS \
  --slots 5 --cadence-ms 30000

yarn exec tsx scripts/bots/collect-execution-session.ts \
  --out output/NEW-SESSION-DATASET --resume
```

Use a real future UTC timestamp such as the format `2026-09-20T12:34:56.000Z`; the example date is not a recommended schedule. Optional `--lot-from PRIOR-DATASET --lot-slot INDEX` freezes a prior observed acquisition minimum using the existing journal verification. Source denomination and finalized identity are checked inside observation collection before quotes; incompatible context becomes a retained error. The existing store independently validates every completed record's fixed-lot context.

The immutable manifest includes all existing collector, custom-type and dependency hashes plus the new CLI and session sources. It also requires:

- `transportPolicy: exclusive-reuse-reconnect-after-failure-v1`
- `timingPolicy: reader-operation-intervals-v1`
- Existing `quoteTiming: request-intervals`, a 25-second observation deadline and five-second start grace.

Resume requires identical sources, fee assumptions and transport/timing policies. An old per-slot-connection dataset cannot be resumed with this entry point. Existing recorded outcomes, including gaps, are never replaced. Both the session and dataset lock are closed on normal completion or errors.

The CLI validates session-specific operation identity, order, interval bounds and pinned block hashes before append and again on resume. Missing instrumentation is rejected even if the underlying base journal hash is valid. Connection IDs are local to one collector process; a resumed process starts a new connection, not a claim that a previous socket survived.

Successful snapshots add `readerTiming`, containing a connection ID, whether that observation reused it, and `connect`, `context`, `buy`, `sell` and `continuity` operation intervals. Error progress retains the same instrumentation, including unfinished operations and original partial evidence. These intervals measure **reader method boundaries**, which can include multiple wire RPC requests. They do not establish individual wire-request freshness, transaction inclusion, execution latency or a fill. The existing directional quote intervals remain present.

An explicitly detected wall-clock regression is retained as an observation error with `clockRegressed:true`; the log reports `timingTrusted:false`. Earlier recorded operation timestamps can then exceed the corrected recording time and remain untouched diagnostic values. This exception never permits a successful snapshot or ordinary error to bypass interval bounds. The unchanged base store still requires recording time at or after the scheduled slot; a larger correction crossing that boundary cannot be appended under its existing contract and closes this run for investigation.

The collector has no wallet, signing or broadcast interface. Connection reuse is a transport experiment, not strategy qualification or profitability evidence. Create a new manifest-bound dataset before investigating it; never alter sources frozen by an active collection. No live collection is started by installation or tests.

Tests: `tests/unit/scripts/bots/collect-execution-session.spec.ts` and `execution-session.spec.ts`. They use mocked readers, exact synthetic records, temporary directories and fake clocks, without network access.
