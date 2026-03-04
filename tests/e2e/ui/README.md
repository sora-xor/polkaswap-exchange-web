# UI E2E Notes

- Default command: `yarn test:e2e tests/e2e/ui`
  - Uses local IPFS preview and network/WebSocket stubs from `tests/e2e/ui/support/ipfs.ts`.
  - Designed for stable, deterministic CI checks.
  - Combined matrix runner: `yarn test:e2e:all` (`default` + `root-prefix` + `live`).
  - Playwright uses `yarn build --logLevel error` to keep build output compact during test runs.
  - Request-level preview logs are disabled by default; set `PS_IPFS_TEST_LOG_REQUESTS=1` to enable verbose server request logging while debugging.

- Live runtime smoke: `yarn test:e2e:live`
  - Runs `tests/e2e/ui/live-runtime.spec.ts` with `PS_E2E_LIVE_NETWORK=1`.
  - Does **not** install network stubs; validates core shell interactions against real runtime behavior.
  - Uses strict browser console/page-error assertions; only external TLS resource failures (`net::ERR_CERT_COMMON_NAME_INVALID`) are ignored to avoid non-app infrastructure noise.
  - This spec is skipped unless `PS_E2E_LIVE_NETWORK` is enabled.

- Root-prefix smoke: `yarn test:e2e:root`
  - Runs key app/navigation suites with `PS_IPFS_TEST_PREFIX=''`.
  - Validates behavior when app is served at root (`/`) instead of `/ipfs/<cid>/`.

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
  - Route churn between swap and bridge tears down route-specific overlays (swap settings + bridge network) and preserves immediate post-navigation control clickability (`stability.spec.ts`).
  - Route churn between swap and wallet tears down route-specific overlays (swap token-select + wallet header settings) and preserves immediate post-navigation control clickability (`stability.spec.ts`).
  - Route churn between deposit/rewards and swap tears down route-scoped connect dialogs and preserves immediate post-navigation swap control clickability (`stability.spec.ts`).
  - Route churn between pool/staking and swap tears down route-scoped connect dialogs and preserves immediate post-navigation swap control clickability (`stability.spec.ts`).
  - Route changes force-close route-scoped web3 dialogs (SORA account/provider/network/sub-node/sub-account) to prevent stale modal hitboxes after navigation (`App.vue` + `resolveDialogVisibilityOnRouteChange.ts`).
  - Swap `Connect account` dialog stays within viewport bounds on extra-narrow mobile screens.
  - Swap `Select token` dialog stays within viewport bounds on extra-narrow mobile screens, can be reopened after close, and no longer leaves a transient post-close hitbox that blocks immediate button clicks.
  - Swap market settings dialog stays within viewport bounds on extra-narrow mobile screens and no longer blocks immediate re-clicks on the settings trigger after close.
  - Info popover stays within viewport bounds on narrow screens.
  - Transaction details popover stays within viewport bounds on narrow screens.
  - SORA Wallet mobile popup remains within viewport bounds on narrow screens.
  - Layout overflow guard checks that `documentElement.scrollWidth` and `body.scrollWidth` stay within viewport width across desktop/mobile interaction states.
  - Narrow-screen (320px) sidebar open state remains within viewport bounds.
