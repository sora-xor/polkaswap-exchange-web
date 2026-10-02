# Synthetic goal reachability

`runGoalSyntheticReachability` is an engineering experiment using invented rational paths. It makes no network requests, reads no market data, signs nothing, and cannot issue a qualification or activate GO. The unchanged exact ledger owns marking, risk admission, settlement, fees, reserve protection, and target/loss latches. The delayed policy calls the real strategy-rule evaluator. The partial-target controller is an illustrative engineering baseline, not a production strategy or replay of a registered candidate.

Run from the repository root:

```sh
yarn tsx scripts/bots/run-goal-synthetic-reachability.ts output/go-history/goal-synthetic-reachability-20260921
```

The runner writes `report.json` once and refuses to overwrite it. Each policy result records first eligible decision, first decision/proposal/fill, first latch, actual synthetic fees and failures, final holdings/value/drawdown, and exact excess value over the passive policy on the same path. Monetary ratios use XOR codec units with 18 decimals; no floating-point token arithmetic is used.

## Fixed experiment

Every case starts with 10 KUSD and the ledger's separate protected 1 XOR fee reserve. Buy lots are 5 KUSD and sell lots 1 XOR, capped to spendable holdings. There is no full-budget conversion or sale of the remaining fee reserve. Marks occur every minute for 24 hours. Decisions use hourly completed candles with the declared publication delay and 200 causal prior closes. All prior synthetic closes are flat.

Three policies share each path:

- Passive: never proposes a trade.
- Delayed entry: uses the real deviation rule evaluator with a 200-hour window and illustrative entry/exit bands of −25%/+25%. This isolates delayed entry shape; it does not claim to reproduce the frozen study's candidates.
- Partial target: proposes a buy above 60% KUSD value weight or a sell below 40%, toward an illustrative half-KUSD allocation. Every proposal still passes the unchanged exact risk gate. These round fractions were declared independently of real observations.

Paths are flat, a linear 10% decline/rise in the XOR-per-KUSD ratio over ten hours, a 6% ratio decline and reversal, an immediate 6% decline, and a 30-minute 6% decline whose candle arrives at minute 31. The remaining cases isolate a fee-only failure and three algebraic cost-headroom boundaries. The source lists every point and delay explicitly.

The ordinary invented native fee is 0.01 XOR per attempt. Invented minimum output is the same-mark gross conversion less 50 basis points. This haircut is a synthetic combined quote cost, not a pool fee, actual price impact, RPC quote, or guarantee. Success and failure fees equal the declared ceiling. There is no liquidity feedback, submission delay, runtime change, or real fee estimation. Receipt identifiers and block hashes are invented.

## Results of the fixed run

| Case                      | Partial-target result                                                   | Interpretation                                                                                          |
| ------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Flat                      | One 5 KUSD fill at minute 1; −0.035 XOR versus passive                  | Entering successfully can still lose costs.                                                             |
| XOR strengthens           | One fill; +0.4645025 XOR versus passive; expires without target         | Lower exposure to KUSD improves this particular path, but ending value remains below the initial value. |
| XOR weakens               | One fill; −0.5345025 XOR versus passive                                 | Reducing exposure also gives up passive gains.                                                          |
| Reversal                  | One fill; −0.0354975 XOR versus passive                                 | Avoiding the passive loss latch does not establish an economic advantage.                               |
| Jump/publication delay    | No decisions or fills before loss latch                                 | An earlier-reachable strategy cannot overcome every observation/cadence constraint.                     |
| Fee-only failure          | Failed attempt at minute 1, successful fill at minute 61; 0.02 XOR fees | The failed receipt consumes fee reserve and headroom without output.                                    |
| Exact headroom boundaries | Both boundary cases reject; just-inside case admits one fill            | Success and fee-only failure must each remain strictly above the existing loss floor.                   |

The opening value is 11 XOR and opening 5% headroom is 0.55 XOR in these invented units. A 5 KUSD quote haircut costs 0.025 XOR at the flat mark. Thus a 0.55 XOR fee fails failure headroom, a 0.525 XOR fee reaches the success floor and rejects, and a 0.524 XOR fee is just inside. These are algebraic checks of the unchanged rule, not economically plausible fee forecasts.

No declared case reaches the sell band while still active; this run proves the initial partial buy and fee accounting paths, not a repeatable buy/sell cycle. The delayed policy makes no trades in these cases. Stopped holdings continue to be marked through the deadline, and their subsequent drawdown remains visible. No policy trades after a latch or resets the goal peak. A loss latch stops new orders; it does not liquidate holdings or guarantee a maximum realized loss.

Focused tests check the concrete outputs, causal delay, strict headroom, failed-fee debit, fixed lots, reserve-sale rejection, absence of post-latch trades, and zero network calls. A separate read-only review checked use of the unchanged reducers. This engineering result supplies no real-data performance evidence and does not change the failed study or open its validation partition. Any new strategy still needs an explicitly registered, fee-aware out-of-sample evaluation and current-runtime compatibility proof before live admission.
