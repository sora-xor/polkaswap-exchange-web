import { flushPromises, mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const activeEraRef = ref<number | null>(10);
const activeEraStartRef = ref<number | null>(Date.now());

vi.mock('@/modules/staking/sora/composables/useSoraStaking', () => ({
  __esModule: true,
  useSoraStaking: () => ({
    activeEra: computed(() => activeEraRef.value),
    activeEraStart: computed(() => activeEraStartRef.value),
  }),
}));

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n');
  return {
    __esModule: true,
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  };
});

import EraCountdown from '@/modules/staking/sora/components/EraCountdown.vue';

describe('EraCountdown.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    activeEraRef.value = 10;
    activeEraStartRef.value = Date.now();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('shows zero countdown when target is past or current era', async () => {
    const wrapper = mount(EraCountdown, {
      props: {
        targetEra: 10,
      },
    });

    await flushPromises();

    expect(wrapper.text().trim()).toBe('0D 0H 0M');

    wrapper.unmount();
  });

  it('computes days, hours, minutes for future era and clears interval on unmount', async () => {
    const clearSpy = vi.spyOn(global, 'clearInterval');
    const wrapper = mount(EraCountdown, {
      props: {
        targetEra: 12,
      },
    });

    await flushPromises();

    expect(wrapper.text().trim()).toBe('0D 12H 0M');

    wrapper.unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});
