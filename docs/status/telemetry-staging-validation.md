# Telemetry Staging Validation (translation_missing)

**Purpose:** note the steps required to validate the translation missing telemetry in staging/preview builds when local preview is blocked in sandboxed CI environments.

## Bundle
- Build: `yarn build:vue3` (completed locally; artifacts in `dist/`).

## How to validate in staging/preview
1. Deploy `dist/` to the staging target (IPFS/CDN).
2. In the browser console before app bootstrap, register a telemetry stub if analytics is not configured:
   ```js
   window.__PS_TELEMETRY__ = { track: console.log };
   ```
   Alternatively, use the query flag `?telemetryStub=1` which now registers the stub automatically during bootstrap.
3. Trigger a missing translation (e.g., call `t('nonexistent.key')` from devtools or temporarily add it in a component).
4. Observe a `translation_missing` event with payload `{ key, locale, component, buildVariant: 'vue3-native' }`. The handler throttles per key/locale for 30s.

## Notes
- Local preview on ports 8888/4173 failed in the sandbox (EPERM binding to 127.0.0.1); staging validation is needed to confirm end-to-end telemetry wiring.
- Build variant is injected as `window.__PS_BUILD_VARIANT__` during bootstrap; telemetry stub respects that value.
