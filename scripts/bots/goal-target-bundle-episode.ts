/** Fixed Node-only V3 raw episode composition. No replacement quote verifier or serialized authority is accepted. */
import { createHash } from 'node:crypto';
import { createGoalEpisodeEvaluatorV3 } from '../../src/features/bot-trading/goal-episode-evaluator';
import {
  createGoalBundleTrainingSourceCore,
  createGoalBundleValidationSourceCore,
  type GoalBundleEpisodeInput,
  type GoalBundleEpisodeDependencies,
  type GoalBundleValidationAdmission,
  type GoalBundleTargetQuoteDriver,
} from '../../src/features/bot-trading/goal-bundle-episode-core';
import { GOAL_TARGET_COMPRESSED_SHA256 } from '../../src/features/bot-trading/goal-target-model';
import { verifyGoalTargetBundleQuote } from './goal-target-bundle-quote';

/** Evidence transport and exact public binary only; the quote implementation is fixed by this module. */
export interface GoalTargetBundleEpisodeDependencies extends GoalBundleEpisodeDependencies {
  compressedBytes: Uint8Array;
}
function check(value: unknown, reason: string): asserts value {
  if (!value) throw Error(`goal-target-bundle-episode:${reason}`);
}
/** Snapshot dependency fields and the binary before any evidence read or asynchronous work. */
function prepare(raw: GoalTargetBundleEpisodeDependencies) {
  check(raw && Object.getPrototypeOf(raw) === Object.prototype, 'dependencies');
  const keys = ['readArtifact', 'compressedBytes', ...(Object.hasOwn(raw, 'signal') ? ['signal'] : [])];
  const d = Object.getOwnPropertyDescriptors(raw);
  check(
    Reflect.ownKeys(d).length === keys.length && keys.every((key) => d[key]?.enumerable && 'value' in d[key]),
    'dependency-fields'
  );
  const readArtifact = d.readArtifact.value as GoalBundleEpisodeDependencies['readArtifact'];
  const signal = d.signal?.value as AbortSignal | undefined;
  check(typeof readArtifact === 'function' && (signal === undefined || signal instanceof AbortSignal), 'dependencies');
  check(!signal?.aborted, 'aborted');
  const supplied: unknown = d.compressedBytes.value;
  check(supplied instanceof Uint8Array, 'binary');
  const prototype = Object.getPrototypeOf(Uint8Array.prototype);
  const length = Object.getOwnPropertyDescriptor(prototype, 'byteLength')!.get!.call(supplied) as number;
  const buffer = Object.getOwnPropertyDescriptor(prototype, 'buffer')!.get!.call(supplied) as ArrayBuffer;
  check(length > 0 && length <= 4 * 1024 * 1024 && !(buffer instanceof SharedArrayBuffer), 'binary');
  const compressedBytes = new Uint8Array(length);
  Uint8Array.prototype.set.call(compressedBytes, supplied);
  check(createHash('sha256').update(compressedBytes).digest('hex') === GOAL_TARGET_COMPRESSED_SHA256, 'binary-pin');
  const driver: GoalBundleTargetQuoteDriver = Object.freeze({
    verify: (binding, bytes) => verifyGoalTargetBundleQuote(binding, bytes, { compressedBytes, signal }),
  });
  return { dependencies: { readArtifact, ...(signal ? { signal } : {}) }, driver };
}

/** Recompute a V3 training episode with exact worker replay; this function creates no qualification. */
export async function evaluateGoalTargetBundleTrainingEpisode(
  input: GoalBundleEpisodeInput,
  dependencies: GoalTargetBundleEpisodeDependencies
) {
  const prepared = prepare(dependencies);
  const source = createGoalBundleTrainingSourceCore(input, prepared.dependencies, prepared.driver);
  return createGoalEpisodeEvaluatorV3({ plan: input.plan, source }).evaluate(input.request);
}

/** Validation remains gated by the same owned live selection and separately owned validation metadata. */
export async function evaluateGoalTargetBundleValidationEpisode(
  input: GoalBundleEpisodeInput,
  dependencies: GoalTargetBundleEpisodeDependencies,
  admission: GoalBundleValidationAdmission
) {
  const prepared = prepare(dependencies);
  const source = createGoalBundleValidationSourceCore(input, prepared.dependencies, admission, prepared.driver);
  return createGoalEpisodeEvaluatorV3({ plan: input.plan, source }).evaluate(
    input.request,
    admission.selection.selection
  );
}
