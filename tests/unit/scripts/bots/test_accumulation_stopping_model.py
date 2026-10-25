"""Deterministic offline contracts; run with python3 <this-file> from any cwd."""

from dataclasses import replace
from decimal import Decimal, localcontext
from fractions import Fraction
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))

from scripts.bots.accumulation_stopping_model import (  # noqa: E402
    Ar1FitError,
    HOUR_MS,
    PRECISION,
    TRAINING_HOURS,
    HourlyClose,
    SingleBuy,
    exact,
    expected_single_buy_values,
    fit_ar1,
    forecast_ar1,
    natural_from_codec,
    single_buy_interval,
    single_buy_values,
)


def synthetic_training(phi="0.98", equilibrium="-1", initial="0"):
    """Generate a declared synthetic recurrence, never real historical data."""
    with localcontext() as context:
        context.prec = PRECISION
        phi, equilibrium, log_price = map(Decimal, (phi, equilibrium, initial))
        intercept = (1 - phi) * equilibrium
        result = []
        for hour in range(TRAINING_HOURS):
            result.append(HourlyClose((5000 + hour) * HOUR_MS, log_price.exp()))
            log_price = intercept + phi * log_price
        return tuple(result)


class ExactAccountingTests(unittest.TestCase):
    def buy(self, **changes):
        fields = dict(capital_kusd="10", input_kusd="2.5", minimum_output_xor="1", network_fee_xor="0.1", opening_price="5")
        fields.update(changes)
        return SingleBuy(**fields)

    def test_exact_parser_and_mixed_token_decimals(self):
        self.assertEqual(exact(Decimal("0.1")), Fraction(1, 10))
        self.assertEqual(exact("0.000000000000000001"), Fraction(1, 10**18))
        self.assertEqual(natural_from_codec("2500000", 6), Fraction(5, 2))
        self.assertEqual(natural_from_codec(10**18, 18), 1)
        buy = self.buy(
            capital_kusd=natural_from_codec(10_000_000, 6),
            input_kusd=natural_from_codec(2_500_000, 6),
            minimum_output_xor=natural_from_codec(10**18, 18),
            network_fee_xor=natural_from_codec(10**17, 18),
        )
        interval = single_buy_interval(buy)
        self.assertEqual(interval.lower, Fraction(25, 9))
        self.assertEqual(interval.upper, Fraction(75, 11))
        value = single_buy_values(buy, Fraction(3))
        self.assertEqual(value.portfolio_xor, Fraction(22, 5))
        self.assertEqual(value.idle_xor, Fraction(13, 3))
        self.assertEqual(value.excess_xor, Fraction(1, 15))

    def test_float_boolean_nonfinite_and_invalid_codec_rejected(self):
        for value in (0.1, True, Decimal("NaN"), "Infinity", "bad", "1/3"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                exact(value)
        for value, decimals in ((True, 18), (-1, 18), ("01", 18), ("1.0", 18), ("-1", 18), ("1", -1), ("1", 39), ("1", True)):
            with self.subTest(value=value, decimals=decimals), self.assertRaises(ValueError):
                natural_from_codec(value, decimals)

    def test_partial_input_capital_and_fee_budget(self):
        for changes in (
            {"capital_kusd": "10.000001"}, {"capital_kusd": "0"},
            {"input_kusd": "10"}, {"input_kusd": "11"}, {"input_kusd": "0"}, {"input_kusd": "-1"},
            {"fee_reserve_xor": "1.01"}, {"fee_reserve_xor": "-1"},
            {"network_fee_xor": "1.000001"}, {"network_fee_xor": "-0.1"},
            {"minimum_output_xor": "0"}, {"opening_price": "0"}, {"current_peak_xor": "2.999"},
        ):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.buy(**changes)
        self.assertEqual(self.buy(input_kusd="9.999999999999999999").capital_kusd, 10)
        self.assertEqual(self.buy(network_fee_xor="1").network_fee_xor, 1)

    def test_fee_equal_to_or_above_output_has_no_interval(self):
        for output in ("0.1", "0.09"):
            buy = self.buy(minimum_output_xor=output)
            interval = single_buy_interval(buy)
            self.assertTrue(interval.empty)
            self.assertFalse(interval.contains("100000"))
            self.assertLess(single_buy_values(buy, "100000").excess_xor, 0)

    def test_reserve_is_in_opening_idle_and_terminal_not_synthetic_profit(self):
        buy = self.buy(input_kusd="5", minimum_output_xor="1", network_fee_xor="0", opening_price="5")
        with_reserve = single_buy_values(buy, "5")
        without_reserve = single_buy_values(replace(buy, fee_reserve_xor="0", current_peak_xor=None), "5")
        self.assertEqual(with_reserve.portfolio_xor, 3)
        self.assertEqual(with_reserve.growth_xor, 0)
        self.assertEqual(with_reserve.excess_xor, 0)
        self.assertFalse(with_reserve.positive_growth_and_excess)
        self.assertFalse(with_reserve.target_reached)
        self.assertEqual(with_reserve.portfolio_xor - without_reserve.portfolio_xor, 1)
        self.assertEqual(with_reserve.growth_xor, without_reserve.growth_xor)
        self.assertEqual(with_reserve.excess_xor, without_reserve.excess_xor)
        self.assertTrue(single_buy_interval(buy).empty)

    def test_fee_subtracted_once_without_counting_pool_costs_again(self):
        value = single_buy_values(self.buy(), "5")
        self.assertEqual(value.opening_xor, 3)
        self.assertEqual(value.portfolio_xor, Fraction(17, 5))
        self.assertEqual(value.excess_xor, Fraction(2, 5))

    def test_positive_growth_and_excess_do_not_require_five_percent_target(self):
        buy = self.buy(input_kusd="5", minimum_output_xor="1.2")
        value = single_buy_values(buy, "5")
        self.assertEqual(value.growth_xor, Fraction(1, 10))
        self.assertTrue(value.positive_growth_and_excess)
        self.assertFalse(value.target_reached)
        self.assertTrue(single_buy_interval(buy).contains("5"))
        at_target = single_buy_values(self.buy(input_kusd="5", minimum_output_xor="1.25"), "5")
        self.assertEqual(at_target.portfolio_xor, Fraction(63, 20))
        self.assertTrue(at_target.target_reached)

    def test_interval_lower_and_growth_upper_are_strict(self):
        buy = self.buy()
        interval = single_buy_interval(buy)
        self.assertFalse(interval.empty)
        self.assertFalse(interval.upper_inclusive)
        self.assertFalse(interval.contains(interval.lower))
        self.assertFalse(interval.contains(interval.upper))
        for price in (Fraction(1), interval.lower, interval.lower + Fraction(1, 10**30), Fraction(3), interval.upper, Fraction(10)):
            value = single_buy_values(buy, price)
            self.assertEqual(interval.contains(price), value.positive_growth_and_excess and value.within_current_drawdown)
        for invalid in ("0", "-1", float("nan")):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                interval.contains(invalid)

    def test_current_peak_floor_is_inclusive_and_can_narrow_or_empty_interval(self):
        buy = self.buy(current_peak_xor="5")
        interval = single_buy_interval(buy)
        self.assertEqual(interval.upper, Fraction(75, 26))
        self.assertTrue(interval.upper_inclusive)
        self.assertTrue(interval.contains(interval.upper))
        value = single_buy_values(buy, interval.upper)
        self.assertEqual(value.portfolio_xor, Fraction(9, 2))
        self.assertTrue(value.within_current_drawdown)
        self.assertTrue(single_buy_interval(self.buy(current_peak_xor="10")).empty)

    def test_growth_upper_wins_tie_with_drawdown_upper(self):
        interval = single_buy_interval(self.buy(current_peak_xor=Fraction(10, 3)))
        self.assertEqual(interval.upper, Fraction(75, 11))
        self.assertFalse(interval.upper_inclusive)
        self.assertFalse(interval.contains(interval.upper))

    def test_unbounded_growth_interval_when_net_output_already_exceeds_opening(self):
        interval = single_buy_interval(self.buy(minimum_output_xor="2.1"))
        self.assertIsNone(interval.upper)
        self.assertTrue(interval.contains("1000000000"))

    def test_weighted_expectation_uses_inverse_price_not_average_price(self):
        buy = self.buy()
        result = expected_single_buy_values(buy, [("3", Fraction(1, 2)), ("6", Fraction(1, 2))])
        self.assertEqual(result.portfolio_xor, Fraction(151, 40))
        self.assertEqual(result.idle_xor, Fraction(7, 2))
        self.assertEqual(result.excess_xor, Fraction(11, 40))
        self.assertEqual(result.growth_xor, Fraction(31, 40))
        self.assertEqual(result.terminal_feasible_probability, 1)
        self.assertEqual(result.target_probability, 1)  # P=6 is exactly the 5% target.
        self.assertNotEqual(result.portfolio_xor, single_buy_values(buy, Fraction(9, 2)).portfolio_xor)

    def test_expectation_preserves_losing_and_no_target_outcomes(self):
        result = expected_single_buy_values(self.buy(), [("2", Fraction(1, 2)), ("10", Fraction(1, 2))])
        self.assertEqual(result.terminal_feasible_probability, 0)
        self.assertEqual(result.target_probability, Fraction(1, 2))
        for scenarios in ([], [("0", 1)], [("3", "0.9")], [("3", "-1"), ("4", "2")], [("3", 1.0)]):
            with self.subTest(scenarios=scenarios), self.assertRaises(ValueError):
                expected_single_buy_values(self.buy(), scenarios)


class CausalModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.training = synthetic_training()
        cls.cutoff = cls.training[-1].timestamp_ms
        cls.model = fit_ar1(cls.training, as_of_ms=cls.cutoff)

    def test_predictable_ar1_fit_and_positive_equilibrium_below_one(self):
        self.assertLess(abs(self.model.phi - Decimal("0.98")), Decimal("1e-65"))
        self.assertLess(abs(self.model.intercept - Decimal("-0.02")), Decimal("1e-65"))
        self.assertLess(abs(self.model.equilibrium_log_price + 1), Decimal("1e-65"))
        self.assertGreater(self.model.equilibrium_price, 0)
        self.assertLess(self.model.equilibrium_price, 1)
        self.assertEqual(len(self.model.residuals), 719)
        self.assertEqual(self.model.training_end_ms, self.cutoff)
        self.assertLess(max(abs(value) for value in self.model.residuals), Decimal("1e-65"))

    def test_deterministic_forecast_one_to_twenty_four_hours(self):
        result = forecast_ar1(self.model, self.training[-1], as_of_ms=self.cutoff, horizon_hours=24)
        self.assertEqual(len(result), 24)
        with localcontext() as context:
            context.prec = PRECISION
            last_log = (Decimal(self.training[-1].price.numerator) / Decimal(self.training[-1].price.denominator)).ln()
            for index, point in enumerate(result, 1):
                expected = -1 + Decimal("0.98") ** index * (last_log + 1)
                self.assertLess(abs(point.log_price - expected), Decimal("1e-65"))
                self.assertLess(abs(point.price - expected.exp()), Decimal("1e-65"))
                self.assertEqual(point.timestamp_ms, self.cutoff + index * HOUR_MS)
        self.assertEqual(result[:1], forecast_ar1(self.model, self.training[-1], as_of_ms=self.cutoff, horizon_hours=1))

    def test_training_length_gaps_duplicates_and_order_rejected(self):
        variants = [self.training[:-1], self.training + (HourlyClose(self.cutoff + HOUR_MS, "1"),)]
        gap = list(self.training)
        gap[100] = HourlyClose(gap[100].timestamp_ms + HOUR_MS, gap[100].price)
        variants.extend((gap, tuple(reversed(self.training))))
        for closes in variants:
            with self.subTest(length=len(closes)), self.assertRaises(ValueError):
                fit_ar1(closes, as_of_ms=self.cutoff)
        with self.assertRaisesRegex(ValueError, "registered cutoff"):
            fit_ar1(self.training, as_of_ms=self.cutoff + HOUR_MS)

    def test_future_data_is_rejected_not_silently_used_or_filtered(self):
        shifted = tuple(HourlyClose(close.timestamp_ms + HOUR_MS, close.price) for close in self.training)
        with self.assertRaisesRegex(ValueError, "future training"):
            fit_ar1(shifted, as_of_ms=self.cutoff)
        original = fit_ar1(self.training, as_of_ms=self.cutoff)
        self.assertEqual(original, self.model)
        with self.assertRaisesRegex(ValueError, "future or stale"):
            forecast_ar1(self.model, HourlyClose(self.cutoff + HOUR_MS, "999999"), as_of_ms=self.cutoff, horizon_hours=1)
        earlier = self.training[-2]
        with self.assertRaisesRegex(ValueError, "training must not extend"):
            forecast_ar1(self.model, earlier, as_of_ms=earlier.timestamp_ms, horizon_hours=1)

    def test_post_training_observation_updates_state_without_refitting(self):
        next_close = HourlyClose(self.cutoff + HOUR_MS, "0.5")
        snapshot = self.model
        result = forecast_ar1(self.model, next_close, as_of_ms=next_close.timestamp_ms, horizon_hours=1)
        self.assertEqual(self.model, snapshot)
        with localcontext() as context:
            context.prec = PRECISION
            expected = self.model.intercept + self.model.phi * Decimal("0.5").ln()
            self.assertEqual(result[0].log_price, expected)

    def test_explicit_innovation_path_is_causal_and_reproducible(self):
        path = ("0.1", "-0.05")
        first = forecast_ar1(self.model, self.training[-1], as_of_ms=self.cutoff, horizon_hours=2, innovations=path)
        second = forecast_ar1(self.model, self.training[-1], as_of_ms=self.cutoff, horizon_hours=2, innovations=path)
        self.assertEqual(first, second)
        zero = forecast_ar1(self.model, self.training[-1], as_of_ms=self.cutoff, horizon_hours=2)
        with localcontext() as context:
            context.prec = PRECISION
            self.assertLess(abs(first[0].log_price - zero[0].log_price - Decimal("0.1")), Decimal("1e-65"))
            self.assertLess(abs(first[1].log_price - zero[1].log_price - (self.model.phi * Decimal("0.1") - Decimal("0.05"))), Decimal("1e-65"))

    def test_constant_nonreverting_or_unstable_training_rejected(self):
        constant = tuple(HourlyClose(close.timestamp_ms, "1") for close in self.training)
        with self.assertRaisesRegex(ValueError, "no variation"):
            fit_ar1(constant, as_of_ms=self.cutoff)
        for phi in ("0", "-0.5", "1.001"):
            with self.subTest(phi=phi), self.assertRaisesRegex(ValueError, "unstable AR"):
                fit_ar1(synthetic_training(phi=phi, equilibrium="0", initial="0.1"), as_of_ms=self.cutoff)

    def test_rejected_fit_retains_coefficients_and_numeric_diagnostics(self):
        for phi in ("0", "-0.5", "1.001"):
            with self.subTest(phi=phi), self.assertRaises(Ar1FitError) as captured:
                fit_ar1(synthetic_training(phi=phi, equilibrium="0", initial="0.1"), as_of_ms=self.cutoff)
            diagnostics = captured.exception.diagnostics
            self.assertEqual(diagnostics["sample_count"], 720)
            self.assertEqual(diagnostics["pair_count"], 719)
            self.assertEqual(diagnostics["training_end_ms"], self.cutoff)
            self.assertGreater(diagnostics["denominator"], 0)
            self.assertLess(abs(diagnostics["phi"] - Decimal(phi)), Decimal("1e-65"))
            self.assertIsInstance(diagnostics["intercept"], Decimal)
            self.assertIsInstance(diagnostics["equilibrium_price"], Decimal)
            with self.assertRaises(TypeError):
                diagnostics["phi"] = Decimal("0.5")
        constant = tuple(HourlyClose(close.timestamp_ms, "1") for close in self.training)
        with self.assertRaises(Ar1FitError) as captured:
            fit_ar1(constant, as_of_ms=self.cutoff)
        self.assertEqual(captured.exception.diagnostics["denominator"], 0)
        self.assertIsNone(captured.exception.diagnostics["phi"])

    def test_invalid_close_horizon_innovations_and_forged_equilibrium_rejected(self):
        for timestamp, price in ((True, "1"), (-HOUR_MS, "1"), (self.cutoff + 1, "1"), (self.cutoff, "0"), (self.cutoff, "-1"), (self.cutoff, 0.1)):
            with self.subTest(timestamp=timestamp, price=price), self.assertRaises(ValueError):
                HourlyClose(timestamp, price)
        for hours in (0, 25, True, 1.0):
            with self.subTest(hours=hours), self.assertRaises(ValueError):
                forecast_ar1(self.model, self.training[-1], as_of_ms=self.cutoff, horizon_hours=hours)
        for innovations in ([], ["NaN"], [0.1]):
            with self.subTest(innovations=innovations), self.assertRaises(ValueError):
                forecast_ar1(self.model, self.training[-1], as_of_ms=self.cutoff, horizon_hours=1, innovations=innovations)
        for equilibrium in (Decimal(0), Decimal("-1"), Decimal("Infinity")):
            with self.subTest(equilibrium=equilibrium), self.assertRaises(ValueError):
                forecast_ar1(replace(self.model, equilibrium_price=equilibrium), self.training[-1], as_of_ms=self.cutoff, horizon_hours=1)

    def test_low_ambient_decimal_precision_cannot_change_fit_or_forecast(self):
        expected = forecast_ar1(self.model, self.training[-1], as_of_ms=self.cutoff, horizon_hours=24)
        with localcontext() as context:
            context.prec = 6
            self.assertEqual(fit_ar1(self.training, as_of_ms=self.cutoff), self.model)
            self.assertEqual(forecast_ar1(self.model, self.training[-1], as_of_ms=self.cutoff, horizon_hours=24), expected)
            self.assertEqual(single_buy_interval(SingleBuy("10", "2.5", "1", "0.1", "5")).lower, Fraction(25, 9))


if __name__ == "__main__":
    unittest.main(verbosity=2)
