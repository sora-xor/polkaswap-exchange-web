---
name: polkaswap-trade-preflight
description: Check a proposed Polkaswap swap before connecting a wallet, using live canonical assets, route quotes, slippage bounds and execution constraints. Use for trade feasibility and unsigned planning; this skill cannot connect wallets, sign or submit trades.
license: Apache-2.0
---

# Polkaswap trade preflight

Answer whether the requested swap currently has a quoted route, what its executable bounds are, and what remains unverified. A quote is evidence about current market state, not a promise that a transaction will fill.

## Runtime choice

If the environment already exposes the public `polkaswap_*` tools, use those tools. Otherwise run the bundled `scripts/preflight.mjs`, which opens the deployed Polkaswap app in a new, empty headless Chromium context and calls its public browser API. Read [references/setup.md](references/setup.md) when the standalone runtime is missing or the user asks how to install it.

Installing this skill copies instructions and scripts. It does not install Node, Playwright or a browser, register an MCP server, or create a hosted service. Do not claim live verification if runtime setup or production connectivity fails.

Runtime installation is a separate explicit step: `node "$SKILL_DIR/scripts/setup.mjs" --runtime-dir "$RUNTIME_DIR"`. It downloads pinned Playwright and its matching Chromium shell into a standalone directory; follow the setup reference before invoking it.

## Obtain a plan

1. Establish input asset, output asset, amount and whether the amount is input to spend or output to receive. Amounts use current SORA-native units and decimal strings; do not apply legacy/ERC20 redenomination to a native swap. Use the user's slippage; when omitted, disclose the runner's `0.5%` default.
2. Wait for node readiness without a wallet, check API version `v1` and network identity, and resolve assets without balances. Symbols must resolve unambiguously; preserve the returned canonical addresses and use them for the plan. A SORA asset address is a `0x`-prefixed 32-byte identifier, not an Ethereum 20-byte address.
3. Obtain a fresh unsigned plan. Do not substitute pool ratios, external price feeds, cached quotes or invented zero output when the route is unavailable.
4. Check that the plan remains unsigned, wallet-independent and non-executable. Inspect route, amounts, bound, price impact, fee sources, warnings, network and expiry. Selected markets come from distribution hops; the liquidity-source registry lists available sources. Follow [references/reporting.md](references/reporting.md) for interpretation and the final report.

Standalone command, after setup:

```sh
node "$SKILL_DIR/scripts/preflight.mjs" \
  --asset-in XOR --asset-out PSWAP --amount 1 \
  --slippage 0.5 --runtime-dir "$RUNTIME_DIR"
```

`--side input` is the default and means spending the requested amount. `--side output` means requesting that output amount and inspecting the maximum input instead. `--asset-in` and `--asset-out` accept a symbol or a full canonical asset identifier. Read `--help` for the runner's supported flags; never invent execution flags.

Example requests:

- “Can I swap 1 XOR into PSWAP at 0.5% slippage before connecting my wallet?”
- “How much XOR would be needed to receive 10 VAL? Check the maximum input.”
- “The quote failed. Was there no route, or did the node time out?”

These amounts are request examples, not maintained prices or recommended trades.

## Existing public MCP tools

Use the already configured tool transport; the skill does not provision it. This is the complete public catalogue:

| Purpose | Tool |
| --- | --- |
| Public version, defaults and limits | `polkaswap_capabilities` |
| Account-redacted node status | `polkaswap_status` |
| Bounded node readiness | `polkaswap_ready` |
| Public asset search | `polkaswap_assets` |
| Resolve canonical asset metadata | `polkaswap_resolve_asset` |
| Common public route assets | `polkaswap_common_assets` |
| Quote only | `polkaswap_quote_swap` |
| Unsigned plan with bounds and fees | `polkaswap_plan_swap` |
| Public XYK pool information | `polkaswap_pool_info` |

For `polkaswap_ready`, set `requireNode: true` and a bounded `timeoutMs`; do not require a wallet. For resolution use `asset: { symbol: "XOR" }` or `asset: { address: "..." }`. Then pass canonical address objects, the amount string, explicit `side` and `slippageTolerance` to `polkaswap_plan_swap`.

## Scope

Use only public discovery, readiness, asset resolution, quotes, unsigned plans and pool reads. Do not call wallet discovery/account methods, `connectWallet`, `prepare*`, `assessSwap`, `execute*`, account-history methods, state import/export, or liquidity/transfer operations. Do not load a personal browser profile or accept credentials, seed phrases or private keys. The unsigned preview names a state-changing SDK call; displaying that metadata does not invoke it.

If the user proceeds, link to [Polkaswap Swap](https://polkaswap.io/#/swap) and tell them to refresh the quote and review it there. The skill ends at the preflight report. Wallet actions and execution are outside this package's capability.
