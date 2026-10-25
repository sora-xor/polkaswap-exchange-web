/** Release-time full replay. This command never starts a new study, opens a wallet or submits a transaction. */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { reverifyGoalStudyBundle } from '../../src/features/bot-trading/goal-bundle-verifier';
import { encodeGoalQualificationRelease } from '../../src/features/bot-trading/goal-qualification';
import { goalRawBytesSha256 } from '../../src/features/bot-trading/goal-raw-envelope';
import type { GoalStudyBundleReaderInput } from '../../src/features/bot-trading/goal-study-bundle-reader';

/** Snapshot caller-owned data without invoking accessors across asynchronous replay and publication. */
function own(raw: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!raw || Object.getPrototypeOf(raw) !== Object.prototype) throw Error('bots.errors.research');
  const descriptors = Object.getOwnPropertyDescriptors(raw);
  if (
    Reflect.ownKeys(descriptors).length !== keys.length ||
    keys.some((key) => !descriptors[key]?.enumerable || !('value' in descriptors[key]))
  )
    throw Error('bots.errors.research');
  return Object.fromEntries(keys.map((key) => [key, descriptors[key].value]));
}

/**
 * Recompute the original raw study in full before emitting its small release manifest.
 * The output is not enabled automatically: a release publisher must ship its exact pins in app configuration.
 * Failed, incomplete or altered evidence produces no new manifest. Existing files are never overwritten.
 */
export async function exportGoalStudyRelease(
  input: { bundle: GoalStudyBundleReaderInput; outputDirectory: string },
  dependencies: { fetch: typeof fetch; signal?: AbortSignal }
) {
  const supplied = own(input, ['bundle', 'outputDirectory']);
  const locator = own(supplied.bundle, ['rootUrl', 'indexSha256']);
  const transport = own(dependencies, ['fetch', ...(Object.hasOwn(dependencies, 'signal') ? ['signal'] : [])]);
  if (
    typeof supplied.outputDirectory !== 'string' ||
    supplied.outputDirectory.length === 0 ||
    supplied.outputDirectory.length > 4096 ||
    typeof locator.rootUrl !== 'string' ||
    typeof locator.indexSha256 !== 'string' ||
    !/^[0-9a-f]{64}$/.test(locator.indexSha256) ||
    typeof transport.fetch !== 'function'
  )
    throw Error('bots.errors.research');
  const bundle = Object.freeze({ rootUrl: locator.rootUrl, indexSha256: locator.indexSha256 });
  const outputDirectory = supplied.outputDirectory;
  const request = Object.freeze({
    fetch: transport.fetch as typeof fetch,
    ...(transport.signal ? { signal: transport.signal as AbortSignal } : {}),
  });
  const verified = await reverifyGoalStudyBundle(bundle, request);
  try {
    const bytes = encodeGoalQualificationRelease({
      ...verified,
      bundleIndexSha256: bundle.indexSha256,
    });
    if (request.signal?.aborted) throw Error('bots.errors.stale');
    await mkdir(outputDirectory, { recursive: true });
    const path = join(outputDirectory, 'manifest.json');
    await writeFile(path, bytes, { flag: 'wx', mode: 0o644 });
    return Object.freeze({
      path,
      bytes: bytes.byteLength,
      sha256: goalRawBytesSha256(bytes),
      bundleIndexSha256: bundle.indexSha256,
      certificateSha256: verified.certificate.certificateSha256,
    });
  } finally {
    verified.dispose();
  }
}
