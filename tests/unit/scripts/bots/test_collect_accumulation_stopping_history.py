"""Offline transport, registration and actual-TypeScript-parser regression tests."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[4]
SPEC = importlib.util.spec_from_file_location("collector", ROOT / "scripts/bots/collect_accumulation_stopping_history.py")
collector = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(collector)


def make_rows(count, start):
    """Generate synthetic same-state proofs; never read market observations."""
    result = {}
    for symbol, asset in collector.ASSETS.items():
        rows = []
        for i in range(count):
            opening = start + i * 3600
            proof = {"kind": "finalized-hour-close", "genesisHash": collector.GENESIS,
                     "completedAt": opening + 3600, "timestamp": opening + 3594,
                     "symbol": symbol, "requestedSymbol": symbol, "decimals": 18,
                     "blockHeight": 100_000 + i * 100, "nextBlockHeight": 100_001 + i * 100,
                     "blockHash": "0x" + f"{100_000 + i * 100:064x}",
                     "nextBlockHash": "0x" + f"{100_001 + i * 100:064x}",
                     "nextTimestamp": opening + 3600, "xorPool": None}
            if symbol == "KUSD":
                proof["xorPool"] = {"baseAssetId": collector.ASSETS["XOR"], "targetAssetId": asset,
                                    "baseDecimals": 18, "targetDecimals": 18,
                                    "baseAssetReserves": "100000000000000000000",
                                    "targetAssetReserves": "500000000000000000000"}
            rows.append({"id": f"asset-{asset}-HOUR-{opening}", "assetId": asset, "type": "HOUR",
                         "timestamp": opening + 3594, "denominator": collector.DENOMINATOR, "closeEvidence": proof})
        result[symbol] = rows
    return result


class CollectorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.parser_tmp = tempfile.TemporaryDirectory()
        cls.collection_spec = collector.prepare_parser(Path(cls.parser_tmp.name))
        cls.manifest = json.loads(Path(cls.collection_spec["parserManifest"]["path"]).read_text())

    @classmethod
    def tearDownClass(cls):
        cls.parser_tmp.cleanup()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.partition = collector.PARTITIONS[0]
        self.rows = make_rows(720, self.partition["bucketStart"])
        self.calls = []

    def registration(self, mutate=None):
        body = {"historyCollector": copy.deepcopy(self.collection_spec),
                "historyAcquisitionDirectory": str((self.root / "run").resolve()),
                "dataAccess": {"partition": "training", "trainingAllowed": True,
                               "developmentAllowed": False, "validationAllowed": False, "financialActions": False}}
        if mutate:
            mutate(body)
        record = {"registrationMode": "exclusive-create", "body": body,
                  "sha256": collector.digest(collector.canonical(body))}
        path = self.root / "registration.json"
        collector.exclusive_write(path, collector.canonical(record))
        return path, collector.digest(path.read_bytes())

    def transport(self, raw, timeout, maximum):
        request = json.loads(raw)
        self.calls.append(request)
        variables = request["variables"]
        asset = variables["filter"]["assetId"]["equalTo"]
        self.assertEqual(variables["filter"]["timestamp"], {
            "greaterThanOrEqualTo": self.partition["bucketStart"], "lessThan": self.partition["bucketEnd"]})
        symbol = next(symbol for symbol, value in collector.ASSETS.items() if value == asset)
        offset = int(variables["after"] or 0)
        selected = self.rows[symbol][offset:offset + 100]
        next_offset = offset + len(selected)
        more = next_offset < len(self.rows[symbol])
        data = {"data": {"assetSnapshots": {"edges": [{"node": row} for row in selected],
                "pageInfo": {"hasNextPage": more, "endCursor": str(next_offset) if more else None}}}}
        return 200, [("content-type", "application/json")], collector.canonical(data), True

    def run_collection(self, transport=None):
        path, sha = self.registration()
        return collector.collect(path, sha, self.root / "run", "training", transport or self.transport)

    def test_exact_dates_and_count(self):
        p = self.partition
        self.assertEqual(p["count"], 720)
        self.assertEqual((p["bucketEnd"] - p["bucketStart"]) // 3600, 720)
        self.assertEqual(collector.timestamp(p["firstClose"]), p["bucketStart"] + 3600)
        self.assertEqual(collector.timestamp(p["lastClose"]), p["bucketEnd"])
        self.assertEqual(self.collection_spec["partitions"], [p])

    def test_real_parser_and_receipts_complete_training_only(self):
        result = self.run_collection()
        self.assertEqual(result["requests"], 16)
        self.assertEqual(len(self.calls), 16)
        self.assertFalse((self.root / "run/development.json").exists())
        data = json.loads((self.root / "run/training.json").read_text())
        self.assertEqual(len(data["parsed"]["history"]["candles"]), 720)
        self.assertEqual(data["parsed"]["history"]["candles"][0]["close"], "5")
        self.assertFalse(data["qualificationAuthority"])
        self.assertFalse(data["historicalExecutionQuote"])
        self.assertGreater(len(self.manifest["sources"]), 5)
        for i in range(1, 17):
            receipt = json.loads((self.root / f"run/request-{i:03d}.receipt.json").read_text())
            raw = (self.root / f"run/request-{i:03d}.response").read_bytes()
            self.assertEqual(receipt["responseSha256"], collector.digest(raw))
            self.assertEqual(receipt["httpStatus"], 200)
            self.assertTrue((self.root / f"run/request-{i:03d}.intent.json").exists())

    def test_registration_hash_and_dates_fail_before_transport(self):
        for variant in ["hash", "dates", "access"]:
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as folder:
                self.root = Path(folder)
                mutate = None
                if variant == "dates":
                    mutate = lambda body: body["historyCollector"]["partitions"][0].update(bucketEnd=self.partition["bucketEnd"] + 3600)
                if variant == "access":
                    mutate = lambda body: body["dataAccess"].update(developmentAllowed=True)
                path, sha = self.registration(mutate)
                with self.assertRaises(collector.CollectionError):
                    collector.collect(path, "0" * 64 if variant == "hash" else sha, self.root / "run", "training", self.transport)
                self.assertEqual(self.calls, [])

    def test_development_partition_rejected(self):
        path, sha = self.registration()
        with self.assertRaisesRegex(collector.CollectionError, "training-stage-only"):
            collector.collect(path, sha, self.root / "run", "development", self.transport)
        self.assertEqual(self.calls, [])

    def test_registration_requires_exclusive_seal(self):
        path, _ = self.registration()
        record = json.loads(path.read_text())
        record["registrationMode"] = "replace"
        path.write_bytes(collector.canonical(record))
        with self.assertRaisesRegex(collector.CollectionError, "exclusive-required"):
            collector.collect(path, collector.digest(path.read_bytes()), self.root / "run", "training", self.transport)
        self.assertEqual(self.calls, [])

    def test_redirect_body_retained_without_retry(self):
        calls = []
        def redirect(*args):
            calls.append(1)
            return 302, [("location", "https://example.invalid")], b"redirect", True
        with self.assertRaisesRegex(collector.CollectionError, "http-error-no-redirects"):
            self.run_collection(redirect)
        self.assertEqual(len(calls), 1)
        self.assertEqual((self.root / "run/request-001.response").read_bytes(), b"redirect")
        self.assertTrue((self.root / "run/failed.json").exists())

    def test_transport_error_retains_intent(self):
        def failure(*args):
            raise TimeoutError("synthetic")
        with self.assertRaisesRegex(collector.CollectionError, "transport-failed"):
            self.run_collection(failure)
        self.assertTrue((self.root / "run/request-001.intent.json").exists())
        self.assertTrue((self.root / "run/request-001.transport-error.json").exists())
        self.assertFalse((self.root / "run/complete.json").exists())

    def test_partial_response_never_parsed(self):
        def partial(*args):
            return 200, [], b'{"data":', False
        with self.assertRaisesRegex(collector.CollectionError, "response-limit"):
            self.run_collection(partial)
        self.assertEqual((self.root / "run/request-001.response").read_bytes(), b'{"data":')

    def test_graphql_errors_rejected(self):
        def error(*args):
            return 200, [], b'{"errors":[]}', True
        with self.assertRaisesRegex(collector.CollectionError, "graphql-error"):
            self.run_collection(error)

    def test_missing_rows_rejected(self):
        self.rows["KUSD"].pop()
        with self.assertRaisesRegex(collector.CollectionError, "missing-rows"):
            self.run_collection()
        self.assertEqual(len(self.calls), 8)

    def test_duplicate_bucket_rejected(self):
        self.rows["KUSD"][1] = copy.deepcopy(self.rows["KUSD"][0])
        with self.assertRaises(collector.CollectionError):
            self.run_collection()
        self.assertEqual(len(self.calls), 1)

    def test_full_existing_proof_semantics_reject_mutations(self):
        partition = dict(self.partition, count=1, bucketEnd=self.partition["bucketStart"] + 3600)
        mutations = {
            "mixed-genesis": lambda rows: rows["XOR"][0]["closeEvidence"].update(genesisHash="0x" + "a" * 64),
            "denomination": lambda rows: rows["KUSD"][0].update(denominator="1"),
            "zero-reserve": lambda rows: rows["KUSD"][0]["closeEvidence"]["xorPool"].update(baseAssetReserves="0"),
            "overflow-reserve": lambda rows: rows["KUSD"][0]["closeEvidence"]["xorPool"].update(baseAssetReserves=str(1 << 128)),
            "mixed-boundary": lambda rows: rows["XOR"][0]["closeEvidence"].update(blockHash="0x" + "a" * 64),
            "nonadjacent": lambda rows: rows["KUSD"][0]["closeEvidence"].update(nextBlockHeight=100_003),
            "wrong-symbol": lambda rows: rows["KUSD"][0]["closeEvidence"].update(requestedSymbol="DAI"),
            "unfinished-hour": lambda rows: rows["KUSD"][0]["closeEvidence"].update(nextTimestamp=partition["bucketEnd"] - 1),
            "legacy-usd": lambda rows: rows["KUSD"][0].update(closeEvidence=None, priceUSD={"close": "1"}),
        }
        for name, mutate in mutations.items():
            with self.subTest(name=name):
                rows = make_rows(1, partition["bucketStart"])
                mutate(rows)
                with self.assertRaisesRegex(collector.CollectionError, "existing-pool-parser-rejected"):
                    collector.parse_existing(rows, partition, self.manifest)

    def test_parser_digest_rejected(self):
        manifest = dict(self.manifest, bundleSha256="0" * 64)
        with self.assertRaisesRegex(collector.CollectionError, "parser-executable-hash"):
            collector.verify_parser(manifest)

    def test_duplicate_json_keys_and_nan_rejected(self):
        for raw in [b'{"a":1,"a":2}', b'{"a":NaN}', b'\xff']:
            with self.assertRaises(collector.CollectionError):
                collector.strict_json(raw)

    def test_live_transport_retains_partial_bytes_and_never_retries(self):
        class Response:
            status = 200
            length = 5
            def getheaders(self):
                return [("content-length", "5")]
            def read1(self, maximum):
                if self.length == 5:
                    self.length = 3
                    return b"ab"
                raise TimeoutError("synthetic read interruption")
        class Connection:
            sock = None
            requests = 0
            closed = False
            def connect(self):
                pass
            def request(self, *args, **kwargs):
                self.requests += 1
            def getresponse(self):
                return Response()
            def close(self):
                self.closed = True
        connection = Connection()
        with patch.object(collector.http.client, "HTTPSConnection", return_value=connection):
            status, headers, raw, complete = collector.live_transport(b"{}", 1, 100)
        self.assertEqual(status, 200)
        self.assertEqual(raw, b"ab")
        self.assertFalse(complete)
        self.assertEqual(connection.requests, 1)
        self.assertTrue(connection.closed)

    def test_output_binding_rejects_a_second_directory(self):
        path, sha = self.registration()
        with self.assertRaisesRegex(collector.CollectionError, "acquisition-output-mismatch"):
            collector.collect(path, sha, self.root / "different-output", "training", self.transport)
        self.assertEqual(self.calls, [])
        self.assertFalse((self.root / "different-output").exists())

    def test_registration_rejects_relative_output_binding(self):
        path, sha = self.registration(lambda body: body.update(historyAcquisitionDirectory="relative/run"))
        with self.assertRaisesRegex(collector.CollectionError, "registration-acquisition-directory"):
            collector.collect(path, sha, self.root / "run", "training", self.transport)
        self.assertEqual(self.calls, [])

    def test_transport_deadline_shared_across_phases(self):
        now = [0.0]
        timeouts = []
        class Socket:
            def settimeout(self, seconds):
                timeouts.append(seconds)
        class Response:
            status = 200
            length = 0
            def getheaders(self):
                return []
            def read1(self, maximum):
                now[0] += 2
                return b""
        class Connection:
            sock = None
            def connect(self):
                now[0] += 2
                self.sock = Socket()
            def request(self, *args, **kwargs):
                now[0] += 2
            def getresponse(self):
                now[0] += 2
                return Response()
            def close(self):
                pass
        with patch.object(collector.http.client, "HTTPSConnection", return_value=Connection()), \
             patch.object(collector.time, "monotonic", side_effect=lambda: now[0]):
            status, _, _, complete = collector.live_transport(b"{}", 7, 100)
        self.assertEqual(timeouts, [5, 3, 1])
        self.assertEqual(status, 200)
        self.assertFalse(complete)  # Eight total seconds cannot pass a seven-second budget.

    def test_connect_overrun_never_dispatches_request(self):
        now = [0.0]
        class Connection:
            sock = None
            requested = False
            def connect(self):
                now[0] = 31
            def request(self, *args, **kwargs):
                self.requested = True
            def close(self):
                pass
        connection = Connection()
        with patch.object(collector.http.client, "HTTPSConnection", return_value=connection), \
             patch.object(collector.time, "monotonic", side_effect=lambda: now[0]):
            with self.assertRaisesRegex(collector.CollectionError, "transport-deadline"):
                collector.live_transport(b"{}", 30, 100)
        self.assertFalse(connection.requested)

    def test_single_use_guard_never_retries(self):
        path, sha = self.registration()
        output = self.root / "run"
        collector.collect(path, sha, output, "training", self.transport)
        with self.assertRaises(FileExistsError):
            collector.collect(path, sha, output, "training", self.transport)
        self.assertEqual(len(self.calls), 16)


if __name__ == "__main__":
    unittest.main()
