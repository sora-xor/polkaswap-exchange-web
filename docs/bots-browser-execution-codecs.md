# Browser execution codecs

`src/features/bot-trading/execution-codecs/` contains additive browser ports of the independently reviewed historical codecs. These modules perform deterministic local encoding and decoding. They expose no provider, wallet, credential, private key, RPC or transaction-submission capability. Existing historical sources and their retained evidence remain unchanged.

| Browser module | Exported entry points                                                                                                                                                                                                                                       | Authoritative source SHA-256                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `execution.ts` | `createHistoricalExecutionCodec`, `createValidatedHistoricalPoolLayout`, `createValidatedHistoricalPoolDecoderFactory`, `historicalMinimumCodec`, `decodeHistoricalFeeDetailsScale`, `assertHistoricalFeeDetailsMatchesQueryInfo`, original types/constants | `ebad0bdd8e970482810e95bc4768aca4c0fb965b788417da53cfd2d2f4ccc4c3` |
| `pool.ts`      | `createHistoricalExecutionPoolCodec`, `prepareHistoricalExecutionPoolIdentity`, `roundHistoricalPoolRatioTo18`, `HistoricalPoolRatio`                                                                                                                       | `4706316a43d652687cf952c8a1a367f10e260206608552096d8aa6f515637b68` |
| `fee.ts`       | `createHistoricalGoalFeeCodec`, `HISTORICAL_GOAL_FEE_POLICY`                                                                                                                                                                                                | `601a1a7fb3d23cdfd617a0e22f9c437360b9e263838db8c782f9e653fa358061` |

Each source file records its original `scripts/bots/` path and checksum. Export names, exact metadata validation, byte encodings, fee policy, evidence labels and output shapes are preserved. The port changes only imports and byte/hash operations: existing `@polkadot/util` Uint8Array helpers, `@polkadot/util-crypto` SHA-256, and `TextEncoder`/`TextDecoder` replace Node-specific APIs. Little-endian decoding reverses a copy, and UTF-8 token decoding preserves a leading BOM so malformed symbols remain rejected. No dependencies were added.

```ts
import { createHistoricalExecutionCodec } from '@/features/bot-trading/execution-codecs/execution';
import { createHistoricalExecutionPoolCodec } from '@/features/bot-trading/execution-codecs/pool';
import { createHistoricalGoalFeeCodec } from '@/features/bot-trading/execution-codecs/fee';

const execution = createHistoricalExecutionCodec(identity);
const pool = createHistoricalExecutionPoolCodec(identity);
const fees = createHistoricalGoalFeeCodec(identity);
```

`prepareHistoricalExecutionPoolIdentity(anchorPool, selectedIdentity)` can reuse
only a genuine anchor's private, unbound pool decoder. Pass its frozen result to
`createHistoricalExecutionPoolCodec`; each result retains the selected block and
decodes every raw proof afresh. Copying the identity takes cold validation, and
copying the anchor grants no reuse capability. The matching Node helper has the
same contract. This grants no finality, quote, fee or trading authority.

`identity` requires an explicit mainnet genesis hash, state block hash, metadata bytes and `{ specVersion, transactionVersion }`. Supported metadata profiles remain SORA 130/131. A caller using these codecs for a captured finalized state must independently establish canonical finality, matching runtime/metadata, raw response provenance, and same-state storage/quote/fee binding. The codecs do not convert arbitrary supplied JSON into such proof.

The bounded fee envelope uses public placeholder bytes and is for fee estimation only. Structural inspection checks call/layout/length compatibility; it does not verify signatures, signer authority, nonce freshness, mortality checkpoint or fee adequacy. The original estimation labels remain explicit. This port alone does not enable live trading or change a production flow.

`tests/unit/features/bot-trading/execution-codecs.spec.ts` compares the browser copies against the original modules with invented runtime 130/131 metadata and amounts. Coverage includes complete call/envelope/policy hashes, u128/minimum/fee arithmetic, exact pool storage/ratios and absent states, nonce/signature/mortality boundaries, malformed inputs and execution with the Node `Buffer` global removed. Both copies must reject the same invalid evidence. Future source changes require deliberate parity review; the historical files must not be silently replaced or modified to make a comparison pass.
