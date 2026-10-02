# Offline accumulation admission subprocess

`scripts/bots/accumulation_admission_runner.py` is the exact serialization and math boundary between the new TypeScript evidence bridge and the frozen Python admission model. It is an offline research component. It cannot fetch data, fit a model, sign, execute orders, qualify a strategy, or prove that a JSON packet came from an authentic source.

The trusted parent must first verify raw evidence through `verifyAccumulationDecisionPacket`, retain its verifier-owned result, and reconstruct the complete episode journal. It must check ownership before serialization. A `status: verified` string or plausible digest in arbitrary JSON does not grant that ownership. The journal projection must preserve the original funding, original 24-hour deadline and durable peak; current holdings must still equal the original allocation, with zero spent fees, no committed attempt, no purchase and no pending frozen order.

## Invocation

The parent launches a pinned Python executable with an argument array, isolated startup, no shell, and this fixed script path:

```sh
python3 -I -S -B scripts/bots/accumulation_admission_runner.py
```

Write exactly one request on stdin and close it. The request has exactly `kind: accumulation-admission-request-v1`, `packet`, and `episode`. The packet follows the evidence-bridge projection. The episode contains `episodeId`, `journalPrefixSha256`, `journalRevision`, `openingAtMs`, `deadlineMs`, `lastAtMs`, `opening`, `current`, `attemptCommitted`, `successfulPurchase`, `orderPhase`, `goalStopped`, and `targetReached`. `opening` carries `capitalKusdCodec`, `feeReserveXorCodec`, and `price`; `current` carries `kusdCodec`, `xorCodec`, `feesPaidXorCodec`, `peakXor`, and `markBlockHash`. Prices/peaks are reduced `{numerator, denominator}` ratios with canonical integer strings. Token amounts are canonical u128 strings at 18 decimals. Only timestamps and counters are JSON integers.

The production CLI accepts no arguments or model override. It reads the sole sealed training-model file at its fixed repository path, verifies raw SHA-256 `59c55ea8eb27b9efcf6e14cff95f3a56f73f2e65d9e66c82bad7b1a5b5fff355`, and verifies the frozen model/admission source hashes before importing them and before output. It never refits or changes the 719 residuals, seed, limits, horizon or training dates. The pure Python function has an explicit trusted-hash parameter for synthetic unit fixtures; the CLI does not expose it.

Input is capped at 256 KiB, model bytes at 128 KiB, and output at 256 KiB. Duplicate/unknown keys, JSON floats/exponents/NaN, unsafe integer timestamps, numeric token amounts, noncanonical or unreduced ratios, altered minima and contradictory clocks are rejected. All nine ordered amount outcomes must remain present. Genuine unavailable quotes remain in diagnostics. Any failed quote makes the packet incomplete and suppresses the policy call; it cannot become a free wait or an omitted bad candidate. Authenticated over-impact quotes are passed to the policy to retain their rejection.

Model size and digest are checked before importing the math. The two local dependency hashes and the absence of package initializers for every Python import suffix are checked before import and before output. The fixed namespace parents must resolve only to the repository paths. A confined standard source loader compiles only the two verified source byte strings, bypassing bytecode caches and replacing unchecked preloaded math modules on its first load. Subsequent calls reuse only its own module objects. This protects source binding without claiming to sandbox a hostile interpreter or parent process.

The journal mark cannot predate its native block, and an opening portfolio at or below 90% of its durable peak must already carry the drawdown stop. Ready quotes have no failure reason; every other outcome requires a bounded reason code.

Original context and quote receipt times remain separate from the fee receipt time. A later fee result cannot renew either age. A completed close must be available before the declared decision. The Python process checks these relations but cannot prove historical publication or browser arrival. The parent must bind observed or explicitly modeled clocks to its registered source.

Output is one canonical JSON line. It retains all nine outcomes, exact input/model/dependency digests and journal references, `policyCalled`, and either the exact research decision or an explicit incomplete result. All monetary diagnostics remain rational objects or finite Decimal strings. Error output contains a bounded code, never the original packet or arbitrary exception details. Every result preserves `financialActions: false` and `qualificationAuthority: false`.

The parent must bound process runtime, stdout and stderr, retain the actual spawn/completion/error clocks, and avoid automatic retries. For prospective use it must recheck original context/quote expiry and the goal deadline **after computation**, discard expired results, and never backdate completion. Historical modeled decision time is not the wall time at which this subprocess happens to run. Frozen dependencies do not authenticate the parent, durable journal or packet bytes. Full acquisition, journal verification, execution replay, development evaluation and prospective validation remain separate requirements.

Run synthetic tests with:

```sh
python3 -m unittest discover -s tests/unit/scripts/bots -p 'test_accumulation_admission_runner.py' -v
```
