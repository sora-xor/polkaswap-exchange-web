# Read-only target runtime host

`scripts/bots/goal-target-runtime-host.cjs` executes a small set of runtime 131 APIs against explicitly supplied state. It performs no network or filesystem reads. Its output is a **hypothetical API result**, not a historical fill, full dispatch, signature check, strategy qualification, or permission to trade.

```js
const { createGoalTargetRuntimeHost } = require('./scripts/bots/goal-target-runtime-host.cjs');
const host = createGoalTargetRuntimeHost(exactCompressedRuntimeBytes);
const result = host.invoke({
  api: 'LiquidityProxyAPI_quote',
  inputHex: exactScaleEncodedInput,
  state: verifiedState.hostState,
});
```

The factory copies the compressed bytes and pins their SHA-256, chain code hash, decompressed length, `Core_version` output, and metadata hash to the retained exact runtime 131 artifact. There is no public arbitrary-binary constructor or configurable limit override. Allowed exports are `Core_version`, `Metadata_metadata`, `LiquidityProxyAPI_quote`, `TransactionPaymentApi_query_info`, and `TransactionPaymentApi_query_fee_details`. Quote and fee calls require explicit state; the two metadata APIs may omit it.

State has this exact shape:

```ts
{
  entries: Record<StorageKeyHex, StorageValueHex | null>;
  prefix: {
    prefix: '0x94106571e04fc4fb4133da54a111ec64f0f8da9ca61ee022314c44009224fe9a';
    complete: true;
    entries: Record<StorageKeyHex, StorageValueHex>;
    after: StorageKeyHex | null;
  };
}
```

The prefix is `XSTPool.EnabledSynthetics`. Members may be nonempty; the host traverses them in byte order and reads their actual declared values. After the last member—or the prefix itself for an empty inventory—`after` must be the real global successor returned by `state_getKeysPaged(null, 1, cursor, blockHash)`. `null` declares that no global successor exists. Neither a guessed sentinel nor an empty prefix alone supplies that fact. Known present keys cannot contradict the declared successor. Prefix pagination through its final empty page and the separate global-successor receipt belong to the state verifier; the host does not authenticate supplied state provenance or completeness.

An explicitly declared `null` means absent storage. `'0x'` means a present empty value. An omitted key always traps. Input objects must contain own data fields; getters are rejected without execution. Each invocation snapshots state, uses fresh fixed memory, retains a state digest and bounded host-call trace, and reports zero storage writes. Storage mutations, transaction boundaries, offchain calls, signing, extrinsic exports, and all unsupported host functions trap. No missing-read or prefix fallback is available.

Limits per invocation are 128 MiB fixed linear memory, 16 MiB per allocation, 4 KiB API input, 2 MiB result, 128 point keys, 256 prefix members, 1 KiB per storage key, 2 MiB of declared key/value bytes, 100,000 host calls, and 4,096 retained nonallocator calls. Compressed input is at most 4 MiB and bounded decompression is at most 16 MiB. The exact pinned module is trusted executable code; the host has no generic WASM instruction fuel or asynchronous cancellation mechanism. Callers requiring a wall-clock deadline must isolate execution in a terminable worker. These bounds are local execution limits, not claims about historical acquisition timing.

`tests/unit/scripts/bots/goal-target-runtime-host.spec.ts` exercises the private kernel only through test VM instrumentation. Invented tiny WASM covers absence versus missing state, real nonempty prefix traversal, contradictory successor declarations, forbidden APIs, and byte/call/memory limits. When the retained local binary is installed, the suite also executes its version, metadata, two native DEX0 XOR/KUSD quote directions, and both fee APIs. The route uses invented reserves and fee multiplier; its numerical outputs make no production-price or fee prediction. The nonempty-prefix vectors encode a synthetic member from exact metadata and prove that the actual runtime reads it. The host neither dispatches nor submits the synthetic signed envelope used for fee queries.

Run the focused suite with `yarn test:unit --project unit-scripts tests/unit/scripts/bots/goal-target-runtime-host.spec.ts`. The existing historical evidence, runtime admission guard, and strategy certificates are unchanged.
