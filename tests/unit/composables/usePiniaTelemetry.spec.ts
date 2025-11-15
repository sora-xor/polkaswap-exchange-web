import { describe, expect, it, vi } from 'vitest';
import { createPinia, defineStore, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

const telemetry = vi.hoisted(() => ({
  trackEventMock: vi.fn(),
}));

vi.mock('@/utils/telemetry', () => ({
  trackEvent: telemetry.trackEventMock,
}));

import { usePiniaTelemetry } from '@/composables/usePiniaTelemetry';

describe('usePiniaTelemetry', () => {
  it('emits usage and fallback events', async () => {
    setActivePinia(createPinia());

    const useDummyStore = defineStore('dummy-telemetry', {
      state: () => ({}),
    });

    const TestComponent = defineComponent({
      setup() {
        const store = useDummyStore();
        usePiniaTelemetry(
          'flow-test',
          [
            { store, storeId: 'dummy' },
            { store: null, storeId: 'legacy', fallbackReason: 'legacy-vuex' },
          ],
          {
            metadata: () => ({ extra: 'payload' }),
          }
        );
        return () => null;
      },
    });

    mount(TestComponent);

    expect(telemetry.trackEventMock).toHaveBeenCalledWith(
      'pinia_store_usage',
      expect.objectContaining({ storeId: 'dummy', extra: 'payload' })
    );
    expect(telemetry.trackEventMock).toHaveBeenCalledWith(
      'pinia_store_fallback',
      expect.objectContaining({ storeId: 'legacy', reason: 'legacy-vuex' })
    );
  });
});
