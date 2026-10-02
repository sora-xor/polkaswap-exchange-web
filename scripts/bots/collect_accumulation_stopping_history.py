#!/usr/bin/env python3
"""Collect only preregistered tc1 training/development hourly pool evidence.

No wallet, quote, signing, retry, redirect or validation access exists here. Python
retains bounded HTTP receipts; the existing TypeScript pool-history parser is
bundled before registration and validates chain, denomination, reserve and joined
boundary semantics offline. Its result is indexed spot evidence, never an archive
execution quote, consensus proof, millisecond arrival or profitability claim.

Usage: prepare-parser --directory DIR; then root exclusively seals registration
with body.historyCollector equal to the printed collectionSpec. collect requires
the exact whole-registration digest. Each output directory is single-use.
"""
from __future__ import annotations

import argparse
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
from datetime import datetime, timezone
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[2]
ENDPOINT = "https://pi.soramitsu.io/graphql"
GENESIS = "0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5"
DENOMINATOR = "100000000000000000000000000000000000000"
ASSETS = {"KUSD": "0x02000c0000000000000000000000000000000000000000000000000000000000",
          "XOR": "0x0200000000000000000000000000000000000000000000000000000000000000"}
QUERY = ("query GoalQualificationPoolHistory($filter:AssetSnapshotFilter!,$after:Cursor)"
         "{assetSnapshots(first:100,after:$after,orderBy:[TIMESTAMP_ASC],filter:$filter)"
         "{pageInfo{hasNextPage endCursor}edges{node{id assetId type timestamp denominator closeEvidence}}}}")
HOUR = 3600
LIMITS = {"requests": 16, "responseBytes": 2_097_152, "totalBytes": 33_554_432,
          "requestSeconds": 30, "operationSeconds": 900, "retries": 0,
          "concurrency": 1, "redirects": False}


def timestamp(value: str) -> int:
    """Convert a fixed UTC ISO endpoint to integer Unix seconds."""
    return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp())


PARTITIONS = [
    {"name": "training", "firstClose": "2026-06-28T19:00:00Z", "lastClose": "2026-07-28T18:00:00Z",
     "bucketStart": timestamp("2026-06-28T18:00:00Z"), "bucketEnd": timestamp("2026-07-28T18:00:00Z"), "count": 720},
    {"name": "development", "firstClose": "2026-07-28T19:00:00Z", "lastClose": "2026-08-18T19:00:00Z",
     "bucketStart": timestamp("2026-07-28T18:00:00Z"), "bucketEnd": timestamp("2026-08-18T19:00:00Z"), "count": 505},
]


class CollectionError(RuntimeError):
    """A bounded acquisition or registration failure; never a fallback trigger."""


def require(condition: Any, reason: str) -> None:
    """Fail closed with a non-sensitive diagnostic."""
    if not condition:
        raise CollectionError(reason)


def canonical(value: Any) -> bytes:
    """Use sorted compact UTF-8 JSON for registration body identities."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode()


def digest(data: bytes) -> str:
    """Return an opaque SHA-256 identity."""
    return hashlib.sha256(data).hexdigest()


def strict_json(raw: bytes) -> Any:
    """Reject duplicate JSON keys and non-finite constants before inspection."""
    def pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in items:
            require(key not in result, "duplicate-json-key")
            result[key] = value
        return result
    def invalid(_: str) -> None:
        raise CollectionError("nonfinite-json")
    try:
        return json.loads(raw.decode("utf-8", errors="strict"), object_pairs_hook=pairs, parse_constant=invalid)
    except (UnicodeError, ValueError, RecursionError) as error:
        raise CollectionError("invalid-json") from error


def exclusive_write(path: Path, raw: bytes) -> None:
    """Flush a new artifact without replacing previous evidence."""
    with path.open("xb") as stream:
        stream.write(raw)
        stream.flush()
        os.fsync(stream.fileno())


PARSER_ENTRY = r'''
import { readFileSync } from 'node:fs';
import { parseIndexedPoolHistoryWithEvidence } from './src/features/bot-trading/pool-history.ts';
const payload = JSON.parse(readFileSync(0, 'utf8'));
const XOR = {address: '0x0200000000000000000000000000000000000000000000000000000000000000',symbol:'XOR',decimals:18};
const KUSD = {address: '0x02000c0000000000000000000000000000000000000000000000000000000000',symbol:'KUSD',decimals:18};
const parsed = parseIndexedPoolHistoryWithEvidence(new Map([[KUSD.address,payload.rows.KUSD],[XOR.address,payload.rows.XOR]]),
  {assetIn:KUSD,assetOut:XOR,policy:{feeAsset:XOR}},payload.context);
const expected = (payload.context.endAt - payload.context.startAt) / 3600000;
if (parsed.history.missing !== 0 || !parsed.history.denominationVerified ||
    parsed.history.candles.length !== expected || parsed.boundaries.length !== expected)
  throw new Error('history-incomplete');
process.stdout.write(JSON.stringify(parsed));
'''
PREPARE_JS = r'''
import { build } from 'esbuild';
const input=JSON.parse(await new Promise(resolve=>{let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>resolve(s));}));
const packages=['math','sdk','liquidity-proxy','api','connection','types','type-definitions'];
const alias=Object.fromEntries(packages.map(n=>['@sora-substrate/'+n,input.root+'/src/lib/substrate/'+n]));
alias['@']=input.root+'/src';
const result=await build({absWorkingDir:input.root,stdin:{contents:input.entry,resolveDir:input.root,sourcefile:'tc1-history-offline-parser.ts',loader:'ts'},
 bundle:true,platform:'node',format:'esm',target:'node26',write:false,metafile:true,alias,logLevel:'silent'});
process.stdout.write(JSON.stringify({code:result.outputFiles[0].text,inputs:Object.keys(result.metafile.inputs).filter(p=>p!=='tc1-history-offline-parser.ts')}));
'''


def prepare_parser(directory: Path) -> dict[str, Any]:
    """Build the real parser and bind every bundled input before any registration."""
    directory.mkdir(parents=True, exist_ok=True)
    node = Path(shutil.which("node") or "").resolve()
    require(node.is_file(), "node-unavailable")
    completed = subprocess.run([str(node), "--input-type=module", "-e", PREPARE_JS],
                               input=canonical({"root": str(ROOT), "entry": PARSER_ENTRY}),
                               capture_output=True, timeout=120, cwd=ROOT, check=False)
    require(completed.returncode == 0, "parser-bundle-failed")
    result = strict_json(completed.stdout)
    bundle = directory.resolve() / "pool-history-parser.mjs"
    exclusive_write(bundle, result["code"].encode())
    sources = []
    for name in sorted(result["inputs"]):
        path = (ROOT / name).resolve()
        require(path.is_relative_to(ROOT) and path.is_file(), "parser-source-outside-repository")
        sources.append({"path": str(path), "sha256": digest(path.read_bytes())})
    manifest = {"kind": "tc1-existing-pool-history-parser-bundle-v1", "bundle": str(bundle),
                "bundleSha256": digest(bundle.read_bytes()), "node": str(node),
                "nodeSha256": digest(node.read_bytes()), "sources": sources,
                "entrySha256": digest(PARSER_ENTRY.encode()),
                "qualificationAuthority": False, "networkEnabled": False}
    manifest_path = directory.resolve() / "parser-manifest.json"
    exclusive_write(manifest_path, canonical(manifest) + b"\n")
    return {"schemaVersion": 1, "endpoint": ENDPOINT, "genesisHash": GENESIS, "denominator": DENOMINATOR,
            "partitions": [PARTITIONS[0]], "limits": LIMITS, "financialActions": False, "validationAllowed": False,
            "collectorSha256": digest(Path(__file__).read_bytes()),
            "parserManifest": {"path": str(manifest_path), "sha256": digest(manifest_path.read_bytes())}}


def verify_registration(path: Path, expected_sha: str, partition: str = "training") -> tuple[dict[str, Any], dict[str, Any]]:
    """Require a pre-existing exclusive registration and exact source/date hashes."""
    require(partition == "training", "training-stage-only")
    raw = path.read_bytes()
    require(bool(re.fullmatch(r"[0-9a-f]{64}", expected_sha)) and digest(raw) == expected_sha, "registration-file-hash")
    record = strict_json(raw)
    require(record.get("registrationMode") == "exclusive-create" and isinstance(record.get("body"), dict), "registration-exclusive-required")
    body = record["body"]
    require(record.get("sha256") == digest(canonical(body)), "registration-body-hash")
    require(body.get("dataAccess") == {"partition": "training", "trainingAllowed": True, "developmentAllowed": False, "validationAllowed": False, "financialActions": False}, "registration-data-access")
    acquisition = body.get("historyAcquisitionDirectory")
    require(isinstance(acquisition, str) and Path(acquisition).is_absolute() and
            str(Path(acquisition).resolve()) == acquisition, "registration-acquisition-directory")
    spec = body.get("historyCollector")
    require(isinstance(spec, dict), "missing-history-collector-spec")
    fixed = {"schemaVersion": 1, "endpoint": ENDPOINT, "genesisHash": GENESIS, "denominator": DENOMINATOR,
             "partitions": [PARTITIONS[0]], "limits": LIMITS, "financialActions": False, "validationAllowed": False,
             "collectorSha256": digest(Path(__file__).read_bytes())}
    require(all(spec.get(k) == v for k, v in fixed.items()) and set(spec) == set(fixed) | {"parserManifest"}, "registration-scope-or-source")
    binding = spec["parserManifest"]
    require(isinstance(binding, dict) and set(binding) == {"path", "sha256"}, "parser-manifest-binding")
    manifest_raw = Path(binding["path"]).read_bytes()
    require(digest(manifest_raw) == binding["sha256"], "parser-manifest-hash")
    manifest = strict_json(manifest_raw)
    require(manifest.get("kind") == "tc1-existing-pool-history-parser-bundle-v1" and
            manifest.get("networkEnabled") is False and manifest.get("qualificationAuthority") is False and
            manifest.get("entrySha256") == digest(PARSER_ENTRY.encode()), "parser-manifest-scope")
    verify_parser(manifest)
    return record, manifest


def verify_parser(manifest: dict[str, Any]) -> None:
    """Verify the sealed executable and source closure without accessing market data."""
    for path_key, hash_key in [("bundle", "bundleSha256"), ("node", "nodeSha256")]:
        require(digest(Path(manifest[path_key]).read_bytes()) == manifest[hash_key], "parser-executable-hash")
    require(isinstance(manifest["sources"], list) and len(manifest["sources"]) > 0, "parser-source-closure")
    for item in manifest["sources"]:
        require(digest(Path(item["path"]).read_bytes()) == item["sha256"], "parser-source-hash")


def request_body(asset: str, partition: dict[str, Any], cursor: str | None) -> bytes:
    """Construct the exact fixed GraphQL selection without priceUSD or fallback data."""
    return canonical({"query": QUERY, "variables": {"filter": {"assetId": {"equalTo": asset},
                     "type": {"equalTo": "HOUR"}, "timestamp": {"greaterThanOrEqualTo": partition["bucketStart"],
                     "lessThan": partition["bucketEnd"]}}, "after": cursor}})


def live_transport(raw: bytes, timeout: float, maximum: int) -> tuple[int, list[tuple[str, str]], bytes, bool]:
    """One TLS request with a shared deadline, no redirects and no retries.

    Remaining socket timeouts are applied between connect/send/header/body phases.
    DNS and a currently blocking library operation are not force-killed by this
    synchronous function; an overrun is rejected, never admitted as complete.
    """
    deadline = time.monotonic() + timeout
    connection = http.client.HTTPSConnection("pi.soramitsu.io", timeout=timeout)
    active_socket = None

    def remaining_phase() -> float:
        remaining = deadline - time.monotonic()
        require(remaining > 0, "transport-deadline")
        connection.timeout = remaining
        socket = connection.sock or active_socket
        if socket is not None:
            socket.settimeout(remaining)
        return remaining

    try:
        remaining_phase()
        connection.connect()
        active_socket = connection.sock
        remaining_phase()
        connection.request("POST", "/graphql", body=raw, headers={"Content-Type": "application/json", "Cache-Control": "no-cache"})
        remaining_phase()
        response = connection.getresponse()
        chunks: list[bytes] = []
        size = 0
        complete = False
        try:
            while size <= maximum:
                remaining_phase()
                chunk = response.read1(min(65_536, maximum + 1 - size))
                if not chunk:
                    complete = response.length in (None, 0)
                    break
                chunks.append(chunk)
                size += len(chunk)
        except (CollectionError, OSError, http.client.HTTPException):
            # Preserve every received chunk and status even after a partial read.
            complete = False
        payload = b"".join(chunks)
        within_deadline = time.monotonic() <= deadline
        return response.status, response.getheaders(), payload[:maximum], complete and size <= maximum and within_deadline
    finally:
        connection.close()


def validate_page(raw: bytes, asset: str, partition: dict[str, Any], previous: int,
                  seen: set[str], cursors: set[str]) -> tuple[list[dict[str, Any]], str | None, int]:
    """Validate transport pagination; full proof validation stays in the TS parser."""
    body = strict_json(raw)
    require(isinstance(body, dict) and "errors" not in body, "graphql-error")
    data = body.get("data", {}).get("assetSnapshots")
    require(isinstance(data, dict) and isinstance(data.get("edges"), list) and len(data["edges"]) <= 100, "page-shape")
    info = data.get("pageInfo")
    require(isinstance(info, dict) and type(info.get("hasNextPage")) is bool, "page-info")
    rows = []
    for edge in data["edges"]:
        row = edge.get("node") if isinstance(edge, dict) else None
        require(isinstance(row, dict), "row-shape")
        ts = row.get("timestamp")
        require(type(ts) is int and partition["bucketStart"] <= ts < partition["bucketEnd"] and ts > previous, "row-time")
        require(row.get("assetId") == asset and row.get("type") == "HOUR", "row-identity")
        expected = f"asset-{asset}-HOUR-{ts // HOUR * HOUR}"
        require(row.get("id") == expected and expected not in seen, "duplicate-or-invalid-row-id")
        previous = ts
        seen.add(expected)
        rows.append(row)
    cursor = None
    if info["hasNextPage"]:
        cursor = info.get("endCursor")
        require(len(rows) > 0 and isinstance(cursor, str) and 0 < len(cursor) <= 4096 and cursor not in cursors, "page-cursor")
        cursors.add(cursor)
    return rows, cursor, previous


def parse_existing(rows: dict[str, list[dict[str, Any]]], partition: dict[str, Any], manifest: dict[str, Any]) -> dict[str, Any]:
    """Run the frozen existing parser offline; never reinterpret a rejected row."""
    verify_parser(manifest)
    payload = {"rows": rows, "context": {"startAt": partition["bucketStart"] * 1000,
               "endAt": partition["bucketEnd"] * 1000, "genesisHash": GENESIS, "denominator": DENOMINATOR}}
    completed = subprocess.run([manifest["node"], manifest["bundle"]], input=canonical(payload),
                               capture_output=True, timeout=30, check=False)
    require(completed.returncode == 0, "existing-pool-parser-rejected")
    require(len(completed.stdout) <= LIMITS["totalBytes"], "parser-output-limit")
    result = strict_json(completed.stdout)
    require(result["history"]["missing"] == 0 and len(result["boundaries"]) == partition["count"], "parsed-count")
    return result


def collect(registration: Path, registration_sha: str, output: Path,
            partition: str, transport: Callable[..., Any] = live_transport) -> dict[str, Any]:
    """Collect one registered run, preserving intents and every terminal outcome."""
    record, manifest = verify_registration(registration, registration_sha, partition)
    output = output.resolve()
    require(str(output) == record["body"]["historyAcquisitionDirectory"], "acquisition-output-mismatch")
    output.mkdir(parents=True, exist_ok=True)
    exclusive_write(output / "acquisition-started.json", canonical({"registrationSha256": registration_sha,
                    "startedAt": datetime.now(timezone.utc).isoformat(), "pid": os.getpid(), "financialActions": False}) + b"\n")
    began = time.monotonic()
    count = total = 0
    artifacts = []
    try:
        for partition in [PARTITIONS[0]]:
            rows: dict[str, list[dict[str, Any]]] = {}
            for symbol, asset in ASSETS.items():
                selected: list[dict[str, Any]] = []
                cursor = None
                previous = -1
                seen: set[str] = set()
                cursors: set[str] = set()
                while True:
                    verify_registration(registration, registration_sha)
                    remaining = LIMITS["operationSeconds"] - (time.monotonic() - began)
                    require(remaining > 0 and count < LIMITS["requests"], "operation-budget")
                    require(total < LIMITS["totalBytes"], "total-byte-budget")
                    count += 1
                    stem = f"request-{count:03d}"
                    raw = request_body(asset, partition, cursor)
                    exclusive_write(output / f"{stem}.json", raw)
                    exclusive_write(output / f"{stem}.intent.json", canonical({"endpoint": ENDPOINT, "method": "POST",
                                    "requestSha256": digest(raw), "partition": partition["name"], "asset": symbol,
                                    "requestedAt": datetime.now(timezone.utc).isoformat(), "sequence": count}) + b"\n")
                    transport_started = time.monotonic()
                    request_timeout = min(remaining, LIMITS["requestSeconds"])
                    try:
                        status, headers, response, complete = transport(raw, request_timeout,
                                        min(LIMITS["responseBytes"], LIMITS["totalBytes"] - total))
                    except Exception as error:
                        exclusive_write(output / f"{stem}.transport-error.json", canonical({"kind": type(error).__name__, "retry": False}) + b"\n")
                        raise CollectionError("transport-failed") from error
                    transport_seconds = time.monotonic() - transport_started
                    total += len(response)
                    exclusive_write(output / f"{stem}.response", response)
                    exclusive_write(output / f"{stem}.receipt.json", canonical({"httpStatus": status,
                                    "headers": headers, "responseSha256": digest(response), "bytes": len(response),
                                    "complete": complete, "transportElapsedSeconds": transport_seconds, "completedAt": datetime.now(timezone.utc).isoformat()}) + b"\n")
                    require(transport_seconds <= request_timeout, "request-deadline-overrun")
                    require(time.monotonic() - began < LIMITS["operationSeconds"], "operation-timeout")
                    require(complete and len(response) <= LIMITS["responseBytes"] and total <= LIMITS["totalBytes"], "response-limit")
                    require(status == 200, "http-error-no-redirects")
                    part, cursor, previous = validate_page(response, asset, partition, previous, seen, cursors)
                    selected.extend(part)
                    require(len(selected) <= partition["count"], "excess-rows")
                    if cursor is None:
                        require(len(selected) == partition["count"], "missing-rows")
                        break
                rows[symbol] = selected
            parsed = parse_existing(rows, partition, manifest)
            path = output / f"{partition['name']}.json"
            result = {"kind": "indexed-pool-spot-development-history-v1", "partition": partition,
                      "registrationSha256": registration_sha, "parserBundleSha256": manifest["bundleSha256"],
                      "rows": rows, "parsed": parsed, "qualificationAuthority": False,
                      "historicalExecutionQuote": False, "millisecondArrivalKnown": False}
            exclusive_write(path, canonical(result) + b"\n")
            artifacts.append({"path": str(path), "sha256": digest(path.read_bytes()), "count": partition["count"]})
        verify_registration(registration, registration_sha)
        completion = {"kind": "tc1-accumulation-history-complete-v1", "registrationSha256": registration_sha,
                      "requests": count, "responseBytes": total, "artifacts": artifacts,
                      "financialActions": False, "validationAccessed": False, "qualificationAuthority": False}
        exclusive_write(output / "complete.json", canonical(completion) + b"\n")
        return completion
    except Exception as error:
        exclusive_write(output / "failed.json", canonical({"kind": "tc1-accumulation-history-incomplete-v1",
                        "reason": str(error) if isinstance(error, CollectionError) else type(error).__name__,
                        "requests": count, "retainedResponseBytes": total, "financialActions": False,
                        "partialArtifactsAreNotComplete": True}) + b"\n")
        raise


def main() -> None:
    """Expose separate offline preparation and explicit single-use collection."""
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    prepare = commands.add_parser("prepare-parser")
    prepare.add_argument("--directory", required=True, type=Path)
    run = commands.add_parser("collect")
    run.add_argument("--partition", required=True, choices=["training"])
    run.add_argument("--registration", required=True, type=Path)
    run.add_argument("--registration-sha256", required=True)
    run.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.command == "prepare-parser":
        print(json.dumps({"collectionSpec": prepare_parser(args.directory)}, indent=2))
    else:
        print(json.dumps(collect(args.registration, args.registration_sha256, args.output, args.partition), indent=2))


if __name__ == "__main__":
    main()
