# Offline exposed-engineering verification

`output/go-history/goal-archive-engineering-20260920/verify-engineering-v2.mts`
verifies only a **completed** `episode-v2` engineering run. It does not fetch
market data, run another candidate, issue a qualification, or authorize trading.
Do not run it while the episode is incomplete. From the repository root, after
the run has written `complete.json`:

```sh
TSX_TSCONFIG_PATH=output/go-history/goal-archive-engineering-20260920/runtime-tsconfig.json \
node --import tsx \
  output/go-history/goal-archive-engineering-20260920/verify-engineering-v2.mts --verify
```

Use the same `TSX_TSCONFIG_PATH` pointing at the existing
`output/go-history/goal-archive-engineering-20260920/runtime-tsconfig.json` as the
engineering runner. The verifier needs no credentials or environment file.
An existing `verification.json` is never overwritten.

The first file required is the successful engineering completion receipt.
The verifier then checks the frozen protocol, preparation and access bindings,
current executed-source hashes, the four fixed metadata input hashes, and the
retained v1 failure/opening-preflight exposure hashes. Every listed raw file must
exist exactly once with its original byte count and SHA-256, within the original
file/count/total budgets. The clock is rebuilt from the fixed metadata and model;
its prepared digest is checked before matching the persisted trace. This avoids
confusing the clock builder's ordered-JSON hash with the sorted-JSON artifact
encoding. Trace and wrapper hashes and referenced raw receipt hashes are checked.
The engineering wrapper and source must remain explicitly ineligible.

`replayEngineeringTrace` uses the actual exact-ledger initialization, observation,
admission and settlement functions. It preserves every completed valuation,
checks exact fixed lots, quote minimums, impact, fee agreement, runtime profile,
24 consumed hours and terminal successor, and accounts at the original deadline.
Explicit cancelled final prefixes remain incomplete where documented. Fills are
**minimum-output hypothetical fills**, not observed transactions. The untouched
benchmark retains the same opening KUSD and separate XOR reserve and is marked
on the same states without charging it simulated trading fees.

The no-clobber result reports codec holdings/deficits, native fees, opening and
ending XOR codec values, benchmark codec value, net/excess changes and returns, observed
maximum drawdown, fill count and outcome. Ratios are reduced signed integer
fractions; value/change ratios use XOR codec units (divide by 10^18 for XOR),
and returns are fractions (multiply by 100 for percent), not rounded
floating-point values. Zero fills or negative excess returns remain visible.
The result always states `qualificationEligible: false`, `actualTransactions: 0`
and `networkRequests: 0`.

This is immutable-file integrity plus exact-ledger replay. It does **not** rerun
all raw RPC/indexer decoders or prove independent cryptographic chain finality,
and cannot convert an exposed engineering episode into a qualification study.
The frozen runner/source and retained raw evidence remain the provenance basis.

`goal-archive-engineering-v2-verifier.spec.ts` uses invented blocks, pools, receipts
and temporary directories to cover exact costs/benchmark accounting, zero fills,
cancelled prefixes, malformed traces, changed files, absent completion, explicit
ineligibility, zero network calls and no-clobber publication.
