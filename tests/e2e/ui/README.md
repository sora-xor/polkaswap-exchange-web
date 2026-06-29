# UI E2E Notes

- Default command: `yarn test:e2e tests/e2e/ui`
  - Uses local IPFS preview and network/WebSocket stubs from `tests/e2e/ui/support/ipfs.ts`.
  - Designed for stable, deterministic CI checks.
  - Combined matrix runner: `yarn test:e2e:all` (`default` + `root-prefix` + `live`).
  - Route-rendering focused runner: `yarn test:e2e:render`.
  - Live route-rendering focused runner: `yarn test:e2e:render:live`.
  - Playwright uses `yarn build --logLevel error` to keep build output compact during test runs.
  - The preview-server startup timeout defaults to 180 seconds because startup includes the production build; override with `PS_PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS=<ms>` when debugging slower machines.
  - The preview server snapshots `dist/` into a temp directory before serving so concurrent builds cannot remove files mid-suite; set `PS_IPFS_TEST_SNAPSHOT_DIST=0` only when intentionally serving the mutable local `dist/`.
  - Request-level preview logs are disabled by default; set `PS_IPFS_TEST_LOG_REQUESTS=1` to enable verbose server request logging while debugging.

- Additional smoke runners (CLI-first Playwright scripts):
  - Swap interaction regression smoke: `yarn test:e2e:swap:smoke`
    - Validates repeated token selection changes, modal outside-click close, and customize-widget switch/label toggles on `#/swap`.
    - Auto-starts the local IPFS preview server when the default local base URL is not already running.
    - Defaults to the local IPFS preview prefix (`/ipfs/polkaswap-e2e/`); override with `SWAP_SMOKE_PREFIX=''` for root-prefix checks.
  - Safari/WebKit UI smoke: `yarn test:e2e:safari:smoke`
    - Runs cross-route shell checks under Playwright WebKit (`#/swap`, `#/trade/DAI/KUSD`, `#/wallet`, `#/burn`, `#/stats`) with screenshots in `output/playwright/safari-smoke/`.
    - Auto-starts the local IPFS preview server when the default local base URL is not already running.
    - Defaults to the local IPFS preview prefix (`/ipfs/polkaswap-e2e/`); override with `SAFARI_SMOKE_PREFIX=''` for root-prefix checks.
  - Wallet matrix (multi-route + signing readiness): `yarn test:e2e:wallet:matrix`
    - Verifies `polkadot-js`, `fearless-wallet`, `subwallet-js`, and `talisman` across `#/swap`, `#/bridge`, `#/burn`, `#/trade/DAI/KUSD`, `#/wallet`, `#/stats`.
    - Includes provider-account checks plus signature-readiness (`signRaw`) checks after connection.
    - Restores missing unpacked wallet extension fixtures from Chrome Web Store CRX packages before launching Chrome; run `yarn test:e2e:wallet:extensions` to prefetch them explicitly.
    - Set `WALLET_MATRIX_SKIP_EXTENSION_ENSURE=1` only when debugging with manually managed `.playwright-cli/extensions/unpacked/*` fixtures.
    - Auto-starts the local IPFS preview server when the default local base URL is not already running.
    - Defaults to the local IPFS preview prefix (`/ipfs/polkaswap-e2e/`); override with `WALLET_MATRIX_PREFIX=''` for root-prefix checks.
    - Uses isolated runtime copies of the extension profiles by default; set `WALLET_MATRIX_RUNTIME_COPIES=0` to reuse the source profiles directly.
    - Uses Playwright's bundled Chromium channel for persistent extension automation; override with `WALLET_MATRIX_CHANNEL=chrome` only when the installed Chrome can load local unpacked wallet fixtures.
    - Installs a deterministic in-page provider for each wallet key by default so empty local extension profiles do not block route/account/signing coverage; set `WALLET_MATRIX_DETERMINISTIC_PROVIDER=0` only when debugging real extension profile authorization.
  - Fresh-profile wallet matrix: `yarn test:e2e:wallet:matrix:fresh`
    - Runs the same wallet matrix using fresh copied extension profiles for deterministic reruns.

- Live runtime smoke: `yarn test:e2e:live`
  - Runs `tests/e2e/ui/live-runtime.spec.ts` with `PS_E2E_LIVE_NETWORK=1`.
  - Does **not** install network stubs; validates core shell interactions, swap wallet connect-overlay teardown, authenticated wallet account-settings/account-action overlays with hash-churn teardown, footer node dialog parity (`Escape`/outside/hash/breakpoint/reopen), static footer indexer block rendering with post-click swap clickability, bridge provider/network/SORA-account/sub-account/sub-node hash-churn teardown plus bridge asset/sub-account decoupling with reopen checks and swap clickability against real runtime behavior, and live route-matrix rendering checks (public routes, protected-route redirects, and protected-route render paths with seeded auth state).
  - Uses strict browser console/page-error assertions; only known external infrastructure errors are ignored (`net::ERR_CERT_COMMON_NAME_INVALID`, transient websocket handshake failures such as `ERR_CONNECTION_RESET` + follow-up error events, CoinGecko CORS + related exchange-rate fetch failures) to avoid non-app noise.
  - This spec is skipped unless `PS_E2E_LIVE_NETWORK` is enabled.

- Live signed minimum transfer: `PS_AGENT_SIGNER_E2E=1 PS_AGENT_SIGNER_USE_LOCAL_KEY=1 PS_AGENT_SIGNER_MNEMONIC_FILE=../sora-key.txt PS_AGENT_SIGNER_EXPECTED_ADDRESS=<cn...> PS_AGENT_SIGNER_MAX_FEE_XOR=0.15 yarn test:e2e tests/e2e/ui/agent-trading-signer.spec.ts --grep "local signer live transfer" --workers=1`
  - Installs a Playwright-only Polkadot extension-compatible signer named `polkaswap-e2e-signer`.
  - The mnemonic is read in Node memory only; the browser receives signing callbacks, not the mnemonic.
  - Submits `0.000000000000000001` XOR through the wallet send UI back to the same derived SORA address; override with `PS_AGENT_SIGNER_TRANSFER_RECIPIENT=<cn...>` when needed.
  - Aborts before signing when the derived address does not match `PS_AGENT_SIGNER_EXPECTED_ADDRESS`, the transfer cannot execute, the fee estimate is unavailable, or the estimated fee exceeds `PS_AGENT_SIGNER_MAX_FEE_XOR`.

- Live Polkamarkt guarded buy: `PS_POLKAMARKT_LIVE=1 PS_POLKAMARKT_MARKET_ID=<id> PS_POLKAMARKT_OUTCOME=YES PS_POLKAMARKT_AMOUNT=<amount> PS_POLKAMARKT_MAX_FEE_XOR=<fee-cap> PS_POLKAMARKT_MAX_COLLATERAL_XOR=<amount-cap> PS_AGENT_SIGNER_MNEMONIC_FILE=../sora-key.txt PS_AGENT_SIGNER_EXPECTED_ADDRESS=<cn...> yarn test:e2e tests/e2e/ui/polkamarkt-live.spec.ts --workers=1`
  - Skipped by default and intended only for explicit mainnet validation.
  - Enforces the collateral cap before rendering, parses the ticket network fee and enforces the fee cap before submit, then confirms a finalized `PolkamarktBuy` history item for the requested market/outcome.

- Root-prefix smoke: `yarn test:e2e:root`
  - Runs app/navigation/stability plus bridge-moonpay, wallet/bridge/footer overlay regression suites, and route-rendering matrix checks with `PS_IPFS_TEST_PREFIX=''`.
  - Validates behavior when app is served at root (`/`) instead of `/ipfs/<cid>/`.

- Route rendering matrix: `tests/e2e/ui/route-rendering.spec.ts`
  - Uses centralized route fixtures from `tests/e2e/ui/support/route-matrix.ts`.
  - Covers all user-facing routes plus protected-route redirect and authenticated render paths.
  - Enforces shell-class correctness, corruption-text absence, and horizontal-overflow bounds.
  - Adds deterministic screenshot snapshots for route states on desktop + mobile breakpoints (with masked volatile widgets), enabling render-regression diffs during CI runs.
  - Update snapshots intentionally with: `yarn test:e2e tests/e2e/ui/route-rendering.spec.ts --update-snapshots`.

- Interaction and layout regressions covered in `tests/e2e/ui/navigation.spec.ts`, `tests/e2e/ui/bridge-moonpay.spec.ts`, and `tests/e2e/ui/stability.spec.ts`:
  - Mobile sidebar closes correctly on outside click, `Escape`, route hash changes, and breakpoint switches, and no longer blocks immediate clicks on swap controls after close.
  - Header settings and info popovers close on hash navigation and viewport breakpoint switches.
  - Header notification settings dialog opens from settings, closes cleanly, and keeps the settings trigger immediately clickable after close.
  - Footer status popovers close on `Escape`, hash navigation, and viewport breakpoint switches, and their trigger remains immediately clickable after close.
  - Stats filter dropdown closes on outside click and viewport breakpoint switches, and stays within viewport bounds on narrow screens.
  - Language and currency dialogs open from header settings without overlay stacking, remain within viewport bounds on extra-narrow mobile screens, keep settings controls clickable after close, and no longer block immediate clicks on the settings trigger after close.
  - Disclaimer overlay remains within viewport bounds and no longer blocks immediate re-clicks on header settings after closing (desktop and narrow mobile).
  - Bridge network selector, bridge asset selector, and bridge account-connect dialog no longer block immediate re-clicks on their originating triggers after close (`bridge-moonpay.spec.ts`).
  - Bridge network selector, bridge asset selector, and bridge account-connect dialogs stay within viewport bounds on extra-narrow mobile screens (`bridge-moonpay.spec.ts`).
  - Bridge network-selector overlays are torn down on hash navigation and do not leak hitboxes that block immediate swap interactions after route change (`bridge-moonpay.spec.ts`).
  - Bridge provider, network, SORA-account, sub-account, and sub-node dialogs are torn down on hash navigation, do not block immediate swap control interactions after route churn, and can be reopened after bridge-swap-bridge hash cycles (`bridge-route-overlays.spec.ts`).
  - Bridge asset selector visibility is decoupled from bridge sub-account dialog visibility, preventing accidental cross-dialog reopen/leak regressions when asset-selection flows are exercised (`bridge-route-overlays.spec.ts`).
  - Route churn between swap and bridge tears down route-specific overlays (swap settings + bridge network) and preserves immediate post-navigation control clickability (`stability.spec.ts`).
  - Route churn between swap and wallet tears down route-specific overlays (swap token-select + wallet header settings) and preserves immediate post-navigation control clickability (`stability.spec.ts`).
  - Route churn between deposit/rewards and swap tears down route-scoped connect dialogs and preserves immediate post-navigation swap control clickability (`stability.spec.ts`).
  - Route churn between pool/staking and swap tears down route-scoped connect dialogs and preserves immediate post-navigation swap control clickability (`stability.spec.ts`).
  - Route changes force-close route-scoped web3 dialogs (SORA account/provider/network/sub-node/sub-account) to prevent stale modal hitboxes after navigation (`App.vue` + `resolveDialogVisibilityOnRouteChange.ts`).
  - Authenticated wallet overlays cover account settings, account rename/export/delete dialogs, MST onboarding, nested address-book dialogs, and MST overlay teardown across hash churn with immediate post-navigation swap clickability (`wallet-overlays.spec.ts`).
  - Footer node and statistics dialogs close on `Escape`, outside click, hash navigation, and viewport breakpoint changes, can be reopened immediately after each close mode, and preserve immediate swap settings clickability after each close path (`footer-dialogs.spec.ts`).
  - Swap `Connect account` dialog stays within viewport bounds on extra-narrow mobile screens.
  - Swap `Select token` dialog stays within viewport bounds on extra-narrow mobile screens, can be reopened after close, and no longer leaves a transient post-close hitbox that blocks immediate button clicks.
  - Swap market settings dialog stays within viewport bounds on extra-narrow mobile screens and no longer blocks immediate re-clicks on the settings trigger after close.
  - Info popover stays within viewport bounds on narrow screens.
  - Transaction details popover stays within viewport bounds on narrow screens.
  - SORA Wallet mobile popup remains within viewport bounds on narrow screens.
  - Layout overflow guard checks that `documentElement.scrollWidth` and `body.scrollWidth` stay within viewport width across desktop/mobile interaction states.
  - Narrow-screen (320px) sidebar open state remains within viewport bounds.
