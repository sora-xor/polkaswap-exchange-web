# Polkaswap Agent Runner Example

This is a minimal Playwright runner for the static browser-native Polkaswap Agent API.

It opens the app, discovers `.well-known/polkaswap-agent.json`, waits for `window.PolkaswapAgent`, verifies v1, resolves assets, quotes a swap, prepares the swap, and prints the signer preview. It does not submit a transaction unless `POLKASWAP_AGENT_EXECUTE_SWAP=1` is set.

## Run

```sh
yarn agent:runner
```

Useful overrides:

```sh
POLKASWAP_AGENT_URL="http://127.0.0.1:8896/?polkaswap-agent=1#/swap" \
POLKASWAP_AGENT_ASSET_IN=XOR \
POLKASWAP_AGENT_ASSET_OUT=PSWAP \
POLKASWAP_AGENT_AMOUNT=1 \
yarn agent:runner
```

For wallet-backed signing, run headed and provide the wallet source. The wallet must already be available to the browser profile used by Playwright.

```sh
POLKASWAP_AGENT_HEADLESS=0 \
POLKASWAP_AGENT_WALLET_SOURCE=polkadot-js \
POLKASWAP_AGENT_WALLET_ADDRESS=cn... \
POLKASWAP_AGENT_EXECUTE_SWAP=1 \
yarn agent:runner
```

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `POLKASWAP_AGENT_URL` | `https://polkaswap.io/?polkaswap-agent=1#/swap` | App URL to open. The runner adds `polkaswap-agent=1` if it is missing. |
| `POLKASWAP_AGENT_ASSET_IN` | `XOR` | Input asset symbol for discovery. |
| `POLKASWAP_AGENT_ASSET_OUT` | `PSWAP` | Output asset symbol for discovery. |
| `POLKASWAP_AGENT_AMOUNT` | `1` | Decimal string amount. |
| `POLKASWAP_AGENT_SIDE` | `input` | `input` or `output`. |
| `POLKASWAP_AGENT_WALLET_SOURCE` | empty | Optional injected wallet source. |
| `POLKASWAP_AGENT_WALLET_ADDRESS` | empty | Optional wallet address. |
| `POLKASWAP_AGENT_EXECUTE_SWAP` | `0` | Set to `1` to submit the prepared swap. |
| `POLKASWAP_AGENT_HEADLESS` | `1` | Set to `0` for a headed browser. |
| `POLKASWAP_AGENT_READY_TIMEOUT_MS` | `30000` | Node and wallet readiness timeout. |
| `POLKASWAP_AGENT_QUOTE_TIMEOUT_MS` | `15000` | Swap quote timeout. |

The runner intentionally keeps signing policy outside the page. The page never receives private keys; signing must come through the selected wallet/signer.
