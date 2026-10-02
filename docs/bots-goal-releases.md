# Fast GO strategy releases

GO downloads one small, immutable strategy manifest. The release publisher runs
the complete original study replay before publishing that manifest; users do not
repeat a multi-gigabyte historical replay in their browser.

This is an explicit publisher trust boundary. The application ships the release
URL and three SHA-256 pins: the manifest bytes, original evidence index and
qualification certificate. AI responses, query parameters and wallet input cannot
choose these pins. A manifest with caller-selected pins is not trusted evidence.
No real qualified release is configured yet: the completed real study failed its
training gates and must not be published as a successful strategy.

## Publish

`exportGoalStudyRelease` in `scripts/bots/goal-study-release.ts` accepts the
original HTTPS evidence directory, its trusted index hash, an output directory
and the publisher's fetch function. It calls `reverifyGoalStudyBundle`, including
original metadata, raw responses, acquisition lineage, training selection and
sealed validation. Only that replay's privately owned qualification can be
encoded. The function snapshots its inputs before asynchronous replay, writes
`manifest.json` once and returns the three pins. Failure creates no manifest;
an existing manifest is never overwritten.

Serve the file as a static HTTPS asset, then include its exact returned pins in
the application's trusted release configuration. Publishing a file alone does
not enable it. Keep the complete original bundle available for independent
auditing. Neither publishing nor loading a release starts a new study or opens
new evaluation data.

## Browser

`loadGoalQualificationRelease` in `src/features/bot-trading/goal-release.ts`
fetches only `manifest.json`, with no credentials or redirects and a 256 KiB
limit. The loader checks all three pins. The qualification decoder checks the
unchanged policy, registration and selection bindings, exact accounting ratios,
training ranking and validation gates before creating an owned capability.
It does not reconstruct raw history: authenticity comes from the shipped pins
and the publisher's required replay. Abort or disposal revokes the capability.

`createGoalApplication` keeps verified releases and funding reviews private.
The existing wallet, current runtime, balance, fee reserve, approval and live
execution checks still apply. A valid manifest is not wallet authorization and
cannot extend a historical certificate to another runtime. Funding approval
creates a paused local allocation; explicit user approval starts the session.

## Verification limits

The release tests use invented evidence to exercise the actual qualification
boundary, bounded loader and revocation. Publisher tests cover orchestration,
failure, immutable inputs and write-once output. These tests demonstrate the
software contract; they are not an empirical profitability result or a completed
successful raw production study. The [validation receipt](../output/go-history/goal-release-20260921/validation.json)
records 20 passing tests, lint, the browser-library build and the exact source
hashes. The scoped type check has the same five pre-existing liquidity-proxy
errors as its baseline and no new errors; it is not a clean whole-repository
type check.
