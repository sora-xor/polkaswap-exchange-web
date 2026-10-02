# Fixed earlier execution study

The runner in `output/go-history/earlier-goal-study-20260921/run-study.mts`
compares two previously proposed signal families through the actual v2 archive
source, durable study journal, causal evaluator and qualification boundary.
It has no wallet, unlock, broadcast or trading path. A retained certificate is
research evidence; the browser must independently reverify its raw evidence
before it can obtain a local qualification capability.

The sealed invocation ended during its first training episode on 21 September
2026 at 01:28:49 UTC. Three KUSD history pages returned HTTP 200; the following
XOR history request returned nginx HTTP 502. The journal retained the partial
evidence and marked the invocation failed, with no retry. No training selection,
validation access, qualification or transaction resulted. The
[failure diagnosis](../output/go-history/earlier-goal-study-20260921/failure-diagnosis.json)
records request identities and response status without copying market values.
Service repair does not change this failed invocation into a completed study.

A separate metadata-only API check at 01:37:41 UTC returned HTTP 200 for the
same XOR time range, with repository and worker ready, zero block lag and no
worker error. This establishes restored query availability, not a completed
strategy evaluation. Its [request and response](../output/go-history/earlier-goal-study-20260921/indexer-post-502-metadata-probe.json)
contain no reserve or price fields.

The server logs subsequently established a deployment listener gap: nginx
reported `Connection refused` to the local upstream at 01:28:49 UTC, between
successful public requests at 01:28:48 and 01:28:52. The combined indexer received
SIGTERM and its replacement listener started at 01:28:51. This was availability
during a separate release, not an absent historical record. The
[sanitized server evidence](../output/go-history/indexer-502-diagnostic-20260921/remote-error-metadata-utc-aligned.json)
contains lifecycle and request-status metadata only. No service restart was
performed during diagnosis.

During diagnosis, an accidental truncated dump exposed some first-episode
warmup reserves to the model. Those are training-context values, not validation
observations. This later exposure supplements the original access disclosure;
it must not be erased or used to retune the sealed candidates.

The historical study binds runtime 130. A separate current metadata probe found
production runtime and transaction version 131. The existing exact runtime
admission guard remains unchanged. Historical qualification, even if obtained,
would require an explicit compatibility assessment before use on that runtime.

The fixed specification uses 10 KUSD initial capital, a separate 1 XOR fee
reserve, 5 KUSD buy lots and at most 1 XOR per sell, capped by actual spendable
inventory. Both candidates use a six-hour cooldown after successful fills.
The first buys below a −25% deviation from the latest 24 completed closes and
sells above +25%. The second buys on a 24-observation return above +25% and
sells below −25%. Neither seeds an opening trade. There is no parameter sweep.

These are deliberately broad, untuned excursion thresholds informed by the
already exposed fixed-fee problem. They are not estimated break-even levels or
return forecasts. Transaction-cost research motivates controlling turnover and
using a region in which no trade occurs; it does not establish an edge for
this pool or these thresholds. [Gârleanu and Pedersen](https://www.nber.org/papers/w15205),
[Gang and Choi](https://arxiv.org/abs/2407.13547). The small declared comparison
and sealed validation preserve the record of selection; they do not remove
uncertainty from such a short sample. [Bailey and López de Prado](https://doi.org/10.2139/ssrn.2460551).

Dates remain those selected before strategy-value access: four 24-hour training
episodes beginning 14–17 June 2026 at 04:00 UTC within the fixed 116-hour training
partition; two validation episodes beginning 19–20 June at 02:00 within its
49-hour partition. The 20-hour training tail, two-hour embargo, one-hour
validation tail and 200 completed warmup closes remain explicit. The operational
indexer backfill already processed this period's prices programmatically.
The prior access audit discloses that ingestion; it records no earlier-window
strategy-selection use or model-visible prices/returns. This is not a claim that
the data has never been read by any program.

The modeled availability delays are unchanged from the engineering run:
12 seconds for finality, one second for callbacks, zero additional processing,
and a 30-second check. History reads, publication and mark reads each have a
one-second modeled delay; quote and fee reads have four seconds. These are
modeled past arrivals, not actual historical browser receipt times. Final checks
retain any deadline cancellation at the original deadline.

Preparation reads source and canonical metadata only. It binds the specification,
access disclosure, actual decoder/evaluator source closure, six clocks, metadata
files and original wire-receipt manifest before price acquisition. Source aliases
resolve inside a separate copy of the verified engineering implementation so
concurrent application edits cannot change the experiment. The new reviewed
study-store/evaluator modules are copied into that same execution directory.

Execution uses the single authoritative `output/go-history/qualification-studies`
directory. Registration precedes any episode producer; each episode records
access before it opens its data. Metadata-cache use receipts are retained in
that episode's own sink, alongside actual quote, pool, fee and hourly-history
responses. Validation can open only after all declared training episodes have
completed and the real boundary has sealed its selection. Failed or incomplete
episodes cannot be replaced by a new date, candidate or request. Restarting a
failed invocation is not an automatic recovery operation.

Physical request starts are serialized at least 125 ms apart and capped at
35,000 for the whole study. Only the approved historical archive and public
indexer are allowed. Each episode additionally retains the existing 10,000
logical-request and 256 MiB response limits, and 16,000-file / 512 MiB evidence
limits. Cached metadata is used only for the market-state reader; executable
quotes, native fees and history are fetched through the actual readers. A limit,
missing response or failed read is an explicit incomplete result, never a
zero-cost value or a substitute observation.

All ordinary qualification gates remain: verified same-state quotes and native
fees, 1% maximum impact, 0.5% slippage, minimum-success and fee-only-failure
admission, positive mean net and holding-benchmark excess in percentage and
absolute XOR, at least one hypothetical fill, and the 5% observed drawdown bound
in every episode. The 5% target stop is distinct from the positive-return gate.
Every idle, losing and failed result remains evidence. No trading outcome is
claimed until an actual user-authorized transaction finalizes.
