"""Synthetic pure reducer checks; no data, wallets or network calls."""
from dataclasses import FrozenInstanceError, replace
from fractions import Fraction
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))
from scripts.bots.accumulation_admission_policy import OpeningPortfolio
from scripts.bots.accumulation_execution_replay import (
    HOUR_MS, DecisionOrder, ReplayError, ReplayMark, create_episode, observe_mark,
    freeze_order, commit_attempt, cancel_order, settle_attempt, finalize_episode,
)

OPEN = 1000 * HOUR_MS
DIGEST = "ab" * 32


def mark(number=1, observed=None, received=None, price="2"):
    return ReplayMark("0x" + f"{number:064x}", number,
                      OPEN - 6000 if observed is None else observed,
                      OPEN - 1000 if received is None else received, price)


def episode():
    return create_episode(OpeningPortfolio("10", "1", "2"), OPEN, mark())


def order(state, **changes):
    values = dict(order_id="order-1", input_kusd=1, quoted_output_xor="0.7",
                  minimum_output_xor="0.6965", fee_ceiling_xor="0.1", decision_at_ms=OPEN + 1000,
                  quote_received_at_ms=OPEN + 500, expires_at_ms=OPEN + 6000,
                  execution_target_ms=OPEN + 3000, maximum_execution_lag_ms=2000,
                  decision_mark=state.current_mark, admission_sha256=DIGEST, quote_sha256=DIGEST,
                  fee_sha256=DIGEST, call_hex="0x0102", envelope_hex="0x0304")
    values.update(changes)
    return DecisionOrder(**values)


def frozen():
    s = episode()
    return freeze_order(s, order(s), expected_revision=s.revision)


def committed():
    s = frozen()
    return commit_attempt(s, OPEN + 1500, expected_revision=s.revision)


def settle(s, **changes):
    values = dict(mark=mark(2, OPEN + 4000, OPEN + 5000), expected_revision=s.revision,
                  order_id=s.order.order_id, envelope_sha256=s.order.envelope_sha256,
                  included_at_ms=OPEN + 4000, received_at_ms=OPEN + 5000,
                  outcome="hypothetical-success", output_xor=s.order.minimum_output_xor, paid_fee_xor="0.1")
    values.update(changes)
    return settle_attempt(s, **values)


class ReplayTests(unittest.TestCase):
    def test_original_exact_opening_and_terminal_accounting(self):
        s = episode()
        self.assertEqual(s.deadline_ms, OPEN + 24 * HOUR_MS)
        self.assertEqual(s.value_xor, Fraction(6))
        terminal = mark(3, s.deadline_ms - 1, s.deadline_ms + 1000, "2.1")
        final = finalize_episode(s, terminal, expected_revision=s.revision)
        self.assertTrue(final.finalized)
        self.assertEqual(final.value_xor, Fraction(121, 21))
        self.assertEqual(final.idle_value_xor, final.value_xor)
        self.assertEqual(final.events[-1].kind, "terminal-accounting-only")
        self.assertEqual(final.current_mark.observed_at_ms, s.deadline_ms - 1)
        self.assertEqual(final.stopped_at_ms, s.deadline_ms)
        for opening in (OPEN + 1, OPEN - HOUR_MS):
            with self.assertRaises(ValueError):
                create_episode(s.opening, opening, mark())
        with self.assertRaises(ReplayError):
            finalize_episode(s, replace(terminal, observed_at_ms=s.deadline_ms), expected_revision=s.revision)

    def test_frozen_terms_and_nested_records_are_immutable(self):
        s = frozen()
        for obj, key, value in ((s.order, "minimum_output_xor", Fraction(1, 10)),
                                (s.order.decision_mark, "price", Fraction(100))):
            with self.assertRaises(FrozenInstanceError):
                setattr(obj, key, value)
        self.assertEqual(s.order.input_kusd, 1)
        self.assertEqual(s.order.minimum_output_xor, Fraction("0.6965"))
        self.assertEqual(s.order.call_hex, "0x0102")
        self.assertEqual(len(s.order.envelope_sha256), 64)
        with self.assertRaisesRegex(ValueError, "50bps"):
            order(episode(), minimum_output_xor="0.6")

    def test_one_commit_then_success_debits_input_and_fee_once(self):
        s = committed()
        self.assertFalse(s.may_request_admission)
        result = settle(s)
        self.assertEqual(result.kusd, 9)
        self.assertEqual(result.xor, Fraction("1.5965"))
        self.assertEqual(result.fees_paid_xor, Fraction("0.1"))
        self.assertEqual(result.remaining_fee_reserve_xor, Fraction("0.9"))
        self.assertTrue(result.successful_purchase)
        self.assertFalse(result.may_request_admission)
        with self.assertRaises(ReplayError):
            settle(result)
        with self.assertRaises(ReplayError):
            commit_attempt(s, OPEN + 1600, expected_revision=s.revision)

    def test_paid_failure_retains_reduced_reserve_and_latches_attempt(self):
        s = committed()
        result = settle(s, outcome="hypothetical-paid-failure", output_xor="0", paid_fee_xor="0.2")
        self.assertEqual((result.kusd, result.xor, result.remaining_fee_reserve_xor),
                         (Fraction(10), Fraction("0.8"), Fraction("0.8")))
        self.assertFalse(result.successful_purchase)
        self.assertFalse(result.may_request_admission)
        self.assertEqual(result.attention, ("paid_fee_exceeded_estimate",))
        self.assertTrue(result.attempt_committed)
        with self.assertRaises(ReplayError):
            freeze_order(result, order(result, order_id="order-2", decision_at_ms=OPEN + 6000,
                                      quote_received_at_ms=OPEN + 5500, expires_at_ms=OPEN + 10000,
                                      execution_target_ms=OPEN + 8000), expected_revision=result.revision)

    def test_only_precommit_cancellation_leaves_admission_eligibility(self):
        s = frozen()
        cancelled = cancel_order(s, OPEN + 1200, expected_revision=s.revision, reason="quote-expired")
        self.assertTrue(cancelled.may_request_admission)
        self.assertFalse(cancelled.attempt_committed)
        self.assertEqual(cancelled.fees_paid_xor, 0)
        expired = cancel_order(s, s.deadline_ms, expected_revision=s.revision, reason="deadline")
        self.assertFalse(expired.may_request_admission)
        with self.assertRaises(ReplayError):
            freeze_order(cancelled, order(cancelled), expected_revision=cancelled.revision)
        s = committed()
        with self.assertRaises(ReplayError):
            cancel_order(s, OPEN + 1700, expected_revision=s.revision, reason="risk-stop")

    def test_passive_gain_cannot_target_before_purchase_or_after_failure(self):
        s = episode()
        gain = mark(2, OPEN + 1000, OPEN + 1100, "1.8")
        s = observe_mark(s, gain, OPEN + 1100, expected_revision=s.revision)
        self.assertGreater(s.value_xor, s.opening.value_xor * Fraction(21, 20))
        self.assertIsNone(s.stop_reason)
        failed = settle(committed(), outcome="hypothetical-paid-failure", output_xor="0")
        failed = observe_mark(failed, mark(3, OPEN + 6000, OPEN + 6100, "1.5"), OPEN + 6100,
                              expected_revision=failed.revision)
        self.assertIsNone(failed.stop_reason)
        self.assertLess(failed.value_xor, failed.idle_value_xor)

    def test_target_requires_success_and_strict_excess_at_same_mark(self):
        s = settle(committed(), output_xor="1")
        self.assertEqual(s.stop_reason, "target")
        self.assertGreater(s.value_xor, s.idle_value_xor)
        neutral = settle(committed())
        # Passive repricing can exceed opening +5% while strategy underperforms idle.
        neutral = observe_mark(neutral, mark(3, OPEN + 6000, OPEN + 6100, "1"), OPEN + 6100,
                               expected_revision=neutral.revision)
        self.assertGreater(neutral.value_xor, neutral.opening.value_xor * Fraction(21, 20))
        self.assertLess(neutral.value_xor, neutral.idle_value_xor)
        self.assertIsNone(neutral.stop_reason)

    def test_risk_stop_after_commit_does_not_cancel_settlement(self):
        s = committed()
        s = observe_mark(s, mark(2, OPEN + 2000, OPEN + 2100, "2.5"), OPEN + 2100,
                         expected_revision=s.revision)
        self.assertEqual(s.stop_reason, "loss")
        self.assertEqual(s.order_phase, "committed")
        result = settle(s, mark=mark(3, OPEN + 4000, OPEN + 5000, "2"), output_xor="3")
        self.assertEqual(result.order_phase, "settled")
        self.assertEqual(result.stop_reason, "loss")
        self.assertEqual(result.stopped_at_ms, OPEN + 2100)
        self.assertEqual(result.kusd, 9)

    def test_pre_settlement_passive_loss_is_not_hidden_by_favorable_fill(self):
        result = settle(committed(), mark=mark(2, OPEN + 4000, OPEN + 5000, "2.5"), output_xor="3")
        self.assertEqual(result.stop_reason, "loss")
        self.assertGreater(result.value_xor, 6)
        self.assertGreaterEqual(result.maximum_drawdown, Fraction(1, 6))

    def test_unexpected_fee_loss_is_applied_and_attention_retained(self):
        result = settle(committed(), paid_fee_xor="0.9")
        self.assertEqual(result.stop_reason, "loss")
        self.assertEqual(result.remaining_fee_reserve_xor, Fraction("0.1"))
        self.assertEqual(result.attention, ("paid_fee_exceeded_estimate",))
        failed = settle(committed(), outcome="hypothetical-paid-failure", output_xor="0", paid_fee_xor="0.7")
        self.assertEqual(failed.stop_reason, "loss")
        self.assertEqual(failed.xor, Fraction("0.3"))

    def test_exact_ten_percent_control_floor_pauses_and_latches(self):
        s = episode()
        floor = mark(2, OPEN + 1000, OPEN + 1100, Fraction(25, 11))  # 10/P + 1 == 5.4
        s = observe_mark(s, floor, OPEN + 1100, expected_revision=s.revision)
        self.assertEqual(s.value_xor, Fraction(27, 5))
        self.assertEqual(s.stop_reason, "loss")
        recovered = observe_mark(s, mark(3, OPEN + 2000, OPEN + 2100, "1"), OPEN + 2100,
                                 expected_revision=s.revision)
        self.assertEqual(recovered.stop_reason, "loss")
        self.assertFalse(recovered.may_request_admission)

    def test_stopping_does_not_hide_later_passive_drawdown(self):
        s = settle(committed(), output_xor="1")
        peak = s.performance_peak_xor
        s = observe_mark(s, mark(3, OPEN + 6000, OPEN + 6100, "10"), OPEN + 6100,
                         expected_revision=s.revision)
        self.assertEqual(s.stop_reason, "target")
        self.assertEqual(s.performance_peak_xor, peak)
        self.assertGreater(s.maximum_drawdown, Fraction(1, 10))

    def test_freshness_clocks_are_independent_at_exact_boundaries(self):
        for age, allowed in ((60000, True), (60001, False)):
            s = episode()
            m = mark(2, OPEN + 1000 - age, OPEN + 500)
            # Use a sufficiently old opening to permit this advancing native mark.
            s = create_episode(s.opening, OPEN, mark(1, OPEN - 60000, OPEN - 1000))
            if allowed:
                s = observe_mark(s, m, OPEN + 1000, expected_revision=s.revision)
                result = freeze_order(s, order(s, quote_received_at_ms=OPEN + 800), expected_revision=s.revision)
                self.assertEqual(result.order_phase, "frozen")
            else:
                with self.assertRaises(ReplayError):
                    observe_mark(s, m, OPEN + 1000, expected_revision=s.revision)
        for age, allowed in ((4999, True), (5000, False)):
            s = episode()
            o = order(s, decision_at_ms=s.current_mark.received_at_ms + age,
                      execution_target_ms=OPEN + 10000, expires_at_ms=OPEN + 12000)
            if allowed:
                self.assertEqual(freeze_order(s, o, expected_revision=s.revision).order_phase, "frozen")
            else:
                with self.assertRaises(ReplayError):
                    freeze_order(s, o, expected_revision=s.revision)

    def test_expired_precommit_and_unsafe_fee_cannot_consume_attempt(self):
        s = frozen()
        with self.assertRaises(ReplayError):
            commit_attempt(s, s.order.expires_at_ms, expected_revision=s.revision)
        self.assertFalse(s.attempt_committed)
        base = episode()
        s = freeze_order(base, order(base, fee_ceiling_xor="0.7"), expected_revision=base.revision)
        with self.assertRaisesRegex(ReplayError, "failed-fee drawdown"):
            commit_attempt(s, OPEN + 1500, expected_revision=s.revision)
        self.assertFalse(s.attempt_committed)
        with self.assertRaises(ReplayError):
            freeze_order(base, order(base, fee_ceiling_xor="1.1"), expected_revision=base.revision)

    def test_original_minimum_cannot_be_refreshed_from_later_low_quote(self):
        s = committed()
        with self.assertRaisesRegex(ReplayError, "below frozen minimum") as caught:
            settle(s, output_xor="0.6")
        self.assertIs(caught.exception.state, s)
        self.assertIn(("output_xor", "3/5"), caught.exception.details)
        self.assertEqual(s.order_phase, "committed")
        for changed in ({"outcome": "actual-success"}, {"outcome": "quote-unavailable"},
                        {"outcome": "hypothetical-paid-failure", "output_xor": "0.1"}):
            with self.assertRaises(ReplayError):
                settle(s, **changed)

    def test_wrong_order_bytes_or_unfunded_fee_retains_unresolved_attempt(self):
        s = committed()
        for changed in ({"order_id": "other"}, {"envelope_sha256": "cd" * 32}, {"paid_fee_xor": "1.1"}):
            with self.assertRaises(ReplayError) as caught:
                settle(s, **changed)
            self.assertIs(caught.exception.state, s)
            self.assertEqual(s.fees_paid_xor, 0)
        with self.assertRaisesRegex(ReplayError, "unresolved"):
            finalize_episode(s, mark(3, s.deadline_ms - 1, s.deadline_ms + 1000), expected_revision=s.revision)

    def test_fixed_execution_window_and_deadline_reject_without_substitution(self):
        s = committed()
        for included in (s.order.execution_target_ms - 1, s.order.execution_target_ms + 2001, s.deadline_ms):
            with self.assertRaisesRegex(ReplayError, "execution window"):
                settle(s, mark=mark(2, included, included + 100), included_at_ms=included, received_at_ms=included + 100)
        result = settle(s, mark=mark(2, OPEN + 5000, OPEN + 5100), included_at_ms=OPEN + 5000, received_at_ms=OPEN + 5100)
        self.assertEqual(result.order_phase, "settled")

    def test_original_model_expiry_is_exclusive_and_does_not_free_the_committed_attempt(self):
        base = episode()
        s = freeze_order(base, order(base, expires_at_ms=OPEN + 4500), expected_revision=base.revision)
        s = commit_attempt(s, OPEN + 1500, expected_revision=s.revision)
        accepted = settle(s, mark=mark(2, OPEN + 4499, OPEN + 5000), included_at_ms=OPEN + 4499)
        self.assertEqual(accepted.order_phase, "settled")
        for included in (OPEN + 4500, OPEN + 4501):
            with self.assertRaisesRegex(ReplayError, "expiry") as caught:
                settle(s, mark=mark(2, included, OPEN + 5000), included_at_ms=included)
            self.assertIs(caught.exception.state, s)
            self.assertTrue(s.attempt_committed)
            self.assertEqual(s.order_phase, "committed")

    def test_output_plus_existing_balance_cannot_overflow_u128(self):
        s = committed()
        output = Fraction(2**128 - 1, 10**18)
        with self.assertRaisesRegex(ReplayError, "codec bounds") as caught:
            settle(s, output_xor=output)
        self.assertIs(caught.exception.state, s)
        self.assertEqual(s.order_phase, "committed")

    def test_predeadline_inclusion_with_late_receipt_remains_hypothetical_and_no_backdated_target(self):
        s = committed()
        late = s.deadline_ms + 1000
        result = settle(s, mark=mark(2, OPEN + 4000, late), received_at_ms=late, output_xor="1")
        self.assertEqual(result.stop_reason, "expired")
        self.assertEqual(result.stopped_at_ms, s.deadline_ms)
        self.assertEqual(result.events[-1].at_ms, late)
        self.assertEqual(result.events[-1].mark.observed_at_ms, OPEN + 4000)
        final = finalize_episode(result, mark(3, s.deadline_ms - 1, late + 1000), expected_revision=result.revision)
        self.assertEqual(final.kusd, 9)
        self.assertEqual(final.xor, Fraction("1.9"))

    def test_revisions_native_order_and_same_block_contradictions_reject(self):
        s = episode()
        with self.assertRaises(ReplayError):
            observe_mark(s, mark(), OPEN, expected_revision=s.revision - 1)
        for bad in (replace(mark(), price="3"), mark(2, OPEN - 6001, OPEN + 1000)):
            with self.assertRaises(ReplayError):
                observe_mark(s, bad, OPEN + 1000, expected_revision=s.revision)
        final = finalize_episode(s, mark(3, s.deadline_ms - 1, s.deadline_ms + 1000), expected_revision=s.revision)
        with self.assertRaises(ReplayError):
            finalize_episode(final, final.current_mark, expected_revision=final.revision)

    def test_exact_token_inputs_and_byte_validation(self):
        s = episode()
        for changes in ({"fee_ceiling_xor": 0.1}, {"fee_ceiling_xor": Fraction(1, 10**19)},
                        {"input_kusd": True}, {"input_kusd": 10}, {"call_hex": "0x0g"},
                        {"admission_sha256": "fake"}, {"quote_received_at_ms": OPEN + 1001}):
            with self.assertRaises(ValueError):
                order(s, **changes)
        with self.assertRaises(ValueError):
            mark(price=2.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
