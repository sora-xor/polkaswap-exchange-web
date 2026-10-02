# Finalized inclusion and signed-lifetime recovery

`discoverGoalFinalizedReceipt` in `src/features/bot-trading/goal-recovery.ts`
uses the connected public `GoalReceiptClient` to find a pending signed or
submitted order without needing the lost send callback's block hash. It makes
no signing request, submission, balance adjustment, or expiry decision.

The reader copies the order before its first await, pins a canonical finalized
head, and searches backwards through at most 128 blocks. Each returned block
must match its canonical hash and requested height. Search work is bounded by
30 seconds and 65,536 total extrinsics. A matching transaction must have the
expected account, transaction hash and exact signed-envelope digest, then pass
`readGoalFinalizedReceipt`, including block-specific actual fee and swap events.
The receipt verification shares the discovery deadline through an abort signal.
Disconnect/reconnect, changed client/runtime/metadata, unavailable/pruned blocks,
invalid data and cancelled reads leave the order unresolved.

`not-found` identifies the exact searched height range and always carries
`expiryProven: false`. It does not mean the transaction never occurred: an older
inclusion may lie outside the window. `signedAtBlock` is not used as mortality
evidence because the current signer independently chooses its checkpoint.
This bounded recent search is retained for old orders without captured signing
evidence. It never manufactures a zero-fee failure receipt.

`goal-live.reconcile` prioritizes retained receipts, then the explicit candidate
or the exact signed-lifetime path when actual signing evidence exists (the recent
search otherwise). It persists a discovered receipt before requesting
the fresh accounting mark. A later mark failure therefore remains recoverable
without repeating discovery. The existing account lease and storage CAS protect
the transition; recovery never resumes a paused signer.

`tests/unit/features/bot-trading/goal-recovery.spec.ts` uses synthetic SDK
responses with the real discovery and receipt parsers. The live executor tests
cover discovery-to-durable-receipt orchestration and unresolved read failures.

## Complete signed lifetime

`discoverGoalExpiry` in `goal-expiry.ts` revalidates the persisted actual signature
and exact signed envelope before reading the chain. It pins and checks a canonical
finalized head, verifies the actual signed checkpoint, and scans every finalized
block from the signed birth to the lesser of death or that head. The supported
mortal64 profile bounds this to 65 blocks and 65,536 total extrinsics within a
30-second operation. Returned heights, hashes and consecutive parent links must
agree. The pinned head and both range anchors are rechecked before a result.

An included exact transaction is passed to the ordinary canonical receipt reader,
including actual fees and output, even if the goal deadline has elapsed. Absence
becomes `expired` only after the head is strictly beyond death and all 65 blocks,
including death, have been read. Missing/pruned blocks, mismatched checkpoint or
ancestry, changed connection, timeout, unsupported signing records and invalid
signatures leave the order unresolved. Nonce values and `signedAtBlock` never
substitute for this scan. Shared SDK wire operations can finish after a timeout;
retired readers cannot start another logical read or mint a valid capability.

The result is a private one-use capability bound to the complete order digest,
order revision and current bot control revision. Client lifecycle listeners stay
attached until consumption, discard or the original 30-second deadline, so a
returned proof cannot survive disconnect/reconnect. Imported audit JSON grants no
authority. Atomic `storage.goals.expire` checks that capability against current
storage and retains the signing record plus expiry evidence under phase `expired`
and status `failed`. It changes no holdings, fee, trade count or economic ledger.
Failed CAS operations discard the local proof; paused signers never resume.

A true expiry can unblock original-deadline closure because the signed transaction
has no included effects. Actual inclusion remains a retained receipt. The
terminal path accounts predeadline effects in the deadline ledger and later
effects in the separate [settlement journal](bots-goal-runtime.md#deadline-settlement);
it cannot omit a known receipt or close while another order remains unresolved.
Tests use real codecs
and disposable synthetic signatures for reload, forged payload/envelope rejection,
complete expiry, inclusion at lifetime boundaries, gaps, reorgs, control races,
late signatures, cancellation and deadline handling.
