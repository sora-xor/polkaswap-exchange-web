"""Test-only bounded TS bridge→Python math handoff using invented fixture bytes.

The production CLI cannot select a model. This harness calls only the runner's
synthetic-test function and never opens its production model or market files.
No raw RPC authenticity or trusted journal authority is conferred by this child.
"""
from hashlib import sha256
from pathlib import Path
import runpy
import sys

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT))


def no_network(event, _args):
    if event.startswith("socket."):
        raise AssertionError("Network forbidden in synthetic handoff")


sys.addaudithook(no_network)
fixture = runpy.run_path(str(ROOT / "tests/unit/scripts/bots/test_accumulation_admission_runner.py"))
runner = fixture["runner"]
packets = runner.strict_json(sys.stdin.buffer.read(3 * runner.MAX_INPUT_BYTES + 1), 3 * runner.MAX_INPUT_BYTES)
if type(packets) is not list or len(packets) != 3:
    raise ValueError("Exactly three synthetic handoff cases required")
model = fixture["model_bytes"]()
outputs = []
for packet in packets:
    request = fixture["request"]()
    # Only the separate invented journal uses the fixture factory. The complete
    # packet, including every ready/unavailable/failed quote, comes from TS.
    request["packet"] = packet
    request["episode"]["lastAtMs"] = packet["contextReceivedAtMs"]
    request["episode"]["current"]["markBlockHash"] = packet["block"]["hash"]
    outputs.append(runner.evaluate_request(fixture["encoded"](request), model,
                   trusted_model_sha256=sha256(model).hexdigest()))
sys.stdout.buffer.write(runner.canonical(outputs))
