"""Bounded offline math subprocess for verifier-owned accumulation packets.

The TypeScript parent authenticates the raw evidence and replays the durable
episode journal BEFORE spawning this process. JSON hashes are references, not
credentials or proof of that ownership. This process checks exact serialization,
unchanged funding and the fixed model; it cannot authenticate a remote source,
qualify a strategy, sign, fetch data or execute an order.
"""
from __future__ import annotations

from dataclasses import asdict
from decimal import Decimal
from fractions import Fraction
from hashlib import sha256
from importlib.machinery import ModuleSpec, SourceFileLoader, all_suffixes
from importlib.util import module_from_spec, spec_from_loader
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "output/go-history/tc1-new-strategy-research-20260926/training-fit-v1/model.json"
MODEL_SHA256 = "59c55ea8eb27b9efcf6e14cff95f3a56f73f2e65d9e66c82bad7b1a5b5fff355"
DEPENDENCIES = {
    "accumulation_stopping_model.py": "26f2d6bc93490338da6488d081271a83bf3d24203fc26b4c2e216abbb234e7a6",
    "accumulation_admission_policy.py": "899d66482c90348684faca6f557224fddf4118ef8932a36b735bd4c935a4d44d",
}
MAX_INPUT_BYTES = 256 * 1024
MAX_MODEL_BYTES = 128 * 1024
MAX_OUTPUT_BYTES = 256 * 1024
MAX_SOURCE_BYTES = 128 * 1024
SAFE_INTEGER = 2**53 - 1
UNIT = 10**18
HOUR = 3_600_000
TRAINING_START = 1782673200000
TRAINING_END = 1785261600000
GENESIS = "0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5"
DENOMINATOR = "100000000000000000000000000000000000000"
SHA = re.compile(r"[0-9a-f]{64}\Z")
HASH = re.compile(r"0x[0-9a-f]{64}\Z")
INTEGER = re.compile(r"(?:0|[1-9][0-9]*)\Z")
_MATH = None


class InvocationError(ValueError):
    """Public bounded reason code; no input dump or inferred wait decision."""


def require(condition: object, code: str) -> None:
    """Fail closed with a fixed, non-sensitive diagnostic."""
    if not condition:
        raise InvocationError(code)


def strict_json(raw: bytes, maximum: int) -> object:
    """Reject oversized/deep JSON, duplicate keys, floats and nonfinite literals."""
    require(type(raw) is bytes and 0 < len(raw) <= maximum, "json-size")

    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, "duplicate-key")
            result[key] = value
        return result

    def forbidden(_value):
        raise InvocationError("noninteger-json-number")

    try:
        value = json.loads(raw.decode("utf-8"), object_pairs_hook=pairs,
                           parse_float=forbidden, parse_constant=forbidden)
    except (UnicodeError, json.JSONDecodeError, RecursionError) as error:
        raise InvocationError("invalid-json") from error
    count = 0

    def visit(item, depth):
        nonlocal count
        count += 1
        require(depth <= 16 and count <= 6000, "json-complexity")
        if isinstance(item, dict):
            for key, child in item.items():
                require(len(key) <= 96, "json-key-size")
                visit(child, depth + 1)
        elif isinstance(item, list):
            require(len(item) <= 1024, "json-array-size")
            for child in item:
                visit(child, depth + 1)
        elif isinstance(item, str):
            require(len(item) <= 2048, "json-string-size")
        elif type(item) is int:
            require(abs(item) <= SAFE_INTEGER, "unsafe-json-integer")
    visit(value, 0)
    return value


def fields(value: object, names: str) -> dict:
    """Require an exact JSON-object schema rather than ignoring new controls."""
    require(type(value) is dict and set(value) == set(names.split()), "object-fields")
    return value


def integer(value: object, minimum: int = 0) -> int:
    """Accept timestamps/counts only as non-boolean safe JSON integers."""
    require(type(value) is int and minimum <= value <= SAFE_INTEGER, "integer-domain")
    return value


def digest(value: object, *, block: bool = False) -> str:
    """Validate a reference's shape; this does not authenticate the reference."""
    require(type(value) is str and (HASH if block else SHA).fullmatch(value), "digest-shape")
    return value


def codec(value: object) -> Fraction:
    """Decode canonical unsigned u128 token units at the fixed 18 decimals."""
    require(type(value) is str and len(value) <= 39 and INTEGER.fullmatch(value), "codec-shape")
    number = int(value)
    require(number < 2**128, "codec-overflow")
    return Fraction(number, UNIT)


def ratio(value: object, *, positive: bool = True) -> Fraction:
    """Decode a reduced nonnegative ratio with bounded canonical integer fields."""
    row = fields(value, "numerator denominator")
    for part in row.values():
        require(type(part) is str and len(part) <= 192 and INTEGER.fullmatch(part), "ratio-shape")
    numerator, denominator = int(row["numerator"]), int(row["denominator"])
    require(denominator > 0 and (numerator > 0 if positive else numerator >= 0), "ratio-domain")
    result = Fraction(numerator, denominator)
    require(result.numerator == numerator and result.denominator == denominator, "ratio-not-reduced")
    return result


def verify_dependencies() -> None:
    """Check sealed source and namespace-package absence before import/output."""
    for package in (ROOT / "scripts", ROOT / "scripts/bots"):
        for suffix in all_suffixes():
            require(not (package / ("__init__" + suffix)).exists(), "unexpected-package-initializer")
    for name, expected in DEPENDENCIES.items():
        with (ROOT / "scripts/bots" / name).open("rb") as handle:
            raw = handle.read(MAX_SOURCE_BYTES + 1)
        require(0 < len(raw) <= MAX_SOURCE_BYTES and sha256(raw).hexdigest() == expected,
                "sealed-dependency-changed")


class _PinnedSourceLoader(SourceFileLoader):
    """Use verified repository source bytes directly, never a timestamp-valid pyc."""

    def get_code(self, fullname):
        name = fullname.removeprefix("scripts.bots.") + ".py"
        require(fullname == "scripts.bots." + name[:-3] and name in DEPENDENCIES,
                "unexpected-math-module")
        path = ROOT / "scripts/bots" / name
        require(self.path == str(path), "unexpected-math-path")
        with path.open("rb") as handle:
            raw = handle.read(MAX_SOURCE_BYTES + 1)
        require(0 < len(raw) <= MAX_SOURCE_BYTES and sha256(raw).hexdigest() == DEPENDENCIES[name],
                "sealed-dependency-changed")
        return self.source_to_code(raw, str(path))


def _namespace(name: str, path: Path) -> None:
    """Create or check only the two fixed namespace parents without startup code."""
    existing = sys.modules.get(name)
    if existing is not None:
        require(getattr(existing, "__file__", None) is None and
                set(getattr(existing, "__path__", ())) == {str(path)} and
                getattr(getattr(existing, "__spec__", None), "origin", None) is None,
                "unexpected-namespace-parent")
        return
    spec = ModuleSpec(name, loader=None, is_package=True)
    spec.submodule_search_locations = [str(path)]
    sys.modules[name] = module_from_spec(spec)


def load_math():
    """Load exactly the pinned source pair, replacing unchecked cached modules once."""
    global _MATH
    verify_dependencies()
    _namespace("scripts", ROOT / "scripts")
    _namespace("scripts.bots", ROOT / "scripts/bots")
    if _MATH is not None:
        require(all(sys.modules.get(module.__name__) is module for module in _MATH), "math-module-replaced")
        return _MATH
    loaded = []
    for name in ("accumulation_stopping_model", "accumulation_admission_policy"):
        fullname = "scripts.bots." + name
        loader = _PinnedSourceLoader(fullname, str(ROOT / "scripts/bots" / (name + ".py")))
        module = module_from_spec(spec_from_loader(fullname, loader))
        # Canonical slots are needed for dataclasses and the sealed policy's
        # absolute model import. Only this isolated worker's fixed pair changes.
        sys.modules[fullname] = module
        loader.exec_module(module)
        setattr(sys.modules["scripts.bots"], name, module)
        loaded.append(module)
    _MATH = (loaded[1], loaded[0])
    return _MATH


def verify_model_bytes(raw: bytes, expected_sha256: str) -> None:
    """Bound and authenticate the fixed model bytes before any local math import."""
    require(type(raw) is bytes and 0 < len(raw) <= MAX_MODEL_BYTES, "model-size")
    digest(expected_sha256)
    require(sha256(raw).hexdigest() == expected_sha256, "model-hash")


def decode_model(raw: bytes, expected_sha256: str, model_module):
    """Load one externally pinned model; never refit or choose alternate data."""
    verify_model_bytes(raw, expected_sha256)
    document = fields(strict_json(raw, MAX_MODEL_BYTES),
        "admissible developmentAccessed financialActions fitCount interpretation kind model networkRequests "
        "qualificationAuthority registrationSha256 startedAt trainingSha256 validationAccessed")
    require(document["kind"] == "tc1-fixed-ar1-training-fit-v1" and document["admissible"] is True and
            type(document["fitCount"]) is int and document["fitCount"] == 1 and
            type(document["networkRequests"]) is int and document["networkRequests"] == 0 and
            all(document[key] is False for key in
                ("developmentAccessed", "financialActions", "qualificationAuthority", "validationAccessed")),
            "model-authority-or-fit")
    model = fields(document["model"],
        "intercept phi equilibrium_log_price equilibrium_price residuals training_start_ms training_end_ms")
    require(model["training_start_ms"] == TRAINING_START and model["training_end_ms"] == TRAINING_END,
            "model-training-window")
    require(type(model["residuals"]) is list and len(model["residuals"]) == 719, "model-residual-count")

    def decimal(value):
        require(type(value) is str and len(value) <= 256 and
                re.fullmatch(r"-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:E[+-]?[0-9]{1,3})?", value),
                "model-decimal-shape")
        parsed = Decimal(value)
        require(parsed.is_finite(), "model-nonfinite")
        return parsed
    values = {key: decimal(model[key]) for key in
              ("intercept", "phi", "equilibrium_log_price", "equilibrium_price")}
    require(0 < values["phi"] < 1 and values["equilibrium_price"] > 0, "model-unstable")
    return model_module.Ar1Model(**values, residuals=tuple(decimal(item) for item in model["residuals"]),
                                training_start_ms=TRAINING_START, training_end_ms=TRAINING_END)


def decode_request(raw: bytes, policy, model_module):
    """Check a trusted parent projection without claiming raw-evidence ownership."""
    request = fields(strict_json(raw, MAX_INPUT_BYTES), "kind packet episode")
    require(request["kind"] == "accumulation-admission-request-v1", "request-kind")
    packet = fields(request["packet"], "status packetSha256 genesisHash denominator block contextReceivedAtMs "
                    "decisionAtMs currentPrice latestCompletedClose candidates")
    require(packet["status"] in ("verified", "incomplete") and packet["genesisHash"] == GENESIS and
            packet["denominator"] == DENOMINATOR, "packet-identity")
    digest(packet["packetSha256"])
    block = fields(packet["block"], "hash height timestampMs")
    digest(block["hash"], block=True)
    integer(block["height"], 1)
    block_time = integer(block["timestampMs"])
    context_time = integer(packet["contextReceivedAtMs"])
    decision_time = integer(packet["decisionAtMs"])
    require(block_time <= context_time <= decision_time, "context-clock")
    price = ratio(packet["currentPrice"])
    close = fields(packet["latestCompletedClose"], "timestampMs availableAtMs price evidenceSha256")
    close_time = integer(close["timestampMs"])
    require(close_time == decision_time // HOUR * HOUR and
            close_time <= integer(close["availableAtMs"]) <= decision_time, "completed-close-clock")
    digest(close["evidenceSha256"])
    close_price = ratio(close["price"])
    episode = fields(request["episode"], "episodeId journalPrefixSha256 journalRevision openingAtMs deadlineMs "
        "lastAtMs opening current attemptCommitted successfulPurchase orderPhase goalStopped targetReached")
    require(type(episode["episodeId"]) is str and
            re.fullmatch(r"[a-zA-Z0-9_-]{1,96}", episode["episodeId"]), "episode-id")
    digest(episode["journalPrefixSha256"])
    integer(episode["journalRevision"])
    start, deadline, last = (integer(episode[key]) for key in ("openingAtMs", "deadlineMs", "lastAtMs"))
    require(start % HOUR == 0 and deadline == start + 24 * HOUR and
            TRAINING_END <= start <= last <= decision_time and block_time <= last, "episode-clock")
    opening = fields(episode["opening"], "capitalKusdCodec feeReserveXorCodec price")
    current = fields(episode["current"], "kusdCodec xorCodec feesPaidXorCodec peakXor markBlockHash")
    capital, reserve = codec(opening["capitalKusdCodec"]), codec(opening["feeReserveXorCodec"])
    require(codec(current["kusdCodec"]) == capital and codec(current["xorCodec"]) == reserve and
            codec(current["feesPaidXorCodec"]) == 0 and episode["attemptCommitted"] is False and
            episode["successfulPurchase"] is False and episode["orderPhase"] in ("none", "cancelled"),
            "episode-no-longer-untouched")
    require(type(episode["goalStopped"]) is bool and episode["targetReached"] is False,
            "contradictory-stop-state")
    require(digest(current["markBlockHash"], block=True) == block["hash"], "journal-mark-mismatch")
    initial = policy.OpeningPortfolio(capital, reserve, ratio(opening["price"]))
    peak = ratio(current["peakXor"])
    require(reserve + capital / price > peak * Fraction(9, 10) or episode["goalStopped"],
            "drawdown-stop-not-latched")
    state = policy.AdmissionState(initial, start, deadline, decision_time, price,
        peak, model_module.HourlyClose(close_time, close_price),
        block["hash"], block_time, context_time, goal_stopped=episode["goalStopped"])
    candidates = packet["candidates"]
    require(type(candidates) is list and len(candidates) == 9, "nine-outcomes-required")
    quotes, failed = [], False
    for index, item in enumerate(candidates, 1):
        row = fields(item, "inputKusd status reason evidenceSha256 quote")
        require(type(row["inputKusd"]) is int and row["inputKusd"] == index, "candidate-order")
        status = row["status"]
        require(status in ("ready", "unavailable", "failed", "rejected-impact"), "candidate-status")
        require(row["reason"] is None or (type(row["reason"]) is str and
                re.fullmatch(r"[a-zA-Z0-9_-]{1,96}", row["reason"])), "candidate-reason")
        require((row["reason"] is None) == (status == "ready"), "candidate-reason-status")
        proofs = row["evidenceSha256"]
        require(type(proofs) is list and 0 < len(proofs) <= 32, "candidate-proof-references")
        for proof in proofs:
            digest(proof)
        if status in ("unavailable", "failed"):
            require(row["quote"] is None and row["reason"] is not None, "unavailable-quote-shape")
            failed = failed or status == "failed"
            continue
        quote = fields(row["quote"], "quotedOutputXorCodec minimumOutputXorCodec networkFeeXorCodec priceImpact "
                       "quoteReceivedAtMs feeReceivedAtMs expiresAtMs")
        output = codec(quote["quotedOutputXorCodec"])
        minimum = codec(quote["minimumOutputXorCodec"])
        fee = codec(quote["networkFeeXorCodec"])
        require(output > 0 and minimum > 0 and minimum * UNIT == output * UNIT * 9950 // 10000,
                "original-minimum-mismatch")
        impact = ratio(quote["priceImpact"], positive=False)
        require((status == "rejected-impact") == (impact > Fraction(1, 100)), "impact-status-mismatch")
        observed, fee_received, expires = (integer(quote[key]) for key in
            ("quoteReceivedAtMs", "feeReceivedAtMs", "expiresAtMs"))
        require(context_time <= observed <= fee_received <= decision_time and expires > observed,
                "candidate-clock")
        quotes.append(policy.QuoteCandidate(index, minimum, fee, impact, block["hash"], block_time,
                                           observed, expires))
    require(not failed or packet["status"] == "incomplete", "failed-packet-cannot-be-verified")
    return request, state, quotes


def encode_exact(value):
    """Return canonical JSON-compatible diagnostics without numeric money."""
    if isinstance(value, Fraction):
        return {"numerator": str(value.numerator), "denominator": str(value.denominator)}
    if isinstance(value, Decimal):
        require(value.is_finite(), "nonfinite-result")
        return str(value)
    if isinstance(value, dict):
        return {key: encode_exact(child) for key, child in value.items()}
    if isinstance(value, (list, tuple)):
        return [encode_exact(child) for child in value]
    require(value is None or type(value) in (str, int, bool), "unsupported-result")
    return value


def evaluate_request(raw: bytes, model_raw: bytes, *, trusted_model_sha256: str = MODEL_SHA256) -> dict:
    """Evaluate exact math only after parent-owned evidence/journal verification.

    The explicit model hash parameter supports pinned synthetic unit fixtures.
    The production CLI never accepts an override and uses MODEL_SHA256.
    """
    verify_model_bytes(model_raw, trusted_model_sha256)
    policy, model_module = load_math()
    request, state, quotes = decode_request(raw, policy, model_module)
    model = decode_model(model_raw, trusted_model_sha256, model_module)
    packet, episode = request["packet"], request["episode"]
    incomplete = packet["status"] == "incomplete"
    decision = None if incomplete else encode_exact(asdict(policy.admit_accumulation(model, state, quotes)))
    verify_dependencies()
    return {"kind": "accumulation-admission-result-v1", "status": "incomplete" if incomplete else "evaluated",
            "inputSha256": sha256(raw).hexdigest(), "modelSha256": trusted_model_sha256,
            "packetSha256": packet["packetSha256"], "episodeId": episode["episodeId"],
            "journalPrefixSha256": episode["journalPrefixSha256"], "journalRevision": episode["journalRevision"],
            "evidenceAuthentication": "external-verifier-and-trusted-journal-required",
            "dependencySha256": dict(DEPENDENCIES), "policyCalled": not incomplete,
            "candidateOutcomes": packet["candidates"], "decision": decision,
            "financialActions": False, "qualificationAuthority": False}


def canonical(value: object) -> bytes:
    """Bound one deterministic output message; never interleave logs with stdout."""
    result = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False).encode() + b"\n"
    require(len(result) <= MAX_OUTPUT_BYTES, "output-size")
    return result


def main() -> int:
    """Read one bounded request and the sole pinned model; emit math or an error."""
    try:
        require(len(sys.argv) == 1, "arguments-not-supported")
        raw = sys.stdin.buffer.read(MAX_INPUT_BYTES + 1)
        with MODEL_PATH.open("rb") as handle:
            model_raw = handle.read(MAX_MODEL_BYTES + 1)
        result = evaluate_request(raw, model_raw)
        sys.stdout.buffer.write(canonical(result))
        return 0
    except (ValueError, OSError, ArithmeticError) as error:
        # Never print arbitrary exception content, paths or supplied data.
        reason = str(error) if isinstance(error, InvocationError) else "invocation-rejected"
        sys.stdout.buffer.write(canonical({"kind": "accumulation-admission-error-v1", "reason": reason,
                                           "financialActions": False, "qualificationAuthority": False}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
