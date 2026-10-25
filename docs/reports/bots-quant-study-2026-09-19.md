# Cost-aware bot research — 19 September 2026

## Goal and acceptance

The active task is to fix the real 10 KUSD-to-XOR flow. Ten KUSD is the total input allocation, not an instruction to exchange it all. The existing separate 1 XOR fee allowance and 5% observed drawdown limit remain unchanged. A successful backtest is not a successful trade or a promise of profit. Live success requires a finalized transaction personally authorized by the user.

1. Verify the fee calculation and executable market data before changing strategies.
2. Research methods published by 19 September 2026 and record their limits.
3. Test a fixed, small set of cost-aware strategies using genuine training data.
4. Change production behavior only when the change corrects a demonstrated defect or improves the research/execution design. Preserve exact amounts and reserve accounting.
5. Test the frozen selected candidate once on separate validation observations. Do not use a failed validation window to tune another candidate.
6. Deploy justified fixes, verify the real Chrome flow, and retain truthful video evidence. Do not mark the goal complete merely because software tests pass.

## Initial findings

The deployed simple flow loads seven days: 117 training closes, one purged boundary close, and 50 validation closes. Its five-fill minimum implies a maximum 12-hour interval, and five fills cost at least 0.500103062948536630 XOR using the latest observed network fee. The repaired indexer retains 90 days. The current assistant proposes one signal family and the app tests only that order size and two smaller sizes; these are not three distinct trading strategies.

The continuous recording in `output/go-history/live-process-20260919/` documents actual rejection of the 2, 1, and 0.5 KUSD DCA candidates. No transaction was submitted. These failures are development evidence, not untouched validation.

## Primary-source basis

- [Bysik and Ślepaczuk, 2026](https://arxiv.org/abs/2606.00060): their hourly Bitcoin experiment finds that cost-aware signal filtering materially reduces turnover. The study uses proportional exchange costs; it does not reproduce Polkaswap's fixed network fee, liquidity, or prices. Its selected strategies do not significantly beat buy-and-hold on corrected Sharpe comparisons. We adopt the execution-cost question, not its reported returns.
- [Gang and Choi, revised 2025](https://arxiv.org/abs/2407.13547): a theoretical no-trade region under proportional costs and random trading opportunities. This motivates a dead band between buying and selling; it does not prove optimality for our discrete fixed-fee AMM setting.
- [Bailey and López de Prado, 2014](https://www.davidhbailey.com/dhbpapers/deflated-sharpe.pdf): selecting among many backtests inflates apparent performance. Record every candidate and avoid repeated searches of the same holdout. Five fills alone are not statistical proof of an edge.

## Frozen exploratory study specification

This specification is written before inspecting the longer training price sequence. It is an exploratory economic feasibility study, not a production qualification or significance claim.

- Source: the independently checked 90-day finalized-hour archive with SHA-256 `53f85950f6510d0e35559a84b947e0c30da5ed059d4b9f17acf59d23eca805c7`.
- Span: 21 June 2026 04:00 UTC to 19 September 2026 04:00 UTC. Load only its first 1,512 observations into the research process. The next boundary observation and remaining 647 observations stay unavailable to candidate selection.
- Capital: 10 KUSD plus the unchanged separate 1 XOR fee reserve. Value equity and drawdown in XOR at each completed close.
- Costs: the recorded current fee observation, 0.5% slippage, next-observation execution. Different notionals need fresh exact-size quotes before any production acceptance. Current fees are a dated scenario, not historical fee observations.
- Order sizes: 5, 2.5, and 1.25 KUSD, all strictly below the total budget.
- Cadences/windows: 24 and 72 hours. Keep these fixed before replay.
- Candidate families: (a) scheduled accumulation baseline, (b) symmetric rolling-mean deviation bands, (c) directional momentum bands. The latter two use a dead band derived from both network fees, both swap fees, and slippage at the candidate notional; fixed parameters are not optimized against outcomes.
- Candidate count: 18 (three families × two windows × three sizes), all disclosed. The cost band is a heuristic hurdle, not a return forecast or a profit guarantee.
- Evaluation: exact existing portfolio replay, five-fill/positive-net-return/5%-drawdown gates unchanged; also report costs and the unchanged-cash portfolio as context. Rank qualifying training candidates by net return minus drawdown. If none qualify, do not read validation or re-label a weaker result as success.
- Follow-up: exact route/reserve execution should replace approximate historical costs when evidence permits. Changes motivated by this exploratory sample require new prospective evidence; do not hide the total number of trials.

## Exploratory results

All 18 candidates completed on the first 1,512 closes. None passed all unchanged qualification gates. The 647-close validation partition was not parsed or evaluated. Current source was bundled and replayed again to verify that the earlier engine bundle had not affected results.

Provenance correction after independent review: this script-level exclusion does not make the entire final partition globally untouched. Its dates overlap 117 closes already exposed in the earlier live training context (12 September 12:00 UTC through 17 September 08:00 UTC). No additional withheld prices were read to check this overlap. Treat those observations as development data. Any new hypothesis informed by this work requires a protocol frozen before a later prospective validation window; do not present the old tail as pristine out-of-sample evidence.

| Family | KUSD/order | Interval | Fills | Net return in XOR | Drawdown in XOR |
| --- | ---: | ---: | ---: | ---: | ---: |
| dca | 5 | 24 h | 2 | -7.6393% | 9.7629% |
| reversion-band | 5 | 24 h | 5 | 2.9265% | 40.4377% |
| momentum-band | 5 | 24 h | 9 | -50.4659% | 63.7642% |
| dca | 5 | 72 h | 2 | -12.0477% | 12.0477% |
| reversion-band | 5 | 72 h | 4 | 5.6731% | 41.2101% |
| momentum-band | 5 | 72 h | 9 | -51.0708% | 61.0707% |
| dca | 2.5 | 24 h | 4 | -16.8620% | 16.8620% |
| reversion-band | 2.5 | 24 h | 0 | 0.3112% | 45.1935% |
| momentum-band | 2.5 | 24 h | 1 | -7.1717% | 45.0606% |
| dca | 2.5 | 72 h | 4 | -9.5647% | 16.0310% |
| reversion-band | 2.5 | 72 h | 0 | 0.3112% | 45.1935% |
| momentum-band | 2.5 | 72 h | 2 | -18.5144% | 47.9625% |
| dca | 1.25 | 24 h | 8 | -25.7770% | 25.7770% |
| reversion-band | 1.25 | 24 h | 0 | 0.3112% | 45.1935% |
| momentum-band | 1.25 | 24 h | 0 | 0.3112% | 45.1935% |
| dca | 1.25 | 72 h | 8 | -26.0552% | 34.0235% |
| reversion-band | 1.25 | 72 h | 0 | 0.3112% | 45.1935% |
| momentum-band | 1.25 | 72 h | 0 | 0.3112% | 45.1935% |

The 5 KUSD mean-reversion variant at 24 hours made 2.9265% in this cost scenario but reached 40.4377% drawdown. The 72-hour variant made 5.6731% with 41.2101% drawdown and only four fills. Neither is qualified. The unchanged-cash portfolio also had 45.1935% drawdown in XOR buying power; holding KUSD is not risk-free when XOR is the unit of the goal. These are exploratory historical results using a current fee scenario, not achievable-return forecasts or validated live strategies.

## Verified fee economics

A separate public finalized-runtime query at block 27,702,199, runtime 131, returned the same fee for 1, 2 and 10 KUSD swap envelopes: 0.100020612589707326 XOR. The runtime custom charge is 0.099999812589707326 XOR plus 0.0000208 XOR for the 208-byte envelope. There is no denomination conversion defect or regular-swap weight refund that removes this cost. Exact evidence and source references are in `output/go-history/quant-study-20260919/fee-audit.json`.

At the recent public training opening price, five network fees alone equal roughly 25.323% of the 10 KUSD input allocation, or 16.811% of the total opening portfolio including its separate 1 XOR reserve. This is a cost hurdle, not a theorem that every future strategy must lose.

An independent exact-pair order-book check at finalized block 27,702,298 enumerated 18 books and queried both KUSD/XOR orientations on all four registered DEXes. All eight direct queries returned no book. Source inspection suggests resting maker placement could have lower fees, but there is no existing book, lot size, depth or counterparty evidence for this pair. Creating a book would not itself establish fills or profitability. No order or transaction was constructed. The reproducible observation and fee-semantics limitations are in `output/go-history/quant-study-20260919/orderbook-feasibility.json`.

## Software correction

The local sizing search previously tested only the assistant's amount and two successive halves. Fixed per-transaction fees make this a one-sided search: it cannot discover an otherwise valid larger partial order. The corrected bounded search tests the proposed amount, half, and double when each is strictly below spendable capital. If the larger size does not fit, smaller exact sizes fill the remaining slots. Every size still gets its own verified quote. The selected order, costs and signal are frozen before the single holdout evaluation. Total capital, fee reserve, drawdown limit and full-budget exclusion are unchanged.

Unit coverage includes an explicitly synthetic market where a larger partial order wins on its own execution costs, along with token-precision, reserve and exact-budget boundary cases. This tests selection behavior; it is not evidence of profitable real trading.

## Remaining acceptance

A profitable strategy that meets the user's loss limit has not been demonstrated, and no live transaction occurred. The longer history study remains an offline investigation; production's seven-day history window is unchanged. Longer validation, historical executable routes and prospective strategy evidence need further work before they can support a live approval. The goal remains active.

The independent next-step review in `output/go-history/quant-study-20260919/next-hypotheses.md` specifies a stateful inventory comparison that avoids repeated entries, plus a conditional same-pair venue-quote feasibility screen. Neither is a qualified strategy. It also identifies an existing distinction to resolve: research gates peak-to-trough drawdown, while the live goal loss trigger uses the opening baseline. Pausing retains token exposure and cannot guarantee a loss cap. These findings are not reasons to relax qualification or approve trading.

The conditional venue screen then stopped at its first prerequisite. At finalized block 27,702,383, DEX 0's XYK pool was the sole available exact KUSD/XOR source in both directions; DEXes 1, 2 and 3 had no sources in either direction. There was no distinct second venue to compare. No quote, envelope or transaction was needed. Evidence is in `output/go-history/quant-study-20260919/quote-feasibility.json`.

## Deployment and next goals

- Completed: verified fixed network fees, 18 disclosed exploratory candidates, maker-market availability and independent-source availability.
- Completed: deployed the bounded bidirectional order-sizing correction to `polkaswap.io`; both IPFS roots imported and pinned, production origin saved, cache purged, live bytes matched and assets warmed. Production root: `bafybeiddczz3xrcleb2ushlrlf3jqnobmqkt45x5dbnv4pmlt2wyo7tfce`.
- Completed: 6,433 unit tests, 13 translation checks, 20 isolated browser cases, lint, the official WebKit check, and final desktop Swap / desktop Bots / 320 px mobile Bots checks. Final checks had zero failed requests, HTTP errors, page errors and console errors. The real Chrome form retains a connected account with 10 KUSD and XOR selected; no trading was authorized or submitted.
- Open: specify and test one stateful inventory strategy with execution-cost accounting and consistent research/live risk semantics. Disclose it as an additional development trial.
- Open: freeze any candidate before collecting prospective validation; previous development observations cannot become new independent evidence.
- Open: only after qualification, present the exact live transaction for the user's own authorization and record its actual finalized outcome. No profitable-trading milestone is complete.

Deployment evidence is in `output/go-history/deploy-quant-sizing/completion.json`. The existing continuous recording shows the earlier rejection, not a successful trade.

## Follow-up: inventory hypothesis falsification

Before implementing a different state machine, replayed its fixed parent to test the common price path before the first entry. The predeclared 5 KUSD, 24-hour mean-reversion entry made its first hypothetical fill only after 108 observations. Those unchanged pre-entry holdings already experienced 13.9217595861% peak-to-trough loss in XOR buying power; the first breach of 5% occurred before any trade. Suppressing repeated entries or applying a transaction-cost filter after this point cannot repair that earlier breach. This falsifies the specific declared comparison against the unchanged gate, without inventing a replacement threshold or inspecting additional held-out values. It does not prove every inventory strategy impossible. Reproducible evidence: `output/go-history/quant-study-20260919/inventory-prefix-falsification.mjs` and its JSON result.

The implementation follow-up instead corrects the demonstrated risk-semantics mismatch: newly created simple-flow goals explicitly opt into peak-relative loss, with durable peak accounting and matching approval text. Existing goals keep their original loss semantics. This strengthens execution consistency; it does not qualify any previously rejected strategy.

## Peak-relative goal deployment and remaining execution work

New simple-flow goals now carry an explicit peak-relative loss metric through the AI request, approval text, durable storage and execution controller. The durable peak cannot move backwards through a stale-tab save or progress update, and a reached pause remains latched. Existing goals retain their authorized baseline semantics. The UI says “Pause below peak”; pausing retains holdings and does not guarantee a maximum realized loss.

This correction is deployed at production root `bafybeigwuwn4q2b2gfpgcbio5pzvnumjzx5fzjyx5gvvao2mowiu7rkntm`. Both roots were imported and recursively pinned on the dedicated MOF origin; the production origin was saved and Bunny purged. Origin and live files matched the frozen build. Validation passed 6,456 unit tests, 13 translation checks, 22 isolated browser cases including real IndexedDB concurrency in Chromium and WebKit, cuneiform validation, lint, both builds, the official WebKit check, and final desktop Swap / desktop Bots / 320 px mobile Bots checks. All final live cases reported zero failed requests, HTTP errors, page errors and console errors. Evidence: `output/go-history/deploy-drawdown/completion.json`.

The real connected Chrome page is left at the compact 10 KUSD budget / maximize XOR form. No wallet unlock, trading authorization, signature or transaction was performed. No candidate has qualified, and there is no successful-trade recording. The financial goal remains active.

Next execution goal: reject a proposed trade when its already-known conservative settlement costs, or its failed-swap fee-only branch, would consume the remaining peak-relative loss allowance. This must run before reservation/signing and after a wallet delay before broadcast, without persisting hypothetical goal outcomes or weakening existing checks. The bounded design and falsification tests are documented in `output/go-history/quant-study-20260919/goal-cost-preflight-review.md`; this follow-up is not part of the deployed release. Further strategy development must retain the trial history and obtain prospective validation after freezing a candidate.

## H3: early partial exposure also fails the fixed training prefix

Preregistered one additional development hypothesis before replay: buy exactly 5 KUSD of XOR at the second training close, retaining the original 10 KUSD plus 1 XOR benchmark, then consider only the already fixed parent signal. The initial feasibility screen used the same disclosed dated fee/slippage scenario and the new exact success/failure cost-admission helper. It preserved the actual simple-flow 5% target and 24-hour goal horizon. It did not reset opening value after buying.

The hypothetical seed passed immediate cost admission. Residual KUSD exposure then produced 9.7629263048% observed drawdown by the nineteenth training close, before any subsequent rotation was eligible. The runtime goal paused at that observation. The screen stopped there, with one hypothetical fill and no simulated rotation; no size, start date, cadence or band was changed to rescue it. This rejects H3 under its frozen scenario, not every possible strategy or future price path. Historical prices plus dated current fees remain indicative, not historical executable quotes.

Evidence: `output/go-history/quant-study-20260919/h3-prefix-protocol.md`, its timestamped SHA-256 freeze, reproducible `h3-prefix-falsification.mjs`, and `h3-prefix-result.json`. Exactly 19 known training rows were parsed (2026-06-21 05:00–23:00 UTC); no additional held-out prices, live quotes, signatures or transactions were accessed. The research history now includes 18 original training configurations plus this one additional prefix hypothesis. No candidate is qualified.

## Projected-cost admission deployed

The new drawdown path now rejects a proposed swap if either its conservative minimum-output settlement or its fee-only failure branch reaches the remaining loss threshold. It checks before reservation/signing, rechecks fresh valuation after a wallet prompt, and rechecks the originally signed minimum and current durable peak before broadcast. A synchronous envelope check prevents the added price reads from allowing expired time/block/runtime context to reach signing or submission. Paper execution uses the same projection and rejects concurrent inventory changes. Only actual observed goal progress is persisted; hypothetical costs never become a realized-loss outcome or ledger debit. Legacy baseline goals retain their existing semantics.

Deployed production root: `bafybeiew4z5xdrfixtelarpxu3dfko5j3pxpejmmr4pevwoelncyqudwmq`. Both production and testnet roots were imported and recursively pinned on MOF; the origin save and full Bunny purge each showed success. Root/entry/style/Swap/Bots bytes matched the frozen build, 138 relevant assets were warmed sequentially, and the official WebKit check plus the subsequent final desktop Swap / desktop Bots / 320 px mobile Bots checks passed with zero failed requests, console errors, page errors and HTTP errors. The connected Chrome account is left at 10 KUSD / XOR with no trading authorization. Evidence: `output/go-history/deploy-cost-admission/completion.json`.

Validation: 6,539 unit tests, 13 translation checks, 22 isolated browser cases, lint, cuneiform validation and production/testnet builds passed. The initial full run exposed one signer-adapter fixture with missing envelope context; the fixture was corrected and the entire suite rerun successfully without changing the built production source.

The financial objective remains incomplete: no qualified strategy, actual trade or successful-trade recording. The next concrete data prerequisite is a bounded, append-only development collector for same-finalized-block minimum-output quotes, impact, fees and lot provenance, reusing the existing pinned reader. Close-only history and one fee calibration are insufficient for exact historical execution claims. The inventory and scope are in `output/go-history/quant-study-20260919/next-data-step.md`; fresh development observations must not be retroactively called an untouched acceptance window.

## Prospective execution collector verified

Added `yarn bots:collect:quotes`, documented in [Public execution evidence](../bots-execution-evidence.md). It freezes a development-only manifest before opening the public MOF connection, then retains complete, failed and missed observations in an append-only hash chain. The exact 5 KUSD partial input, direct DEX 0 XYK source, 0.5% minimum, conservative reverse-lot provenance, finalized context, raw quote/fee responses and public estimation-envelope assumptions are explicit. No wallet or submission interface is exposed by the collector.

The initial five scheduled samples all failed closed on a newly discovered metadata representation mismatch: this SDK negotiates metadata V16, but legacy `state_getMetadata` returned V14 for runtime 131. Both formats described the same runtime, so comparing their raw hashes was invalid. Those five error records and their original source files remain preserved in `output/go-history/quant-study-20260919/execution-development-001`. Its full chain and all 35 frozen source hashes were verified. No price quote was accepted from that dataset.

The fix obtains `Metadata_metadata_at_version` using the SDK's actual encoding format at the pinned block and at a pinned current head. It uses little-endian SCALE for the version parameter and decodes the returned Option from bytes. The public diagnostic confirmed the pinned V16 hash exactly matches the SDK encoder; tests still reject actual runtime, format or metadata changes. Exact-format acquisition is now recorded in every snapshot.

A separately frozen collection, `execution-development-002`, completed **five of five scheduled observations**, with **zero errors or missed slots**, at five distinct finalized blocks from 27,703,141 through 27,703,176. Slots ran on 19 September 2026 from 14:32:09 to 14:36:09 UTC. Each took approximately 12–14 seconds, below the unchanged 25-second deadline. Both directions, both exact-call fee queries and the encoding checks refer to the same finalized state for each observation. Verified resume retained all records without another market request. The manifest, journal, frozen sources, run log, resume log and independent hash/amount checks are in that directory.

All five observations returned the same amounts:

| Public quote screen | Exact amount |
| --- | ---: |
| Partial input | 5 KUSD |
| Forward minimum | 0.657855789355561562 XOR |
| Reverse minimum, using that forward-minimum lot | 4.759032264502313543 KUSD |
| Difference from input before additional network fees | −0.240967735497686457 KUSD |
| Estimated network fee per 209-byte filtered swap | 0.100020712589707326 XOR |
| Additional estimated network fees for both directions | 0.200041425179414652 XOR |

Route fees are already included in the quoted output and are not charged again in this comparison. This is a same-state quote screen, **not** an executed sequential round trip: the reverse quote does not apply a hypothetical forward trade to pool reserves. It establishes neither profit nor a historical execution model. Five minutes of inspected development data cannot be promoted to untouched strategy validation.

The batching investigation also found no supported way to combine time-separated trading decisions into one fee-paying transaction. The reviewed local runtime rejects ordinary wrapper calls containing more than one swap; the dedicated swap-transfer batch is a synchronous distribution facility with fees that scale with recipients. A single utility wrapper's normal weight-based fee remains unmeasured and must not be represented as a proven discount. Primary local code evidence and scope are in `output/go-history/quant-study-20260919/batching-feasibility.md`.

Validation: the full unit run passed 6,240 application tests and 425 script tests before the metadata-format correction. After that script-only correction, all 445 script tests passed, giving **6,685 passing tests across the final applicable suites**. The collector contributes 146 tests. All 13 translation checks, strict standalone collector TypeScript checking and focused lint passed. No production frontend source changed in this step, so the previously verified production deployment remains current.

The execution-data prerequisite is now implemented and smoke-tested. The trading goal remains active and incomplete: **no candidate has qualified, no funds moved, and no successful-trade video exists**. Any next strategy must declare its lot accounting and complete cost model before a prospective acceptance window; these development observations and the earlier disclosed failed hypotheses remain part of the research history.

## Production replay and AI-input correction

The collector exposed a further production omission: research retained quoted network and pool fees but discarded `amountWithoutImpact`, so historical replay omitted the observed price impact. The correction retains a separate impact percentage for each direction, rounded upwards to 18 decimal places. Replay and the passive benchmark apply the pool-fee, impact and slippage factors once each before asset-decimal flooring. For the direct XYK route, the impact-free quote already deducts pool fees, so this ratio isolates impact without charging the pool fee twice. Fresh research requires both impact observations; older saved assumptions remain identifiable and unchanged.

The AI request now supplies exact goal duration, return/loss limits, valuation basis, reserve funding and dated directional costs in validated structured fields shared across desktop, Jev and provider transports. Raw current prices and quote outputs are excluded to avoid leaking later market prices into historical strategy drafting. The reverse cost sample is explicitly labeled as using expected forward output, rather than the conservative minimum lot used by the collector. Candidate sizes continue to receive their own quotes.

These are current cost scenarios applied to historical closes, not historical executable liquidity reconstructions. The correction does not qualify a strategy or make the disclosed failed trials profitable. No loss threshold, minimum-fill requirement or budget is relaxed.

The correction is deployed at production root `bafybeicnwhwg37dgux3acwvbvja5afvsc6nhpfjlrgjgk5bouz7ikwuvrm`. Both production and testnet DAGs were imported and recursively pinned on MOF. The origin save and full Bunny purge each showed success; root, entry, CSS and route chunks matched the frozen build, and 138 required assets were warmed sequentially. The official WebKit check passed, followed by desktop Swap, desktop Bots and 320 px mobile Bots checks with the expected root and zero request, console, page or HTTP errors.

Validation passed 6,724 unit tests, 13 translation checks, focused lint, cuneiform checking, production/testnet builds and 24 isolated browser cases. The first additional worker/report browser attempt failed because its test server prefix differed from the test URL. Its rerun also updates the test to enter the current Advanced view; production source did not change. Both native Chromium and WebKit worker/report cases then passed.

In the real connected Chrome tab, GO preserved 10 KUSD and XOR, the assistant acknowledged through browser controls without an API key, and research reached a pending request. That request carried the exact 24-hour goal, 5% peak-relative loss, separate 1 XOR reserve, 1 KUSD fee-sampling amount and independently observed buy/sell impacts of `0.278676177278628967%` / `0.274586044524738869%`. The 1,065-character instruction stayed below the desktop limit. The public cost state was finalized at `2026-09-19T15:08:00Z`; each directional network fee was `0.100020612589707326 XOR`.

This was an input/transport check: no strategy was submitted, qualified or executed, and the research request was cancelled. The tab retains the connected assistant and 10 KUSD/XOR form. The visible 117-close training window now spans 12 September 16:00 UTC through 17 September 12:00 UTC. These inspected training observations are development data and further extend the previously documented overlap; no withheld observations were read. Future independent acceptance must follow a separate strategy freeze. Release evidence: `output/go-history/deploy-impact-context/completion.json`; real Chrome evidence: `connected-chrome.json` in that directory. The financial goal remains active, with no successful-trade recording.

## Fixed-window feasibility bound

An independent check of the first two already exposed training closes establishes a stronger diagnosis for this exact live window. The first close is `4.627275257177647266 KUSD/XOR` at 12 September 16:00 UTC; the next is `5.485617430406035512` at 17:00 UTC. With the required 10 KUSD opening allocation and separate 1 XOR reserve, opening value is `3.161099014909128987751959878034227096 XOR`. At the second close, unchanged holdings are worth `2.822948852497688310233892604526336167 XOR`: a `10.6972341206832258130349913977100777%` decline.

The replay cannot execute before that second close. A buy at the second close exchanges at its price and deducts nonnegative execution costs, so it cannot exceed the unchanged-holdings value. The opening 1 XOR is protected reserve and cannot fund an initial sale. Warmup provides indicator observations, not inventory. Replay records equity after the optional fill; the unavoidable decline therefore appears in the second equity point and survives in maximum drawdown. This is not a claim that replay records a separate pre-fill risk observation or immediately pauses on it.

Consequently **no supported deterministic strategy can satisfy the existing 5% drawdown gate for this fixed opening allocation, window and execution model**, even with execution costs set to zero. This proof uses only those two known closes and is not another candidate trial. It does not prove that future markets or differently authorized experiments cannot be profitable. Moving the start, pre-buying XOR, resetting opening value, adding capital or relaxing the loss threshold would change the experiment; none was done. This explains why generating another signal alone cannot resolve this specific rejection. Reproducible evidence is in `output/go-history/quant-study-20260919/opening-feasibility-20260920/`.


## Opening feasibility checked before drafting

The production research path now screens this mathematical lower bound immediately after history validation and the fixed chronological training split, before quotes, AI drafting, candidate construction or workers. It examines only the first two training observations and a fresh, unchanged allocation with no spendable output inventory. It uses the same portfolio valuation, fee-reserve accounting, 36-place rounding and strict `>` comparison as qualification. A passing screen is not strategy qualification. Existing training/validation criteria, opening time, budgets and loss limits remain unchanged.

The UI preserves the amount and token selections, gives one short error, and puts the zero-fee bound, valuation token, limit and historical UTC timestamps under the collapsed “Why it stopped” explanation. Only locally constructed, validated diagnostic objects can carry this evidence. The explanation is never supplied to the AI as candidate-tuning data. Display rounding preserves a conservative lower bound and uses full precision when two decimal places would hide the excess.

Regression coverage includes input/output/third-asset reserves, exact equality and sub-precision excess, changed holdings, unavailable prices and timestamps, real next-close replays for four strategy types, later-data independence, cancellation cleanup and the absence of fee, provider, review, save or start calls. An isolated browser presentation case exercises the trusted error through the real orchestration/UI on Chromium and WebKit at 320 px. Its services are mocked; it is not evidence of a real wallet, WebMCP runtime, strategy result or trade.


Deployed production root: `bafybeiancw2xnnozlh5dh5dmj3fmnd6diu6xs3l5yupbq7llejz5oijdni`. Both DAGs were imported and recursively pinned on MOF. Bunny saved the origin and confirmed the full cache purge; all five checked origin/live files match the frozen build and 138 relevant assets were warmed sequentially. The official WebKit check and subsequent desktop Swap, desktop Bots and 320 px Bots checks passed with the correct production root and zero failed requests, console errors, page errors or HTTP errors. Validation passed **6,778 unit tests**, **13 translation checks**, **14 isolated browser cases**, lint, cuneiform checks and both builds. Release evidence: `output/go-history/deploy-opening-feasibility/completion.json`.

The actual connected Chrome account ran GO with 10 KUSD and XOR on the deployed release. Same-tab browser controls acknowledged the assistant without an API key. After history loading, the new opening screen displayed the 10.69% lower bound and 12 September 16:00–17:00 UTC dates, before any pending draft. The 10 KUSD amount, 5% target, 5% loss limit and 1 XOR reserve remained intact. No wallet unlock, strategy submission, trading approval or transaction occurred. The page is left open with the diagnostic expanded; this is not a successful-trade recording. The financial goal remains active and incomplete. This turn delivered the checked production diagnosis; it did not establish a profitable candidate or change the failed experiment.
