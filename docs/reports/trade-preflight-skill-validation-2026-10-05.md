# Polkaswap trade-preflight skill validation — 5 October 2026

The local package is ready for review. It has not been pushed, published, listed on skills.sh, deployed or registered as a hosted MCP service.

## Scope and files

- `skills/polkaswap-trade-preflight/SKILL.md`: discovery, public tool workflow and read-only boundary.
- `agents/openai.yaml`: generated Codex interface metadata.
- `references/setup.md`: pinned local install and explicit runtime provisioning.
- `references/reporting.md`: exact-input/output bounds, native units, fees, selected route and limitations.
- `scripts/setup.mjs`: Node 26 setup of pinned Playwright 1.63.0 and matching Chromium shell in a separate owned runtime.
- `scripts/preflight.mjs` and `scripts/preflight-core.mjs`: ephemeral local browser, pinned production location, canonical asset resolution, unsigned live plan and public result projection.
- `tests/unit/scripts/skills/polkaswap-trade-preflight.spec.ts`: 128 targeted Vitest cases.

There are no app dependency, UI, translation, server, endpoint, wallet or analytics changes. The original checkout remains clean. The package uses a local browser CLI; existing read-only MCP tools are an optional alternative. Installing the skill does not provision runtime or an MCP service.

## Clean installation and setup

Official Vercel `skills@1.7.0` copied the package into an empty temporary project's `.agents/skills/polkaswap-trade-preflight`, using `DISABLE_TELEMETRY=1`, project scope and `--copy`. No global install, account credentials or persistent account permissions were used.

The installed `setup.mjs` then provisioned an entirely new runtime at `/tmp/polkaswap-preflight-setup-clean`: Node 26.10.0, Playwright 1.63.0, Chromium headless shell revision 1243 (153.0.8010.12), and its small FFmpeg dependency. The browser download was 94.3 MiB. The package uses public npm/CDN downloads with lifecycle scripts, audit and funding requests disabled for npm. It does not clone the full application or install its dependencies.

Two demonstrated failures were corrected: the CLI entrypoint now resolves macOS `/tmp` aliases, and the standalone runtime uses the current official Node-26-supported Playwright release. Playwright 1.58.2 had stalled during browser extraction here; its precise cause was not established. The shipped setup does not require a manual archive-extraction workaround.

## Live read-only results

At **2026-10-05T03:37:32.085Z**, the installed package and clean runtime returned:

| Field | Result |
| --- | --- |
| Requested input | 1 current SORA-native XOR |
| Quoted output | 23680.855788920757882639 PSWAP |
| Minimum output at 0.5% slippage | 23562.451509976154093226 PSWAP |
| Selected route | XOR → PSWAP, XYKPool, DEX 0 |
| SORA block / runtime | 27907740 / 132 |
| Network fee | Unavailable; critical `FEE_UNAVAILABLE` |
| Execution authority | `mode: unsigned`, `canExecute: false`, `requiresWallet: false` |

The quote included exact native codec metadata: 1 XOR maps to `1000000000000000000` at precision 18. The accumulated old-to-current denomination coefficient is not an additional native-swap codec multiplier.

An independent skill-following test at **2026-10-05T03:38:05.547Z** requested exactly 100 PSWAP. It returned quoted input **0.004164018371983191 XOR** and maximum input **0.004184838463843106 XOR** at 0.5% slippage, selected XYKPool and the same critical fee limitation. A sandboxed launch first failed with a fixed `PREFLIGHT_FAILED`; the approved local browser retry succeeded. This is an execution-environment restriction, not a wallet authorization step.

An unknown asset produced `ASSET_NOT_FOUND`, a nonzero exit and `canExecute: false`. No invented quote replaced the failure.

These observations are dated market data, not maintained example prices, trade recommendations, completed transactions or fill guarantees. Account balances, signer-specific fees and account eligibility remain unchecked. The public API does not identify the asset denomination of distribution-hop fees; the package does not invent one or compute an all-in cost.

## Verification

- 128 Vitest cases passed using the existing repository Vitest 4.1.0, with mocked browser/provider operations and no network in unit tests.
- Official skill-creator `quick_validate.py` passed, using PyYAML 6.0.3 only in a temporary validation virtual environment.
- YAML metadata, local documentation links and Markdown fences were checked.
- Independent forward test used the installed skill and returned a faithful exact-output report.
- No app build or server restart was performed. No wallet connection, executable preparation, signing, transaction, burn, model-provider key, paid inference or analytics was used.

## Proposed public summary

Check a proposed Polkaswap trade before connecting a wallet. Resolve canonical SORA assets, inspect a live route, minimum received or maximum input, price impact, fee availability and expiry. The skill includes a separately provisioned local read-only browser runner and never grants trading authority.

Publication remains a separate review decision. Only the macOS arm64 clean runtime was tested end to end; other supported Playwright hosts may require their normal operating-system browser libraries. Fresh market quotes require the deployed Agent API and public SORA endpoints to be reachable.
