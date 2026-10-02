# Complete retained-training filesystem inventory

`scripts/bots/goal-acquisition-replay-files.ts` supplies the trusted filesystem
boundary for `prepareGoalAcquisitionReplay`. It reads the original failed **first
training** acquisition only. It does not run an evaluator, append a continuation,
open validation, make a network request or authorize trading.

Call `prepareGoalAcquisitionReplayFiles` with absolute canonical `studyRoot`,
`parentPlanSha256`, `requestSha256` and a new `manifestPath`. The output directory
must already exist outside the authoritative study root. All directory components
must be real directories, including the supplied root. An optional `AbortSignal`
joins a 60-second operation deadline.

The adapter enumerates the complete original
`studies/<parentPlanSha256>/raw-<requestSha256>` directory, plus its sibling
registration, access and failed records. It never accepts a caller-selected subset.
The original physical filename is `<receipt.name>.json`; consequently a logical
`raw/failure.json` refers to `failure.json.json`. Unknown parent records, invalid
raw filenames, symlinks, subdirectories, special files, oversized files and
non-UTF-8 bytes are rejected. Limits match the replay verifier: 16,000 raw files,
32 MiB per input file and 512 MiB in aggregate, checked before reading bodies.

Open directory handles pin device/inode identities. Every input file is opened
with `O_NOFOLLOW`, matched to its inventoried device/inode/mode/size/nanosecond
timestamps/link count, read in bounded chunks, and checked again through its
descriptor and pathname. The directory inventories and all original file
identities are checked again before publication and after owned verification.
The verification reader permits only inventoried logical names and checks the
exact raw-byte SHA-256, including any original trailing newline. Changed bytes,
replaced inodes, and added or removed files cannot produce a returned preparation.

The manifest is written through a synced temporary file and atomic no-clobber
hard link, then the containing directory is synced. An existing destination is
never replaced, even if its contents match. The adapter passes that manifest and
the allowlisted reader to the actual replay verifier, and checks that the resulting
owned preparation belongs to the requested parent and request. Original files and
validation claims are never written. If verification fails after publication,
the manifest remains as an audit artifact; no preparation is returned.

The result contains only the privately owned preparation and manifest metadata:
path, SHA-256, byte size, file counts and aggregate source bytes. It contains no
raw response bodies, prices or transaction authority. The continuation runner
must retain that preparation object; serializing its fields does not reproduce
ownership. Reopening uses a fresh verification and a fresh manifest output path.

Tests materialize the shared synthetic acquisition fixture in temporary real
directories. They cover full inventory and untouched originals, no-clobber output,
ancestor/leaf/output symlinks, unexpected entries, sparse oversized files,
mutation between inventory and verification, replacement during an open-descriptor
read, wrong parent bindings, path traversal, getters and cancellation.
