# Deadline cancellation and hourly publication

The v2 research protocol preserves the original 24-hour deadline, fixed modeled
callback/check delays, token budgets, fee reserve and economic limits. It corrects
one mismatch: the live scheduler aborts a check still running at the deadline,
while the v1 historical builder rejected the entire episode if a modeled check
would finish at or after that deadline. The original builder and live scheduler
files remain unchanged, and old failed runs remain failed under v1.

`buildGoalQualificationClockV2` in
`src/features/bot-trading/goal-callback-builder-v2.ts` (also re-exported by
`scripts/bots/goal-qualification-clock-builder-v2.ts`) retains every canonical
callback and all completed checks. At the deadline it emits `deadline-cancel` for
an in-flight check, then `deadline`. A cancelled check records `cancelledAtMs` and
the unchanged `plannedCompletedAtMs`; it has no `completedAtMs`. Completion exactly
at the deadline loses to cancellation. Earlier gaps, contradictory blocks, missing
coverage and unsupported event overlap still fail. The pure verifier in
`src/features/bot-trading/goal-qualification-clock-v2.ts` independently replays the
same event contract. `goalClockCheckCutoff` is an admission boundary, not a claim
that a cancelled check completed. The shared browser implementation preserves the
original builder's complete JSON output, including property order and digest, in
three offline comparisons against the frozen original source: a final check
completing before, exactly at, and after its deadline.

The shared causal evaluator and archive source retain the completed prefix of that
check. A valuation, decision or hypothetical fill is admitted only if its receipt
is strictly before the original deadline. A quote that finishes before the deadline
still counts even if the enclosing scheduler check is cancelled later. A stage
that cannot finish before the deadline emits a retained
`GoalEpisodeDeadlineCancellation` receipt: check ID, stage, start, planned receipt,
fixed cancellation time and raw evidence digest. No price, quote, fee or fill is
invented for that unfinished stage. Earlier valuations remain; a consumed signal
whose quote is cancelled is recorded as `deadline-cancelled`. The terminal proof
still selects the true canonical state as of the original deadline and its immediate
successor. All ordinary checks require valuations, and all 24 hourly signals must
be consumed. Only the explicitly cancelled final stage may omit its valuation.

The v2 archive source also checks publication readiness before opening historical
price data. The relevant successor is the first block at or after the completed
hour, found from the last block strictly before it. Its indexed timestamp's upper
bound, finality delay and declared publication delay determine readiness. If the
hour is not ready when a due check begins, the source returns metadata-only
`awaiting-history` evidence, retains the ordinary valuation and leaves the hourly
cursor unchanged. The next due check can request that same hour. The live shared
signal evaluator similarly returns `awaiting-history` only for verified history
ending exactly one hour behind. Older, malformed, missing or contradictory evidence
still fails. Waiting cannot hide an entire unconsumed hour or make an incomplete
study qualify. A valuation that crosses an hour remains a valuation; old-hour data
cannot consume the newly current hour.

V2 installation is explicit:

- Plan protocol/policy: `GOAL_QUALIFICATION_PROTOCOL_V2` and
  `GOAL_QUALIFICATION_POLICY_V2` from `goal-qualification.ts`.
- Archive manifest: `goal-qualification-archive-source-v2`.
- Exposed engineering: `createGoalArchiveDevelopmentSourceV2` and
  `evaluateGoalArchiveEngineeringEpisodeV2`.
- Qualification: `createGoalQualificationArchiveSourceV2`,
  `createGoalEpisodeEvaluatorV2`, `openGoalQualificationStudyStoreV2`,
  `openGoalQualificationArchiveEvaluatorV2`, and
  `createGoalQualificationBoundaryV2`.
- Evidence/evaluator protocol: `finalized-xyk-execution-validation-v2`.

The original constructors remain strict v1 entry points. The v2 boundary rechecks
version matching, stage receipts, exact accounting and economic acceptance. The
same authoritative study directory and validation overlap protections apply.
Engineering wrappers remain explicitly exposed and qualification-ineligible.
A new operational run must bind the new source hashes, policy and protocol before
access; renaming or replaying an old v1 result does not upgrade it. This work does
not install a funded browser flow, submit a transaction or prove profitability.

Synthetic tests cover the final check starting 23 seconds before the deadline with
its fixed 30-second modeled duration, equality at the deadline, missing/forged
cancellation, ordinary callback gaps, exact-hour successor selection, waiting
without price reads, retained valuations, cancellation before a quote completes,
completed fills before cancellation, strict version separation, independent
qualification accounting and durable replay after metadata removal.
