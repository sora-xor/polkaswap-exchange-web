/** Small, application-pinned strategy releases. Full raw-history replay belongs to the release process. */
import { createGoalBundleTransport } from './goal-bundle-transport';
import {
  GOAL_QUALIFICATION_RELEASE_MAX_BYTES,
  verifyPinnedGoalQualificationRelease,
  type GoalQualificationReleasePins,
} from './goal-qualification';

export interface GoalQualificationReleasePin extends GoalQualificationReleasePins {
  /** Canonical HTTPS URL ending in /manifest.json, from trusted shipped configuration. */
  url: string;
}

/** Fetch one bounded release; abort/dispose revokes its owned qualification even after loading finishes. */
export async function loadGoalQualificationRelease(
  pin: GoalQualificationReleasePin,
  dependencies: { fetch: typeof fetch; signal?: AbortSignal }
) {
  const fields = Object.getOwnPropertyDescriptors(pin);
  const names = ['url', 'sha256', 'bundleIndexSha256', 'certificateSha256'];
  if (
    Object.getPrototypeOf(pin) !== Object.prototype ||
    Reflect.ownKeys(fields).length !== names.length ||
    names.some((name) => !fields[name]?.enumerable || !('value' in fields[name]))
  )
    throw Error('bots.errors.research');
  const value = Object.fromEntries(
    names.map((name) => [name, fields[name].value])
  ) as unknown as GoalQualificationReleasePin;
  if (typeof value.url !== 'string' || !value.url.endsWith('/manifest.json')) throw Error('bots.errors.research');
  const transport = createGoalBundleTransport(value.url.slice(0, -'manifest.json'.length), dependencies);
  const signal = dependencies.signal;
  let owned: ReturnType<typeof verifyPinnedGoalQualificationRelease> | undefined;
  let closed = false;
  const dispose = () => {
    if (closed) return;
    closed = true;
    owned?.dispose();
    transport.dispose();
    signal?.removeEventListener('abort', dispose);
  };
  signal?.addEventListener('abort', dispose, { once: true });
  if (signal?.aborted) dispose();
  try {
    if (closed) throw Error('bots.errors.stale');
    const bytes = await transport.read('manifest.json', value.sha256, GOAL_QUALIFICATION_RELEASE_MAX_BYTES);
    if (closed) throw Error('bots.errors.stale');
    owned = verifyPinnedGoalQualificationRelease(bytes, {
      sha256: value.sha256,
      bundleIndexSha256: value.bundleIndexSha256,
      certificateSha256: value.certificateSha256,
    });
    if (closed || signal?.aborted) {
      owned.dispose();
      throw Error('bots.errors.stale');
    }
    transport.dispose();
    return Object.freeze({ certificate: owned.certificate, verification: owned.verification, dispose });
  } catch (error) {
    dispose();
    throw error instanceof Error && error.message === 'bots.errors.stale' ? error : Error('bots.errors.research');
  }
}
