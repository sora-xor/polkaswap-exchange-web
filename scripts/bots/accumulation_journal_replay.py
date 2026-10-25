"""Bounded offline replay/proposal over a parent-owned accumulation journal.

Hashes and source references in JSON do not authenticate evidence, head ownership,
complete schedules or subprocess results. This worker never restores ReplayState,
reads a model file, calls policy math, accesses a network, or writes a journal.
"""
from __future__ import annotations

from dataclasses import asdict
from fractions import Fraction
from hashlib import sha256
from importlib.machinery import ModuleSpec, SourceFileLoader, all_suffixes
from importlib.util import module_from_spec, spec_from_loader
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
DEPENDENCIES = {
    "accumulation_stopping_model.py": "26f2d6bc93490338da6488d081271a83bf3d24203fc26b4c2e216abbb234e7a6",
    "accumulation_admission_policy.py": "899d66482c90348684faca6f557224fddf4118ef8932a36b735bd4c935a4d44d",
    "accumulation_execution_replay.py": "8afd3f7f3d18c6712933882c405d22f1ea743adf6f6873fd389d728b2a33420f",
    "accumulation_admission_runner.py": "25de2ff4e4e9dbe6b7e57d0d444ad5d1a6f4ff16ba78b3455cd7975bc7bd3e16",
}
MAX_SOURCE_BYTES = 128 * 1024
MAX_JOURNAL_BYTES = 1024 * 1024
MAX_INPUT_BYTES = 2 * 1024 * 1024
MAX_LINE_BYTES = 256 * 1024
MAX_OUTPUT_BYTES = 256 * 1024
MAX_RECORDS = 512
SAFE_INTEGER = 2**53 - 1
UNIT = 10**18
ID = re.compile(r"[A-Za-z0-9_-]{1,96}\Z")
SHA = re.compile(r"[0-9a-f]{64}\Z")
_MODULES = None


class JournalError(ValueError):
    """Public bounded rejection code, never an input or exception dump."""


def require(value, reason):
    """Reject a structural or replay inconsistency without granting authority."""
    if not value:
        raise JournalError(reason)


def canonical(value):
    """Exact journal encoding: sorted ASCII JSON, compact separators and one LF."""
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True,
                       allow_nan=False) + "\n").encode("ascii")


def parse_json(raw, maximum):
    """Bound JSON complexity and reject duplicate keys, floats and unsafe integers."""
    require(type(raw) is bytes and 0 < len(raw) <= maximum, "json-size")
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, "duplicate-key")
            result[key] = value
        return result
    def forbidden(_):
        raise JournalError("noninteger-json-number")
    try:
        value = json.loads(raw.decode("utf-8"), object_pairs_hook=pairs,
                           parse_float=forbidden, parse_constant=forbidden)
    except (UnicodeError, json.JSONDecodeError, RecursionError) as error:
        raise JournalError("invalid-json") from error
    nodes = 0
    def visit(item, depth):
        nonlocal nodes
        nodes += 1
        require(depth <= 20 and nodes <= 16000, "json-complexity")
        if type(item) is dict:
            for key, child in item.items():
                require(len(key) <= 96 and key.isascii(), "json-key")
                visit(child, depth + 1)
        elif type(item) is list:
            require(len(item) <= 2048, "json-array")
            for child in item:
                visit(child, depth + 1)
        elif type(item) is str:
            require(len(item) <= MAX_JOURNAL_BYTES, "json-string")
        elif type(item) is int:
            require(abs(item) <= SAFE_INTEGER, "unsafe-json-integer")
    visit(value, 0)
    return value


def fields(value, names):
    """Require the exact object fields for this version."""
    require(type(value) is dict and set(value) == set(names.split()), "object-fields")
    return value


def identifier(value):
    """Bound record, episode and evidence identifiers to ASCII scalars."""
    require(type(value) is str and ID.fullmatch(value), "identifier")
    return value


def digest(value):
    """Check a reference's syntax only; its authority remains external."""
    require(type(value) is str and SHA.fullmatch(value), "digest-shape")
    return value


def integer(value, minimum=0):
    """Reject booleans, negative clocks and unsafe integer serialization."""
    require(type(value) is int and minimum <= value <= SAFE_INTEGER, "integer-domain")
    return value


def source_bytes(name):
    """Read only one of four fixed code files and verify its complete bounded bytes."""
    require(name in DEPENDENCIES, "unexpected-source")
    with (ROOT / "scripts/bots" / name).open("rb") as handle:
        raw = handle.read(MAX_SOURCE_BYTES + 1)
    require(0 < len(raw) <= MAX_SOURCE_BYTES and sha256(raw).hexdigest() == DEPENDENCIES[name],
            "sealed-source-changed")
    return raw


def verify_sources():
    """Reject initializer startup files and recheck the fixed source closure."""
    for directory in (ROOT / "scripts", ROOT / "scripts/bots"):
        for suffix in all_suffixes():
            require(not (directory / ("__init__" + suffix)).exists(), "unexpected-package-initializer")
    for name in DEPENDENCIES:
        source_bytes(name)


class _PinnedLoader(SourceFileLoader):
    """Compile verified source directly; never accept a timestamp-valid pyc."""
    def get_code(self, fullname):
        name = fullname.removeprefix("scripts.bots.") + ".py"
        require(fullname == "scripts.bots." + name[:-3] and name in DEPENDENCIES and
                self.path == str(ROOT / "scripts/bots" / name), "unexpected-module")
        return self.source_to_code(source_bytes(name), self.path)


def load_modules():
    """Own a single shared set of class identities without invoking runner.load_math."""
    global _MODULES
    verify_sources()
    for name, path in (("scripts", ROOT / "scripts"), ("scripts.bots", ROOT / "scripts/bots")):
        existing = sys.modules.get(name)
        if existing is not None:
            require(getattr(existing, "__file__", None) is None and
                    set(getattr(existing, "__path__", ())) == {str(path)} and
                    getattr(getattr(existing, "__spec__", None), "origin", None) is None,
                    "unexpected-namespace-parent")
        else:
            spec = ModuleSpec(name, loader=None, is_package=True)
            spec.submodule_search_locations = [str(path)]
            sys.modules[name] = module_from_spec(spec)
    if _MODULES is not None:
        require(all(sys.modules.get(module.__name__) is module for module in _MODULES), "owned-module-replaced")
        return _MODULES
    loaded = []
    for filename in DEPENDENCIES:
        name = filename[:-3]
        fullname = "scripts.bots." + name
        loader = _PinnedLoader(fullname, str(ROOT / "scripts/bots" / filename))
        module = module_from_spec(spec_from_loader(fullname, loader))
        sys.modules[fullname] = module
        loader.exec_module(module)
        setattr(sys.modules["scripts.bots"], name, module)
        loaded.append(module)
    _MODULES = tuple(loaded)
    return _MODULES


def state_document(state, runner):
    """Serialize a newly computed state for reproducibility, never for restoration."""
    return runner.encode_exact(asdict(state))


def state_digest(state, runner):
    """Bind every computed state field and reducer summary event to canonical bytes."""
    return sha256(canonical(state_document(state, runner))).hexdigest()


def mark(value, replay, runner):
    """Decode complete native mark identity and exact natural KUSD/XOR price."""
    row = fields(value, "blockHash blockNumber observedAtMs receivedAtMs price")
    runner.digest(row["blockHash"], block=True)
    return replay.ReplayMark(row["blockHash"], integer(row["blockNumber"], 1),
        integer(row["observedAtMs"]), integer(row["receivedAtMs"]), runner.ratio(row["price"]))


def order(value, replay, runner):
    """Decode the original full order without deriving new minima or bytes."""
    row = fields(value, "orderId inputKusd quotedOutputXorCodec minimumOutputXorCodec feeCeilingXorCodec "
        "decisionAtMs quoteReceivedAtMs expiresAtMs executionTargetMs maximumExecutionLagMs decisionMark "
        "admissionSha256 quoteSha256 feeSha256 callHex envelopeHex")
    return replay.DecisionOrder(identifier(row["orderId"]), integer(row["inputKusd"], 1),
        runner.codec(row["quotedOutputXorCodec"]), runner.codec(row["minimumOutputXorCodec"]),
        runner.codec(row["feeCeilingXorCodec"]), integer(row["decisionAtMs"]),
        integer(row["quoteReceivedAtMs"]), integer(row["expiresAtMs"]), integer(row["executionTargetMs"]),
        integer(row["maximumExecutionLagMs"]), mark(row["decisionMark"], replay, runner),
        digest(row["admissionSha256"]), digest(row["quoteSha256"]), digest(row["feeSha256"]),
        row["callHex"], row["envelopeHex"])


def evidence_refs(value):
    """Preserve bounded external references without opening or authenticating artifacts."""
    require(type(value) is list and 1 <= len(value) <= 16, "evidence-reference-count")
    seen = set()
    for item in value:
        row = fields(item, "purpose artifactId sha256")
        identifier(row["purpose"]); digest(row["sha256"])
        key = identifier(row["artifactId"])
        require(key not in seen, "duplicate-evidence-reference")
        seen.add(key)


def accounting_summary(state, runner):
    """Report exact derived accounting and latches without reporting qualification."""
    return runner.encode_exact({
        "openingAtMs": state.opening_at_ms, "deadlineMs": state.deadline_ms,
        "lastAtMs": state.last_at_ms, "kusd": state.kusd, "xor": state.xor,
        "feesPaidXor": state.fees_paid_xor, "remainingFeeReserveXor": state.remaining_fee_reserve_xor,
        "valueXor": state.value_xor, "idleValueXor": state.idle_value_xor,
        "goalPeakXor": state.goal_peak_xor, "performancePeakXor": state.performance_peak_xor,
        "maximumDrawdown": state.maximum_drawdown, "stopReason": state.stop_reason,
        "stoppedAtMs": state.stopped_at_ms, "orderPhase": state.order_phase,
        "attemptCommitted": state.attempt_committed, "successfulPurchase": state.successful_purchase,
        "paidFailures": sum(event.kind == "hypothetical-paid-failure" for event in state.events),
        "finalized": state.finalized, "attention": state.attention, "revision": state.revision,
        "mark": {"blockHash": state.current_mark.block_hash, "blockNumber": state.current_mark.block_number,
                 "observedAtMs": state.current_mark.observed_at_ms,
                 "receivedAtMs": state.current_mark.received_at_ms, "price": state.current_mark.price}})


class _Replay:
    """Replay owner for one bounded invocation; never accepts restored state."""
    def __init__(self, modules):
        self.model, self.policy, self.reducer, self.runner = modules
        self.state = None
        self.last_event_at = 0
        self.incomplete = False
        self.diagnostics = []
        self.slots = set()
        self.invocations = {}
        self.active_invocation = None

    def apply(self, kind, value):
        """Dispatch full typed transition inputs or bounded non-accounting records."""
        r, s, helper = self.runner, self.state, self.reducer
        try:
            require(kind == "opening" if s is None else kind != "opening", "opening-order")
            if kind == "opening":
                row = fields(value, "openingAtMs capitalKusdCodec feeReserveXorCodec price mark")
                at = integer(row["openingAtMs"])
                require(at >= r.TRAINING_END, "opening-before-training-end")
                opening = self.policy.OpeningPortfolio(r.codec(row["capitalKusdCodec"]),
                    r.codec(row["feeReserveXorCodec"]), r.ratio(row["price"]))
                self.state = helper.create_episode(opening, at, mark(row["mark"], helper, r))
            elif kind == "valuation":
                row = fields(value, "atMs mark"); at = integer(row["atMs"])
                self._clock(at)
                self.state = helper.observe_mark(s, mark(row["mark"], helper, r), at, expected_revision=s.revision)
            elif kind == "order-frozen":
                row = fields(value, "order")
                frozen = order(row["order"], helper, r); at = frozen.decision_at_ms
                self._clock(at)
                self.state = helper.freeze_order(s, frozen, expected_revision=s.revision)
            elif kind == "order-cancelled":
                row = fields(value, "atMs reason"); at = integer(row["atMs"])
                self._clock(at); identifier(row["reason"])
                self.state = helper.cancel_order(s, at, expected_revision=s.revision, reason=row["reason"])
            elif kind == "attempt-committed":
                row = fields(value, "atMs"); at = integer(row["atMs"])
                self._clock(at)
                self.state = helper.commit_attempt(s, at, expected_revision=s.revision)
            elif kind == "settlement":
                row = fields(value, "mark orderId envelopeSha256 includedAtMs receivedAtMs outcome outputXorCodec paidFeeXorCodec")
                at = integer(row["receivedAtMs"]); self._clock(at)
                self.state = helper.settle_attempt(s, mark(row["mark"], helper, r), expected_revision=s.revision,
                    order_id=identifier(row["orderId"]), envelope_sha256=digest(row["envelopeSha256"]),
                    included_at_ms=integer(row["includedAtMs"]), received_at_ms=at,
                    outcome=row["outcome"], output_xor=r.codec(row["outputXorCodec"]),
                    paid_fee_xor=r.codec(row["paidFeeXorCodec"]))
            elif kind == "terminal":
                row = fields(value, "mark"); terminal = mark(row["mark"], helper, r)
                at = max(s.last_at_ms, terminal.received_at_ms); self._clock(at)
                self.state = helper.finalize_episode(s, terminal, expected_revision=s.revision)
            else:
                return self._observational(kind, value)
            self.last_event_at = at
            return self._result("applied")
        except helper.ReplayError as error:
            self.state = error.state
            self.last_event_at = max(self.last_event_at, at)
            self.incomplete = True
            self.diagnostics.append({"kind": kind, "reason": error.reason})
            return self._result("rejected", error.reason, r.encode_exact(error.details))

    def _clock(self, at):
        require(at >= self.last_event_at, "event-time-regressed")

    def _result(self, status, reason=None, details=None):
        return {"status": status, "stateSha256": state_digest(self.state, self.runner),
                "reason": reason, "details": [] if details is None else details}

    def _observational(self, kind, value):
        """Retain lifecycle references; these records cannot mutate portfolio or risk."""
        s = self.state
        require(not s.finalized, "record-after-finalized")
        if kind == "decision-slot":
            row = fields(value, "slot atMs status packetSha256 reason")
            slot = integer(row["slot"])
            require(slot < 24 and slot not in self.slots, "duplicate-or-invalid-slot")
            at = integer(row["atMs"]); self._clock(at)
            require(s.opening_at_ms + slot * self.model.HOUR_MS <= at <
                    s.opening_at_ms + (slot + 1) * self.model.HOUR_MS, "slot-clock")
            require(row["status"] in ("ready", "unavailable", "failed", "expired", "skipped"), "slot-status")
            digest(row["packetSha256"])
            require((row["reason"] is None) == (row["status"] == "ready"), "slot-reason")
            if row["reason"] is not None: identifier(row["reason"])
            self.slots.add(slot)
            if row["status"] == "failed": self.incomplete = True
        elif kind == "admission-start":
            row = fields(value, "invocationId atMs inputSha256 packetSha256")
            key = identifier(row["invocationId"]); at = integer(row["atMs"]); self._clock(at)
            require(s.may_request_admission and at < s.deadline_ms and not self.incomplete and
                    self.active_invocation is None and key not in self.invocations, "invocation-not-eligible")
            digest(row["inputSha256"]); digest(row["packetSha256"])
            self.invocations[key] = dict(row)
            self.active_invocation = key
        elif kind in ("admission-result", "admission-failure"):
            names = "invocationId atMs inputSha256 " + ("outputSha256 status action selectedInputKusd reason"
                      if kind == "admission-result" else "reason")
            row = fields(value, names); at = integer(row["atMs"]); self._clock(at)
            key = identifier(row["invocationId"])
            require(key == self.active_invocation and row["inputSha256"] == self.invocations[key]["inputSha256"],
                    "invocation-result-binding")
            if kind == "admission-result":
                digest(row["outputSha256"])
                require(row["status"] in ("evaluated", "incomplete"), "invocation-status")
                if row["status"] == "incomplete":
                    require(row["action"] is None and row["selectedInputKusd"] is None, "incomplete-decision")
                    self.incomplete = True
                else:
                    require(row["action"] in ("buy", "wait"), "decision-action")
                    if row["action"] == "buy": require(integer(row["selectedInputKusd"], 1) <= 9, "decision-size")
                    else: require(row["selectedInputKusd"] is None, "wait-size")
            else:
                self.incomplete = True
            identifier(row["reason"])
            self.active_invocation = None
        else:
            raise JournalError("unknown-event-kind")
        self.last_event_at = at
        return self._result("recorded")


def episode_projection(state, episode_id, head, runner):
    """Construct old-runner inputs only from newly reproduced immutable accounting."""
    def units(value):
        scaled = value * UNIT
        require(scaled.denominator == 1 and 0 <= scaled < 2**128, "projection-codec")
        return str(scaled.numerator)
    return {"episodeId": episode_id, "journalPrefixSha256": head, "journalRevision": state.revision,
        "openingAtMs": state.opening_at_ms, "deadlineMs": state.deadline_ms, "lastAtMs": state.last_at_ms,
        "opening": {"capitalKusdCodec": units(state.opening.capital_kusd),
                    "feeReserveXorCodec": units(state.opening.fee_reserve_xor),
                    "price": runner.encode_exact(state.opening.opening_price)},
        "current": {"kusdCodec": units(state.kusd), "xorCodec": units(state.xor),
                    "feesPaidXorCodec": units(state.fees_paid_xor), "peakXor": runner.encode_exact(state.goal_peak_xor),
                    "markBlockHash": state.current_mark.block_hash},
        "attemptCommitted": state.attempt_committed, "successfulPurchase": state.successful_purchase,
        "orderPhase": state.order_phase, "goalStopped": state.stop_reason is not None,
        "targetReached": state.stop_reason == "target"}


def join_packet(packet, state, runner):
    """Join every mark field, including original receipt; a hash alone is insufficient."""
    row = fields(packet, "status packetSha256 genesisHash denominator block contextReceivedAtMs decisionAtMs "
                 "currentPrice latestCompletedClose candidates")
    block = fields(row["block"], "hash height timestampMs")
    current = state.current_mark
    require((block["hash"], block["height"], block["timestampMs"], row["contextReceivedAtMs"],
             runner.ratio(row["currentPrice"])) ==
            (current.block_hash, current.block_number, current.observed_at_ms, current.received_at_ms, current.price),
            "packet-full-mark-mismatch")
    require(integer(row["decisionAtMs"]) >= state.last_at_ms, "packet-before-journal")
    require(row["status"] in ("verified", "incomplete"), "packet-status")
    return row


def evaluate_request(raw):
    """Replay a full exact prefix, optionally propose one event, and derive eligibility."""
    request = parse_json(raw, MAX_INPUT_BYTES)
    require(type(request) is dict and request.get("operation") in ("replay", "transition"), "operation")
    fields(request, "kind operation episodeId registrationSha256 journalJsonl expectedRecordCount expectedHeadSha256 packet" +
           (" nextEvent" if request["operation"] == "transition" else ""))
    require(request["kind"] == "accumulation-journal-replay-request-v1", "request-kind")
    episode_id, registration = identifier(request["episodeId"]), digest(request["registrationSha256"])
    require(type(request["journalJsonl"]) is str and request["journalJsonl"].isascii(), "journal-encoding")
    journal = request["journalJsonl"].encode("ascii")
    require(len(journal) <= MAX_JOURNAL_BYTES, "journal-size")
    count = integer(request["expectedRecordCount"])
    require(count <= MAX_RECORDS, "record-count")
    if count:
        digest(request["expectedHeadSha256"])
        require(journal.endswith(b"\n"), "journal-final-newline")
    else:
        require(not journal and request["expectedHeadSha256"] is None and request["operation"] == "transition",
                "empty-prefix")
    lines = journal.splitlines(keepends=True)
    require(len(lines) == count, "prefix-record-count")
    modules = load_modules(); replay = _Replay(modules); runner = modules[3]
    previous = None
    for sequence, line in enumerate(lines, 1):
        record = parse_json(line, MAX_LINE_BYTES)
        require(canonical(record) == line, "noncanonical-journal-line")
        fields(record, "kind episodeId registrationSha256 sequence previousRecordSha256 expectedReducerRevision input evidence result")
        require(record["episodeId"] == episode_id and record["registrationSha256"] == registration and
                type(record["sequence"]) is int and record["sequence"] == sequence and
                record["previousRecordSha256"] == previous, "journal-chain-binding")
        revision = 0 if replay.state is None else replay.state.revision
        require(type(record["expectedReducerRevision"]) is int and record["expectedReducerRevision"] == revision,
                "reducer-revision")
        evidence_refs(record["evidence"])
        reproduced = replay.apply(record["kind"], record["input"])
        require(canonical(record["result"]) == canonical(reproduced), "record-result-mismatch")
        previous = sha256(line).hexdigest()
    require(previous == request["expectedHeadSha256"], "prefix-head-mismatch")
    base_journal = {"recordCount": count, "headSha256": previous,
                    "prefixSha256": sha256(journal).hexdigest()}
    proposal = None
    if request["operation"] == "transition":
        require(request["packet"] is None and count < MAX_RECORDS, "transition-packet-or-capacity")
        event = fields(request["nextEvent"], "kind input evidence")
        evidence_refs(event["evidence"])
        revision = 0 if replay.state is None else replay.state.revision
        result = replay.apply(event["kind"], event["input"])
        record = {**event, "episodeId": episode_id, "registrationSha256": registration,
                  "sequence": count + 1, "previousRecordSha256": previous,
                  "expectedReducerRevision": revision, "result": result}
        line = canonical(record)
        require(len(line) <= MAX_LINE_BYTES and len(journal) + len(line) <= MAX_JOURNAL_BYTES, "proposal-size")
        previous = sha256(line).hexdigest(); count += 1
        journal += line
        proposal = {"recordJsonl": line.decode("ascii"), "headSha256": previous, "recordCount": count,
                    "prefixSha256": sha256(journal).hexdigest()}
    state = replay.state
    require(state is not None, "missing-opening")
    diagnostics = list(replay.diagnostics)
    episode = None
    status = "incomplete" if replay.incomplete else "ineligible"
    if replay.active_invocation is not None:
        status = "incomplete"; diagnostics.append({"kind": "admission-start", "reason": "invocation-pending"})
    packet = request["packet"]
    if packet is not None:
        join_packet(packet, state, runner)
        require(packet["decisionAtMs"] >= replay.last_event_at, "packet-before-journal-event")
    if not replay.incomplete and replay.active_invocation is None and state.may_request_admission:
        if packet is None:
            status = "incomplete"; diagnostics.append({"kind": "projection", "reason": "packet-required"})
        elif packet["status"] == "incomplete":
            status = "incomplete"; diagnostics.append({"kind": "projection", "reason": "packet-incomplete"})
        else:
            require(state.kusd == state.opening.capital_kusd and state.xor == state.opening.fee_reserve_xor and
                    state.fees_paid_xor == 0 and not state.successful_purchase, "untouched-state-required")
            episode = episode_projection(state, episode_id, sha256(journal).hexdigest(), runner)
            # Schema/math validation only, using the same owned classes; never load_math or a model file.
            runner.decode_request(canonical({"kind": "accumulation-admission-request-v1", "packet": packet,
                                             "episode": episode}), modules[1], modules[0])
            require(packet["decisionAtMs"] < state.deadline_ms and
                    packet["decisionAtMs"] - state.current_mark.received_at_ms < 5000 and
                    packet["decisionAtMs"] - state.current_mark.observed_at_ms <= 60000,
                    "projection-expired")
            status = "eligible"
    verify_sources()
    result = {"kind": "accumulation-journal-replay-result-v1", "status": status, "episode": episode,
        "inputSha256": sha256(raw).hexdigest(), "baseJournal": base_journal,
        "journal": {"headSha256": previous, "recordCount": count, "reducerRevision": state.revision,
                    "prefixSha256": sha256(journal).hexdigest()},
        "state": accounting_summary(state, runner), "stateSha256": state_digest(state, runner),
        "diagnostics": diagnostics, "proposal": proposal, "sourceSha256": dict(DEPENDENCIES),
        "evidenceAuthentication": "trusted-parent-source-and-head-required", "scheduleCompletenessVerified": False,
        "financialActions": False, "qualificationAuthority": False, "policyCalled": False}
    require(len(canonical(result)) <= MAX_OUTPUT_BYTES, "output-size")
    return result


def main():
    """One isolated stdin request; fixed source dependencies and no model/data file IO."""
    try:
        require(len(sys.argv) == 1, "arguments-not-supported")
        result = evaluate_request(sys.stdin.buffer.read(MAX_INPUT_BYTES + 1))
        sys.stdout.buffer.write(canonical(result))
        return 0
    except (ValueError, OSError, ArithmeticError, TypeError, RecursionError) as error:
        reason = str(error) if isinstance(error, JournalError) else "journal-rejected"
        sys.stdout.buffer.write(canonical({"kind": "accumulation-journal-replay-error-v1", "reason": reason,
            "financialActions": False, "qualificationAuthority": False, "policyCalled": False}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
