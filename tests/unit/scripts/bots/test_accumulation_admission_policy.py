"""Synthetic offline policy checks: python3 this_file; no real data or network."""

from dataclasses import replace
from decimal import Decimal, localcontext
from fractions import Fraction
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))

from scripts.bots.accumulation_stopping_model import Ar1Model, HourlyClose, HOUR_MS, PRECISION  # noqa: E402
from scripts.bots.accumulation_admission_policy import (  # noqa: E402
    AdmissionState, OpeningPortfolio, QuoteCandidate, REQUIRED_PASSING_PATHS,
    SCENARIO_COUNT, SCENARIO_SEED, _evaluate_scenarios, admit_accumulation,
    MAXIMUM_CONTEXT_AGE_MS_EXCLUSIVE, MAXIMUM_FINALIZED_BLOCK_AGE_MS,
    generate_scenarios, residual_block_starts,
)


HASH = "0x" + "ab" * 32
OPENING = 1719 * HOUR_MS


def model(residuals=None):
    """Declared synthetic frozen model; never fit on a tested future path."""
    with localcontext() as context:
        context.prec = PRECISION
        log_price = Decimal(2).ln()
        return Ar1Model(log_price / 2, Decimal("0.5"), log_price, Decimal(2),
                        residuals or (Decimal(0),) * 719, 1000 * HOUR_MS, OPENING)


def state(hours=1, **changes):
    """One immutable opening episode; remaining time moves toward its fixed end."""
    decision = OPENING + (24 - hours) * HOUR_MS
    fields = dict(opening=OpeningPortfolio("10", "1", "2"), opening_at_ms=OPENING,
                  deadline_ms=OPENING + 24 * HOUR_MS, decision_at_ms=decision,
                  current_price="2", current_peak_xor="6", block_hash=HASH,
                  block_timestamp_ms=decision - 6000, context_received_at_ms=decision - 1000,
                  latest_completed_close=HourlyClose(decision, "2"))
    fields.update(changes)
    return AdmissionState(**fields)


def quote(s, q=1, **changes):
    """Synthetic exact same-state quote, not a statement of market availability."""
    fields = dict(input_kusd=q, minimum_output_xor="0.7", network_fee_xor="0.1",
                  price_impact="0", block_hash=s.block_hash,
                  block_timestamp_ms=s.block_timestamp_ms, observed_at_ms=s.decision_at_ms,
                  expires_at_ms=s.decision_at_ms + 5000)
    fields.update(changes)
    return QuoteCandidate(**fields)


def paths(*prices):
    """1024 explicit synthetic paths for the internal evaluator seam."""
    return (tuple(Decimal(price) for price in prices),) * SCENARIO_COUNT


class ScenarioTests(unittest.TestCase):
    def test_sampler_is_fixed_contiguous_nonwrapping_and_uses_whole_block_corpus(self):
        self.assertEqual(SCENARIO_SEED, 20260926)
        starts = residual_block_starts(24)
        self.assertEqual(starts, residual_block_starts(24))
        self.assertEqual(len(starts), 1024)
        self.assertTrue(all(len(row) == 4 and all(0 <= i <= 713 for i in row) for row in starts))
        covered = {index for row in starts for start in row for index in range(start, start + 6)}
        self.assertEqual(covered, set(range(719)))
        self.assertEqual(len(residual_block_starts(7)[0]), 2)
        for invalid in (0, 25, True, 1.0):
            with self.assertRaises(ValueError):
                residual_block_starts(invalid)

    def test_generation_uses_declared_six_hour_residual_blocks_and_no_refit(self):
        residuals = tuple(Decimal(i) / Decimal(100000) for i in range(719))
        frozen = model(residuals)
        s = state(hours=7)
        result = generate_scenarios(frozen, s)
        starts = residual_block_starts(7)
        with localcontext() as context:
            context.prec = PRECISION
            y = Decimal(2).ln()
            innovations = tuple(v for start in starts[0] for v in residuals[start:start + 6])[:7]
            expected = []
            for innovation in innovations:
                y = frozen.intercept + frozen.phi * y + innovation
                expected.append(y.exp())
        self.assertEqual(result[0], tuple(expected))
        self.assertEqual(frozen.residuals, residuals)
        self.assertEqual(len(result), 1024)
        self.assertTrue(all(len(row) == 7 for row in result))

    def test_original_deadline_not_rolling_and_expired_episode_waits(self):
        s = state(hours=2)
        self.assertEqual(s.remaining_hours, 2)
        self.assertEqual(len(generate_scenarios(model(), s)[0]), 2)
        with self.assertRaisesRegex(ValueError, "original opening"):
            replace(s, deadline_ms=s.decision_at_ms + 24 * HOUR_MS)
        expired = state(hours=0)
        self.assertEqual(admit_accumulation(model(), expired, [quote(expired)]).reason, "episode_expired")
        with self.assertRaisesRegex(ValueError, "expired"):
            generate_scenarios(model(), expired)

    def test_actual_after_hour_decision_preserves_native_state_and_hourly_forecast(self):
        base = state(hours=2)
        actual = replace(base, decision_at_ms=base.decision_at_ms + 5000,
                         block_timestamp_ms=base.decision_at_ms + 3000,
                         context_received_at_ms=base.decision_at_ms + 4000, current_price="2.01")
        self.assertEqual(actual.remaining_hours, 2)
        self.assertEqual(actual.deadline_ms, base.deadline_ms)
        self.assertEqual(generate_scenarios(model(), actual), generate_scenarios(model(), base))
        forecast_times = tuple(actual.latest_completed_close.timestamp_ms + h * HOUR_MS for h in (1, 2))
        self.assertTrue(all(actual.decision_at_ms < time <= actual.deadline_ms for time in forecast_times))
        self.assertEqual(forecast_times[-1], actual.deadline_ms)
        result = admit_accumulation(model(), actual, [quote(actual)])
        self.assertEqual(result.action, "buy")
        self.assertEqual(result.candidates[0].post_entry_value_xor, Fraction(9) / Fraction("2.01") + Fraction(8, 5))
        with self.assertRaisesRegex(ValueError, "future"):
            replace(actual, latest_completed_close=HourlyClose(base.decision_at_ms + HOUR_MS, "2"))
        with self.assertRaisesRegex(ValueError, "actual decision hour"):
            replace(actual, latest_completed_close=HourlyClose(base.decision_at_ms - HOUR_MS, "2"))

    def test_final_hour_actual_time_never_extends_original_deadline_or_backdates_quote(self):
        s = state()
        later = replace(s, decision_at_ms=s.deadline_ms - 1, block_timestamp_ms=s.deadline_ms - 2,
                        context_received_at_ms=s.deadline_ms - 1)
        self.assertEqual(later.remaining_hours, 1)
        self.assertEqual(len(generate_scenarios(model(), later)[0]), 1)
        self.assertEqual(later.latest_completed_close.timestamp_ms + HOUR_MS, later.deadline_ms)
        q = quote(later)
        self.assertEqual(q.observed_at_ms, later.decision_at_ms)
        self.assertEqual(admit_accumulation(model(), later, [q]).action, "buy")
        with self.assertRaisesRegex(ValueError, "future"):
            replace(later, block_timestamp_ms=later.decision_at_ms + 1)

    def test_future_and_post_opening_refit_or_incomplete_residuals_rejected(self):
        s = state()
        for changed in (
            replace(model(), training_start_ms=s.decision_at_ms + HOUR_MS - 719 * HOUR_MS, training_end_ms=s.decision_at_ms + HOUR_MS),
            replace(model(), training_start_ms=1001 * HOUR_MS, training_end_ms=OPENING + HOUR_MS),
            replace(model(), residuals=(Decimal(0),) * 718),
            replace(model(), residuals=(Decimal("NaN"),) * 719),
            replace(model(), phi=Decimal(1)),
        ):
            with self.subTest(changed=changed.training_end_ms), self.assertRaises(ValueError):
                admit_accumulation(changed, s, [quote(s)])


class AdmissionTests(unittest.TestCase):
    def test_public_entry_generates_fixed_scenarios_and_admits_below_five_percent(self):
        s = state()
        result = admit_accumulation(model(), s, [quote(s)])
        self.assertEqual((result.action, result.selected_input_kusd), ("buy", 1))
        self.assertEqual(result.scenario_count, 1024)
        self.assertLess(result.candidates[0].expected_growth_xor / 6, Decimal("0.05"))
        self.assertEqual(result.reason, "myopic_model_admission_only")

    def test_expectation_is_of_inverse_price_and_wait_holds_original_allocations(self):
        s = state()
        fixture = ((Decimal(1),),) * 512 + ((Decimal(2),),) * 512
        result = _evaluate_scenarios(s, [quote(s, minimum_output_xor="1")], fixture)
        self.assertEqual(result.expected_wait_terminal_xor, Decimal("8.5"))
        candidate = result.candidates[0]
        self.assertEqual(candidate.expected_terminal_xor, Decimal("8.65"))
        self.assertEqual(candidate.expected_excess_xor, Decimal("0.15"))
        self.assertEqual(candidate.expected_growth_xor, Decimal("2.65"))
        self.assertNotEqual(result.expected_wait_terminal_xor, Decimal(10) / Decimal("1.5") + 1)

    def test_zero_excess_waits_even_when_idle_repricing_has_positive_growth(self):
        s = state()
        result = _evaluate_scenarios(s, [quote(s, minimum_output_xor="1.1")], paths("1"))
        self.assertEqual(result.action, "wait")
        self.assertGreater(result.candidates[0].expected_growth_xor, 0)
        self.assertEqual(result.candidates[0].expected_excess_xor, 0)
        self.assertIn("expected_excess_not_robustly_positive", result.candidates[0].reasons)

    def test_zero_growth_and_near_boundary_growth_wait(self):
        s = state()
        for amount in (Fraction(3, 5), Fraction(3, 5) + Fraction(1, 10**65)):
            result = _evaluate_scenarios(s, [quote(s, minimum_output_xor=amount)], paths("2"))
            self.assertEqual(result.action, "wait")
            self.assertIn("expected_growth_not_robustly_positive", result.candidates[0].reasons)

    def test_exact_positive_ties_choose_lower_input_regardless_of_candidate_order(self):
        s = state()
        candidates = [quote(s, 2, minimum_output_xor="1.2"), quote(s)]
        result = _evaluate_scenarios(s, candidates, paths("2"))
        self.assertEqual(result.selected_input_kusd, 1)
        self.assertTrue(all(c.admitted for c in result.candidates))
        self.assertEqual(result.candidates[0].expected_terminal_xor, result.candidates[1].expected_terminal_xor)

    def test_near_tie_is_not_mislabeled_exact_tie(self):
        s = state()
        q2 = quote(s, 2, minimum_output_xor=Fraction(6, 5) + Fraction(1, 10**65))
        result = _evaluate_scenarios(s, [quote(s), q2], paths("2"))
        self.assertEqual(result.action, "wait")
        self.assertEqual(result.reason, "numerically_ambiguous_ranking")

    def test_maximizes_expected_terminal_output_on_common_paths(self):
        s = state()
        candidates = [quote(s), quote(s, 2, minimum_output_xor="1.4"), quote(s, 3, minimum_output_xor="1.7")]
        result = _evaluate_scenarios(s, candidates, paths("2"))
        self.assertEqual(result.selected_input_kusd, 2)
        self.assertEqual([c.expected_terminal_xor for c in result.candidates], list(map(Decimal, ["6.1", "6.3", "6.1"])))

    def test_973_paths_required_and_all_bad_paths_retained(self):
        self.assertEqual(REQUIRED_PASSING_PATHS, 973)
        s = state()
        for failures, admitted in ((51, True), (52, False)):
            fixture = ((Decimal(2),),) * (1024 - failures) + ((Decimal(3),),) * failures
            result = _evaluate_scenarios(s, [quote(s)], fixture)
            candidate = result.candidates[0]
            self.assertEqual(candidate.passing_paths, 1024 - failures)
            self.assertEqual(candidate.admitted, admitted)
            self.assertEqual(result.action, "buy" if admitted else "wait")

    def test_full_path_drawdown_uses_new_peaks_not_just_terminal_floor(self):
        s = state(hours=2)
        result = _evaluate_scenarios(s, [quote(s)], paths("1", "2"))
        self.assertGreater(result.candidates[0].expected_growth_xor, 0)
        self.assertGreater(result.candidates[0].expected_excess_xor, 0)
        self.assertEqual(result.candidates[0].passing_paths, 0)
        self.assertEqual(result.action, "wait")

    def test_post_fee_entry_loss_rejected_before_later_recovery(self):
        s = state()
        bad = quote(s, 4, minimum_output_xor="1", network_fee_xor="1")
        result = _evaluate_scenarios(s, [bad], paths("0.5"))
        self.assertEqual(result.candidates[0].post_entry_value_xor, 4)
        self.assertEqual(result.candidates[0].reasons, ("entry_drawdown_exceeded",))

    def test_exact_entry_floor_allowed_but_future_boundary_counts_ambiguous_failure(self):
        s = state()
        q = quote(s, 4, minimum_output_xor="1.5")
        result = _evaluate_scenarios(s, [q], paths("2"))
        candidate = result.candidates[0]
        self.assertEqual(candidate.post_entry_value_xor, Fraction(27, 5))
        self.assertNotIn("entry_drawdown_exceeded", candidate.reasons)
        self.assertEqual(candidate.passing_paths, 0)
        self.assertEqual(candidate.ambiguous_paths, 1024)

    def test_failed_attempt_native_fee_loss_is_checked_even_when_success_would_pass(self):
        s = state()
        bad = quote(s, minimum_output_xor="1.8", network_fee_xor="1")
        result = _evaluate_scenarios(s, [bad], paths("2"))
        candidate = result.candidates[0]
        self.assertEqual(candidate.reasons, ("failed_attempt_drawdown_exceeded",))
        self.assertEqual(candidate.failed_attempt_value_xor, 5)
        self.assertGreater(candidate.post_entry_value_xor, 6)
        boundary = quote(s, minimum_output_xor="1.2", network_fee_xor="0.6")
        self.assertTrue(_evaluate_scenarios(s, [boundary], paths("2")).candidates[0].admitted)
        above = replace(boundary, network_fee_xor=Fraction(3, 5) + Fraction(1, 10**30))
        self.assertIn("failed_attempt_drawdown_exceeded", _evaluate_scenarios(s, [above], paths("2")).candidates[0].reasons)

    def test_current_durable_peak_stop_target_and_second_buy_guards(self):
        for changes, reason in (
            ({"goal_stopped": True}, "goal_stopped"),
            ({"target_reached": True}, "target_already_reached"),
            ({"buy_count": 1}, "already_bought"),
            ({"current_price": "3"}, "current_drawdown_exceeded"),
            ({"current_peak_xor": "10"}, "current_drawdown_exceeded"),
        ):
            s = state(**changes)
            with self.subTest(reason=reason):
                result = admit_accumulation(model(), s, [quote(s)])
                self.assertEqual(result.reason, reason)
                self.assertEqual(result.action, "wait")
                self.assertEqual(result.scenario_count, 0)

    def test_native_quote_budget_impact_partial_state_and_causality_rejections(self):
        s = state()
        variants = [
            (quote(s, 10), "not_a_partial_integer_size"),
            (quote(s, 0), "not_a_partial_integer_size"),
            (quote(s, network_fee_xor="1.000000000000000001"), "fee_reserve_exceeded"),
            (quote(s, price_impact=Fraction(1, 100) + Fraction(1, 10**30)), "price_impact_exceeded"),
            (quote(s, block_hash="0x" + "cd" * 32), "quote_state_mismatch"),
            (quote(s, block_timestamp_ms=s.block_timestamp_ms - 1), "quote_state_mismatch"),
            (quote(s, observed_at_ms=s.decision_at_ms + 1), "future_quote"),
            (quote(s, observed_at_ms=s.context_received_at_ms - 1), "quote_precedes_context"),
            (quote(s, observed_at_ms=s.decision_at_ms - 1, expires_at_ms=s.decision_at_ms), "expired_quote"),
            (quote(s, observed_at_ms=s.decision_at_ms - 5000), "stale_quote"),
            (quote(s, block_timestamp_ms=s.decision_at_ms - 60001), "stale_quote_block"),
        ]
        for q, reason in variants:
            with self.subTest(reason=reason):
                candidate = _evaluate_scenarios(s, [q], paths("2")).candidates[0]
                self.assertFalse(candidate.admitted)
                self.assertIn(reason, candidate.reasons)
        self.assertTrue(_evaluate_scenarios(s, [quote(s, price_impact=Fraction(1, 100))], paths("2")).candidates[0].admitted)

    def test_fresh_receipt_allows_fourteen_second_old_finalized_block(self):
        s = state()
        fresh = replace(s, block_timestamp_ms=s.decision_at_ms - 14000)
        self.assertEqual(admit_accumulation(model(), fresh, [quote(fresh)]).action, "buy")

    def test_context_receipt_age_five_seconds_is_exclusive(self):
        self.assertEqual(MAXIMUM_CONTEXT_AGE_MS_EXCLUSIVE, 5000)
        s = state(context_received_at_ms=state().decision_at_ms - 4999)
        fresh = quote(s, observed_at_ms=s.decision_at_ms - 4999)
        self.assertEqual(admit_accumulation(model(), s, [fresh]).action, "buy")
        stale = quote(s, observed_at_ms=s.decision_at_ms - 5000)
        result = admit_accumulation(model(), s, [stale])
        self.assertEqual(result.action, "wait")
        self.assertIn("stale_quote", result.candidates[0].reasons)

    def test_fresh_quote_cannot_refresh_old_context_receipt(self):
        s = state()
        old = replace(s, context_received_at_ms=s.decision_at_ms - 6000)
        recent_quote = quote(old, observed_at_ms=s.decision_at_ms - 2000)
        self.assertEqual(admit_accumulation(model(), old, [recent_quote]).reason, "stale_current_context")
        boundary = replace(s, context_received_at_ms=s.decision_at_ms - 5000)
        self.assertEqual(admit_accumulation(model(), boundary, [quote(boundary)]).reason, "stale_current_context")
        fresh = replace(s, context_received_at_ms=s.decision_at_ms - 4999)
        self.assertEqual(admit_accumulation(model(), fresh, [quote(fresh)]).action, "buy")
        for receipt in (s.block_timestamp_ms - 1, s.decision_at_ms + 1, True):
            with self.subTest(receipt=receipt), self.assertRaises(ValueError):
                replace(s, context_received_at_ms=receipt)

    def test_finalized_block_age_sixty_seconds_is_inclusive(self):
        self.assertEqual(MAXIMUM_FINALIZED_BLOCK_AGE_MS, 60000)
        s = state()
        fresh = replace(s, block_timestamp_ms=s.decision_at_ms - 60000)
        self.assertEqual(admit_accumulation(model(), fresh, [quote(fresh)]).action, "buy")
        stale = replace(s, block_timestamp_ms=s.decision_at_ms - 60001)
        self.assertEqual(admit_accumulation(model(), stale, [quote(stale)]).reason, "stale_current_state")

    def test_current_peak_must_include_current_value_and_inputs_never_use_float(self):
        for changes in ({"current_price": "1"}, {"current_price": 2.0}, {"buy_count": True}, {"block_timestamp_ms": True}, {"decision_at_ms": OPENING + 1}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                state(**changes)
        for args in (("11", "1", "2"), ("10", "1.1", "2"), (10.0, "1", "2")):
            with self.assertRaises(ValueError):
                OpeningPortfolio(*args)
        with self.assertRaises(ValueError):
            quote(state(), q=True)
        with self.assertRaises(ValueError):
            quote(state(), network_fee_xor=0.1)

    def test_no_candidates_duplicates_and_incomplete_scenarios(self):
        s = state()
        self.assertEqual(admit_accumulation(model(), s, []).reason, "no_candidates")
        with self.assertRaisesRegex(ValueError, "duplicate"):
            admit_accumulation(model(), s, [quote(s), quote(s)])
        for fixture in (paths("2")[:-1], paths("2", "2"), paths("NaN")):
            with self.assertRaises(ValueError):
                _evaluate_scenarios(s, [quote(s)], fixture)

    def test_ambient_decimal_precision_cannot_change_decision(self):
        s = state()
        expected = _evaluate_scenarios(s, [quote(s)], paths("2"))
        with localcontext() as context:
            context.prec = 6
            self.assertEqual(_evaluate_scenarios(s, [quote(s)], paths("2")), expected)


if __name__ == "__main__":
    unittest.main(verbosity=2)
