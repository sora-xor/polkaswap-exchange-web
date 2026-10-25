"""Offline fit-driver boundary tests; all proof parsing is mocked, never fetched."""
import copy
from decimal import Decimal
from fractions import Fraction
from pathlib import Path
import sys
import tempfile
from types import MappingProxyType
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "scripts/bots"))
import fit_accumulation_stopping_training as driver
from accumulation_stopping_model import Ar1Model
from collect_accumulation_stopping_history import CollectionError, PARTITIONS, canonical, digest, timestamp


class TrainingBoundaryTests(unittest.TestCase):
    """The fit must never accept another range, rounded money, or changed proofs."""

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "training.json"
        start = timestamp(driver.FIT_SPECIFICATION["firstClose"]) * 1000
        self.parsed = {
            "history": {"missing": 0, "denominationVerified": True,
                        "candles": [{"timestamp": start + i * 3_600_000, "close": "9.123456789012345678901"}
                                    for i in range(720)]},
            "boundaries": [{"completedAtMs": start + i * 3_600_000} for i in range(720)],
        }
        self.document = {"partition": PARTITIONS[0], "registrationSha256": "registration",
                         "parserBundleSha256": "parser", "qualificationAuthority": False,
                         "historicalExecutionQuote": False, "millisecondArrivalKnown": False,
                         "rows": {"KUSD": [], "XOR": []}, "parsed": self.parsed}

    def read(self, parsed=None, expected_sha=None):
        raw = canonical(self.document)
        self.path.write_bytes(raw)
        with patch.object(driver, "parse_existing", return_value=parsed if parsed is not None else self.parsed):
            return driver.read_training(self.path, expected_sha or digest(raw), "registration", {"bundleSha256": "parser"})

    def test_preserves_all_720_prices_and_exact_precision(self):
        closes = self.read()
        self.assertEqual(len(closes), 720)
        self.assertEqual(closes[0].price, Fraction(Decimal("9.123456789012345678901")))
        self.assertEqual(closes[-1].timestamp_ms, timestamp(driver.FIT_SPECIFICATION["lastClose"]) * 1000)

    def test_rejects_changed_input_before_proof_parse(self):
        with self.assertRaisesRegex(CollectionError, "training-file-hash"):
            self.read(expected_sha="0" * 64)

    def test_rejects_development_and_wrong_registration(self):
        for key, value in [("partition", PARTITIONS[1]), ("registrationSha256", "other")]:
            original = self.document[key]
            self.document[key] = value
            with self.assertRaises(CollectionError):
                self.read()
            self.document[key] = original

    def test_requires_replayed_proofs_to_equal_saved_parse(self):
        changed = copy.deepcopy(self.parsed)
        changed["history"]["candles"][10]["close"] = "100"
        with self.assertRaisesRegex(CollectionError, "training-parser-result-mismatch"):
            self.read(parsed=changed)

    def test_rejects_future_boundary_even_with_equal_replay(self):
        self.parsed["history"]["candles"][-1]["timestamp"] += 3_600_000
        with self.assertRaisesRegex(CollectionError, "training-boundary-mismatch"):
            self.read()

    def test_rejects_numeric_float_price(self):
        self.parsed["history"]["candles"][0]["close"] = 9.1
        with self.assertRaisesRegex(CollectionError, "training-price-must-be-exact"):
            self.read()

    def test_rejects_missing_joined_evidence(self):
        self.parsed["boundaries"].pop()
        with self.assertRaisesRegex(CollectionError, "training-count"):
            self.read()


class RetainedFailureTests(unittest.TestCase):
    """A failed fixed fit is evidence and may not become an automatic retry."""

    def test_retains_diagnostics_and_prevents_second_attempt(self):
        class DiagnosticFailure(ValueError):
            diagnostics = MappingProxyType({"phi": Decimal("1.001")})
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "fit"
            with patch.object(driver, "verify_registration", return_value=({"body": {"fitOutputDirectory": str(output.resolve())}}, {})), \
                 patch.object(driver, "verify_source_bindings"), \
                 patch.object(driver, "read_training", return_value=[]), \
                 patch.object(driver, "fit_ar1", side_effect=DiagnosticFailure("unstable fit")) as fit:
                with self.assertRaisesRegex(DiagnosticFailure, "unstable fit"):
                    driver.run_fit(Path("sealed"), "registration", Path("training"), "training-sha", output)
                failure = driver.strict_json((output / "failed.json").read_bytes())
                self.assertEqual(failure["diagnostics"], {"phi": "1.001"})
                self.assertFalse(failure["alternativeFitAttempted"])
                self.assertFalse(failure["qualificationAuthority"])
                self.assertEqual(fit.call_count, 1)
                with self.assertRaises(FileExistsError):
                    driver.run_fit(Path("sealed"), "registration", Path("training"), "training-sha", output)
                with self.assertRaisesRegex(CollectionError, "fit-output-not-registered"):
                    driver.run_fit(Path("sealed"), "registration", Path("training"), "training-sha", Path(directory) / "second")
                self.assertEqual(fit.call_count, 1)

    def test_rechecks_registration_before_emitting_success(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "fit"
            record = {"body": {"fitOutputDirectory": str(output.resolve())}}
            with patch.object(driver, "verify_registration", side_effect=[(record, {}), CollectionError("changed-seal")]), \
                 patch.object(driver, "verify_source_bindings"), \
                 patch.object(driver, "read_training", return_value=[]), \
                 patch.object(driver, "fit_ar1", return_value=object()) as fit:
                with self.assertRaisesRegex(CollectionError, "changed-seal"):
                    driver.run_fit(Path("sealed"), "registration", Path("training"), "training-sha", output)
                self.assertEqual(fit.call_count, 1)
                self.assertFalse((output / "model.json").exists())
                self.assertTrue((output / "failed.json").exists())

    def test_retains_success_with_exact_coefficients_without_qualification(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "fit"
            record = {"body": {"fitOutputDirectory": str(output.resolve())}}
            model = Ar1Model(Decimal("0.01"), Decimal("0.99"), Decimal("1"), Decimal("2.718"),
                             (Decimal("-0.003"),), 0, 719 * 3_600_000)
            with patch.object(driver, "verify_registration", return_value=(record, {})) as verify, \
                 patch.object(driver, "verify_source_bindings"), \
                 patch.object(driver, "read_training", return_value=[]), \
                 patch.object(driver, "fit_ar1", return_value=model) as fit:
                result = driver.run_fit(Path("sealed"), "registration", Path("training"), "training-sha", output)
                self.assertEqual(verify.call_count, 2)
                self.assertEqual(fit.call_count, 1)
                self.assertTrue(result["admissible"])
                self.assertFalse(result["qualificationAuthority"])
                self.assertEqual(result["model"]["phi"], "0.99")
                self.assertEqual(result["model"]["residuals"], ["-0.003"])
                self.assertEqual(driver.strict_json((output / "model.json").read_bytes()), result)

    def test_exact_diagnostic_serialization(self):
        self.assertEqual(driver.encode_exact({"price": Fraction(1, 3), "phi": Decimal("0.99")}),
                         {"price": {"numerator": "1", "denominator": "3"}, "phi": "0.99"})

    def test_rejects_unsealed_fit_specification(self):
        with self.assertRaisesRegex(CollectionError, "fit-specification-mismatch"):
            driver.verify_source_bindings({"fitSpecification": {"trainingCount": 719}})

    def test_sealed_source_change_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = [Path(driver.__file__).resolve(), ROOT / "scripts/bots/accumulation_stopping_model.py"]
            for index in range(5):
                path = Path(directory) / f"source-{index}.txt"
                path.write_text("sealed source")
                paths.append(path)
            body = {"fitSpecification": driver.FIT_SPECIFICATION,
                    "sourceBindings": [{"path": str(path), "sha256": digest(path.read_bytes())} for path in paths]}
            driver.verify_source_bindings(body)
            paths[-1].write_text("changed after seal")
            with self.assertRaisesRegex(CollectionError, "fit-source-binding-changed"):
                driver.verify_source_bindings(body)


if __name__ == "__main__":
    unittest.main()
