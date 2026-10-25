# Report retained causal calibration artifacts

The [reporter](../scripts/bots/report-causal-goal-calibration.ts) reads local JSON
only. It neither acquires data nor changes the frozen experiment. See the
[acquisition guide](causal-goal-calibration.md) for scope and receipt meanings.

From the repository root:

```sh
node .yarn/releases/yarn-4.10.3.cjs tsx scripts/bots/report-causal-goal-calibration.ts RUN_DIRECTORY > REPORT.json
node .yarn/releases/yarn-4.10.3.cjs tsx scripts/bots/report-causal-goal-calibration.ts RUN_DIRECTORY --markdown > REPORT.md
```

Replace paths with the retained run directory and new output files. Exit 0 means
complete artifact coverage, not a strategy pass; exit 2 means incomplete or
inconsistent evidence. An incomplete report retains available failure details and
coverage counts but omits all candidate aggregates. It never replaces missing
episodes with a completed prefix.

A full report requires the registration, start marker, first-episode marker,
completion marker, and all 84 complete results. It checks their canonical digests,
fixed dates and candidate coverage, endpoint values, fill counts, and derived
statistics. Ordered control equity and prior fills must support the exact target
or loss crossing and stop time; fills at opening or after a stop are rejected.
These unkeyed hashes establish internal consistency only; the tool
does not reauthenticate raw chain evidence or prove artifact authorship.

The reporter recognizes the original strict registration and the separate
[gap-aware registration](causal-gap-calibration.md) explicitly; result protocols
must match. A gap report checks native closing ages, actual control times, all
24 signal records, stale versus stopped signals, and the unchanged 12-second
execution expiry. It rejects late fills, orders from skipped signals, incorrect
expiry timestamps, and inconsistent timing counters. Accounting completion does
not imply that each hour was tradable. Each candidate has 700 closing snapshots
across the 28 episodes (shared endpoints are counted per independent episode),
644 potential pre-deadline execution windows, and 672 funded signal hours.
Reports retain timely-window counts, stale hours, actual active stale skips and
actual pending-order expiries separately from performance statistics.

All three candidates receive arithmetic mean/median net returns and excess versus
unchanged holdings, exact rational values, positive-excess and traded-episode
counts, exact XOR fee totals, fills, separate control/hourly drawdowns, rejection
reasons, and outcomes. Decimal displays truncate at 36 places; comparisons and
aggregates use reduced BigInt fractions, and fee sums retain codec units.

The 28 episodes are independently funded. Returns are neither compounded nor
annualized. Zero-fill gains may be idle asset revaluation. Drawdown can continue
after a stop and does not measure intrahour risk. This is exposed calibration with
hypothetical fills, not live qualification, realized profit, future-profit
evidence, or a finalized user-approved transaction.
