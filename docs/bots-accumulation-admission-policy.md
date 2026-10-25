# Partial accumulation admission prototype

`scripts/bots/accumulation_admission_policy.py` is an offline decision experiment. It consumes the frozen AR(1) research model, an opening portfolio, the current decision state and independently authenticated native quote candidates. It is not connected to Bots, cannot fetch data or sign, and does not authorize a transaction.

The policy compares a partial buy now with keeping the initial holdings until the **original** 24-hour deadline. It maximizes modeled expected terminal XOR among admitted amounts. This is a myopic admission heuristic, not an optimal policy for future decisions and not evidence that the model predicts profitable trades.

## Contract

- Call `admit_accumulation(model, state, quotes)` with `OpeningPortfolio`, `AdmissionState` and `QuoteCandidate` values. The state requires `latest_completed_close: HourlyClose`, aligned to the completed hour containing the actual millisecond decision time. Callers must authenticate chain identity, native state, exact input/output amounts, quote minima, fees, impact and real data availability before constructing these inputs. A local data structure cannot prove an RPC response's authenticity.
- Consider integer partial inputs 1–9 KUSD under the unchanged maximum 10 KUSD allocation. The separate maximum 1 XOR allocation pays fees only. Reject previous purchases, stopped/expired goals, reached targets, invalid state bindings and stale quotes.
- The pure API accepts up to nine available candidate quotes. The evidence adapter must retain unavailable-size and failed-request outcomes; an absent quote must never become a zero-cost option.
- Quotes must share the declared decision state, be unexpired and have observation age strictly below 5 seconds. The state's independently recorded `context_received_at_ms` must also be less than 5 seconds old; a newer quote does not renew it. The finalized native block may be at most 60 seconds old. These distinct clocks match the existing `EXECUTION_STATE_POLICY` in `src/features/bot-trading/execution-state.ts`; finality lag is not quote receipt age. The minimum output includes venue fees and the existing total 0.5% slippage allowance; deduct only the separate bounded network fee afterward.
- Forecast only the remaining original horizon from the latest completed close. Its price seeds forecasts; the separate native `current_price` values current holdings and entry risk. Ignoring between-hour spot information in the forecast is a coarse model choice, not a guaranteed conservative price bound. Quotes may arrive after the hour without pretending they were available on its boundary. The fixed sampler uses 1,024 paths, seed 20260926, and overlapping non-wrapping six-hour blocks from the 719 frozen residuals. Each candidate sees the same paths. Uniformly sampled block starts do not give all finite-edge residuals equal marginal weight.
- Require positive expected growth of the whole opening allocation and positive expected excess over holding. Value each scenario using reciprocal price before averaging; using reciprocal average price gives a different, incorrect result.
- Include the actual durable peak, current state and immediate minimum-output/fee loss before checking future hourly drawdown. At least 973 of 1,024 modeled paths must pass the 10% cap. The actual live cap remains 10%; the model filter does not permit larger realized losses.
- Check the supplied fee against the immediate no-fill loss floor as well. Establishing the actual fee for a failed transaction and accounting for its later settlement remain the evidence adapter's responsibility.
- Prefer waiting when equality or numerical uncertainty prevents a positive result. Resolve genuine positive-score ties toward the smaller input. The 5% target remains a stopping condition, separate from requiring positive expected growth/excess.

Money and current-state boundaries use exact rational inputs. Stochastic paths and expectations use Decimal precision 80, with an arithmetic guard of `1e-60 × max(1, magnitudes)`. Future modeled drawdown equality or near-equality is rejected conservatively; exact current/entry equality at the cap passes. That guard addresses numerical rounding; it does not account for parameter uncertainty, regime changes, intrahour extrema or execution failures. The path-pass count is a conditional model statistic, not established real-world 95% safety.

## Execution and validation boundary

A selected candidate is neither a prepared order nor a historical fill. Before development evaluation, separately freeze and test an adapter that models data publication, quote arrival, later execution states, minimum-output failures, fee-only failures, deadline expiry, target/pause behavior and all no-fill outcomes. Amount selection must occur before later execution evidence is read. Do not bypass the existing archive reader's one-quote-per-check contract to simulate a multi-quote decision.

The completed training fit and its source bindings remain unchanged. The design and primary evidence are under `output/go-history/tc1-new-strategy-research-20260926/`. Development data remains closed until the entire causal replay is registered. Previously exposed historical development cannot become independent validation; live use requires separate qualification and the user's personal wallet approval.

Run the network-free policy tests with:

```sh
python3 -m unittest discover -s tests/unit/scripts/bots -p 'test_accumulation_admission_policy.py' -v
```
