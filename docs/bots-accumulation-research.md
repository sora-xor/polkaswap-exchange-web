# Cost-aware accumulation research

This offline prototype studies partial KUSD purchases of XOR while retaining the option to wait. It is not connected to Bots, cannot sign or submit transactions, and cannot qualify a live strategy. The current tc1 budget, fee reserve, risk limits and 24-hour horizon are unchanged.

`scripts/bots/accumulation_stopping_model.py` provides:

- One fixed OLS AR(1) fit on exactly 720 contiguous hourly log prices. Decimal precision is 80; rejected numerical fits retain diagnostic coefficients. Forecasts are conditional log-mean paths unless the caller supplies explicit innovations. They are not calibrated expected prices or probabilities.
- Exact rational accounting for a single partial buy. Quoted minimum output includes pool fees and allowed slippage; the separate network fee is deducted once from the XOR reserve. The economic interval requires positive opening growth and excess over holding, separately from the 5% target. Terminal checks do not replace full-path drawdown checks.
- Exact expectations over explicitly supplied weighted price scenarios. The implementation values each scenario before averaging because expected reciprocal price differs from the reciprocal of expected price.

`scripts/bots/collect_accumulation_stopping_history.py` preserves bounded public-indexer requests and responses. Its offline parser bundle uses the existing TypeScript `parseIndexedPoolHistoryWithEvidence`; it does not replace that parser with a weaker proof interpretation. Stage 1 allows only the fixed training partition. Development and validation reads, retries and redirects are refused. Indexed second-resolution pool evidence is not an executable quote or proof of millisecond arrival timing.

`scripts/bots/fit_accumulation_stopping_training.py` verifies the sealed source bindings, explicit training digest and exact 720 timestamps, replays the frozen parser, and retains one fit or its failure. Output directories are single use. It performs no network requests and never tries an alternative model or window after a failed fit.

## Running the fixed training stage

First prepare the parser offline:

```sh
python3 scripts/bots/collect_accumulation_stopping_history.py prepare-parser --directory <new-parser-directory>
```

Before requesting market data, exclusively create a registration containing the returned `historyCollector` specification, the exact `dataAccess` boundary, the driver's `FIT_SPECIFICATION`, canonical absolute `historyAcquisitionDirectory` and `fitOutputDirectory` paths, and SHA-256 bindings for the protocol, source and tests. The collector requires the canonical body digest and whole-registration digest; never overwrite a registration or reuse an acquisition directory. The fixed experiment protocol and its exposure history are recorded under `output/go-history/tc1-new-strategy-research-20260926/`.

```sh
python3 scripts/bots/collect_accumulation_stopping_history.py collect \
  --partition training --registration <registration.json> \
  --registration-sha256 <registration-file-sha256> --output <new-acquisition-directory>

python3 scripts/bots/fit_accumulation_stopping_training.py \
  --registration <registration.json> --registration-sha256 <registration-file-sha256> \
  --training <acquisition-directory>/training.json --training-sha256 <training-file-sha256> \
  --output <new-fit-directory>
```

An admissible fit does not authorize development acquisition or live trading. The fitted model and a complete causal decision/execution protocol must be sealed before a separate development stage. These historical training/development dates include earlier exposed calibration; they must never be relabeled independent validation.

Run the deterministic, network-free tests with:

```sh
python3 -m unittest discover -s tests/unit/scripts/bots -p 'test_*accumulation*py' -v
```
