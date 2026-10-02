# Finalized goal swap projection

`src/features/agent-trading/goal-swap.ts` is a pure adapter from one available browser execution-state estimate to the existing agent quote and fee shapes. It does not fetch data, obtain wallet authority, activate a bot, sign, or submit. The protocol is explicitly named `finalized-xyk-native-fee-v1`; the legacy `goal-episodes-v2` protocol is unchanged.

`readGoalSwapExecution(value)` accepts `undefined` for the existing legacy flow, or exactly `{ protocol: 'finalized-xyk-native-fee-v1', expectedDenominator: '1' }` with the caller's positive canonical u128 denominator. Null, unknown protocols, missing/extra keys, inherited data, accessors, and malformed amounts reject with `INVALID_AGENT_STATE`. The example denominator is not a default: callers must supply the denominator they have reviewed.

`projectGoalSwapEstimate({ execution, resolved, assetIn, assetOut, estimate })` returns `{ quote, fee }`. `quote` has the standard `AgentSwapQuote` payload without `quoteDigest`. Its `execution` member contains the explicit protocol and the full detached provider estimate, including the exact finalized-state binding, pool evidence, raw quote, minimum, SCALE call, bounded fee envelope and raw fee responses. Hash the complete returned quote with the existing agent digest helper; the execution evidence must remain inside that digest.

The resolved request must explicitly use desired input, DEX 0, `XYKPool`, and `0.5` percent slippage. Only KUSD/XOR, in either direction, with the observed 18 decimals and matching symbols are accepted. The projection cross-checks natural input against the exact input codec, the 0.5-percent minimum, direct route, reviewed denomination, state bindings, native-XOR fee and raw quote/fee consistency. The service must reject missing explicit route fields before normalization, so legacy defaults cannot select this protocol accidentally.

All amount conversion uses integers. The display impact is a negative percentage whose absolute value is rounded upward to 18 decimal places; for example 1.004 percent becomes `-1.004`, and one third becomes `-33.333333333333333334`. This display is not an admission test. Exact output and no-impact output remain available for the separate rational impact guard. A well-formed estimate above a trading limit can still be projected for review.

Quoted output already includes pool fees. The projection neither subtracts those fees again nor deducts the native network fee from the quoted output. Native fees have the distinct source `finalized-runtime` and remain a separate amount. Rewards and split distribution are returned as empty arrays because this narrow provider does not validate those fields; the complete raw response remains in execution evidence. Public assets omit wallet balances and SDK-only fields.

The returned graph is bounded, detached, and deeply frozen. It is evidence, not the provider's owned context handle. Keep the original captured context and call the session's `assertCurrent(originalContext)` before and after projection and digest work. This pure adapter cannot independently authenticate provenance, finality or freshness, and a copied context cannot be passed back as a provider-owned capability. Envelope fees remain estimates and never become signature verification or authority to trade.

Synthetic tests use the real read-only provider with invented metadata and mocked raw responses. They cover both directions, exact u128/18-decimal values, conservative impact display, separate fees, explicit-selector rejection, contradictory bindings, immutable evidence and digest sensitivity. No network, wallet or historical market datasets are used.

## Opt-in public preparation

`quoteSwap`, `planSwap`, and `prepareSwap` now accept this execution selector. Omit it to retain the existing flow. The public declarations and JSON schema are published at `.well-known/polkaswap-agent.d.ts` and `.well-known/polkaswap-agent.schema.json`.

```ts
// Supply the chain denomination already reviewed by the caller; there is no default.
async function planFinalizedLot(expectedDenominator: string) {
  return window.PolkaswapAgent.planSwap({
    assetIn: { symbol: 'KUSD' },
    assetOut: { symbol: 'XOR' },
    amount: '2.5',
    side: 'input',
    dexId: 0,
    liquiditySource: 'XYKPool',
    slippageTolerance: '0.5',
    execution: { protocol: 'finalized-xyk-native-fee-v1', expectedDenominator },
  });
}
```

`amount` is one order's input, not a deposit or the goal's total budget. The selector has exactly two keys; its denominator must be a canonical integer string from `1` through `340282366920938463463374607431768211455`. All four route fields shown above are mandatory with this selector; numeric `0.5`, string DEX `'0'`, omitted fields and alternate routes reject. Both tokens must resolve to the canonical KUSD/XOR assets, in either direction.

Each request uses the connected page SDK: eight finalized-state reads and three exact quote/fee reads. It does not fall back to a cached fee, default quote or `paymentInfo`. Successful quotes include `execution: { protocol, estimate }`; plans and preparations expose the native fee as `source: 'finalized-runtime'`. Full state, pool, quote, minimum, SCALE envelope and raw fee evidence remain inside the quote digest and prepared envelope. Pool fees are already included in the quoted output; the native fee is separate.

The service rechecks the owned context through hashing and balance reads, requiring context age below five seconds and finalized-block age at most sixty seconds. Timeout, disconnect/reconnect, runtime or client changes invalidate preparation; a late response cannot persist an intent. Public plans do not read wallet balances. Preparation may read the connected account and balances, but does not unlock, sign, deposit or submit.

**This protocol is preparation-only in the public API.** Generic `executeSwap({ intentId, clientOrderId })` rejects its prepared intents with `INTENT_MISMATCH` before signing or requoting. The `prepareAndExecuteSwap` convenience flow therefore cannot execute them either. Prepared `canExecute` reflects balance/warning assessment, not availability of this protocol's executor. A guarded bot executor and its goal admission are separate work; this addition does not activate a bot or promise fee adequacy, fills or profit.
