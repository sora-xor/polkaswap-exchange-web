"""Offline myopic one-buy admission heuristic; never optimal stopping or live authority.

Call ``admit_accumulation`` with a previously fitted immutable Ar1Model, an
original 24-hour episode and externally authenticated contemporaneous quotes.
There is no IO, refit, parameter search, signing or transaction construction.
Waiting means holding the opening allocation until the ORIGINAL deadline; it
does not model the value of a later purchase. All candidate sizes share the same
1024 future paths. A 95% model-path filter neither proves calibrated probability
nor relaxes the actual 10% loss cap. Future risk is observed at hourly points,
including terminal time, not continuously between them. Live 5% target stopping,
next-block execution and actual fee settlement remain external. Immediate
no-fill failure is also checked after debiting the supplied native fee; callers
must establish whether that supplied amount bounds their actual failure fee.

Bootstrap: seed 20260926, SHA256 counter/rejection sampler, uniformly chosen
starts 0..713 in all 719 frozen residuals. Each block consists of six adjacent
training residuals with NO wrap. Concatenate blocks then truncate to the fixed
remaining horizon. All residuals belong to the block corpus; finite-edge
residuals have uneven marginal weights, especially for short horizons.

Opening, quote, current and immediate post-fee accounting use exact Fraction.
Future stochastic arithmetic and expectations use local Decimal precision 80,
ROUND_HALF_EVEN, never float money or a sum of Fraction denominators. Every
strict comparison requires a margin exceeding 1e-60 * max(1, compared magnitudes).
Future drawdown equality/near-equality counts as an ambiguous failed path;
exact current/entry drawdown equality is allowed. Ambiguous growth/excess or
ranking waits. Exact expected ties are recognized only when the mean inverse
price was computed without Decimal inexactness; lower input wins those ties.
This numerical guard is a conservative policy convention, not a formal error
bound for the fitted stochastic model. No path is dropped after numeric failure.
"""

from dataclasses import dataclass
from decimal import Context, Decimal, DecimalException, Inexact, localcontext
from fractions import Fraction
from hashlib import sha256
import re
from typing import Sequence

from scripts.bots.accumulation_stopping_model import (
    Ar1Model, HourlyClose, DRAWDOWN_LIMIT, HOUR_MS, MAX_FEE_RESERVE_XOR, MAX_INPUT_KUSD,
    MAX_HORIZON_HOURS, PRECISION, TRAINING_HOURS, exact,
)


SCENARIO_COUNT = 1024
BLOCK_HOURS = 6
SCENARIO_SEED = 20260926
REQUIRED_PASSING_PATHS = 973  # ceil(95/100 * 1024), evaluated as an integer count.
# Mirrors EXECUTION_STATE_POLICY in src/features/bot-trading/execution-state.ts:
# context-receipt age and finalized chain timestamp are distinct clocks.
MAXIMUM_CONTEXT_AGE_MS_EXCLUSIVE = 5_000
MAXIMUM_FINALIZED_BLOCK_AGE_MS = 60_000
NUMERICAL_GUARD = Decimal("1e-60")
_CONTEXT = Context(prec=PRECISION)
_HASH = re.compile(r"0x[0-9a-f]{64}\Z")


def _timestamp(value: int, label: str, *, hourly: bool = False) -> None:
    if type(value) is not int or value < 0 or (hourly and value % HOUR_MS):
        raise ValueError(f"{label} must be a nonnegative {'hour-aligned ' if hourly else ''}integer timestamp")


def _decimal(value: Fraction) -> Decimal:
    return Decimal(value.numerator) / Decimal(value.denominator)


def _guard(*values: Decimal) -> Decimal:
    return NUMERICAL_GUARD * max(Decimal(1), *(abs(value) for value in values))


@dataclass(frozen=True)
class OpeningPortfolio:
    """Immutable episode funding: at most 10 KUSD plus a separate at most 1 XOR."""

    capital_kusd: Fraction
    fee_reserve_xor: Fraction
    opening_price: Fraction

    def __post_init__(self) -> None:
        for name in ("capital_kusd", "fee_reserve_xor", "opening_price"):
            object.__setattr__(self, name, exact(getattr(self, name)))
        if not 0 < self.capital_kusd <= MAX_INPUT_KUSD:
            raise ValueError("opening capital must be positive and at most 10 KUSD")
        if not 0 <= self.fee_reserve_xor <= MAX_FEE_RESERVE_XOR or self.opening_price <= 0:
            raise ValueError("invalid separate fee reserve or opening price")

    @property
    def value_xor(self) -> Fraction:
        """Opening total value includes the separate reserve exactly once."""
        return self.capital_kusd / self.opening_price + self.fee_reserve_xor


@dataclass(frozen=True)
class AdmissionState:
    """Actual decision time, latest completed close and original durable controls.

    current_price is natural KUSD per XOR at the authenticated native block.
    Quotes bind that block and actual decision time, which may be after the
    hour boundary. Forecasts start the separately supplied latest completed
    hourly close in that same hour; they do not relabel native spot as a close.
    context_received_at_ms retains the original native-context receipt clock;
    a newly received quote cannot extend its exclusive five-second lifetime.
    Ignoring the between-hour spot for forecasting is a fixed coarse input
    choice, not evidence that the forecast is a guaranteed conservative bound.
    target_reached is an authoritative caller flag;
    passive repricing of idle holdings alone must not invent a live target hit.
    The prototype supports only an untouched opening allocation before one buy.
    """

    opening: OpeningPortfolio
    opening_at_ms: int
    deadline_ms: int
    decision_at_ms: int
    current_price: Fraction
    current_peak_xor: Fraction
    latest_completed_close: HourlyClose
    block_hash: str
    block_timestamp_ms: int
    context_received_at_ms: int
    buy_count: int = 0
    goal_stopped: bool = False
    target_reached: bool = False

    def __post_init__(self) -> None:
        if not isinstance(self.opening, OpeningPortfolio):
            raise ValueError("opening portfolio is required")
        for name in ("opening_at_ms", "deadline_ms"):
            _timestamp(getattr(self, name), name, hourly=True)
        _timestamp(self.decision_at_ms, "actual decision time")
        _timestamp(self.block_timestamp_ms, "state block timestamp")
        _timestamp(self.context_received_at_ms, "context receipt timestamp")
        if self.deadline_ms != self.opening_at_ms + MAX_HORIZON_HOURS * HOUR_MS:
            raise ValueError("deadline must be original opening plus 24 hours")
        if self.decision_at_ms < self.opening_at_ms:
            raise ValueError("decision precedes opening")
        if not isinstance(self.latest_completed_close, HourlyClose):
            raise ValueError("latest completed HourlyClose is required")
        if self.latest_completed_close.timestamp_ms > self.decision_at_ms:
            raise ValueError("completed close is in the future")
        if self.latest_completed_close.timestamp_ms != self.decision_at_ms // HOUR_MS * HOUR_MS:
            raise ValueError("latest completed close must belong to the actual decision hour")
        if not isinstance(self.block_hash, str) or not _HASH.fullmatch(self.block_hash):
            raise ValueError("state requires a canonical block hash")
        if self.block_timestamp_ms > self.decision_at_ms:
            raise ValueError("state block is in the future")
        if not self.block_timestamp_ms <= self.context_received_at_ms <= self.decision_at_ms:
            raise ValueError("context receipt must follow its block and not be in the future")
        if type(self.buy_count) is not int or not 0 <= self.buy_count <= 1:
            raise ValueError("one-buy prototype requires buy_count zero or one")
        if type(self.goal_stopped) is not bool or type(self.target_reached) is not bool:
            raise ValueError("stop and target flags must be booleans")
        object.__setattr__(self, "current_price", exact(self.current_price))
        object.__setattr__(self, "current_peak_xor", exact(self.current_peak_xor))
        if self.current_price <= 0 or self.current_peak_xor < self.opening.value_xor:
            raise ValueError("invalid current price or durable opening peak")
        if self.buy_count == 0 and self.current_peak_xor < self.current_value_xor:
            raise ValueError("durable peak must include the current valuation")

    @property
    def remaining_hours(self) -> int:
        """Remaining completed-hour steps to the immutable original deadline."""
        return max(0, (self.deadline_ms - self.latest_completed_close.timestamp_ms) // HOUR_MS)

    @property
    def current_value_xor(self) -> Fraction:
        """Value of still-untouched opening holdings before the permitted first buy."""
        return self.opening.capital_kusd / self.current_price + self.opening.fee_reserve_xor


@dataclass(frozen=True)
class QuoteCandidate:
    """Exact externally verified native quote; price_impact is a ratio, not percent.

    minimum_output_xor already includes venue costs and permitted slippage.
    Only network_fee_xor is debited separately. Timestamps establish causality
    here; authenticity, route/asset identity and execution feasibility are the
    caller's responsibility and are never inferred from these data fields.
    observed_at_ms is receipt time: its age must be strictly below five seconds,
    while the finalized native block may be at most sixty seconds old.
    """

    input_kusd: int
    minimum_output_xor: Fraction
    network_fee_xor: Fraction
    price_impact: Fraction
    block_hash: str
    block_timestamp_ms: int
    observed_at_ms: int
    expires_at_ms: int

    def __post_init__(self) -> None:
        if type(self.input_kusd) is not int:
            raise ValueError("candidate input must be an integer KUSD size")
        for name in ("minimum_output_xor", "network_fee_xor", "price_impact"):
            object.__setattr__(self, name, exact(getattr(self, name)))
        if self.minimum_output_xor <= 0 or self.network_fee_xor < 0 or self.price_impact < 0:
            raise ValueError("invalid quote output, fee or impact")
        if not isinstance(self.block_hash, str) or not _HASH.fullmatch(self.block_hash):
            raise ValueError("quote requires a canonical block hash")
        for name in ("block_timestamp_ms", "observed_at_ms", "expires_at_ms"):
            _timestamp(getattr(self, name), name)
        if self.observed_at_ms < self.block_timestamp_ms or self.expires_at_ms <= self.observed_at_ms:
            raise ValueError("quote observation/expiry ordering is invalid")


@dataclass(frozen=True)
class CandidateAdmission:
    """Retained admission/rejection diagnostics, including all modeled failures."""

    input_kusd: int
    admitted: bool
    reasons: tuple[str, ...]
    post_entry_value_xor: Fraction | None = None
    expected_terminal_xor: Decimal | None = None
    expected_growth_xor: Decimal | None = None
    expected_excess_xor: Decimal | None = None
    passing_paths: int = 0
    ambiguous_paths: int = 0
    failed_attempt_value_xor: Fraction | None = None


@dataclass(frozen=True)
class AdmissionDecision:
    """Research-only choice; wait never grants execution or changes the goal."""

    action: str
    selected_input_kusd: int | None
    reason: str
    expected_wait_terminal_xor: Decimal | None
    candidates: tuple[CandidateAdmission, ...]
    scenario_count: int = 0
    wait_passing_paths: int = 0
    wait_ambiguous_paths: int = 0
    seed: int = SCENARIO_SEED


def _validate_model(model: Ar1Model, state: AdmissionState) -> None:
    if not isinstance(model, Ar1Model):
        raise ValueError("a frozen AR(1) model is required")
    _timestamp(model.training_start_ms, "model start", hourly=True)
    _timestamp(model.training_end_ms, "model cutoff", hourly=True)
    if model.training_end_ms - model.training_start_ms != (TRAINING_HOURS - 1) * HOUR_MS:
        raise ValueError("model must contain the fixed 720-close training window")
    if model.training_end_ms > state.decision_at_ms:
        raise ValueError("future training model")
    if model.training_end_ms > state.opening_at_ms:
        raise ValueError("training model must be frozen no later than episode opening")
    values = (model.intercept, model.phi, model.equilibrium_log_price, model.equilibrium_price)
    if any(not isinstance(value, Decimal) or not value.is_finite() for value in values):
        raise ValueError("model coefficients must be finite Decimal values")
    if not 0 < model.phi < 1 or model.equilibrium_price <= 0:
        raise ValueError("unstable AR(1) model")
    if not isinstance(model.residuals, tuple) or len(model.residuals) != TRAINING_HOURS - 1:
        raise ValueError("all 719 immutable training residuals are required")
    if any(not isinstance(value, Decimal) or not value.is_finite() for value in model.residuals):
        raise ValueError("residuals must be finite Decimal values")


def residual_block_starts(horizon_hours: int) -> tuple[tuple[int, ...], ...]:
    """Fixed unbiased SHA256 sampler over all 714 overlapping non-wrapping blocks."""
    if type(horizon_hours) is not int or not 1 <= horizon_hours <= MAX_HORIZON_HOURS:
        raise ValueError("scenario horizon must be an integer from 1 to 24")
    count = TRAINING_HOURS - BLOCK_HOURS
    ceiling = (1 << 256) - ((1 << 256) % count)
    per_path = (horizon_hours + BLOCK_HOURS - 1) // BLOCK_HOURS
    counter = 0
    paths = []
    for _ in range(SCENARIO_COUNT):
        starts = []
        while len(starts) < per_path:
            value = int.from_bytes(sha256(f"{SCENARIO_SEED}:{counter}".encode("ascii")).digest(), "big")
            counter += 1
            if value < ceiling:
                starts.append(value % count)
        paths.append(tuple(starts))
    return tuple(paths)


def generate_scenarios(model: Ar1Model, state: AdmissionState) -> tuple[tuple[Decimal, ...], ...]:
    """Generate 1024 common hourly paths to the original deadline, without refitting."""
    _validate_model(model, state)
    if not state.remaining_hours:
        raise ValueError("episode is expired")
    starts = residual_block_starts(state.remaining_hours)
    try:
        with localcontext(_CONTEXT):
            initial_log = _decimal(state.latest_completed_close.price).ln()
            paths = []
            for blocks in starts:
                innovations = tuple(value for start in blocks for value in model.residuals[start:start + BLOCK_HOURS])
                current_log, prices = initial_log, []
                for innovation in innovations[:state.remaining_hours]:
                    current_log = model.intercept + model.phi * current_log + innovation
                    price = current_log.exp()
                    if not price.is_finite() or price <= 0:
                        raise ValueError("nonfinite scenario price")
                    prices.append(price)
                paths.append(tuple(prices))
            return tuple(paths)
    except DecimalException as error:
        raise ValueError("scenario arithmetic outside the finite Decimal domain; no paths retained") from error


def _quote_reasons(quote: QuoteCandidate, state: AdmissionState) -> tuple[str, ...]:
    reasons = []
    if not 1 <= quote.input_kusd <= 9 or quote.input_kusd >= state.opening.capital_kusd:
        reasons.append("not_a_partial_integer_size")
    if quote.price_impact > Fraction(1, 100):
        reasons.append("price_impact_exceeded")
    if quote.network_fee_xor > state.opening.fee_reserve_xor:
        reasons.append("fee_reserve_exceeded")
    if quote.block_hash != state.block_hash or quote.block_timestamp_ms != state.block_timestamp_ms:
        reasons.append("quote_state_mismatch")
    if quote.observed_at_ms > state.decision_at_ms or quote.block_timestamp_ms > state.decision_at_ms:
        reasons.append("future_quote")
    if quote.observed_at_ms < state.context_received_at_ms:
        reasons.append("quote_precedes_context")
    if state.decision_at_ms - quote.observed_at_ms >= MAXIMUM_CONTEXT_AGE_MS_EXCLUSIVE:
        reasons.append("stale_quote")
    if state.decision_at_ms - quote.block_timestamp_ms > MAXIMUM_FINALIZED_BLOCK_AGE_MS:
        reasons.append("stale_quote_block")
    if state.decision_at_ms >= quote.expires_at_ms:
        reasons.append("expired_quote")
    return tuple(reasons)


def _inverse_paths(paths: Sequence[Sequence[Decimal]], hours: int):
    if len(paths) != SCENARIO_COUNT or any(len(path) != hours for path in paths):
        raise ValueError("exactly 1024 complete common paths to the original deadline required")
    inverses, exact_mean = [], True
    with localcontext(_CONTEXT) as context:
        terminal_sum = Decimal(0)
        for path in paths:
            inverse = []
            for price in path:
                if not isinstance(price, Decimal) or not price.is_finite() or price <= 0:
                    raise ValueError("all scenario prices must be finite positive Decimals")
                context.clear_flags()
                inverse.append(Decimal(1) / price)
                if len(inverse) == hours:
                    exact_mean = exact_mean and not context.flags[Inexact]
            context.clear_flags()
            terminal_sum += inverse[-1]
            exact_mean = exact_mean and not context.flags[Inexact]
            inverses.append(tuple(inverse))
        context.clear_flags()
        mean = terminal_sum / SCENARIO_COUNT
        exact_mean = exact_mean and not context.flags[Inexact]
    return tuple(inverses), mean, Fraction(mean) if exact_mean else None


def _path_risk(inverses, remaining: Fraction, constant: Fraction, initial_peak: Fraction):
    """Count full hourly paths; an ambiguous or failed hour fails that whole path."""
    passed = ambiguous = 0
    capital, fixed, peak_start = _decimal(remaining), _decimal(constant), _decimal(initial_peak)
    for path in inverses:
        peak, path_ambiguous, safe = peak_start, False, True
        for inverse in path:
            value = capital * inverse + fixed
            if not value.is_finite():
                raise ValueError("nonfinite portfolio path")
            peak = max(peak, value)
            floor = Decimal("0.9") * peak
            if value - floor <= _guard(value, floor):
                safe = False
                path_ambiguous = path_ambiguous or abs(value - floor) <= _guard(value, floor)
        passed += int(safe)
        ambiguous += int(path_ambiguous)
    return passed, ambiguous


def _evaluate_scenarios(state: AdmissionState, quotes: Sequence[QuoteCandidate], paths) -> AdmissionDecision:
    """Internal evaluation seam for synthetic fixtures; public admission always generates paths."""
    try:
        with localcontext(_CONTEXT):
            inverses, mean_inverse, exact_mean_inverse = _inverse_paths(paths, state.remaining_hours)
            opening = _decimal(state.opening.value_xor)
            capital, reserve = state.opening.capital_kusd, state.opening.fee_reserve_xor
            wait_value = _decimal(capital) * mean_inverse + _decimal(reserve)
            wait_passed, wait_ambiguous = _path_risk(inverses, capital, reserve, state.current_peak_xor)
            evaluations, admitted = [], []
            for quote in sorted(quotes, key=lambda item: item.input_kusd):
                reasons = list(_quote_reasons(quote, state))
                if reasons:
                    evaluations.append(CandidateAdmission(quote.input_kusd, False, tuple(reasons)))
                    continue
                remaining = capital - quote.input_kusd
                net = quote.minimum_output_xor - quote.network_fee_xor
                fixed = reserve + net
                entry = remaining / state.current_price + fixed
                if entry < (1 - DRAWDOWN_LIMIT) * state.current_peak_xor:
                    evaluations.append(CandidateAdmission(quote.input_kusd, False, ("entry_drawdown_exceeded",), entry))
                    continue
                failed_value = state.current_value_xor - quote.network_fee_xor
                if failed_value < (1 - DRAWDOWN_LIMIT) * state.current_peak_xor:
                    evaluations.append(CandidateAdmission(
                        quote.input_kusd, False, ("failed_attempt_drawdown_exceeded",), entry,
                        failed_attempt_value_xor=failed_value,
                    ))
                    continue
                passed, ambiguous = _path_risk(inverses, remaining, fixed, max(state.current_peak_xor, entry))
                terminal = _decimal(remaining) * mean_inverse + _decimal(fixed)
                growth = terminal - opening
                # Subtract the same mean inverse-price value, not value at mean price.
                excess = _decimal(net) - Decimal(quote.input_kusd) * mean_inverse
                if growth <= _guard(terminal, opening):
                    reasons.append("expected_growth_not_robustly_positive")
                if excess <= _guard(terminal, wait_value):
                    reasons.append("expected_excess_not_robustly_positive")
                if passed < REQUIRED_PASSING_PATHS:
                    reasons.append("model_path_drawdown_filter_failed")
                result = CandidateAdmission(quote.input_kusd, not reasons, tuple(reasons), entry, terminal, growth, excess, passed, ambiguous, failed_value)
                evaluations.append(result)
                if result.admitted:
                    admitted.append((result, quote))
            if not admitted:
                return AdmissionDecision("wait", None, "no_candidate_admitted", wait_value, tuple(evaluations), SCENARIO_COUNT, wait_passed, wait_ambiguous)
            admitted.sort(key=lambda pair: (-pair[0].expected_terminal_xor, pair[0].input_kusd))
            best, best_quote = admitted[0]
            for other, other_quote in admitted[1:]:
                difference = best.expected_terminal_xor - other.expected_terminal_xor
                if difference <= _guard(best.expected_terminal_xor, other.expected_terminal_xor):
                    exact_difference = None if exact_mean_inverse is None else (
                        best_quote.minimum_output_xor - best_quote.network_fee_xor
                        - other_quote.minimum_output_xor + other_quote.network_fee_xor
                        - (best_quote.input_kusd - other_quote.input_kusd) * exact_mean_inverse
                    )
                    if exact_difference != 0:
                        return AdmissionDecision("wait", None, "numerically_ambiguous_ranking", wait_value, tuple(evaluations), SCENARIO_COUNT, wait_passed, wait_ambiguous)
                    if other.input_kusd < best.input_kusd:
                        best, best_quote = other, other_quote
            return AdmissionDecision("buy", best.input_kusd, "myopic_model_admission_only", wait_value, tuple(evaluations), SCENARIO_COUNT, wait_passed, wait_ambiguous)
    except DecimalException as error:
        raise ValueError("portfolio arithmetic outside the finite Decimal domain; no admission") from error


def admit_accumulation(model: Ar1Model, state: AdmissionState, quotes: Sequence[QuoteCandidate]) -> AdmissionDecision:
    """Choose wait or one fixed partial buy using the same 1024 model paths.

    At most nine distinct integer-size candidates are accepted. A stopped,
    already-targeted, expired or already-bought goal never receives another buy.
    Quotes are observations, not assumed executions; callers must subsequently
    enforce real loss controls, fresh executable minima, fees and personal
    authorization. This function is an offline admission heuristic only.
    """
    if not isinstance(state, AdmissionState):
        raise ValueError("validated admission state is required")
    _validate_model(model, state)
    if len(quotes) > 9 or any(not isinstance(quote, QuoteCandidate) for quote in quotes):
        raise ValueError("at most nine typed native quotes are permitted")
    if len({quote.input_kusd for quote in quotes}) != len(quotes):
        raise ValueError("duplicate candidate input size")
    reason = (
        "goal_stopped" if state.goal_stopped else
        "target_already_reached" if state.target_reached else
        "episode_expired" if not state.remaining_hours else
        "already_bought" if state.buy_count else
        "stale_current_state" if state.decision_at_ms - state.block_timestamp_ms > MAXIMUM_FINALIZED_BLOCK_AGE_MS else
        "stale_current_context" if state.decision_at_ms - state.context_received_at_ms >= MAXIMUM_CONTEXT_AGE_MS_EXCLUSIVE else
        "current_drawdown_exceeded" if state.current_value_xor < (1 - DRAWDOWN_LIMIT) * state.current_peak_xor else
        "no_candidates" if not quotes else None
    )
    if reason:
        return AdmissionDecision("wait", None, reason, None, ())
    return _evaluate_scenarios(state, quotes, generate_scenarios(model, state))
