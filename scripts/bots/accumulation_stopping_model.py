"""Offline H1 research primitives; never a live signal or qualification decision.

Prices are natural KUSD per XOR and timestamps are UTC epoch milliseconds at
which an hourly close was complete and available (not candle start times).
Callers must authenticate timestamps, prices, native quotes, fees and asset
decimals externally. There is no IO, fitting search, rounding to token units,
transaction construction or execution in this module.

Fit exactly 720 contiguous completed training closes once, then retain the
frozen model. Forecasts use 80-digit Decimal logs and exponentials. The default
forecast is a conditional log-mean path, NOT an expected price or calibrated
distribution. Explicit innovation paths allow a separately registered sampler;
this module does not choose a bootstrap scheme or estimate probabilities.

Money, price ratios and scenario expectations use exact Fraction arithmetic.
The economic interval checks terminal growth/excess and the current peak only;
full-path drawdown, quote validity, impact and existing qualification checks
remain external. A 5% target hit is distinct from positive growth/excess.
"""

from dataclasses import dataclass
from decimal import Context, Decimal, DecimalException, localcontext
from fractions import Fraction
from types import MappingProxyType
from typing import Sequence


PRECISION = 80
TRAINING_HOURS = 720
HOUR_MS = 3_600_000
MAX_HORIZON_HOURS = 24
MAX_INPUT_KUSD = Fraction(10)
MAX_FEE_RESERVE_XOR = Fraction(1)
DRAWDOWN_LIMIT = Fraction(1, 10)
TARGET_GAIN = Fraction(1, 20)
_CONTEXT = Context(prec=PRECISION)
Exact = Fraction | Decimal | str | int


def exact(value: Exact) -> Fraction:
    """Parse natural units losslessly; reject floats, booleans and nonfinite values."""
    if isinstance(value, bool) or not isinstance(value, (Fraction, Decimal, str, int)):
        raise ValueError("amounts must be exact Fraction, Decimal, decimal string or integer")
    try:
        if isinstance(value, str):
            value = Decimal(value)
        if isinstance(value, Decimal) and not value.is_finite():
            raise ValueError("amounts must be finite")
        return Fraction(value)
    except (DecimalException, ValueError, TypeError, OverflowError) as error:
        raise ValueError("invalid exact amount") from error


def natural_from_codec(value: int | str, decimals: int) -> Fraction:
    """Convert a nonnegative canonical integer codec amount using explicit decimals."""
    if type(decimals) is not int or not 0 <= decimals <= 38:
        raise ValueError("decimals must be an integer in [0, 38]")
    if type(value) is int:
        codec = value
    elif isinstance(value, str) and value.isascii() and value.isdigit() and (value == "0" or not value.startswith("0")):
        codec = int(value)
    else:
        raise ValueError("codec amount must be a canonical nonnegative integer")
    if codec < 0:
        raise ValueError("codec amount must be nonnegative")
    return Fraction(codec, 10**decimals)


def _decimal(value: Exact) -> Decimal:
    ratio = exact(value)
    with localcontext(_CONTEXT):
        return Decimal(ratio.numerator) / Decimal(ratio.denominator)


def _hour(value: int, label: str) -> int:
    if type(value) is not int or value < 0 or value % HOUR_MS:
        raise ValueError(f"{label} must be a nonnegative completed-hour timestamp")
    return value


@dataclass(frozen=True)
class HourlyClose:
    """One complete price observation; natural-unit price must be strictly positive."""

    timestamp_ms: int
    price: Fraction

    def __post_init__(self) -> None:
        _hour(self.timestamp_ms, "close timestamp")
        object.__setattr__(self, "price", exact(self.price))
        if self.price <= 0:
            raise ValueError("close price must be positive")


@dataclass(frozen=True)
class Ar1Model:
    """Frozen OLS fit of log price: y(next) = intercept + phi*y + innovation."""

    intercept: Decimal
    phi: Decimal
    equilibrium_log_price: Decimal
    equilibrium_price: Decimal
    residuals: tuple[Decimal, ...]
    training_start_ms: int
    training_end_ms: int


class Ar1FitError(ValueError):
    """Rejected numeric fit with immutable diagnostics; never a fallback model.

    Decimal values remain exact Decimal objects for the caller to serialize as
    strings. Missing computations remain None. Input/window validation still
    raises ValueError before a numerical fit is attempted.
    """

    def __init__(self, message: str, diagnostics: dict[str, Decimal | int | None]) -> None:
        super().__init__(message)
        self.diagnostics = MappingProxyType(dict(diagnostics))


def fit_ar1(closes: Sequence[HourlyClose], *, as_of_ms: int) -> Ar1Model:
    """Fit exactly 720 hourly closes ending at as_of_ms; reject future data/gaps.

    The caller passes the registered training window, not an arbitrary history
    from which this function might select an advantageous subset. There are 719
    one-hour regression pairs. A negative equilibrium log level is valid when
    its exponent is a finite positive price below one.
    """
    _hour(as_of_ms, "training cutoff")
    if len(closes) != TRAINING_HOURS:
        raise ValueError("training requires exactly 720 completed hourly closes")
    if any(not isinstance(close, HourlyClose) for close in closes):
        raise ValueError("training observations must be HourlyClose values")
    if any(close.timestamp_ms > as_of_ms for close in closes):
        raise ValueError("future training observation")
    if closes[-1].timestamp_ms != as_of_ms:
        raise ValueError("training must end at its registered cutoff")
    if any(right.timestamp_ms - left.timestamp_ms != HOUR_MS for left, right in zip(closes, closes[1:])):
        raise ValueError("training hours must be contiguous and increasing")
    diagnostics: dict[str, Decimal | int | None] = {
        "sample_count": len(closes), "pair_count": len(closes) - 1,
        "training_start_ms": closes[0].timestamp_ms, "training_end_ms": as_of_ms,
        "x_mean": None, "y_mean": None, "denominator": None,
        "phi": None, "intercept": None, "equilibrium_log_price": None, "equilibrium_price": None,
    }
    try:
        with localcontext(_CONTEXT):
            logs = tuple(_decimal(close.price).ln() for close in closes)
            count = Decimal(TRAINING_HOURS - 1)
            xs, ys = logs[:-1], logs[1:]
            x_mean, y_mean = sum(xs, Decimal(0)) / count, sum(ys, Decimal(0)) / count
            denominator = sum(((x - x_mean) ** 2 for x in xs), Decimal(0))
            diagnostics.update(x_mean=x_mean, y_mean=y_mean, denominator=denominator)
            if denominator <= 0:
                raise Ar1FitError("training log prices have no variation", diagnostics)
            phi = sum(((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys)), Decimal(0)) / denominator
            intercept = y_mean - phi * x_mean
            diagnostics.update(phi=phi, intercept=intercept)
            if phi == 1:
                raise Ar1FitError("unstable AR(1): require 0 < phi < 1", diagnostics)
            equilibrium_log = intercept / (1 - phi)
            diagnostics["equilibrium_log_price"] = equilibrium_log
            equilibrium = equilibrium_log.exp()
            diagnostics["equilibrium_price"] = equilibrium
            if not phi.is_finite() or not Decimal(0) < phi < Decimal(1):
                raise Ar1FitError("unstable AR(1): require 0 < phi < 1", diagnostics)
            if not equilibrium.is_finite() or equilibrium <= 0:
                raise Ar1FitError("equilibrium price must be finite and positive", diagnostics)
            residuals = tuple(y - intercept - phi * x for x, y in zip(xs, ys))
            return Ar1Model(intercept, phi, equilibrium_log, equilibrium, residuals, closes[0].timestamp_ms, as_of_ms)
    except DecimalException as error:
        raise Ar1FitError("AR(1) arithmetic is outside the finite Decimal domain", diagnostics) from error


@dataclass(frozen=True)
class ForecastPoint:
    """A synthetic future price conditional on the explicitly supplied innovations."""

    horizon_hours: int
    timestamp_ms: int
    log_price: Decimal
    price: Decimal


def forecast_ar1(
    model: Ar1Model,
    current_close: HourlyClose,
    *,
    as_of_ms: int,
    horizon_hours: int,
    innovations: Sequence[Exact] | None = None,
) -> tuple[ForecastPoint, ...]:
    """Return hours 1..horizon (1..24), using only a fit and an available close.

    current_close must be available exactly at the forecast cutoff, which must
    not precede the training cutoff. Zero innovations give a log-mean path;
    passing residual innovations does not certify their statistical validity.
    """
    _hour(as_of_ms, "forecast cutoff")
    if type(horizon_hours) is not int or not 1 <= horizon_hours <= MAX_HORIZON_HOURS:
        raise ValueError("forecast horizon must be an integer from 1 to 24 hours")
    if not isinstance(current_close, HourlyClose) or current_close.timestamp_ms != as_of_ms:
        raise ValueError("current close must equal the forecast cutoff; no future or stale close")
    if not isinstance(model, Ar1Model) or model.training_end_ms > as_of_ms:
        raise ValueError("model training must not extend into the forecast future")
    if not model.phi.is_finite() or not 0 < model.phi < 1 or not model.intercept.is_finite():
        raise ValueError("invalid stable AR(1) coefficients")
    if not model.equilibrium_price.is_finite() or model.equilibrium_price <= 0:
        raise ValueError("invalid equilibrium price")
    if innovations is not None and len(innovations) != horizon_hours:
        raise ValueError("one explicit innovation per forecast hour is required")
    try:
        with localcontext(_CONTEXT):
            log_price = _decimal(current_close.price).ln()
            points = []
            for index in range(horizon_hours):
                innovation = Decimal(0) if innovations is None else _decimal(innovations[index])
                log_price = model.intercept + model.phi * log_price + innovation
                price = log_price.exp()
                if not price.is_finite() or price <= 0:
                    raise ValueError("forecast price must be finite and positive")
                points.append(ForecastPoint(index + 1, as_of_ms + (index + 1) * HOUR_MS, log_price, price))
            return tuple(points)
    except DecimalException as error:
        raise ValueError("forecast arithmetic is outside the finite Decimal domain") from error


@dataclass(frozen=True)
class SingleBuy:
    """Exact quoted partial buy; capital and reserve are separate allocations.

    Pool fees and allowed slippage are already in minimum_output_xor. Only the
    separate network fee is subtracted here. This narrow prototype permits no
    more than 10 KUSD capital and 1 XOR fee allowance. It validates neither quote
    authenticity nor price impact, and does not authorize any purchase.
    """

    capital_kusd: Fraction
    input_kusd: Fraction
    minimum_output_xor: Fraction
    network_fee_xor: Fraction
    opening_price: Fraction
    fee_reserve_xor: Fraction = Fraction(1)
    current_peak_xor: Fraction | None = None

    def __post_init__(self) -> None:
        for name in ("capital_kusd", "input_kusd", "minimum_output_xor", "network_fee_xor", "opening_price", "fee_reserve_xor"):
            object.__setattr__(self, name, exact(getattr(self, name)))
        if not 0 < self.capital_kusd <= MAX_INPUT_KUSD:
            raise ValueError("capital must be positive and at most 10 KUSD")
        if not 0 < self.input_kusd < self.capital_kusd:
            raise ValueError("input must be a positive partial amount below capital")
        if self.minimum_output_xor <= 0 or self.opening_price <= 0:
            raise ValueError("minimum output and opening price must be positive")
        if not 0 <= self.fee_reserve_xor <= MAX_FEE_RESERVE_XOR:
            raise ValueError("fee reserve must be between zero and 1 XOR")
        if not 0 <= self.network_fee_xor <= self.fee_reserve_xor:
            raise ValueError("network fee must be funded by the separate fee reserve")
        opening = self.capital_kusd / self.opening_price + self.fee_reserve_xor
        peak = opening if self.current_peak_xor is None else exact(self.current_peak_xor)
        if peak < opening:
            raise ValueError("durable portfolio peak cannot be below opening value")
        object.__setattr__(self, "current_peak_xor", peak)


@dataclass(frozen=True)
class BuyValues:
    """Terminal accounting only; its booleans are not full-path qualification."""

    opening_xor: Fraction
    portfolio_xor: Fraction
    idle_xor: Fraction
    excess_xor: Fraction
    growth_xor: Fraction
    positive_growth_and_excess: bool
    within_current_drawdown: bool
    target_reached: bool


def single_buy_values(buy: SingleBuy, terminal_price: Exact) -> BuyValues:
    """Value untouched KUSD, acquired XOR and unspent reserve in XOR exactly."""
    price = exact(terminal_price)
    if price <= 0:
        raise ValueError("terminal price must be positive")
    opening = buy.capital_kusd / buy.opening_price + buy.fee_reserve_xor
    idle = buy.capital_kusd / price + buy.fee_reserve_xor
    portfolio = (buy.capital_kusd - buy.input_kusd) / price + buy.fee_reserve_xor + buy.minimum_output_xor - buy.network_fee_xor
    excess, growth = portfolio - idle, portfolio - opening
    return BuyValues(
        opening, portfolio, idle, excess, growth,
        growth > 0 and excess > 0,
        portfolio >= (1 - DRAWDOWN_LIMIT) * buy.current_peak_xor,
        portfolio >= (1 + TARGET_GAIN) * opening,
    )


@dataclass(frozen=True)
class EconomicInterval:
    """Terminal prices passing positive growth/excess and the current peak floor.

    The lower bound is always strict (idle outperformance). An absent upper
    bound means unbounded above. This interval does not constrain future peaks.
    """

    lower: Fraction | None
    upper: Fraction | None
    upper_inclusive: bool
    empty: bool
    reason: str | None = None

    def contains(self, price: Exact) -> bool:
        """Check an exact positive terminal price against this terminal-only interval."""
        price = exact(price)
        if price <= 0:
            raise ValueError("terminal price must be positive")
        return not self.empty and self.lower is not None and price > self.lower and (
            self.upper is None or price < self.upper or (self.upper_inclusive and price == self.upper)
        )


def single_buy_interval(buy: SingleBuy) -> EconomicInterval:
    """Derive exact fee-dependent bounds; never use the 5% target as eligibility."""
    net_xor = buy.minimum_output_xor - buy.network_fee_xor
    if net_xor <= 0:
        return EconomicInterval(None, None, False, True, "fee consumes or exceeds minimum output")
    lower = buy.input_kusd / net_xor
    opening = buy.capital_kusd / buy.opening_price + buy.fee_reserve_xor
    remaining = buy.capital_kusd - buy.input_kusd
    bounds: list[tuple[Fraction, bool]] = []
    for floor, inclusive in ((opening, False), ((1 - DRAWDOWN_LIMIT) * buy.current_peak_xor, True)):
        denominator = floor - buy.fee_reserve_xor - net_xor
        if denominator > 0:
            bounds.append((remaining / denominator, inclusive))
    if not bounds:
        return EconomicInterval(lower, None, False, False)
    upper = min(bound for bound, _ in bounds)
    inclusive = all(closed for bound, closed in bounds if bound == upper)
    empty = lower >= upper
    return EconomicInterval(lower, upper, inclusive, empty, "joint terminal interval is empty" if empty else None)


@dataclass(frozen=True)
class ExpectedBuyValues:
    """Exact expectation over caller-supplied weighted prices, not a calibrated forecast."""

    opening_xor: Fraction
    portfolio_xor: Fraction
    idle_xor: Fraction
    excess_xor: Fraction
    growth_xor: Fraction
    terminal_feasible_probability: Fraction
    target_probability: Fraction


def expected_single_buy_values(buy: SingleBuy, scenarios: Sequence[tuple[Exact, Exact]]) -> ExpectedBuyValues:
    """Aggregate (price, probability) pairs with exact nonnegative weights summing to 1.

    Do not substitute value at an average price: E[1/P] is generally not 1/E[P].
    Terminal probabilities omit intervening drawdown and are not qualification.
    """
    if not scenarios:
        raise ValueError("at least one explicit scenario is required")
    normalized = tuple((exact(price), exact(weight)) for price, weight in scenarios)
    if any(price <= 0 or weight < 0 for price, weight in normalized) or sum((weight for _, weight in normalized), Fraction(0)) != 1:
        raise ValueError("scenario prices must be positive and nonnegative weights must sum exactly to 1")
    values = tuple((single_buy_values(buy, price), weight) for price, weight in normalized)
    portfolio = sum((value.portfolio_xor * weight for value, weight in values), Fraction(0))
    idle = sum((value.idle_xor * weight for value, weight in values), Fraction(0))
    opening = values[0][0].opening_xor
    feasible = sum((weight for value, weight in values if value.positive_growth_and_excess and value.within_current_drawdown), Fraction(0))
    target = sum((weight for value, weight in values if value.target_reached), Fraction(0))
    return ExpectedBuyValues(opening, portfolio, idle, portfolio - idle, portfolio - opening, feasible, target)
