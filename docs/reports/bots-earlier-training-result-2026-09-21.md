# Earlier-window training result

The fixed acquisition continuation finished on 21 September 2026 with all eight
training episodes complete and no data-acquisition failure. Neither candidate
qualified. The original process exited 1 with `bots.errors.research`; no candidate
selection was sealed, no validation episode was opened, and no transaction was
submitted. This is a strategy result, distinct from the parent's earlier HTTP 502
interruption.

The diagnostic reused the **original frozen** episode accounting, eligibility and
average functions. Its only source changes resolved imports to that frozen
directory and exposed those pure functions. All 129 frozen study source hashes
still matched. No strategy, date, threshold, cost assumption, candidate budget or
validation record was changed.

Both the 24-close deviation and 24-observation momentum candidates produced the
same holdings: no entry, no fills, and zero native fees. Their fixed ±25% signals
did not produce an entry before the funded portfolio reached its gain target
(14 and 16 June) or drawdown stop (15 and 17 June). The goal
measures value in XOR, so holding KUSD can change portfolio value and drawdown
without making a transaction. After a stop, the frozen protocol continues valuing
those holdings through the original deadline; stopping the bot does not freeze
their market value. The ±25% price indicator and 5% portfolio limit measure
different quantities; their numerical values alone do not establish that an
entry is always impossible.

| Training day | Net return in XOR | Excess over unchanged holdings | Maximum observed drawdown | First stop | Fills |
| --- | ---: | ---: | ---: | --- | ---: |
|14 June|3.4420%|0.0000%|5.4726%|Target|0|
|15 June|−2.6380%|0.0000%|14.5857%|Drawdown|0|
|16 June|5.7731%|0.0000%|17.9456%|Target|0|
|17 June|−4.5516%|0.0000%|6.4675%|Drawdown|0|

Display values are truncated to four decimal places. The retained receipt includes
the exact rational values. Mean net return was 0.5063%, entirely from unchanged
holdings. Both candidates fail the requirements for at least one fill, positive
benchmark-excess return/change, and no training episode exceeding 5% drawdown.
Fees did not cause this failure because no trade was attempted.

This rules out rerunning the same pair of strategies as a repair. A different
entry/exit policy needs an explicitly separate research protocol and untouched
evaluation data; lowering acceptance requirements or retuning this sealed run
would not establish profitability. The failed study and its original validation
claim remain retained. Its unopened validation data has not become a tuning set.

Evidence:

- [Original invocation result](../../output/go-history/earlier-goal-acquisition-continuation-20260921-v2/failure.json)
- [Exact original-accounting diagnostic](../../output/go-history/earlier-goal-training-diagnostic-20260921/verification.json)
- [Diagnostic source binding](../../output/go-history/earlier-goal-training-diagnostic-20260921/source-binding.json)
- [Frozen-function replay log](../../output/go-history/earlier-goal-training-diagnostic-20260921/run-corrected.log)

The indexer independently passed both public queries for the newly completed
04:00 UTC hour for all seven priority assets. No market values were selected by
that freshness check: [query receipt](../../output/go-history/indexer-freshness-20260921/completed-hour-20260921T040118Z/verification.json).
