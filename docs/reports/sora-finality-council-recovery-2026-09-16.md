# SORA finality recovery: council and technical committee procedure

Prepared 16 September 2026 JST, using read-only mainnet observations from 15 September 2026, 15:24 UTC. This is a proposal preparation and execution procedure. The validator addresses, replacement count, referendum voting windows, recovery checkpoint, and GRANDPA delay must be filled from reviewed operational evidence before constructing submission bytes.

## Decision and sequence

Use two separately reviewed governance proposals:

1. **Proposal A — change election membership.** Stop confirmed unavailable validators being reelected, retain their bonded funds, and elect a verified working set.
2. **Proposal B — recover finality.** After the replacement session membership is verified, authorize the forced GRANDPA handoff. If finality recovers normally before then, reassess whether B is needed.

Do not put `grandpa.noteStalled` in the same batch as the candidacy/election changes. It acts at the next session, which may still contain the old queued validators.

The recorded eight disabled validators are not a verified offline list. Recent block authorship also does not prove current GRANDPA voting. Operators must establish the replacement membership before A is approved.

## Live referendum #795 — discovered in the subsequent governance review

At 15:34 UTC, #795 was already voting: zero recorded aye/nay votes, end block 27,665,334, and a 600-block enactment delay. Its preimage is an atomic `utility.batchAll` containing 16 `staking.forceUnstake` calls followed by `staking.setValidatorCount(21)`.

The live candidate pool contained 26 accounts. Fourteen of #795's targets were current candidates, so successful removal of all those targets would leave 12 current candidates, absent other changes. Four targets had authored blocks in the sampled period. Those facts require review of the membership assumptions; they do not establish which operators currently supply GRANDPA votes.

More immediately, live storage at 15:36 UTC showed that the first and eighth force-unstake calls each supplied a slashing-span bound of 2 while 5 spans were stored. The runtime rejects an insufficient bound with `IncorrectSlashingSpans`. At that state, the atomic batch is expected to fail and roll back the validator-count change too. This is a source/storage analysis, not a submitted transaction or dry-run result.

Coordinate #795 before proceeding with the new recovery proposals. An ongoing referendum cannot be edited or passed to `fastTrack` again; that call consumes `nextExternal`. For a corrected replacement, the council can propose `democracy.emergencyCancel(795)` through a collective motion requiring at least two thirds (**6 of the current 8 council members**), subject to the proposal hash's cancellation eligibility. Verify cancellation, then table the reviewed replacement through the four-of-eight council and three-of-four technical procedure below. Do not leave conflicting pending recovery actions unexamined.

Evidence: `output/finality-diagnosis/referendum-795-2026-09-15T15-34-30-972Z.json`, `referendum-795-bonded-2026-09-15T15-36-33-576Z.json`, and `referenda-mof-2026-09-15T15-34-18-944Z.json`.

## Current governance requirements

| Action | Requirement at the observed membership |
| --- | --- |
| Council approves `democracy.externalProposeMajority` | At least half: **4 of 8 members** |
| Technical committee approves ordinary `democracy.fastTrack` | More than half: **3 of 4 members** |
| Technical committee permits a voting period below 1,800 blocks | At least two thirds: **3 of 4 members**; `instantAllowed = true` |
| Public referendum | Token-holder voting is still required; simple majority of the effective aye/nay vote weights |

Recheck council and technical committee membership before constructing each motion. Proposing a collective motion does **not** cast an aye vote in this runtime. The proposer must vote too.

The normal fast-track minimum is **1,800 produced blocks**. Shorter periods use the instant-origin path through the same `democracy.fastTrack` call. Select an explicit period greater than one block that gives all intended voters time to participate. One block is technically accepted but can close the referendum before votes submitted in the next block execute. Durations are measured in produced blocks; do not convert them to three hours or other normal-chain estimates during this stall.

## Engineering preparation for Proposal A

Record and review:

- Every unavailable validator's stash account, its current controller from `staking.bonded(stash)`, and a matching `staking.ledger(controller).stash`. Verify that each target is currently a validator candidate and document the reason for removal.
- The willing replacement operators, their eligible stash accounts, registered session keys, and evidence that they can produce and exchange finality votes on the same chain. Do not obtain or include their private keys.
- The intended election target `N`. Reducing this number does not itself choose healthy candidates; inspect all remaining candidates and the election result.
- The current era, session, election phase, and queued keys. A forced new era needs sufficient election lead time and can fail to produce a new result if called too late.

Construct the following **Root call**. This is call-builder notation, not ready-to-submit JavaScript or encoded call data:

```text
utility.batchAll([
  utility.dispatchAsFallible(
    System.Signed(CONTROLLER_FOR_REVIEWED_STASH_1),
    staking.chill()
  ),
  ... one dispatchAsFallible/chill for each reviewed controller ...,
  staking.setValidatorCount(N),
  staking.forceNewEra()
])
```

`staking.chill` removes validation/nominating intent while retaining the staking ledger and bonded funds. It requires the **controller**, not an assumed stash address. `dispatchAsFallible` propagates inner failures, allowing `batchAll` to roll back the batch instead of hiding a failed chill behind an outer success.

Include `forceNewEra` only after engineering has verified sufficient election lead time for the expected enactment. If that cannot be established, omit it and use the normal era transition, or schedule a separately reviewed force-new-era proposal. The rest of A does not depend on blindly forcing an election.

Chilling is not a permanent ban: a controller can later declare validation intent again. Recheck candidate membership before the election and before B. Do not substitute `forceUnstake`; it changes bonded-funds state and is not the operation described here.

## Council and technical committee cycle — repeat for A and B

### 1. Engineer prepares the preimage

Encode the approved **inner recovery RuntimeCall** as SCALE bytes `C` (the call bytes, not a signed extrinsic). Calculate:

- `H`: the runtime hash of `C`.
- `L`: byte length of `C`.

Independently decode `C` against current mainnet metadata and compare every address and parameter with the reviewed proposal. Publish these exact bytes through:

```text
preimage.notePreimage(C)
```

Confirm that the preimage is available for `H` with length `L`. Prepare the deposit/fee through the normal signed-account workflow if required.

### 2. Council member proposes the external referendum

First inspect `democracy.nextExternal`. At the observation time it was empty. If another proposal is pending, coordinate its handling; `externalProposeMajority` can replace the pending external proposal.

Build:

```text
E = democracy.externalProposeMajority(
  Lookup { hash: H, len: L }
)

council.propose(
  threshold: 4,
  proposal: E,
  lengthBound: encoded byte length of E
)
```

Use the emitted council motion hash `HC` and motion index `IC`. Each approving council member, including the proposer, submits:

```text
council.vote(HC, IC, true)
```

After at least four recorded ayes, close it with:

```text
council.close(HC, IC, proposalWeightBound, lengthBound)
```

Engineering must supply sufficient `Weight { refTime, proofSize }` and length bounds for **E**, using the current UI/runtime estimate; do not use zero or unrelated bounds. The close-call metadata documents storage-length overhead, so use its generated bound or the encoded motion length plus the documented four-byte allowance.

Confirm council execution succeeded and `democracy.nextExternal` contains **H** with `SimpleMajority`. A successful outer transaction or `Approved` event alone is insufficient if the embedded call failed.

### 3. Technical committee proposes the fast-track motion

Agree `V`, the positive referendum voting period in blocks, with the intended voters. For emergency periods below 1,800 blocks, the current three-of-four threshold meets the instant-origin requirement. Use `Dgov = 0` if the approved procedure requires the earliest permitted enactment after the referendum passes.

```text
T = democracy.fastTrack(
  proposalHash: H,
  votingPeriod: V,
  delay: Dgov
)

technicalCommittee.propose(
  threshold: 3,
  proposal: T,
  lengthBound: encoded byte length of T
)
```

Use the emitted technical motion hash `HT` and index `IT`. Approving members, including the proposer, submit:

```text
technicalCommittee.vote(HT, IT, true)
```

After at least three recorded ayes, close using sufficient weight/length bounds for **T**:

```text
technicalCommittee.close(HT, IT, proposalWeightBound, lengthBound)
```

Confirm successful execution and read the actual referendum index `R` from `democracy.Started` or `referendumInfoOf`. Do not predict the next index from an earlier snapshot.

**H is the recovery preimage hash. HC and HT are different collective-motion hashes. Never use HC or HT as the fast-track proposal hash.**

### 4. Token holders vote in the referendum

The council and technical votes do not approve the Root recovery action by themselves. Eligible token holders cast their intended referendum votes before its recorded end block:

```text
democracy.vote(R, AccountVote::Standard {
  vote: Vote { aye: true, conviction: VOTER_SELECTED_CONVICTION },
  balance: VOTER_SELECTED_BALANCE
})
```

Each voter selects their own vote, balance and conviction. Use the wallet's exact token-amount encoding and review any voting lock. The example shows an aye vote; the referendum remains the token holders' decision.

### 5. Verify enactment

Read referendum approval, the scheduler's actual execution result, and the resulting state. With `Dgov = 0`, approved enactment is scheduled for the **next produced block after approval**, not the same block.

During a finality stall, these transactions and governance state can appear in produced but unfinalized blocks. Track their block hashes and confirm the observations on consistent nodes; inclusion is not finality. After recovery, verify that the enacted actions are on the finalized chain.

## Gate between A and B

Verify A's Root batch completed successfully, each targeted validator candidacy was removed, the target changed as intended, and the election succeeded. Inspect the resulting and queued session membership and keys against the approved working-operator list. Do not assume a fixed number of sessions guarantees success, or that `forceNewEra` succeeding means a new election succeeded.

Proceed to B only when engineering has verified the replacement validators that will be supplied to GRANDPA at B's next-session handoff. Ordinary GRANDPA changes may still be waiting for old-set finality; the runtime session list and a node's actively voting GRANDPA set are not interchangeable.

Also inspect `grandpa.pendingChange` and `grandpa.nextForced` immediately before B's enactment. There must be no pending runtime change or forced-change cooldown blocking scheduling at the intended session. A successful `noteStalled` extrinsic alone does not prove the handoff was scheduled: the session hook can reject scheduling with `ChangePending` or `TooSoon` while leaving the request queued for a later session.

## Proposal B — forced finality handoff

Obtain fresh data directly from **every proposed replacement validator**:

- Latest finalized block number and hash, agreeing chain ancestry, and current voting/key configuration.
- `F`: the highest latest-finalized block number among those validators, with a verified compatible hash/checkpoint. Conflicting finalized histories must be resolved before selecting a checkpoint. The earlier RPC observation of block 27,658,983 is not a value to paste blindly into this proposal.
- `Dgrandpa`: an operator-reviewed delay, in produced blocks, sufficient for the signalled transition to be stable. This is separate from `Dgov`. The upstream documentation's 1,000-block example is not a measured recommendation for this stalled chain.

The inner Root call for B is:

```text
grandpa.noteStalled(
  delay: Dgrandpa,
  bestFinalizedBlockNumber: F
)
```

Repeat the complete preimage → council → technical committee → referendum → enactment cycle above with **B's own bytes, hash and length**. Coordinate the expected enactment/session boundary with the verified replacement membership.

`noteStalled` does not accept a validator list. It uses the next session's supplied validators and schedules a forced handoff after the chosen block delay. It does not automatically exclude disabled members. Monitor the scheduled forced change and actual node authority-set transition.

If scheduling is deferred, immediately revalidate the later session's membership and the checkpoint with the participating operators. Treat the still-queued request as live and coordinate any required correction; do not assume it was canceled or that the originally reviewed next-session membership will still be used.

## Completion evidence

- Replacement validators agree on the new authority set and finality advances on multiple independent nodes.
- Recovery enactment blocks become finalized; the expected election membership remains in effect.
- The finalized head continues advancing, rather than moving once and stalling again.
- Polkaswap's fresh-finalized-data checks recover without weakening their freshness requirements.

## Evidence and version notes

The live runtime was spec version **130**. The installed node reports 4.8.6, but its tag's native runtime is spec128; node version is not deployed runtime version. Published SORA spec130 source confirms the origins below. Matching a spec version is not a cryptographic verification of the deployed WASM build; revalidate metadata and governance membership before execution.

- [SORA spec130 governance origins](https://github.com/sora-xor/sora2-network/blob/0411827191070367d9685227fc2d6d32843af347/runtime/src/lib.rs#L660-L686)
- [SDK fast-track validation](https://github.com/paritytech/polkadot-sdk/blob/e3737178ec726cffe506c907263aaaa417893fd0/substrate/frame/democracy/src/lib.rs#L775-L813)
- [SDK fallible origin dispatch](https://github.com/paritytech/polkadot-sdk/blob/e3737178ec726cffe506c907263aaaa417893fd0/substrate/frame/utility/src/lib.rs#L560-L588)
- [SDK staking chill](https://github.com/paritytech/polkadot-sdk/blob/e3737178ec726cffe506c907263aaaa417893fd0/substrate/frame/staking/src/pallet/mod.rs#L1435-L1454)
- [GRANDPA emergency recovery documentation](https://paritytech.github.io/polkadot-sdk/master/pallet_grandpa/pallet/struct.Pallet.html#method.note_stalled)
- Local evidence: `output/finality-diagnosis/governance-2026-09-15T15-24-17-194Z.json`, `governance-call-shapes-2026-09-15T15-24-21-753Z.json`, and `governance-encoding-check.json`.

The call shapes were encoded and decoded against live metadata using a dummy controller and illustrative parameters only. No proposal, vote, stake change, or recovery transaction was submitted.
