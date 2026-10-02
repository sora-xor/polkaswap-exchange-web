# Prospective capture file retention

`createAccumulationCaptureStore` in `scripts/bots/accumulation-capture-store.ts`
creates a fresh attempt directory. It never opens an old attempt, deletes a lock,
trims a partial file, retries a write, or repairs uncertainty automatically. The
caller supplies an existing canonical absolute `baseDirectory`, a lowercase
alphanumeric/hyphen `attemptName`, exact `registrationBytes`, an independently
expected registration SHA-256, explicit `maximumBytes` (at most 64 MiB), and
optional `maximumRecords` (2–128, default 128). Registration bytes are copied
before the first await and checked against the expected digest.

The base, its parents and the attempt path cannot be symlinks. The attempt is
created exclusively with mode 0700. Files are created exclusively with mode 0600
and no-follow flags. Registration is saved as `registration.json`; it is opaque
registered bytes, not a validated sampling protocol. The factory syncs its file,
attempt directory and parent directory before returning the capability.

`retain(name, exactUtf8Text)` returns `{sha256, bytes}` only after writing and
syncing the file, then syncing the attempt directory. It can be passed to the
raw recorder with a prefix, for example
`(name, bytes) => store.retain('quote-' + name, bytes)`. Names must have a bounded
lowercase/hyphen basename and `.json` suffix. `source-`, `bootstrap-` and `quote-`
prefixes are accepted; path components, reserved names and name reuse are not.
Content is retained exactly without JSON rewriting or semantic validation.

Each file is capped at 8 MiB, including metadata-sized raw outcomes. The aggregate
budget and record count include registration and terminal seal. The store reserves
one slot and 64 KiB for a terminal seal; ordinary retains cannot consume these.
Writes are serialized with reservations made before queuing so concurrent recorder
lanes cannot exceed shared limits. No acquisition or market schedule is imposed.

`seal({status:'complete'|'failed', reason:string|null})` stops new retains, waits
for earlier writes, rechecks the exact full directory inventory, and re-reads and
hashes each retained file. It rejects added, missing, modified or symlinked files.
The durable `seal.json` binds registration, all preceding file names/digests/byte
lengths, totals and the caller's terminal capture status. A failed capture requires
a bounded reason code and retains partial evidence. `complete` means only that the
capture owner reported completion; it grants no source, timing, strategy, admission,
qualification, wallet or trading authority. The returned seal digest binds the seal
itself; a file cannot contain its own hash.

Any uncertain filesystem write, sync or inventory check permanently poisons this
owner. Pending followers reject and remnants remain. `inspection()` reports this
state. An I/O-poisoned attempt cannot reliably create a failure seal; callers must
retain that uncertainty independently. A seal file left after a failed sync is not
an acknowledged terminal seal. Reuse always fails because the directory exists.
A new attempt requires a separate externally authorized registration; there is no
automatic recovery or hidden retry. Storage assumes one cooperative writer and a
trusted local filesystem, not protection from a malicious concurrent host process.
