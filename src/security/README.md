# Wallet message boundary

`registerW3mMessageGuard()` runs at application bootstrap before WalletConnect's
message listeners. It checks `@w3m-app/` and `@w3m-frame/` messages during capture,
so a rejected message never reaches the downstream schema parser.

Allowed origins are this page's non-opaque origin and the explicit WalletConnect
origins in the module. An opaque `null` origin is never accepted, including when
Electron loads the app from a file. Additional origins cannot enable `null`.

Even an allowed sender must stay within these limits:

- 2,048 entries per array or object.
- 16,384 traversal nodes, with pending traversal bookkeeping also bounded.
- 32 nesting levels below the message root.
- 1 MiB of aggregate UTF-8 string content, including object keys.
- 256 UTF-8 bytes for the top-level message `type` and nested RPC `method` strings,
  which upstream union-validation errors can repeat across many branches. This
  smaller discriminator limit does not apply to transaction calldata.

The iterative check rejects sparse arrays, cycles, getters and non-JSON object types without
serializing the payload. Shared object references remain accepted within the
same traversal budget. Dense array slots each consume the traversal budget, so
schema parsers cannot expand uncounted holes into validation errors. Ordinary wallet connection, network, transaction and
signature payloads are unchanged. Oversized payloads are dropped before Zod can
allocate a validation error for every entry.

This bounds the AppKit message ingress associated with
[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
The [consumer migration](../../docs/zod-migration.md) separately moves AppKit and
CDP to patched Zod 4.6.7, updates incompatible APIs and declarations, and adds
explicit array maxima. Keep this guard after the migration: a schema library
cannot prevent the browser's initial structured-clone allocation or event floods,
and this boundary does not cover every upstream SDK parser.
