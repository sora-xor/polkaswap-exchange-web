# Connected raw RPC adapter

`src/features/agent-trading/goal-rpc.ts` supplies the execution-state provider's
`request(method, params, signal)` callback using an already connected caller-owned
SDK client. It exposes no endpoint selection, wallet calls, signing or submission.

```ts
const { request } = createGoalRpc({
  client: connectedChain,
  isCurrent: () => connectedChain === currentChain && capturedIdentity === currentIdentity(),
});
```

The caller binds connection/network/runtime identity in `isCurrent` and supplies
its operation's `AbortSignal` and timeout. The adapter captures the SDK's public
`rpc.<section>.<method>.raw` promise functions. SDK lazy method getters are trusted
integration objects; request parameters are validated separately as exact bounded
own-data dense arrays. Raw results are returned unchanged: no `toJSON`, camel-case
conversion, numeric conversion or output codec conversion occurs here. The installed
SDK's `RpcCore` raw path is tested with a synthetic provider and no network.

Allowed requests are:

- Explicit u32 `chain_getBlockHash`, `chain_getFinalizedHead`, and hash-pinned
  `chain_getHeader`, `state_getRuntimeVersion`, `state_getMetadata`.
- `state_getStorageHash` only for `:code` (`0x3a636f6465`) at an explicit hash.
- `state_queryStorageAt` with exactly seven unique hex keys (up to 512 bytes each)
  and a state hash. The provider verifies these exact keys and their order against
  its metadata-derived timestamp, denomination, token, DEX and pool schema.
- `state_call` only for `TransactionPaymentApi_query_info` or
  `TransactionPaymentApi_query_fee_details`, with at most 4 KiB of query data and
  an explicit hash. The provider binds the exact SCALE fee envelope and decodes
  both results; this adapter makes no fee-adequacy claim.
- `liquidityProxy_quote` only for DEX0 KUSD↔XOR, positive canonical u128 exact input,
  `WithDesiredInput`, `['XYKPool']`, `AllowSelected`, and an explicit state hash.

The context guard runs before calling the SDK and after settlement. Abort ends
the adapter's wait promptly and discards any late result/rejection. It does **not**
cancel the shared socket's wire request or disconnect the SDK. No retry, fallback,
independent cache, direct HTTP or private-provider access is introduced. Output
size, state freshness, finality, metadata compatibility and financial admission
remain the execution-state provider's responsibilities. No public Agent API or
user interface is wired by this module alone.
