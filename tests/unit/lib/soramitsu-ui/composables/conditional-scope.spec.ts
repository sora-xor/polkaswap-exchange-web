import { effectScope, nextTick, onScopeDispose, ref, watch } from 'vue';
import { describe, expect, it } from 'vitest';

import { useConditionalScope } from '@/lib/soramitsu-ui/composables/conditional-scope';

describe('useConditionalScope', () => {
  it('starts immediately when enabled and stops the active scope when disabled', async () => {
    const enabled = ref(true);
    const events: string[] = [];
    const scope = effectScope();

    scope.run(() => {
      useConditionalScope(enabled, () => {
        events.push('setup');
        onScopeDispose(() => {
          events.push('stop');
        });
      });
    });

    expect(events).toEqual(['setup']);

    enabled.value = false;
    await nextTick();

    expect(events).toEqual(['setup', 'stop']);

    enabled.value = true;
    await nextTick();

    expect(events).toEqual(['setup', 'stop', 'setup']);

    scope.stop();

    expect(events).toEqual(['setup', 'stop', 'setup', 'stop']);
  });

  it('disposes watchers created inside the conditional scope', async () => {
    const enabled = ref(false);
    const source = ref(0);
    const observedValues: number[] = [];
    const scope = effectScope();

    scope.run(() => {
      useConditionalScope(enabled, () => {
        watch(
          source,
          (value) => {
            observedValues.push(value);
          },
          { immediate: true }
        );
      });
    });

    expect(observedValues).toEqual([]);

    enabled.value = true;
    await nextTick();

    expect(observedValues).toEqual([0]);

    source.value = 1;
    await nextTick();

    expect(observedValues).toEqual([0, 1]);

    enabled.value = false;
    await nextTick();
    source.value = 2;
    await nextTick();

    expect(observedValues).toEqual([0, 1]);

    enabled.value = true;
    await nextTick();

    expect(observedValues).toEqual([0, 1, 2]);

    scope.stop();
  });
});
