"""Pure one-attempt hypothetical execution accounting for the frozen admission model.

No IO, network, model call, signing, price-crossing inference or real receipt is
implemented. Callers authenticate records and preserve the full event schedule.
All amounts are exact natural-token Fractions (18-decimal token units); prices
and valuation ratios are exact and need not have a finite decimal expansion.
Only a caller-declared hypothetical settlement changes holdings. A fee estimate
is never promoted into a paid fee by this module.

A committed attempt consumes eligibility even when unresolved or failed. Stops
prevent new commitments; they do not revoke an existing attempt or liquidate
holdings. Late receipt of a pre-deadline inclusion is retained, but cannot create
an earlier observed control action. Finalization means accounting only, never
complete market coverage, a successful backtest, qualification or live authority.
"""
from dataclasses import dataclass, replace
from fractions import Fraction
from hashlib import sha256
import re

from scripts.bots.accumulation_stopping_model import HOUR_MS, exact
from scripts.bots.accumulation_admission_policy import (
    OpeningPortfolio, MAXIMUM_CONTEXT_AGE_MS_EXCLUSIVE, MAXIMUM_FINALIZED_BLOCK_AGE_MS,
)

UNIT = 10**18
_HASH = re.compile(r"0x[0-9a-f]{64}\Z")
_SHA = re.compile(r"[0-9a-f]{64}\Z")
_ID = re.compile(r"[a-zA-Z0-9_-]{1,96}\Z")


def _require(condition, reason):
    if not condition:
        raise ValueError(reason)


def _time(value):
    _require(type(value) is int and value >= 0, "invalid timestamp")


def _amount(value):
    result = exact(value)
    _require(result >= 0 and (result * UNIT).denominator == 1 and result * UNIT < 2**128,
             "invalid 18-decimal token amount")
    return result


@dataclass(frozen=True)
class ReplayMark:
    """Authenticated externally: native block time, receipt time and KUSD per XOR."""
    block_hash: str
    block_number: int
    observed_at_ms: int
    received_at_ms: int
    price: Fraction

    def __post_init__(self):
        _require(isinstance(self.block_hash, str) and _HASH.fullmatch(self.block_hash), "invalid block hash")
        _require(type(self.block_number) is int and self.block_number > 0, "invalid block number")
        _time(self.observed_at_ms)
        _time(self.received_at_ms)
        _require(self.observed_at_ms <= self.received_at_ms, "future native mark")
        object.__setattr__(self, "price", exact(self.price))
        _require(self.price > 0, "nonpositive price")


@dataclass(frozen=True)
class DecisionOrder:
    """Frozen accepted terms; supplied evidence digests do not authenticate themselves.

    Byte identity is preserved here. The external codec must verify that the
    call/envelope actually encode these terms, the declared chain and DEX0 XYK.
    The fixed route is KUSD->XOR, XYKPool/AllowSelected, with 50bps minimum rule.
    expires_at_ms is this model's immutable acceptance cutoff, not on-chain
    revocation: quote TTL cannot revoke a transaction once actually submitted.
    """
    order_id: str
    input_kusd: int
    quoted_output_xor: Fraction
    minimum_output_xor: Fraction
    fee_ceiling_xor: Fraction
    decision_at_ms: int
    quote_received_at_ms: int
    expires_at_ms: int
    execution_target_ms: int
    maximum_execution_lag_ms: int
    decision_mark: ReplayMark
    admission_sha256: str
    quote_sha256: str
    fee_sha256: str
    call_hex: str
    envelope_hex: str

    def __post_init__(self):
        _require(isinstance(self.order_id, str) and _ID.fullmatch(self.order_id), "invalid order id")
        _require(type(self.input_kusd) is int and 1 <= self.input_kusd <= 9, "invalid partial input")
        for name in ("quoted_output_xor", "minimum_output_xor", "fee_ceiling_xor"):
            object.__setattr__(self, name, _amount(getattr(self, name)))
        _require(self.quoted_output_xor > 0 and self.minimum_output_xor > 0, "empty output")
        expected = (self.quoted_output_xor * UNIT * 9950 // 10000) / Fraction(UNIT)
        _require(self.minimum_output_xor == expected, "minimum is not original 50bps floor")
        _require(isinstance(self.decision_mark, ReplayMark), "missing decision mark")
        for name in ("decision_at_ms", "quote_received_at_ms", "expires_at_ms", "execution_target_ms",
                     "maximum_execution_lag_ms"):
            _time(getattr(self, name))
        _require(self.decision_mark.received_at_ms <= self.quote_received_at_ms <= self.decision_at_ms < self.expires_at_ms,
                 "invalid order receipt clock")
        _require(self.decision_at_ms < self.execution_target_ms and self.maximum_execution_lag_ms <= HOUR_MS,
                 "invalid fixed execution window")
        for value in (self.admission_sha256, self.quote_sha256, self.fee_sha256):
            _require(isinstance(value, str) and _SHA.fullmatch(value), "invalid evidence digest")
        for value in (self.call_hex, self.envelope_hex):
            _require(isinstance(value, str) and len(value) <= 131074 and
                     re.fullmatch(r"0x(?:[0-9a-f]{2})+", value), "invalid encoded bytes")

    @property
    def envelope_sha256(self):
        """Digest exact immutable envelope bytes; no encoding or signature is inferred."""
        return sha256(bytes.fromhex(self.envelope_hex[2:])).hexdigest()


@dataclass(frozen=True)
class ReplayEvent:
    """Small immutable exact journal; native and causally available times stay distinct."""
    kind: str
    at_ms: int
    mark: ReplayMark
    kusd: Fraction
    xor: Fraction
    fees_paid_xor: Fraction
    stop_reason: str | None
    order_id: str | None = None
    reason: str | None = None


@dataclass(frozen=True)
class ReplayState:
    """Reducer result; callers must own a trusted, linear event history.

    Revision checks detect stale transitions on that history, not forged
    dataclass instances or separate branches. Reconstruction requires an
    external journal of full transition inputs and orders: the events tuple
    contains summaries only. Do not edit fields, restore funding or claim
    global exactly-once authority.
    """
    opening: OpeningPortfolio
    opening_at_ms: int
    deadline_ms: int
    kusd: Fraction
    xor: Fraction
    fees_paid_xor: Fraction
    current_mark: ReplayMark
    last_at_ms: int
    goal_peak_xor: Fraction
    performance_peak_xor: Fraction
    maximum_drawdown: Fraction
    stop_reason: str | None = None
    stopped_at_ms: int | None = None
    order: DecisionOrder | None = None
    order_phase: str = "none"
    attempt_committed: bool = False
    successful_purchase: bool = False
    finalized: bool = False
    attention: tuple[str, ...] = ()
    order_ids: tuple[str, ...] = ()
    events: tuple[ReplayEvent, ...] = ()
    revision: int = 0

    @property
    def remaining_fee_reserve_xor(self):
        """Paid scenario fees reduce the original allowance; proceeds never replenish it."""
        return self.opening.fee_reserve_xor - self.fees_paid_xor

    @property
    def may_request_admission(self):
        """False from commitment onward, including unresolved and fee-paying failure."""
        return not (self.finalized or self.attempt_committed or self.stop_reason or self.order_phase == "frozen" or
                    self.last_at_ms >= self.deadline_ms)

    @property
    def value_xor(self):
        """Combined current holdings valued at the supplied native mark."""
        return self.kusd / self.current_mark.price + self.xor

    @property
    def idle_value_xor(self):
        """Unchanged opening allocation repriced at that same mark."""
        return self.opening.capital_kusd / self.current_mark.price + self.opening.fee_reserve_xor


class ReplayError(ValueError):
    """Rejected transition with the unchanged state and explicit public diagnostics."""
    def __init__(self, reason, state, details=()):
        super().__init__(reason)
        self.reason, self.state, self.details = reason, state, tuple(details)


def _check(state, revision):
    _require(isinstance(state, ReplayState), "typed replay state required")
    if type(revision) is not int or revision != state.revision or state.finalized:
        raise ReplayError("stale revision or finalized episode", state)


def _fail(condition, reason, state, details=()):
    if not condition:
        raise ReplayError(reason, state, details)


def _journal(state, kind, at_ms, reason=None):
    event = ReplayEvent(kind, at_ms, state.current_mark, state.kusd, state.xor,
                        state.fees_paid_xor, state.stop_reason,
                        state.order.order_id if state.order else None, reason)
    return replace(state, events=(*state.events, event), revision=state.revision + 1)


def _observe(state, mark, at_ms, *, retrospective=False):
    _require(isinstance(mark, ReplayMark), "typed native mark required")
    _time(at_ms)
    _fail(mark.received_at_ms <= at_ms and at_ms >= state.last_at_ms, "noncausal mark receipt", state)
    old = state.current_mark
    _fail(mark.block_number >= old.block_number and mark.observed_at_ms >= old.observed_at_ms,
          "native mark moved backwards", state)
    if mark.block_number == old.block_number:
        _fail((mark.block_hash, mark.observed_at_ms, mark.price) == (old.block_hash, old.observed_at_ms, old.price),
              "same block identity or price changed", state)
    else:
        _fail(mark.block_hash != old.block_hash and mark.observed_at_ms > old.observed_at_ms,
              "nonadvancing block identity", state)
    if not retrospective:
        _fail(at_ms < state.deadline_ms and at_ms - mark.observed_at_ms <= MAXIMUM_FINALIZED_BLOCK_AGE_MS,
              "expired or stale control mark", state)
    value = state.kusd / mark.price + state.xor
    performance_peak = max(state.performance_peak_xor, value)
    dd = max(state.maximum_drawdown, (performance_peak - value) / performance_peak)
    peak, reason, stopped = state.goal_peak_xor, state.stop_reason, state.stopped_at_ms
    if reason is None and not retrospective:
        peak = max(peak, value)
        if value <= peak * Fraction(9, 10):
            reason, stopped = "loss", at_ms
        elif state.successful_purchase and value >= state.opening.value_xor * Fraction(21, 20) and \
                value > state.opening.capital_kusd / mark.price + state.opening.fee_reserve_xor:
            reason, stopped = "target", at_ms
    return replace(state, current_mark=mark, last_at_ms=at_ms, goal_peak_xor=peak,
                   performance_peak_xor=performance_peak, maximum_drawdown=dd,
                   stop_reason=reason, stopped_at_ms=stopped)


def create_episode(opening, opening_at_ms, opening_mark):
    """Fund the original UTC boundary using an exact canonical H-minus mark, once."""
    _require(isinstance(opening, OpeningPortfolio) and isinstance(opening_mark, ReplayMark), "typed opening required")
    _time(opening_at_ms)
    _require(opening_at_ms % HOUR_MS == 0, "opening must be hourly")
    _amount(opening.capital_kusd)
    _amount(opening.fee_reserve_xor)
    _require(opening_mark.observed_at_ms < opening_at_ms and opening_mark.received_at_ms <= opening_at_ms and
             opening_at_ms - opening_mark.observed_at_ms <= MAXIMUM_FINALIZED_BLOCK_AGE_MS and
             opening_at_ms - opening_mark.received_at_ms < MAXIMUM_CONTEXT_AGE_MS_EXCLUSIVE and
             opening.opening_price == opening_mark.price, "invalid original opening mark")
    result = ReplayState(opening, opening_at_ms, opening_at_ms + 24 * HOUR_MS,
                         opening.capital_kusd, opening.fee_reserve_xor, Fraction(0), opening_mark,
                         opening_at_ms, opening.value_xor, opening.value_xor, Fraction(0))
    return _journal(result, "opening", opening_at_ms)


def observe_mark(state, mark, at_ms, *, expected_revision):
    """Observe held assets before the deadline; a stop never erases committed orders."""
    _check(state, expected_revision)
    return _journal(_observe(state, mark, at_ms), "valuation", at_ms)


def freeze_order(state, order, *, expected_revision):
    """Preserve selected input/minimum/bytes before any future execution evidence read."""
    _check(state, expected_revision)
    _fail(isinstance(order, DecisionOrder) and state.may_request_admission, "order not eligible", state)
    _fail(order.order_id not in state.order_ids and order.input_kusd < state.opening.capital_kusd,
          "duplicate order or nonpartial input", state)
    _fail(order.decision_mark == state.current_mark and order.decision_at_ms >= state.last_at_ms and
          order.execution_target_ms < state.deadline_ms, "changed decision state or deadline", state)
    current = _observe(state, order.decision_mark, order.decision_at_ms)
    _fail(current.stop_reason is None, "goal stopped before order", current)
    _fail(order.fee_ceiling_xor <= current.remaining_fee_reserve_xor, "unfunded fee ceiling", current)
    _fresh(current, order, order.decision_at_ms)
    current = replace(current, order=order, order_phase="frozen", order_ids=(*state.order_ids, order.order_id))
    return _journal(current, "order-frozen", order.decision_at_ms)


def _fresh(state, order, at_ms):
    _fail(at_ms < order.expires_at_ms and at_ms - order.decision_mark.received_at_ms < MAXIMUM_CONTEXT_AGE_MS_EXCLUSIVE and
          at_ms - order.quote_received_at_ms < MAXIMUM_CONTEXT_AGE_MS_EXCLUSIVE and
          at_ms - order.decision_mark.observed_at_ms <= MAXIMUM_FINALIZED_BLOCK_AGE_MS,
          "order receipt or native state expired", state)


def cancel_order(state, at_ms, *, expected_revision, reason):
    """Cancel only an uncommitted order without paying a fee or consuming the attempt."""
    _check(state, expected_revision)
    _time(at_ms)
    _fail(state.order_phase == "frozen" and not state.attempt_committed and at_ms >= state.last_at_ms,
          "only an uncommitted order can cancel", state)
    _require(isinstance(reason, str) and 0 < len(reason) <= 160, "explicit cancellation reason required")
    return _journal(replace(state, order_phase="cancelled", last_at_ms=at_ms), "order-cancelled", at_ms, reason)


def commit_attempt(state, at_ms, *, expected_revision):
    """Consume the sole hypothetical attempt atomically; this is never a submission API."""
    _check(state, expected_revision)
    _time(at_ms)
    _fail(state.order_phase == "frozen" and not state.attempt_committed and state.stop_reason is None,
          "attempt not eligible", state)
    order = state.order
    _fail(state.last_at_ms <= at_ms < min(state.deadline_ms, order.execution_target_ms), "commit outside fixed window", state)
    _fresh(state, order, at_ms)
    current = _observe(state, state.current_mark, at_ms)
    _fail(current.stop_reason is None, "goal stopped before commitment", current)
    minimum_value = (current.kusd - order.input_kusd) / current.current_mark.price + current.xor + \
                    order.minimum_output_xor - order.fee_ceiling_xor
    failure_value = current.value_xor - order.fee_ceiling_xor
    _fail(min(minimum_value, failure_value) >= current.goal_peak_xor * Fraction(9, 10),
          "immediate success or failed-fee drawdown", current)
    return _journal(replace(current, order_phase="committed", attempt_committed=True), "attempt-committed", at_ms)


def settle_attempt(state, mark, *, expected_revision, order_id, envelope_sha256, included_at_ms,
                   received_at_ms, outcome, output_xor, paid_fee_xor):
    """Apply one explicitly hypothetical included success/paid failure, never infer it.

    Quoted estimates cannot supply paid_fee_xor automatically. Unknown outcomes,
    below-minimum claimed successes, post-deadline inclusions and reserve deficits
    raise a retained ReplayError and leave the committed attempt unresolved.
    Late evidence of pre-deadline inclusion is permitted before later native
    marks, but produces no retroactive target/loss action. Full coverage remains
    the external driver's responsibility.
    """
    _check(state, expected_revision)
    _fail(state.order_phase == "committed" and state.attempt_committed, "no unresolved committed attempt", state)
    order = state.order
    _fail(order_id == order.order_id and envelope_sha256 == order.envelope_sha256, "settlement order binding changed", state)
    _time(included_at_ms)
    _time(received_at_ms)
    output, fee = _amount(output_xor), _amount(paid_fee_xor)
    details = (("included_at_ms", included_at_ms), ("received_at_ms", received_at_ms),
               ("output_xor", str(output)), ("paid_fee_xor", str(fee)), ("outcome", outcome))
    _fail(outcome in ("hypothetical-success", "hypothetical-paid-failure"), "explicit hypothetical outcome required", state, details)
    _fail(isinstance(mark, ReplayMark) and mark.observed_at_ms == included_at_ms and
          mark.received_at_ms == received_at_ms and included_at_ms <= received_at_ms,
          "settlement mark or receipt clock mismatch", state, details)
    _fail(order.execution_target_ms <= included_at_ms <= order.execution_target_ms + order.maximum_execution_lag_ms and
          included_at_ms < min(state.deadline_ms, order.expires_at_ms),
          "inclusion outside original execution window or expiry", state, details)
    _fail(fee <= state.remaining_fee_reserve_xor and fee <= state.xor, "paid fee exceeds funded reserve", state, details)
    success = outcome == "hypothetical-success"
    _fail(output >= order.minimum_output_xor if success else output == 0,
          "claimed success below frozen minimum or failed output nonzero", state, details)
    next_xor = state.xor + output - fee
    _fail(0 <= next_xor * UNIT < 2**128 and (next_xor * UNIT).denominator == 1,
          "settled holdings exceed codec bounds", state, details)
    late = received_at_ms >= state.deadline_ms
    current = _observe(state, mark, received_at_ms, retrospective=late)
    if late and current.stop_reason is None:
        current = replace(current, stop_reason="expired", stopped_at_ms=state.deadline_ms)
    attention = current.attention
    if fee > order.fee_ceiling_xor:
        attention = (*attention, "paid_fee_exceeded_estimate")
    current = replace(current, kusd=current.kusd - order.input_kusd if success else current.kusd,
                      xor=next_xor, fees_paid_xor=current.fees_paid_xor + fee,
                      successful_purchase=success, order_phase="settled", attention=attention)
    current = _observe(current, mark, received_at_ms, retrospective=late)
    return _journal(current, outcome, received_at_ms)


def finalize_episode(state, terminal_mark, *, expected_revision):
    """Close exact original-deadline accounting only; no coverage/qualification claim.

    A canonical H-minus terminal mark may arrive later. It updates held/idle
    values and full-period drawdown without inventing an earlier control stop.
    Unresolved commitments cannot be finalized as no-fill episodes.
    """
    _check(state, expected_revision)
    _fail(state.order_phase != "committed", "unresolved attempt at terminal", state)
    _fail(isinstance(terminal_mark, ReplayMark) and terminal_mark.observed_at_ms < state.deadline_ms and
          state.deadline_ms - terminal_mark.observed_at_ms <= MAXIMUM_FINALIZED_BLOCK_AGE_MS and
          terminal_mark.received_at_ms >= state.deadline_ms,
          "invalid original H-minus terminal mark", state)
    current = _observe(state, terminal_mark, max(state.last_at_ms, terminal_mark.received_at_ms), retrospective=True)
    if current.stop_reason is None:
        current = replace(current, stop_reason="expired", stopped_at_ms=state.deadline_ms)
    current = replace(current, finalized=True,
                      order_phase="cancelled" if current.order_phase == "frozen" else current.order_phase)
    return _journal(current, "terminal-accounting-only", current.last_at_ms)
