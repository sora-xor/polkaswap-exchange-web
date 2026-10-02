"""Synthetic offline tests for strict subprocess math inputs; no market fixtures."""
import copy
from hashlib import sha256
import json
import os
from pathlib import Path
import py_compile
import subprocess
import sys
import tempfile
from types import ModuleType
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT))
from scripts.bots import accumulation_admission_runner as runner


def ratio(numerator, denominator=1):
    return {"numerator": str(numerator), "denominator": str(denominator)}


def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode()


def model_bytes():
    return encoded({"kind": "tc1-fixed-ar1-training-fit-v1", "admissible": True,
        "fitCount": 1, "networkRequests": 0, "developmentAccessed": False,
        "validationAccessed": False, "financialActions": False, "qualificationAuthority": False,
        "registrationSha256": "1" * 64, "trainingSha256": "2" * 64,
        "startedAt": "synthetic", "interpretation": "Synthetic fixed fixture only",
        "model": {"intercept": "0", "phi": "0.5", "equilibrium_log_price": "0",
            "equilibrium_price": "1", "residuals": ["0"] * 719,
            "training_start_ms": runner.TRAINING_START, "training_end_ms": runner.TRAINING_END}})


def request():
    start = runner.TRAINING_END + runner.HOUR
    context = start + 1000
    block = {"hash": "0x" + "a" * 64, "height": 100, "timestampMs": start}
    candidates = [{"inputKusd": size, "status": "unavailable", "reason": "native-quote-null",
        "evidenceSha256": [str(size) * 64], "quote": None} for size in range(1, 10)]
    candidates[0] = {"inputKusd": 1, "status": "ready", "reason": None, "evidenceSha256": ["1" * 64],
        "quote": {"quotedOutputXorCodec": "1200000000000000000", "minimumOutputXorCodec": "1194000000000000000",
            "networkFeeXorCodec": "100000000000000000", "priceImpact": ratio(0),
            "quoteReceivedAtMs": context + 100, "feeReceivedAtMs": context + 200, "expiresAtMs": start + 10_000}}
    return {"kind": "accumulation-admission-request-v1", "packet": {
        "status": "verified", "packetSha256": "b" * 64, "genesisHash": runner.GENESIS,
        "denominator": runner.DENOMINATOR, "block": block, "contextReceivedAtMs": context,
        "decisionAtMs": context + 300, "currentPrice": ratio(1),
        "latestCompletedClose": {"timestampMs": start, "availableAtMs": context, "price": ratio(1),
                                  "evidenceSha256": "c" * 64}, "candidates": candidates},
        "episode": {"episodeId": "synthetic-001", "journalPrefixSha256": "d" * 64, "journalRevision": 3,
            "openingAtMs": start, "deadlineMs": start + 24 * runner.HOUR, "lastAtMs": context,
            "opening": {"capitalKusdCodec": "10000000000000000000", "feeReserveXorCodec": "1000000000000000000",
                        "price": ratio(1)},
            "current": {"kusdCodec": "10000000000000000000", "xorCodec": "1000000000000000000",
                        "feesPaidXorCodec": "0", "peakXor": ratio(11), "markBlockHash": block["hash"]},
            "attemptCommitted": False, "successfulPurchase": False, "orderPhase": "none",
            "goalStopped": False, "targetReached": False}}


class InvocationTests(unittest.TestCase):
    def evaluate(self, data=None, model=None):
        data = request() if data is None else data
        model = model_bytes() if model is None else model
        return runner.evaluate_request(encoded(data), model, trusted_model_sha256=sha256(model).hexdigest())

    def reject(self, data):
        with self.assertRaises(ValueError):
            self.evaluate(data)

    def test_synthetic_exact_buy_retains_all_outcomes_without_authority(self):
        data = request()
        result = self.evaluate(data)
        self.assertEqual(result["decision"]["action"], "buy")
        self.assertEqual(result["decision"]["selected_input_kusd"], 1)
        self.assertEqual(result["inputSha256"], sha256(encoded(data)).hexdigest())
        self.assertEqual(result["candidateOutcomes"], data["packet"]["candidates"])
        self.assertTrue(result["policyCalled"])
        self.assertFalse(result["qualificationAuthority"])
        self.assertFalse(result["financialActions"])
        self.assertEqual(runner.canonical(result), encoded(result) + b"\n")

    def test_incomplete_never_invokes_policy_or_becomes_wait(self):
        data = request(); data["packet"]["status"] = "incomplete"
        data["packet"]["candidates"][1]["status"] = "failed"
        data["packet"]["candidates"][1]["reason"] = "transport-error"
        policy, _ = runner.load_math()
        with patch.object(policy, "admit_accumulation", side_effect=AssertionError("must not invoke")):
            result = self.evaluate(data)
        self.assertEqual(result["status"], "incomplete")
        self.assertIsNone(result["decision"])
        self.assertFalse(result["policyCalled"])
        self.assertEqual(len(result["candidateOutcomes"]), 9)

    def test_failed_outcome_cannot_claim_verified_packet(self):
        data = request(); data["packet"]["candidates"][1]["status"] = "failed"
        self.reject(data)

    def test_all_nine_sizes_required_in_canonical_order(self):
        for change in (lambda rows: rows.pop(), lambda rows: rows.reverse(),
                       lambda rows: rows.__setitem__(1, copy.deepcopy(rows[0]))):
            data = request(); change(data["packet"]["candidates"]); self.reject(data)

    def test_original_minimum_is_exact_codec_floor(self):
        data = request(); data["packet"]["candidates"][0]["quote"]["minimumOutputXorCodec"] = "1193999999999999999"
        self.reject(data)

    def test_original_quote_and_context_ages_are_not_renewed_by_fee(self):
        data = request(); p = data["packet"]
        p["decisionAtMs"] = p["contextReceivedAtMs"] + 5000
        p["candidates"][0]["quote"]["feeReceivedAtMs"] = p["decisionAtMs"]
        result = self.evaluate(data)
        self.assertEqual(result["decision"]["reason"], "stale_current_context")
        p["decisionAtMs"] -= 1
        p["candidates"][0]["quote"]["feeReceivedAtMs"] -= 1
        self.assertEqual(self.evaluate(data)["decision"]["action"], "buy")

    def test_future_or_reordered_receipts_reject(self):
        for field, value in (("quoteReceivedAtMs", -1), ("feeReceivedAtMs", runner.SAFE_INTEGER),
                             ("feeReceivedAtMs", request()["packet"]["contextReceivedAtMs"])):
            data = request(); data["packet"]["candidates"][0]["quote"][field] = value; self.reject(data)
        data = request(); data["packet"]["latestCompletedClose"]["availableAtMs"] = data["packet"]["decisionAtMs"] + 1
        self.reject(data)

    def test_overimpact_quote_is_retained_as_policy_rejection(self):
        data = request(); row = data["packet"]["candidates"][0]
        row["status"] = "rejected-impact"; row["reason"] = "impact-limit"; row["quote"]["priceImpact"] = ratio(1, 50)
        result = self.evaluate(data)
        self.assertEqual(result["decision"]["action"], "wait")
        self.assertIn("price_impact_exceeded", result["decision"]["candidates"][0]["reasons"])

    def test_spent_fees_or_attempt_cannot_recreate_opening_allocation(self):
        for key, value in (("feesPaidXorCodec", "1"), ("xorCodec", "999999999999999999"),
                           ("kusdCodec", "9000000000000000000")):
            data = request(); data["episode"]["current"][key] = value; self.reject(data)
        for key, value in (("attemptCommitted", True), ("successfulPurchase", True), ("orderPhase", "frozen"),
                           ("orderPhase", "committed"), ("targetReached", True)):
            data = request(); data["episode"][key] = value; self.reject(data)

    def test_stopped_goal_stays_wait_without_simulation(self):
        data = request(); data["episode"]["goalStopped"] = True
        self.assertEqual(self.evaluate(data)["decision"]["reason"], "goal_stopped")

    def test_mark_cannot_precede_its_native_block(self):
        data = request()
        data["packet"]["block"]["timestampMs"] += 500
        data["episode"]["lastAtMs"] = data["packet"]["block"]["timestampMs"] - 1
        self.reject(data)
        data["episode"]["lastAtMs"] += 1
        self.assertEqual(self.evaluate(data)["decision"]["action"], "buy")

    def test_drawdown_pause_must_latch_at_and_beyond_exact_cap(self):
        for peak in (ratio(110, 9), ratio(13)):
            data = request(); data["episode"]["current"]["peakXor"] = peak
            with self.assertRaisesRegex(ValueError, "drawdown-stop-not-latched"):
                self.evaluate(data)
            data["episode"]["goalStopped"] = True
            self.assertEqual(self.evaluate(data)["decision"]["reason"], "goal_stopped")

    def test_candidate_reasons_must_agree_with_status(self):
        data = request(); data["packet"]["candidates"][0]["reason"] = "transport-error"
        self.reject(data)
        data = request(); row = data["packet"]["candidates"][0]
        row["status"] = "rejected-impact"; row["quote"]["priceImpact"] = ratio(1, 50)
        self.reject(data)

    def test_untrusted_or_oversized_model_rejects_before_math_import(self):
        with patch.object(runner, "load_math", side_effect=AssertionError("must not import")):
            for raw in (b"untrusted", b"x" * (runner.MAX_MODEL_BYTES + 1)):
                with self.assertRaises(ValueError):
                    runner.evaluate_request(encoded(request()), raw)

    def test_unpinned_namespace_initializer_is_rejected_before_import(self):
        actual_exists = Path.exists
        for package in (runner.ROOT / "scripts", runner.ROOT / "scripts/bots"):
            for suffix in runner.all_suffixes():
                unexpected = package / ("__init__" + suffix)
                with patch.object(Path, "exists", lambda path: path == unexpected or actual_exists(path)):
                    with self.assertRaisesRegex(ValueError, "unexpected-package-initializer"):
                        runner.load_math()

    def test_timestamp_valid_altered_bytecode_is_never_loaded(self):
        name = "accumulation_stopping_model"
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); source = root / "scripts/bots" / (name + ".py")
            source.parent.mkdir(parents=True)
            source.write_bytes(b'sentinel = "evil"\n')
            timestamp = source.stat().st_mtime_ns
            py_compile.compile(str(source), doraise=True, invalidation_mode=py_compile.PycInvalidationMode.TIMESTAMP)
            checked = b'sentinel = "real"\n'
            source.write_bytes(checked); os.utime(source, ns=(timestamp, timestamp))
            with patch.object(runner, "ROOT", root), patch.dict(runner.DEPENDENCIES,
                    {name + ".py": sha256(checked).hexdigest()}, clear=True):
                loader = runner._PinnedSourceLoader("scripts.bots." + name, str(source))
                module = runner.module_from_spec(runner.spec_from_loader("scripts.bots." + name, loader))
                loader.exec_module(module)
                self.assertEqual(module.sentinel, "real")

    def test_unchecked_preloaded_math_is_replaced_and_cache_reader_unused(self):
        fullname = "scripts.bots.accumulation_stopping_model"
        old = sys.modules.get(fullname)
        original_cache = runner._MATH
        try:
            runner._MATH = None
            unchecked = ModuleType(fullname); sys.modules[fullname] = unchecked
            original_get_data = runner.SourceFileLoader.get_data

            def checked_get_data(loader, path):
                if loader.name in {"scripts.bots." + name[:-3] for name in runner.DEPENDENCIES}:
                    raise AssertionError("no math cache read")
                return original_get_data(loader, path)

            with patch.object(runner.SourceFileLoader, "get_data", checked_get_data):
                policy, model = runner.load_math()
            self.assertIsNot(model, unchecked)
            self.assertIs(policy.Ar1Model, model.Ar1Model)
            self.assertEqual(Path(model.__file__), runner.ROOT / "scripts/bots/accumulation_stopping_model.py")
        except BaseException:
            runner._MATH = original_cache
            if old is not None:
                sys.modules[fullname] = old
            raise

    def test_unexpected_parent_package_path_cannot_inject_imports(self):
        with patch.dict(sys.modules, {"scripts": ModuleType("scripts")}):
            with self.assertRaisesRegex(ValueError, "unexpected-namespace-parent"):
                runner.load_math()

    def test_original_deadline_mark_and_durable_peak_cannot_change(self):
        data = request(); data["episode"]["deadlineMs"] += runner.HOUR; self.reject(data)
        data = request(); data["episode"]["current"]["markBlockHash"] = "0x" + "b" * 64; self.reject(data)
        data = request(); data["episode"]["current"]["peakXor"] = ratio(10); self.reject(data)
        data = request(); data["episode"]["lastAtMs"] = data["packet"]["decisionAtMs"] + 1; self.reject(data)

    def test_exact_codec_and_ratio_boundary(self):
        for invalid in (1, True, "01", "1.0", "1e18", "-1", str(2**128)):
            data = request(); data["episode"]["opening"]["capitalKusdCodec"] = invalid; self.reject(data)
        for invalid in (ratio(2, 2), ratio(1, 0), ratio("1" * 193), {"numerator": 1, "denominator": "1"}):
            data = request(); data["packet"]["currentPrice"] = invalid; self.reject(data)

    def test_duplicate_keys_floats_nonfinite_and_oversized_json_reject(self):
        for raw in (b'{"kind":1,"kind":2}', b'{"x":1.0}', b'{"x":1e3}', b'{"x":NaN}',
                    b'[' * 20 + b'0' + b']' * 20, b' ' * (runner.MAX_INPUT_BYTES + 1)):
            with self.assertRaises(ValueError):
                runner.strict_json(raw, runner.MAX_INPUT_BYTES)
        data = request(); data["episode"]["deadlineMs"] = runner.SAFE_INTEGER + 1; self.reject(data)

    def test_unknown_controls_cannot_be_ignored(self):
        data = request(); data["episode"]["relaxLimits"] = True; self.reject(data)
        data = request(); data["packet"]["candidates"][0]["quote"]["feeWaived"] = True; self.reject(data)

    def test_model_hash_window_residuals_and_fit_count_are_fixed(self):
        policy, model_module = runner.load_math()
        with self.assertRaises(ValueError):
            runner.decode_model(model_bytes(), "0" * 64, model_module)
        for change in (lambda m: m["model"]["residuals"].pop(),
                       lambda m: m["model"].__setitem__("training_end_ms", runner.TRAINING_END + runner.HOUR),
                       lambda m: m.__setitem__("fitCount", 2),
                       lambda m: m["model"].__setitem__("phi", "1"),
                       lambda m: m["model"].__setitem__("intercept", "NaN")):
            data = json.loads(model_bytes()); change(data)
            with self.assertRaises(ValueError):
                self.evaluate(model=encoded(data))

    def test_cli_rejects_model_override_with_one_canonical_error_line(self):
        process = subprocess.run([sys.executable, "-I", "-S", "-B", str(Path(runner.__file__)), "--model", "ignored"],
                                 input=b"{}", capture_output=True, timeout=10)
        self.assertEqual(process.returncode, 1)
        self.assertEqual(process.stderr, b"")
        result = json.loads(process.stdout)
        self.assertEqual(result["reason"], "arguments-not-supported")
        self.assertEqual(process.stdout, runner.canonical(result))


if __name__ == "__main__":
    unittest.main()
