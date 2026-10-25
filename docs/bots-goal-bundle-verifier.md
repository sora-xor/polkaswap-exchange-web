# Portable study replay

Public GO uses the [small pinned release manifest](bots-goal-releases.md).
The full replay described here runs during release publication and remains
available for independent auditing; it is not a per-user GO download.

`reverifyGoalStudyBundle` in `src/features/bot-trading/goal-bundle-verifier.ts`
composes the static reader, completed-study journal, original metadata and
episode verifiers, continuation-prefix verifier and unchanged v2 qualification
boundary. Its only inputs are a trusted HTTPS directory/index SHA-256 and the
application's static fetch function plus optional abort signal. Callers cannot
substitute an evaluator or import a certificate as authority.

The application must pin the index independently of AI output and page parameters.
The reader first checks that index and its complete original metadata archive.
Metadata is verified once per partition; original training episodes are then
recomputed in their sealed order. The unchanged qualification boundary selects
the candidate. Only its privately owned selection can open the exact two
validation episodes, which are also recomputed from original raw responses.
The returned certificate must equal the original one in full.

For a continuation, the composed prefix verifier also joins the original failed
parent invocation, retained successful responses and child use/retry receipts.
Changing the study ID cannot discard the failure or its validation claim.
Every subsequent continuation-child episode also verifies its retained acquisition
attempts, response bytes and original operation deadlines; later hidden retries
cannot bypass those bounds merely because the parent prefix has been exhausted.
Timeouts while downloading static artifacts do not change modeled historical
arrival times or count as new market observations.

On success the function returns the certificate, owned qualification verification,
and `dispose`. Keep that disposer for the lifetime of the installed verification.
Disposal or caller abort revokes authority, cancels outstanding downloads and
releases retained metadata. Failure returns no qualification capability.

This composition has no wallet, funding, signing, node RPC or indexer acquisition
surface. It does not select evidence URLs from the bundle or enable public GO by
itself. A qualification for the archived runtime130 does not admit runtime131;
current runtime acceptance, funding consent and live execution remain separate.

The [21 September verification receipt](../output/go-history/goal-browser-composition-20260921/validation.json)
pins the final source, focused test logs and successful browser-library build.
The root checks pass 101 tests across six suites. Original raw-source replay and
owned study-boundary integrations are exercised separately; no complete successful
real raw study has been replayed through this top-level composition. The frozen
real study failed after eight training episodes, so it supplies no qualified
bundle to install. Public GO integration and deployment remain unfinished.
