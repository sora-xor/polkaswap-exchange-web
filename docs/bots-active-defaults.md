# Active defaults for new bot studies

`createLabDefaultSettings(now)` in `src/features/bot-trading/lab-config.ts` creates a fresh research draft for first entry or an explicit reset. Restoring or reviewing a saved study retains that study's recorded settings.

| Setting | New Lab study | Meaning |
| --- | --- | --- |
| Strategy | Moving-average crossover | A two-way rule: buy on an upward crossing and sell on a downward crossing. An elapsed timer alone does not cause a trade. |
| Signal timing | Live price | New live bots compare completed hourly history plus one current-hour price observation. Windows remain measured in hours; repeated quotes do not become extra hourly bars. |
| Minimum trade gap | 1 minute / 10 nominal blocks | Permits frequent responses to signals. It is neither a trade schedule nor a promise of one trade per minute. |
| Order | 10% of the initial input allocation | Keeps order size unchanged. Making orders smaller would increase fixed network fees as a proportion of each order. |
| History | Last 90 days, bounded by verified archive availability | More observations without inventing missing data. |
| Validation | Walk-forward, first 60% for training, three later tests | A complete 90-day history gives roughly 12 days per test. Tests retain the observed hourly resolution and do not validate intrahour fills. |
| Tuning | Off | Does not pick parameters by searching for the best historical return. |
| Slippage allowance | 0.5% | Retains the existing per-order allowance and simulation assumption. |
| Maximum live price impact | 1% for new templates | Rejects quotes above the limit instead of accepting the former 3% default. Existing reviewed policies remain unchanged. |
| Network fee allocation | 1 XOR | A ceiling and reserved balance, not a fee quote. Actual fees come from the selected route and verified chain state. |

The initial 100-token amount is an editable simulation allocation, not an account percentage. Changing the input token changes its unit, so the token remains visible beside the amount. Live setup requires a fresh wallet funding review before starting. The market remains XOR/VAL unless the user chooses another pair.

The hourly historical test cannot establish the performance or trading frequency of the live-price variant between hourly closes. Live-price SMA is an explicit setting on new Lab drafts. An existing SMA without `signalTiming`, or with `signalTiming: 'closed-hour'`, retains completed-hour decisions. The settings object may retain a timing preference while the user switches presets; `createPlaygroundBot` writes it into the execution strategy only for SMA. Changing defaults never changes an existing bot or authorized session.

Frequent crossings can produce frequent losing trades and fees in a sideways market. Entry and exit signals, fee ceilings, allocation limits, fresh quote checks, impact limits and wallet approval still apply. The interface describes the strategy and observed results without labeling any preset profitable or safe.

## Public links

Opening a new Lab without a strategy query selects SMA. Explicit `strategy=dca`, `strategy=threshold` and `strategy=sma` links preserve their choices. Generated links include every explicit preset so future changes to the initial preset do not change a shared choice. The standalone historical playground retains its separate DCA selection and a one-minute initial trade gap.

## Verification

- Fresh default drafts are independent and use completed UTC hours; invalid clock values are rejected.
- A flat-price fixture creates no SMA crossover trades even after the minute trade gap has elapsed, and incurs no simulated trading fees.
- A complete 90-day fixture produces three held-out windows longer than 11 days, with no parameter search or higher-resolution observations invented.
- A new template accepts a quote at 1% price impact and rejects 1.0001%. A separately authored existing 3% policy remains unchanged.
- Signal timing is copied only to SMA, supports explicit completed-hour behavior, rejects unknown values, and leaves legacy omission intact.
