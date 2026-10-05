# Interpret and report a preflight

Lead with one of: **A current route was quoted**, **No route was returned**, or **The preflight could not verify a quote**. Avoid “will fill”, “safe trade”, “approved to execute” or an invented probability of success.

## Evidence to preserve

The standalone runner returns a sanitized report. Existing public MCP tools return the API plan directly; their additional raw fields need careful unit interpretation.

| Question | Plan evidence |
| --- | --- |
| Which assets and units? | CLI `assets.input` / `assets.output`; API `quote.assetIn` / `quote.assetOut`; addresses, symbols, decimals, `quote.amountInMeta`, `amountOutMeta` and codec strings |
| What was requested? | CLI `request`; API `quote.request`; amount, side, slippage and DEX/source selection |
| What was quoted? | `quote.amountIn`, `amountOut`, route asset identifiers and distribution hops; selected markets come from `distribution.market`, not the available-source registry |
| What is the execution bound? | Input side: `quote.minAmountOut`. Output side: `quote.maxAmountIn`. CLI `quote.boundMeta` preserves its codec and decimals |
| What costs and risks were reported? | `quote.priceImpact`, `fees[]` with their sources, every `warnings[]` entry, and liquidity-provider fees when returned |
| When and on which network? | `plannedAt`, `expiresAt`, `network.genesisHash`, `runtimeSpecVersion`, `blockNumber`; CLI `observedAt` or local verification time |
| Can this plan trade? | `mode: "unsigned"`, `canExecute: false`, `requiresWallet: false` |

The CLI intentionally omits arbitrary upstream messages and private fields. Keep its machine-readable result available; do not invent fields it did not return. Its `constraints` explicitly records unchecked balances, unchecked signer fees and absence of a fill guarantee. Do not call the full plan's raw-fee arithmetic an all-in-cost estimate when the runner did not return those fields.

## Amounts and bounds

- `side: "input"` means the amount is the exact input to spend. Report the quoted output and the returned **minimum received**.
- `side: "output"` means the amount is the requested output. Report the quoted input and the returned **maximum input**. Do not mislabel it as minimum received.
- Amounts are decimal strings; codec values are integer strings. Preserve the API's natural value, codec and decimals. Do not use JavaScript floating-point calculations or round the displayed bound upward for input-side minimums.
- The CLI reports `constraints.unitSystem: "current-sora-native"`. Requests and quotes use current SORA-native units: one current native XOR is `1000000000000000000` codec units at 18 decimals. The `10^38` denomination coefficient belongs to the old/current or ERC20 conversion for XOR/TBCD; it does not multiply a native swap request. Preserve the returned natural and codec values rather than applying that conversion again. Legacy/ERC20 amounts require an explicit conversion outside this native preflight.
- A `0x`-prefixed 32-byte SORA asset identifier is not an Ethereum 20-byte token address. Match the returned network and canonical asset identifier before interpreting a quote.

## Selected route

`quote.route` identifies the asset path. `quote.liquiditySources` is the available registry list and may include markets the quote did not select. When distribution hops are returned, use each hop's `market`, `input`, `output`, `income`, `outcome` and `fee` to report the actual selected markets and any split paths. If distribution is missing, label selected-market detail unavailable rather than treating all registered sources as the route.

## Costs and execution constraints

The public unsigned plan normally labels its generic network fee `source: "static"`. That is not an estimate for a selected signer using `paymentInfo`, and not a finalized transaction fee. A later wallet-bound flow must refresh the route, compute its exact call fee, check spendable token/XOR balances and account constraints, and review the execution bounds. This skill does none of those wallet operations.

Keep liquidity-provider/route fees separate from network fees. The API does not specify an asset denomination for a distribution hop's raw `fee`; report that ambiguity rather than inventing an asset or an all-in fee total. Do not add differently denominated or unspecified fees together. Do not describe slippage as a separate fee or count price impact twice. If a network fee is unavailable, say so and retain `FEE_UNAVAILABLE`; a zero placeholder is not a free transaction.

Keep each warning's code, severity and meaning. Quoteability does not verify spendable balance, fee balance, account eligibility or success at transaction inclusion. A connected public node and an unsigned SDK-call preview do not prove historical or end-to-end execution.

## Freshness and failures

Treat a plan as a timestamped snapshot. Its API expiry is currently five minutes, but liquidity and market prices can change earlier. Replan expired data and refresh immediately before any separate execution decision. A `quoteDigest` identifies quoted content; it does not reserve liquidity or authorize a trade. A plan preview is SDK-call metadata, not a SCALE-encoded transaction.

| Failure | Honest report/action |
| --- | --- |
| `PATH_UNAVAILABLE` | No quote route was returned for these inputs. Retain diagnostics; do not claim the market can never trade. |
| `QUOTE_TIMEOUT` | The quote was not verified within the timeout. This is not proof of zero liquidity. |
| `NODE_NOT_READY` | Public node readiness failed. No live market conclusion is supported. |
| `NETWORK_CONTEXT_UNAVAILABLE` | Chain context was missing or changed. Obtain fresh consistent public context. |
| `ASSET_AMBIGUOUS` | Require an explicit asset choice; do not guess. Existing public asset tools can show candidates; the CLI's fixed error output excludes upstream details. |
| `ASSET_NOT_FOUND` | The public resolver did not identify that asset. Preserve the request. |
| Runtime/browser/API failure | Report the fixed error code and setup or production incompatibility separately from market feasibility. The CLI deliberately does not expose raw browser/provider messages. |

One bounded retry for a transient connection or timeout is reasonable. Preserve the original failure and retry time; stop on repeated failure rather than probing indefinitely. Do not increase slippage, switch networks, choose another asset or split the trade without an explicit user instruction.

## Concise result shape

“At [UTC time], Polkaswap returned a route for [input] → [output] in current SORA-native units on [network/block]. Quoted [amount]; [minimum received / maximum input] at [slippage]. Selected markets: [distribution markets, or unavailable]. Price impact: [returned value]. Network fee: [amount and source, or unavailable]. Warnings: [codes or none returned]. This unsigned plan expires at [time]; balances and signer-specific fees remain unchecked. [Open Polkaswap](https://polkaswap.io/#/swap) to refresh and review.”

Replace this with the actual failure when no valid plan is returned. No successful sample output is embedded here because a maintained example could otherwise be mistaken for a live quote.
