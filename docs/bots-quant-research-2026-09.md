# Bots research and delivery goals — September 2026

Research cutoff: **15 September 2026**. This is a selected review of accessible primary publications, with dates checked on the originating pages. It does not establish a universal best trading algorithm. The research below motivates independently implemented, explainable building blocks; the example parameters have no demonstrated profitability on Polkaswap.

The existing execution, composability, history, arithmetic, and backtest contracts are documented in [Composable bot strategies](bot-composable-strategies.md). That document also records the exact Ivan Idris repository revision and available Internet Archive evidence. The user's additional reference to **spring constants** makes restoring-force ideas an explicit design goal. The specific Idris spring article has not been verified; the first-order diagnostic below is independently designed and is not attributed to his code.

## 1. Springs: useful hypothesis, measurable assumptions

A spring suggests that a stretched relationship may pull back toward an equilibrium. Two mathematical models must stay distinct:

- A Hooke-style oscillator describes **acceleration**, for example `acceleration = −k × displacement − damping × velocity + noise`.
- An Ornstein–Uhlenbeck (OU) process describes **first-order drift**: `dX = κ × (m − X) × dt + σ × dW`. Here `m` is an assumed equilibrium, `κ` is a reversion rate, and `σ × dW` is noise. It does not model inertial oscillation.

Avellaneda and Lee use OU dynamics for residuals after removing equity risk factors. Their results concern market-neutral portfolios and show substantial variation across periods. Applying that model directly to a single token's price requires a separate empirical justification. [Author-hosted working paper, 15 June 2009](https://math.nyu.edu/inmemoriam/avellaneda/AvellanedaLeeStatArb20090616.pdf)

Leung and Li derive entry/exit regions for an assumed OU spread with transaction costs and a stop-loss constraint. The useful product lesson is to study the displacement, the restoring tendency, and the execution cost together. Their optimality result depends on the process and trading assumptions; an arbitrary percentage dip does not inherit it. [Primary preprint, first submitted 18 November 2014](https://arxiv.org/abs/1411.5062)

### Implemented restoring-tendency condition

The `restoring` condition fits `ΔC[i] = a + b × C[i−1] + error` on **N prior transitions**, with an intercept and with the latest decision close excluded. It needs `N+2` closes, counting that current close. Its value is `−100 × b`, a percent-scaled discrete restoring coefficient. The exact slope is `(N × sum(xy) − sum(x) × sum(y)) / (N × sum(x²) − sum(x)²)`, where `x` is a lagged close and `y` its following price change. Integer fractions decide comparisons before display rounding.

Writing `k = −b`, positive persistence consistent with a sampled OU process requires `0 < k < 1`, since its AR(1) coefficient is `1−k`. The spring recipe therefore gates the displayed value strictly between `0` and `100`. This is a descriptive local fit, not a stationarity test, a physical spring constant, or an estimated probability of reversion. The fitted equilibrium would be `−a/b` when it exists, but the app does not estimate or display it; displacement uses the separately defined rolling-mean deviation.

For a constant sampling interval `Δt`, the continuous-time interpretation would be `κ = −log(1−k)/Δt`; the app does not calculate that rate or a half-life. Uniform timestamp spacing is required over the full `N+2`-close window, including the step to the current close. A missing interval or zero regression variance produces unavailable evidence. Near-zero stiffness would make an inferred equilibrium unstable. A fitted pull toward a mean can disappear after a regime change; no current-price signal supplies a guaranteed rebound or loss bound.

An actual second-order spring condition would require separately documenting its finite-difference acceleration, displacement reference, regression window, and damping. It is not part of this implementation.

The spring recipe enters when its 48-transition restoring value is strictly between `0` and `100`, its 48-close mean deviation is below `−2%`, and its two-observation momentum is above `0%`. It exits when deviation is above `0%` or its 48-close drawdown is below `−8%`. Warm-up is 50 closes. These example thresholds are untuned. The drawdown exit follows existing fixed-amount, next-observation execution semantics and cannot cap a loss at 8%.

## 2. What the frontier adds as of the cutoff

| Primary source and checked date | What it contributes | Implication for this Bots page |
| --- | --- | --- |
| [Optimal Trading of Microstructure Mean Reversion](https://arxiv.org/abs/2608.00885v1), 1 August 2026, theoretical preprint | Models a seconds-scale mid-price gap around an observable efficient price and derives a trading band on a diffusion surrogate. The jump-process optimality claim remains a conjecture; timing error is heuristic. | Costs influence the useful width of a reversion band. The required efficient-price gap and tick-book data are absent from hourly closes, so this exact algorithm is research-only. |
| [TimesFM-3](https://research.google/blog/timesfm-3-a-zero-shot-foundation-model-for-multivariate-forecasting/), Google Research, 31 August 2026 | A 330-million-parameter model with multivariate, covariate, and quantile forecasts; Google reports leading results on three public forecasting benchmarks. | A credible recent forecasting frontier, but the benchmarks do not establish profitable spot trading. Keep model inference as a separately evaluated future project. |
| [FinVerse v2](https://arxiv.org/abs/2608.03259v2), 20 August 2026, benchmark preprint | Evaluates 43 public forecasting models with financial metrics and reports that generic forecasting strength does not consistently transfer to useful financial forecasts. | Assess actual executable portfolios, costs, drawdown, and passive baselines, alongside indicator behavior. A forecast score or win fraction cannot substitute for them. |
| [Conformal Kelly](https://arxiv.org/abs/2608.01494v1), 2 August 2026, preprint | Uses uncertainty widths in position sizing and reports a preregistered holdout after approximately 200 explored configurations. Calibration held on the holdout; growth lagged its passive comparators. | Preserve frozen study specifications and disclose selection. Historical quantiles in this app are descriptive statistics, not conformal intervals or a calibrated probability of profit. |
| [Robust Reinforcement Learning in Finance](https://papers.neurips.cc/paper_files/paper/2025/file/3c129892b4f9c8326aba665425a470c5-Paper-Conference.pdf), NeurIPS 2025 | Incorporates directional market-impact uncertainty in policy evaluation. The paper acknowledges approximate impact simulation and untested robustness as trading frequency increases. | Explicit slippage/fee assumptions are necessary but do not reconstruct historical market impact. A trained execution policy needs a validated execution environment. |
| [Financially Guided Deep Portfolio Optimization](https://arxiv.org/abs/2605.28853v1), 16 May 2026, preprint | Trains portfolio weights against financial objectives, including tail-risk and risk-parity terms, using expanding walk-forward equity data and spread costs. | Keep direction, exposure, and execution as distinct decisions. A one-pair condition editor does not reproduce a trained multi-asset portfolio optimizer. |

These sources span forecasting, statistical arbitrage, position sizing, and execution. Their benchmarks use different universes, horizons, assumptions, and objectives; ranking their headline returns against one another would not produce a meaningful state-of-the-art leaderboard. The practical inference is to combine transparent signals, test after costs, and preserve untouched future observations before expanding complexity.

## 3. Additional mixable building blocks

The three further deterministic additions complement `restoring`, bringing the library to ten condition types and nine recipes. Let `C[t]` be the latest completed positive close, and let the `N` changes end at `t`.

| Block | Exact definition | Role and edge behavior |
| --- | --- | --- |
| Path efficiency | `100 × abs(C[t]−C[t−N]) / sum(abs(C[i]−C[i−1]))` over the last `N` changes | Measures how direct a move was, independent of its direction. Needs `N+1` closes; flat paths are `0`. A monotonic fall also scores `100`, so combine with a directional rule. |
| Simple-window RSI | `100 × sum(positive changes) / sum(abs(changes))` over the last `N` changes | Measures gain/loss balance. Needs `N+1` closes; a flat path is `50`. This finite-window convention uses no Wilder smoothing. Low values are not evidence that a rebound must occur. |
| Drawdown from recent high | `100 × (C[t] / max(last N closes including C[t]) − 1)` | Describes distance below a rolling high. Needs `N` closes; a current high is `0`. This is not portfolio drawdown, a position's trailing stop, or a maximum-loss guarantee. |

The five new recipe families are:

- **Spring (`spring`):** historical restoring tendency, a dip below the mean, and a short positive move; exit on mean recovery or a decline from the rolling high.
- **Persistent trend (`persistent`):** directional momentum and trend alignment, with a minimum path-efficiency condition; exit on loss of trend or efficiency.
- **Range rebound (`range`):** low efficiency, low simple-window RSI, and negative mean deviation; exit on RSI recovery or a decline from the rolling high. Continued repricing can defeat the rebound hypothesis.
- **Pullback recovery (`rebound`):** a longer uptrend, drawdown between two negative thresholds, and a short positive move; exit on high RSI or failure of the longer trend.
- **Quiet expansion (`expansion`):** a breakout, low preceding-return MAD, and sufficient path efficiency; exit on a lower-channel break or high RSI.

The authoritative editable definitions are in `src/features/bot-trading/rule-recipes.ts`. The four existing trend, breakout, dip, and quiet recipes remain available.

Related indicators are not independent evidence. `all` and `any` combine level predicates, not probability estimates. The existing engine can repeat fixed-amount entries on later eligible observations; recipe names must not imply one-time crosses or automatic full liquidation.

## 4. Delivery acceptance goals

| Goal | Acceptance evidence |
| --- | --- |
| **G1 — Ground the strategies** | Record primary links, exact publication/capture dates, formula conventions, unavailable sources, and the difference between original Idris material, independently designed spring ideas, and frontier research. |
| **G2 — Expand composition** | Add restoring tendency, path efficiency, simple-window RSI, and drawdown, plus five editable recipes (ten conditions and nine recipes total); preserve the existing all/any editor and rule/share parsing behavior. |
| **G3 — Keep financial behavior exact** | Tests cover exact comparisons, ties, flat/monotonic/choppy paths, invalid configuration, insufficient history, chronology, exclusion of the current close from spring fitting, irregular cadence, and singular regression. Runtime and research use the same bounded evaluator. |
| **G4 — Make the lab feel tactile** | Use raised/inset neumorphic surfaces, restrained neon accents, and motion that explains flow or selection. Verify keyboard focus, narrow layouts, light/dark themes, and reduced-motion behavior. |
| **G5 — Validate the integration** | Run relevant unit tests, translation checks, the static build, and local browser checks of recipe selection, editing, and evidence. Distinguish synthetic engineering fixtures from historical market results. |
| **G6 — Preserve honest research** | Keep next-observation fills, explicit costs, frozen composed-rule studies, chronological held-out evaluation, and passive comparisons. Do not claim unrun profitability validation or silently optimize recipes after viewing held-out data. |

These are acceptance criteria, not assertions that verification has already passed. Final execution evidence belongs with the implementation/test report. Frontier model training, multi-asset neutral portfolios, and order-book microstructure execution require additional data and a separate validated runtime before they can become product features.

### Scoped translation evidence

All 23 new strings are present in all 30 non-English main catalogs, with full key parity and matching runtime tokens. The public translation endpoint returned HTTP 429 for every bounded request. Consequently, 27 ordinary catalogs contain nine manually localized label drafts and fourteen English explanatory fallbacks each; those labels still need specialist/native review. Akkadian and Egyptian use the established convention of existing localized terms plus mathematical adaptations for all 23 strings. Pijin retains its existing English fallback convention. These adaptations do not claim full translations of the explanatory prose.

The final scoped audit found no missing/extra main-catalog keys, token mismatches, or forbidden Latin characters in the new Akkadian/Egyptian strings. Cuneiform enforcement passed. The highest complete-catalog English-match ratio was 7.9347%, below the unchanged 8% test limit. Evidence is recorded in `output/bots-quant-september/translation-final-audit.json`, `translation-report.json`, and `manual-labels-report.json`. The full translation test-suite result belongs with the integration validation report.
