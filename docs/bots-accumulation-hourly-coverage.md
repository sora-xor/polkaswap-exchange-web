# Hourly research coverage

`auditAccumulationHourlyCoverage(snapshot, trustedSchedule, throughAtMs, requiredDecisionSlot)` checks the structural presence of every due observation in the complete retained journal. It performs no acquisition, model evaluation, storage writes or financial actions.

The independently retained schedule fixes the original hourly opening, funding, a common interior-control offset, and a decision window before market observations are opened. There are 23 interior hourly controls, the original opening and terminal observation, and 24 hourly decision outcomes. Offsets are below 60 seconds; decision windows are at most 60 seconds and exclusive at their upper bound. These are a new explicit hourly research schedule, not an amendment to an older callback protocol or evidence of continuous/live drawdown protection. No market registration has been created by adding this checker.

The checker binds exact canonical JSONL, count, record chain, original episode/funding and full-prefix digest. The caller must independently own the expected registration and head. At a partial prefix it requires only due controls and decisions whose windows have closed. Pass the current `requiredDecisionSlot` when requesting admission before that window closes. At and after the original 24-hour deadline, every slot and terminal observation is required. A stop or paid failure does not remove subsequent observations from this requirement.

Missing observations remain explicit. A retained failed decision or rejected control counts as structurally present but fails `requiredObservationsPassed`. Unavailable, expired and skipped decision outcomes remain in the journal; this checker does not prove their reasons or permit invented skips. Extra causal valuations cannot substitute for an exact scheduled control. Neither favorable survivors nor a rehashed shortened journal can satisfy a missing required hour.

`structuralCoverageComplete` and `requiredObservationsPassed` concern these structural records only. Every result explicitly sets `nativeEvidenceVerified`, `selectionRuleVerified`, `reducerResultsVerified`, `continuousDrawdownVerified` and `qualificationAuthority` to false. The separate session must reproduce accounting; the native verifier must authenticate each observation. A registered acquisition rule must establish that each mark was the prescribed state rather than a favorable replacement inside a time window. Opening/interior/terminal raw evidence, all additional predecision/precommit/settlement observations, admission lifecycle and hypothetical execution semantics remain separate prerequisites. A complete structural report cannot activate a strategy.

Tests use invented journals and do not represent their result fields as valid accounting. They exercise complete/prefix coverage, rehashed omissions, failed versus missing observations, time boundaries, duplicate outcomes, immutable funding, canonical-byte checks and rejected accessors.

```sh
yarn vitest run --project unit-scripts tests/unit/scripts/bots/accumulation-hourly-coverage.spec.ts
```
