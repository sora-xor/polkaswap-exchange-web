import { onMounted, ref } from 'vue';
import { describe, expect, it } from 'vitest';

import { mountSetup } from '@stubs/mountSetup';

describe('mountSetup', () => {
  it('runs lifecycle hooks with an active Vue component instance', () => {
    const { state } = mountSetup(
      {
        setup() {
          const mounted = ref(false);

          onMounted(() => {
            mounted.value = true;
          });

          return { mounted };
        },
      },
      {}
    );

    expect(state.mounted.value).toBe(true);
  });
});
