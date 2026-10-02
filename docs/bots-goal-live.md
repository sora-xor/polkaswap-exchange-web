# Finalized goal execution

`src/features/bot-trading/goal-live.ts` composes the explicit
`finalized-xyk-goal-v1` protocol with exact storage, private qualification,
the existing signer abstraction, and an owned finalized-state preparation.
It does not create or fund a goal, issue a qualification, expose a signing
API, or activate the route in the UI. Its dependencies must be supplied by
the application’s trusted adapter; the signer is requested only after the
caller has obtained the user's approval.

## Authority and ownership

`createGoalLiveExecutor(storage, dependencies)` returns `authorize`,
`execute`, `previewAllocation`, `reconcile`, `stop`, and `dispose`.
`authorize` resumes an already-funded exact goal after checking the privately
owned qualification capability, the actual connected SDK client and runtime,
fresh runtime qualification, account allocations, pending orders, and balances.
It acquires the same account/network lifetime lease as other live bots.
It refreshes balances again after wallet unlock and commits resume with a
synchronous freshness guard and durable control revision.

`prepare` must return the internal `OwnedGoalPreparation` from
`agent-trading/goal-preparation.ts`: the actual session and original context,
not a public evidence copy. Public quote evidence remains useful for digest
and amount validation; it cannot satisfy the provider's private ownership
check. `qualification` must return a capability owned by
`goal-qualification.ts`; a duck-typed object or imported digest does not qualify.

Disconnect, reconnect, runtime/client change, wallet change, deadline expiry,
explicit stop, and disposal revoke in-memory authority. Reconnect is a
permanent revocation for that authorization, including an ABA change during
an awaited wallet operation. `stop` revokes synchronously and returns a
promise for durable pause. Callers must await it; if SDK cleanup throws, all
remaining owned cleanup actions and durable pause are still attempted before
the cleanup failure is reported. The shared SDK socket is never disconnected.

## Partial order sequence

1. Load the current exact goal and verify consent, qualification and control
   revision. Prepare one supplied partial input amount with desired-input,
   DEX `0`, `XYKPool`, and `0.5%` slippage explicitly selected.
2. Validate the complete prepared quote, review envelope, exact call bytes,
   original owned context, qualified runtime, account balances and exact
   ledger admission. Reserve the order atomically before requesting a signature.
3. Persist any returned signed-byte digest and transaction hash, plus actual
   captured payload evidence when available, before checking whether Stop, expiry,
   or a context change won the signing await. Check the
   returned call, signer, signed hash and 64-block mortal era.
4. Recheck the original review's time and block expiry, maximum 30-second age,
   network, runtime and signer independently of the original quote's freshness.
   Capture a new context through the original owned session. Quote the same
   input and require its executable minimum to cover the original signed
   minimum. Query runtime fee information for the actual signed bytes at that
   same new state; the original signed minimum and reserved fee ceiling stay fixed.
5. Refresh balances, observe the exact fresh mark and recheck admission using
   the original minimum and fee ceiling. The storage `submit` transaction uses
   accounting/control CAS and a synchronous session, context, review-deadline
   and signed-byte guard. Recheck immediately after it commits, then send the
   exact signed object. `submit` means intent to broadcast, not chain inclusion.
6. Treat the send callback only as a candidate finalized block. The receipt
   reader independently checks canonical finalized inclusion and exact
   signed-envelope identity. Persist its actual output and native fee before
   requesting the fresh accounting mark. Apply genuine settlement once,
   including failure fees, low proceeds and overruns. After accounting, reread
   transferable balances against all active allocations. A depleted XOR fee
   reserve, depleted input allocation, or unavailable balance read pauses and
   revokes the current signer; this does not change the finalized ledger or
   count unrelated wallet spending as a bot loss. Clean settlement can preserve
   the session. A newer authorization is never revoked by an older delayed read.

Exact token and fee arithmetic stays in the validated projection, codecs,
ledger and storage modules. Pool fees are already reflected in the quote;
native transaction fees are accounted separately. There is no `paymentInfo`
fallback or quote-based replacement for the actual signed-envelope fee query.

When the owned qualification declares the explicit target-runtime V3 model,
its preregistered monetary cap is checked before order reservation/signing,
against the fresh quote after signing, and against the actual signed-envelope
fee estimate before submission. This is additional to the original reserved
fee ceiling and total fee allowance. A failure after signing preserves the
signed order for recovery and does not broadcast it. Finalized actual fees
remain authoritative even if they exceed a preflight estimate.

## Recovery and limits

`reconcile(bot, candidateBlockHash?)` first applies an already-retained receipt,
or verifies an explicitly supplied canonical finalized candidate. Without a
candidate, captured signing evidence selects the complete signed-lifetime reader;
older records use up to 128 recent finalized blocks through `goal-recovery.ts`.
Both verify exact signed bytes and account and pass any inclusion through the
ordinary canonical receipt parser. It requires no signer and
preserves pause when applying late settlement. Discovery has a 30-second total
deadline and a 65,536 aggregate extrinsic cap. A search miss, unavailable block,
or timeout leaves the order unresolved; a miss never proves absence or expiry.

Signed orders with actual captured payloads can recover after Stop/reload through
`goal-expiry.ts`: the original signature is reverified, then the entire canonical
finalized lifetime is scanned. Only a private complete-absence proof can mark an
order `expired`, retaining its signed evidence with no fee or balance mutation.
Old orders without that capture, and any gaps or mismatched evidence, stay pending.
Real inclusion always follows receipt accounting; it cannot become an expiry.
A predeadline signature included after the original deadline stays
`finalized-pending` until canonical deadline closure. That atomic transaction
preserves the deadline valuation and records the actual later effects in a
separate journal; see [deadline settlement](bots-goal-runtime.md#deadline-settlement).
Any other unresolved signed order blocks closure of both ledgers.

A signing request that rejects without a trustworthy statement about whether a
signature escaped also remains pending. A provably pre-signing reservation can
be cancelled; a failed cancellation remains pending. A send watch ends after
90 seconds, which is neither settlement nor absence proof.

The signer adapter is responsible for its actual signing mechanism; runtime
fee inspection provides structural envelope bounds, not signature validation
or a guarantee that a future state will charge the same fee. The canonical
receipt accounts the real result. No strategy, price movement or profit is
promised by authorization or successful submission.

## Validation

`tests/unit/features/bot-trading/goal-live.spec.ts` exercises orchestration with
real exact storage and synthetic signer, provider, qualification and receipt
boundaries. It covers successful accounting, preserved signed facts after
revocation, uncertain signing failure, original review expiry, changed client
identity, pre-unlock qualification/balances, post-finalization reserve checks,
late-read Stop races, cleanup failures, fee/minimum rejection and receipt
recovery. These are offline tests, not a live trade or
qualification result. The provider, codecs, qualification and canonical
receipt parser have separate focused suites.
