# New Accounts creation counter, 11 November 2026

The public Stats page loaded successfully but its rolling-day New Accounts card
was unavailable. A read of every one of the 522 blocks in the affected hour
isolated block 28,315,078. Its finalized `assets.transfer` call has two
participants; one was absent from the recovered earlier-participation inventory.
The existing projection therefore correctly withheld a first-participation
count. Substituting zero would have been incorrect.

Matching Pi and MOF2 archive captures, native state-proof and extrinsics-root
verification, and the executing runtime's metadata establish a
`System.NewAccount` event in that block. The intended correction counts
finalized on-chain account creations, including recreation after removal,
separately from the legacy first-participation field. It does not establish
personal Points, ownership history, or reward entitlements.

The corrected permanent API handoff completed at 02:26:08 UTC. The frontend
origin is saved and purged, and the public six-period Stats check passes. The
default 1D view shows one New Account with no failed requests or console errors. The original browser
check and all six observed period readings are retained under
`output/playwright/new-accounts-20261111/`; the page had no failed requests or
console errors, and its rolling day showed 40 transactions, seven active
accounts, and an unavailable New Accounts count.

The standalone offending-block evidence is retained privately at
`/private/tmp/pi-new-accounts-20261111/`. Its matching uncompressed archive
capture has SHA-256
`bf7d3952306fa64969e546ba75e1d86b4d10b87f8917f05d6ed9f88de503728b`.
The complete interval and live continuation must pass their separate coverage
checks before publication; a single creation event cannot certify a period total.

The initial complete event prefix covers blocks 28,306,000–28,321,084: 15,085
blocks and exactly one creation. Thirty pages of native state proofs authenticate
Events, Timestamp and execution code against every contiguous header, ending at
a separately checked MOF2 live finalized anchor. The MOF2 historical archive's
14 GiB disk floor was preserved; its low free space caused that historical read
to be rejected, and no retained database or evidence was deleted. The independent
live finality anchor authenticates the complete Pi proof chain instead.

A second, offline read reopened all native proofs and decoded all events again
in 170.383 seconds, with no network access. Its manifest SHA-256 is
`9ecb392878904bf4b5a17700a4cec48e8f356d43b969adc645854b803a8d0325`;
the source receipt is
`3895b4d4f0e952ae925b992048aeb8ab37382c3f1028964d458c92dd25467cdf`.
The full 150-file, 37,891,993-byte escrow is retained on the approved Pi host at
`account-creation-source-20261111/fc744f35cbc4d0d8bd58/source.tar.gz`, relative to
`/srv/services/pi-stats-recovery-20261107`, with SHA-256
`fc744f35cbc4d0d8bd58aec08e82da47ece5e71503a1582c2a14cdc9409dc8d8`.
The adjacent root-owned retention receipt has SHA-256
`bb9cf59af06b1d3090803c45168c9bdbce02e3da88e99e0318a992c778d1abe2`.
This initial prefix did not certify the later stopped writer boundary; the
final separately qualified tail and handoff are recorded below.

The controller compatibility change is isolated at commits `ab8f8b0` and `b2f0d2a` in
`/private/tmp/pi-account-creation-controller-20261111`. All 53 controller,
installation and package tests pass, including preservation of all earlier data
inputs, exact seven-file runtime overlay, private launcher compatibility,
independent readback requirements and rejection of false creation API results.
That generic profile was inactive until the exact final source and handoff inputs
were pinned in the later controller commit recorded below.

The retained proof archive binding adds a further test: the final generic
controller suite passes 53 tests. The backend runtime is source commit
`5592d544487b00cfa3c5cafc847d48a12c297344`, inventory
`05e1575dc574256262faec947aaf795810b229e6b05560147f457ce58852ab3a`.
It preserves every predecessor runtime file and changes exactly seven JavaScript
modules. The 106 focused tests include the real GraphQL aliases and atomic worker
commit. The broader backend run recorded 4,053 passes, 99 skips and two existing
five-second timing failures; the unchanged affected suites subsequently passed
193 tests with a thirty-second timeout. These results are not a clean full-suite
pass under the original timeout.

The first retained private copy was too far behind for a prompt handoff. Only its
private worker was stopped. The existing pinned-generation clone tool copied a
fresh physical snapshot in 3.118 seconds; the production writer remained PID
1530702. Seven immutable runs and an 816-byte WAL were copied. The previous clone
and its complete inventory were retained. A native read-only helper authenticated
the fresh copy at block 28,321,385, hash
`0xe248bf601a11ea8c43e3e48ea0063021dc9558b9651a185c0238228ccccafc7a`,
timestamp 1794358770, database inode 89671073. It checked every file's identity
and metadata, hashed the manifest and WAL, verified no other handles or mappings,
and left the inventory unchanged. This snapshot subsequently passed complete event-prefix and private API
acceptance before it was used for temporary public routing.

The standalone handoff operator and systemd interruption-recovery hook have six
passing orchestration tests. They cover route ordering, source rejection,
permanent-service failure, a stop timeout after process exit, unhandled-process
recovery and refusal to overwrite unrelated operator configuration.

The first private API completed the inherited checks and reached readiness, but
its new counter check correctly rejected the closed-hour result. The BLOCK count
was one; the HOUR count was null. The hour's stored chart timestamp was 1794319176,
while its included terminal block 28,315,490 actually has timestamp 1794319194.
The next block, 28,315,491, is exactly at the hour boundary, 1794319200. Restricting
that next-block witness to the included terminal height made the complete hour
appear unverifiable. The correction reads the witness through the captured
canonical cursor, retains the included-height limit for counting, and rejects
an incomplete included prefix. Events exactly at the next hour remain excluded.
The independently authenticated boundary is retained in
`/private/tmp/pi-account-creation-source-20261111/boundary-witness.json`, SHA-256
`cbc731de3dd582853ae61ae8369d3587d58ab5f0064c52029420c1b1c4a3b61a`.

The corrected focused backend suite passes 109 tests, including the real boundary,
incomplete-prefix rejection and duplicate timestamps at the excluded boundary.
The existing concurrent-cache test retains its two-scan assertion; it explicitly
registers the wider waiter first because the new witness read adds an asynchronous
step. No worker catch-up optimization or readiness relaxation was made. The initial
private runtime is retained before replacing its single read-projection module.


The corrected backend source is commit
`c8dd14e700fae995e80c2e928d61b6ce461ed331`, with runtime inventory
`4cbca62e49f111e9ff0113e1ff7640f0d5dc3845658db30d460d9439ff26403b`.
The original runtime described above is retained as the first private generation;
it was never admitted to the permanent writer. The corrected private API passes
all inherited checks, reports one creation for both the affected block and hour,
and preserves the legacy unavailable first-participation result. The six-range
candidate browser oracle also passes: the rolling day shows one New Account,
while unsupported historical creation intervals remain unavailable.

The first permanent handoff rolled back before the new worker could start.
A root-owned operation receipt was mode 0640 with the wrong group, so the
service account could not read it during its boot preflight. The corrected
private writer continued serving the verified API during recovery; the exact
predecessor writer and original route were restored before the second attempt.
No original database was replaced or rewound. The retained failed attempt is
under `account-creations-20261111/ops/cutover/` on the approved Pi host.

The retry explicitly assigns operation receipts to `root:pi-indexer`, verifies
all receipt and proof-archive hashes as the service account, and executes the
installed controller's complete preflight as that account before starting the
writer. The retry courier has 48 passing operator tests; the handoff has eight
passing orchestration tests, including service-account permission failure and
rollback. The second attempt uses separate `cutover-2/` receipts and preserves
the first attempt's source and operational evidence.


The retry's final source covers blocks 28,306,000–28,321,970: 15,971 blocks
in 32 pages, with one creation. Its terminal hash is
`0xa312aa6bd28c0b036518c2d4c56aae59d1ef49b03aaf7bbf69e533878d317bf4`
and timestamp is 1794362802. The full offline cold verification passed in
125.834 seconds. The final pins are:

| Artifact | SHA-256 |
| --- | --- |
| Creation manifest | `4ac3db4a95f428dd02340e920ef076f86094774d099c39558d2318e296090f8c` |
| Source receipt | `c3cb5acadd9b8191d66d12cd102679bed4fba0a3582c9740b2c105bd73b59dfc` |
| Offline cold readback | `d16ea384d4e83ccc11c06a0e7a90a2dfb4534880adc285f071a987c94d37cab1` |
| Proof archive | `528c01ae15c3adf91874f4564b3e26ae91e9a83359baf0fe71d61007821b8323` |
| Root-owned retention receipt | `0249127958f3d4dd979e8e76c7aa2b05c6286570d4626761c200943da829a7ac` |
| Frozen original cursor | `83e132f5fd1a9e5a0277acd254c1dd72ba32700f0f5ef7674f00fc3a9288419e` |
| Service-account readback | `93d9ab4589d142c1904eb587154e1c39438f9754ed8e4ac7129a315a433be4b7` |
| Final production override | `25a47c9380bfe4fcb24adbde571f3f27ad25996c7befd2eb2918874214527a0f` |
| Controller inventory | `4e9bbc7e6b86daafab71ef811927861036de3434c45aa0741592d6affe093c24` |

The final proof archive contains 158 files and 39,673,697 bytes, retained under
`/srv/services/pi-stats-recovery-20261107/account-creation-source-20261111/528c01ae15c3adf91874/`.
The service-account readback checked all 30 emitted receipt pins and all three
referenced proof archives. The final controller additionally pins two inherited
manifests and verifies the complete runtime. Controller commit
`8142d192fb078106aebeab824d7cc73f40b61859` passes all 53 controller/package tests.
The actual installed controller preflight passed as `pi-indexer` before the
permanent writer started at 02:14:49 UTC. Its separate readiness and public acceptance gates subsequently passed.


The second handoff completed at 02:26:08 UTC with the permanent process
PID 1786386 holding 30 handles on the original Kasumi database, inode 69732827,
ID `928d76efeca14250869ae22c31854c11`. The process uses the exact final
creation source and preserves all protected earlier-account, archived-counter,
incoming-bridge and Burn inputs. It reached live readiness without another
restart; startup temporarily drained a backlog through the existing synchronous
reconciliation path. This is not a new Kasumi performance qualification.

The complete public acceptance receipt is retained at
`/srv/services/pi-stats-recovery-20261107/account-creations-20261111/ops/cutover-2/complete.json`,
SHA-256 `6b24c682226e66f80ed6666c2e75607f833507b291777a639d680647bfc12c6e`.
It verifies the affected block and closed hour both report one creation, the
legacy participation count remains null, live continuation is covered, and
personal entitlements remain unavailable. All inherited source and API cases
pass. The permanent public route is restored, the temporary writer and firewall
grant are removed, the rollback service is retained, and the campaign timer is
active. The handoff service exited successfully.


An independent readback at 02:27:01 UTC verified the actual permanent process,
31 database handles, original database inode, runtime inventory, creation source,
and protected inputs. The direct API and public endpoint were both ready at
block 28,322,149 with zero lag. The natural campaign timer also ran at 02:26:08
and exited successfully, confirming the unchanged historical campaign through
block 28,191,816; it did not merely skip a held lock. Detailed backend validation
and retained readbacks are recorded in
[new-accounts-2026-11-11/backend-qualification.json](new-accounts-2026-11-11/backend-qualification.json).


The frontend uses production CID
`bafybeidalmpedv6tpwjcu6kuimrg5ulwiwniib6m2izzbxyqzcehoavazq`, paired with
testnet `bafybeigodxgspk5f76xxri52vfhj5or4mq22l2owel2chi25g2cn3vpaiq`.
The full shipped Burn-redesign assembly is preserved, with only five frontend
files changed. See [the frontend release report](account-creations-frontend-2026-11-11.md)
for source reconstruction, the complete test results, static publication and
browser gates.

The final public six-range check is
`output/playwright/new-accounts-20261111/live/stats-cards-1794364164282.json`.
It passed against the new `x-ipfs-roots` value, reached `Statistics - Polkaswap`,
and recorded zero failed requests and console errors. Every network card matched
its actual captured API responses for 1D, 1W, 1M, 3M, 6M and 1Y. The 1D New
Accounts value is one. The longer creation intervals lack complete verified
coverage and remain unavailable; they are not silently filled with zero or
legacy participation values. The affected block and hour return one creation
while the legacy field stays null. Existing historical incoming counts, account
coverage guards and both public Burn intervals also pass their browser-side
checks. This release does not restore personal Points or reward entitlements.


All nine required official live routes pass: Swap, Bots, Store, Buy XOR,
Get TS, Wallet, Stats, Burn and Points. Each retains its requested route,
mounts the intended feature UI, and reports the deployed CID with zero failed
requests and console errors. The final repeated Swap check also reaches `Swap - Polkaswap` on the new root
with zero failed requests and console errors. The complete public byte audit matches all 933
files across 935 responses, including both initial and final roots, with no
redirects, failed responses, retries or transient errors. Complete public audit
SHA-256 is `ecfc6f810c13b4028f72cfd64f11452fc7672d454814b389e4cba690becc3a04`.
The final reports and bounded operational/browser evidence are retained together
on the approved Pi host; the exact archive and readback are recorded in
[the final retention receipt](new-accounts-2026-11-11/final-retention.json).
