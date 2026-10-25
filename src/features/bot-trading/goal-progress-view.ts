/** Reactive display-only clock: reevaluate at the original deadline, never poll prices or orders. */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { projectExactGoalProgress, type GoalProgressOptions } from './goal-progress';
import type { BotDefinition } from './types';
/** Share the exact projection between progress cards and their presentation-only action buttons. */
export function useExactGoalProgress(
  read: () => Omit<GoalProgressOptions, 'now'> & { bot: BotDefinition | null; now?: number }
) {
  const clock = ref(Date.now());
  let timer: ReturnType<typeof setTimeout> | undefined;
  const progress = computed(() => {
    const input = read();
    return input.bot
      ? projectExactGoalProgress(input.bot, { ...input, now: input.now ?? clock.value })
      : { kind: 'legacy' as const };
  });
  watch(
    [() => (progress.value.kind === 'exact' ? progress.value.deadlineAtMs : undefined), () => read().now],
    ([deadline, supplied]) => {
      clearTimeout(timer);
      clock.value = Date.now();
      if (supplied === undefined && deadline !== undefined && deadline > clock.value)
        timer = setTimeout(
          () => {
            clock.value = Date.now();
          },
          Math.min(deadline - clock.value + 1, 2147483647)
        );
    },
    { immediate: true }
  );
  onBeforeUnmount(() => clearTimeout(timer));
  return progress;
}
