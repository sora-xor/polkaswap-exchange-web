/** Strict V2 browser replay. V3 target-WASM execution is installed only by its fixed Node composition. */
import { createGoalEpisodeEvaluatorV2 } from './goal-episode-evaluator';
import {
  createGoalBundleTrainingSourceCore,
  createGoalBundleValidationSourceCore,
  type GoalBundleEpisodeInput,
  type GoalBundleEpisodeDependencies,
  type GoalBundleTrainingInput,
  type GoalBundleValidationAdmission,
} from './goal-bundle-episode-core';
export type {
  GoalBundleArchiveManifest,
  GoalBundleEpisodeReceipt,
  GoalBundleEpisodeInput,
  GoalBundleTrainingInput,
  GoalBundleValidationAdmission,
  GoalBundleEpisodeDependencies,
} from './goal-bundle-episode-core';

/** Replay only V2 training; serialized flags cannot install a target runtime verifier. */
export function createGoalBundleTrainingSource(
  input: GoalBundleTrainingInput,
  dependencies: GoalBundleEpisodeDependencies
) {
  return createGoalBundleTrainingSourceCore(input, dependencies);
}

/** Validation additionally requires the original private live selection and owned metadata. */
export function createGoalBundleValidationSource(
  input: GoalBundleEpisodeInput,
  dependencies: GoalBundleEpisodeDependencies,
  admission: GoalBundleValidationAdmission
) {
  return createGoalBundleValidationSourceCore(input, dependencies, admission);
}

/** Run the unchanged V2 evaluator against the exact original causal evidence. */
export async function evaluateGoalBundleTrainingEpisode(
  input: GoalBundleTrainingInput,
  dependencies: GoalBundleEpisodeDependencies
) {
  const source = createGoalBundleTrainingSource(input, dependencies);
  return createGoalEpisodeEvaluatorV2({ plan: input.plan, source }).evaluate(input.request);
}

/** Recompute selected V2 validation without trusting its saved trace or issuing authority. */
export async function evaluateGoalBundleValidationEpisode(
  input: GoalBundleEpisodeInput,
  dependencies: GoalBundleEpisodeDependencies,
  admission: GoalBundleValidationAdmission
) {
  const source = createGoalBundleValidationSource(input, dependencies, admission);
  return createGoalEpisodeEvaluatorV2({ plan: input.plan, source }).evaluate(
    input.request,
    admission.selection.selection
  );
}
