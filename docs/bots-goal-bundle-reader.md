# Pinned browser training-bundle bytes

`src/features/bot-trading/goal-bundle-reader.ts` is a browser-only transport for one
training episode's retained artifacts. The application supplies an externally
trusted manifest SHA-256 and fixed HTTPS directory. Matching that pin proves byte
integrity; it does not prove chain truth, honest preregistration, unopened validation,
profitable strategy results or authorization to trade. Nothing in this module is
accepted by the qualification, funding or signing boundaries. It has no default
GO wiring and imports no Node filesystem or crypto modules.

```ts
const reader = await createGoalBundleReader(
  { rootUrl: trustedEpisodeDirectory, manifestSha256: trustedManifestHash },
  { fetch, signal }
);
try {
  const sourceBytes = await reader.read('source.json');
  // An independently installed evidence decoder must interpret these bytes.
} finally {
  reader.dispose();
}
```

The pin and root come from trusted application configuration, never a certificate
claim, AI output or arbitrary page parameter. The directory must be a canonical
HTTPS URL ending in `/`, without credentials, query, fragment, encoded path
characters, empty path components or traversal. There is no HTTP/development
exception. A site's existing content-addressed directory can be used with this
same rule.

## Exact format and paths

The root's `manifest.json` contains exactly:

```json
{
  "version": 1,
  "kind": "goal-episode-evidence-bundle-v1",
  "phase": "training",
  "planSha256": "<64 lowercase hex characters>",
  "requestSha256": "<64 lowercase hex characters>",
  "sourceSha256": "<64 lowercase hex characters>",
  "artifacts": [{ "name": "source.json", "sha256": "<64 lowercase hex characters>", "bytes": 123 }]
}
```

Every digest covers exact bytes, including any trailing newline. The JSON fields
do not permit an artifact URL or path. An artifact is fetched only from the same
root's `objects/<sha256>.bin`; its logical name is never interpreted as a path.
Names are unique, 1–128 ASCII letters/digits/dots/underscores/hyphens, start with a
letter or digit and contain no `..`. Manifest JSON must be valid UTF-8 without a
BOM. Unknown fields, duplicate logical names and malformed or oversized entries
reject before any artifact request.

This is a per-episode index. The separate
[completed-study exporter and reader](bots-goal-study-bundle.md) bind the complete
candidate/episode set, original and continuation lineage, acquisition receipts,
shared metadata cache dependencies, registration and selection records. Both
readers use `goal-bundle-transport.ts` for the same bounded HTTPS reads. No actual
study bundle is exported or read by this change.

## Bounds and lifecycle

The manifest is at most 4 MiB. It declares 1–16,000 artifacts, each 1 byte–32 MiB,
with at most 512 MiB total artifact bytes. Reads are lazy, sequential and read-once
per logical name. The reader retains only the verified index; the caller owns
returned bytes and their memory lifetime. A caller requiring reuse must retain its
verified bytes rather than reopen a network request through the same reader.

Every request uses `GET`, `credentials: omit`, `redirect: error` and `cache:
no-store`. HTTP 200, an unredirected response and its exact requested URL are
required. The response body is streamed with an actual byte bound and at most
65,536 read iterations; empty chunks reject. Declared Content-Length is not
trusted as a substitute for consumed bytes. Both exact length and SHA-256 must
match before an artifact is returned.

Each request has a 30-second deadline covering headers and body. External abort,
disposal, timeout, concurrent/repeated/unknown reads, malformed responses or hash
failures revoke further reads. Pending waits abort, late responses are cancelled
and caller listeners are removed. Disposal never aborts the caller's signal or
disconnects shared services. An uncooperative fetch implementation may finish its
own physical work, but its late response cannot become admitted evidence.

## Validation admission

The original `createGoalBundleReader` entrypoint stays training-only. It rejects a
validation manifest before artifact reads. `createGoalValidationBundleReader`
requires the separate, privately owned selection from the completed-study replay.
That capability is issued only after the unchanged qualification boundary
recomputes all training results and the original candidate selection. A serialized
`GoalQualificationSelection` cannot unlock validation.

The validation reader binds the exact study index, plan, source, selected candidate
and one of its two original validation requests. It rechecks capability ownership
before and after every read; disposal of the study revokes pending and future
validation access. Validation bytes still grant no trading authority.

The composed browser path must independently decode raw metadata, state, history,
quotes and fees; replay the existing causal episode evaluator; and call
`createGoalQualificationBoundaryV2(...).reverify(certificate)` through a trusted
sealed-evidence evaluator. Returning downloaded completed-trace JSON directly is
insufficient. The existing exact runtime-profile guard also remains unchanged:
reverifying historical runtime 130 evidence does not admit runtime 131.

Synthetic unit tests exercise exact-byte pins, lazy/read-once behavior, locator
and redirect restrictions, malformed schemas and UTF-8, per-file/aggregate bounds,
tampering, abort, timeout, concurrent reads and late cleanup. No test reads a
retained study, contacts a provider or creates wallet authority.
