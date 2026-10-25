# Offline runtime test helpers

These helpers make the existing archive, fee, transport, runtime-host and
signature regression suites reproducible from a clean checkout. Previously,
the suites imported the same source from ignored `output/go-history/`
directories. `provenance.json` records the original source sizes and SHA-256
hashes; the relocation changes repository-relative imports, source-hash paths
and runtime binary locations only.

The directory contains source helpers and the network-denial sandbox profile.
It does not contain operator archives, RPC credentials, wallet credentials,
generated verification bundles or live transaction records. Signature fixtures
use the explicitly public artificial seed consisting of 32 `0x42` bytes. They
must never hold funds or be used as a wallet.

The runtime loaders read only the checked-in, hash-pinned binaries in
`../runtime-artifacts/`. Missing or modified artifacts fail validation; they
are never downloaded or replaced with a local checkout. Historical source
hash receipts are generated from these tracked helper files during each test.

Importing the helper modules does not start collection or perform network I/O.
Transport and fee-probe tests supply fake transports. Historical CLI entrypoints
are guarded by the entry-module check and are not run by these tests. Do not
invoke them to collect new data as part of unit testing.

The three suites that assert operating-system socket denial run their relevant
cases through `/usr/bin/sandbox-exec` on macOS. Those specific assertions are
guarded by the supported platform and sandbox executable, not by fixture
availability. Portable host-boundary and decoder tests run on every platform.
The macOS subprocess must observe `EPERM` from an actual loopback `connect`
before loading a runtime; a mocked denial or a refused connection is not enough.
No Linux network-denial evidence is claimed.
