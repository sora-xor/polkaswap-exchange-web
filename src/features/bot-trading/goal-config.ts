/** Shipped release trust roots only. Never populate from URL parameters, local storage, AI or public manifests. */
import type { GoalApplicationRelease } from './goal-application';

/** No completed qualified production study exists yet; ordinary bot flows remain available. */
export const GOAL_APPLICATION_RELEASES: readonly Readonly<GoalApplicationRelease>[] = Object.freeze([]);
