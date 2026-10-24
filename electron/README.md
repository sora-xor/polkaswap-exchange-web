# Desktop shell security

The optional Electron shell renders the same static application. Run
`yarn electron:serve` for development and `yarn electron:build` to build it.

The renderer is sandboxed, uses context isolation, and has no Node integration
or preload IPC bridge. The web app currently requires no native capabilities.
If a native feature is introduced, expose only its specific validated operation
and check the sender; do not restore a generic IPC interface.

The app window may navigate only within its exact entry document, including
hash routes. External links are opened in the system browser only after parsing
the URL and allowing HTTP/HTTPS without credentials. File URLs, executable
schemes, custom protocol handlers, and navigation to another document are
refused. Remote pages must not replace the application renderer.

The built entrypoint is `out/renderer/index.html`. Its CSP is applied before
scripts load and mirrors the existing web entry policy, including the specific
payment, wallet, and Google iframe/script origins and the WebAssembly allowance.
Inline JavaScript, JavaScript `eval`, object plugins, and foreign base URLs are
blocked. Inline styles remain permitted for the existing UI.

These boundaries have offline unit tests under `tests/unit/scripts/electron/`.
They follow the [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security).
They do not establish that the entire financial application or its upstream
services have passed a full security audit.
