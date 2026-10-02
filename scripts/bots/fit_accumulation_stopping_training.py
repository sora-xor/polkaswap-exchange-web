#!/usr/bin/env python3
"""Fit the sealed stage-1 accumulation model once, offline, without qualification.

Use after the training-only collector completes. This command revalidates the
indexed proofs with the same frozen parser, verifies all registered source
bindings and the explicit input digest, then retains either the one fixed fit
or its failure. Development/validation data and financial actions are absent.
"""
from __future__ import annotations

import argparse
from collections.abc import Mapping
from dataclasses import asdict
from decimal import Decimal
from fractions import Fraction
from pathlib import Path
from datetime import datetime, timezone
from typing import Any

from accumulation_stopping_model import HourlyClose, fit_ar1
from collect_accumulation_stopping_history import (
    PARTITIONS, canonical, digest, exclusive_write, parse_existing,
    require, strict_json, timestamp, verify_registration,
)


FIT_SPECIFICATION = {
    "model": "OLS-AR1-log-natural-KUSD-per-XOR",
    "trainingCount": 720,
    "firstClose": "2026-06-28T19:00:00Z",
    "lastClose": "2026-07-28T18:00:00Z",
    "precision": 80,
    "admissiblePhi": "0 < phi < 1",
    "fits": 1,
    "alternativeWindows": False,
    "developmentAllowed": False,
    "validationAllowed": False,
    "qualificationAuthority": False,
}


def encode_exact(value: Any) -> Any:
    """Serialize Decimal and rational diagnostics without a float conversion."""
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, Fraction):
        return {"numerator": str(value.numerator), "denominator": str(value.denominator)}
    if isinstance(value, Mapping):
        return {key: encode_exact(item) for key, item in value.items()}
    if isinstance(value, (tuple, list)):
        return [encode_exact(item) for item in value]
    return value


def verify_source_bindings(body: dict[str, Any]) -> None:
    """Require the registered model, driver, protocol and tests to remain exact."""
    require(body.get("fitSpecification") == FIT_SPECIFICATION, "fit-specification-mismatch")
    bindings = body.get("sourceBindings")
    require(isinstance(bindings, list) and len(bindings) >= 7, "fit-source-bindings-missing")
    paths: set[str] = set()
    for binding in bindings:
        require(isinstance(binding, dict) and set(binding) == {"path", "sha256"}, "fit-source-binding-shape")
        path = Path(binding["path"])
        require(path.is_absolute() and str(path) not in paths, "fit-source-binding-path")
        paths.add(str(path))
        require(digest(path.read_bytes()) == binding["sha256"], "fit-source-binding-changed")
    required = [Path(__file__).resolve(), Path(__file__).with_name("accumulation_stopping_model.py").resolve()]
    require(all(str(path) in paths for path in required), "fit-core-source-unbound")


def read_training(path: Path, expected_sha: str, registration_sha: str,
                  parser_manifest: dict[str, Any]) -> list[HourlyClose]:
    """Check training identity and rerun the frozen proof parser before fitting."""
    raw = path.read_bytes()
    require(digest(raw) == expected_sha, "training-file-hash")
    document = strict_json(raw)
    require(document.get("partition") == PARTITIONS[0], "training-partition-mismatch")
    require(document.get("registrationSha256") == registration_sha, "training-registration-mismatch")
    require(document.get("parserBundleSha256") == parser_manifest["bundleSha256"], "training-parser-mismatch")
    require(document.get("qualificationAuthority") is False and
            document.get("historicalExecutionQuote") is False and
            document.get("millisecondArrivalKnown") is False, "training-authority-mismatch")
    parsed = parse_existing(document["rows"], PARTITIONS[0], parser_manifest)
    require(parsed == document.get("parsed"), "training-parser-result-mismatch")
    history = parsed["history"]
    require(history.get("missing") == 0 and history.get("denominationVerified") is True,
            "training-unverified-or-incomplete")
    candles = history["candles"]
    boundaries = parsed["boundaries"]
    start = timestamp(FIT_SPECIFICATION["firstClose"]) * 1000
    require(len(candles) == len(boundaries) == 720, "training-count")
    observations = []
    for index, (candle, boundary) in enumerate(zip(candles, boundaries)):
        expected = start + index * 3_600_000
        require(type(candle.get("timestamp")) is int and candle["timestamp"] == expected and
                type(boundary.get("completedAtMs")) is int and boundary["completedAtMs"] == expected,
                "training-boundary-mismatch")
        require(isinstance(candle.get("close"), str), "training-price-must-be-exact")
        observations.append(HourlyClose(expected, candle["close"]))
    return observations


def run_fit(registration: Path, registration_sha: str, training: Path,
            training_sha: str, output: Path) -> dict[str, Any]:
    """Retain one fit or rejection in a new directory; never search or retry."""
    record, parser_manifest = verify_registration(registration, registration_sha, "training")
    verify_source_bindings(record["body"])
    require(record["body"].get("fitOutputDirectory") == str(output.resolve()), "fit-output-not-registered")
    output.mkdir(parents=True, exist_ok=True)
    identity = {"registrationSha256": registration_sha, "trainingSha256": training_sha,
                "startedAt": datetime.now(timezone.utc).isoformat(), "networkRequests": 0,
                "developmentAccessed": False, "validationAccessed": False,
                "financialActions": False, "qualificationAuthority": False}
    exclusive_write(output / "fit-started.json", canonical(identity) + b"\n")
    try:
        closes = read_training(training, training_sha, registration_sha, parser_manifest)
        model = fit_ar1(closes, as_of_ms=timestamp(FIT_SPECIFICATION["lastClose"]) * 1000)
        verify_registration(registration, registration_sha, "training")
        verify_source_bindings(record["body"])
        result = {**identity, "kind": "tc1-fixed-ar1-training-fit-v1", "fitCount": 1,
                  "admissible": True, "model": encode_exact(asdict(model)),
                  "interpretation": "An admissible training fit is not a strategy, profit, or validation result."}
        exclusive_write(output / "model.json", canonical(result) + b"\n")
        return result
    except Exception as error:
        failure = {**identity, "kind": "tc1-fixed-ar1-training-rejected-v1", "admissible": False,
                   "errorType": type(error).__name__, "reason": str(error),
                   "diagnostics": encode_exact(getattr(error, "diagnostics", None)),
                   "alternativeFitAttempted": False}
        exclusive_write(output / "failed.json", canonical(failure) + b"\n")
        raise


def main() -> None:
    """Run the strictly offline, digest-bound training fit from explicit paths."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--registration", required=True, type=Path)
    parser.add_argument("--registration-sha256", required=True)
    parser.add_argument("--training", required=True, type=Path)
    parser.add_argument("--training-sha256", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    result = run_fit(args.registration, args.registration_sha256, args.training, args.training_sha256, args.output)
    print(canonical({"admissible": result["admissible"], "modelPath": str(args.output / "model.json"),
                     "modelSha256": digest((args.output / "model.json").read_bytes()),
                     "qualificationAuthority": False}).decode())


if __name__ == "__main__":
    main()
