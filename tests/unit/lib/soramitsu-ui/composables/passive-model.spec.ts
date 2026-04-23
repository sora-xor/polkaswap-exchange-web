import { nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';

import { usePassiveModel } from '@/lib/soramitsu-ui/composables/passive-model';

describe('usePassiveModel', () => {
  it('creates a proxy initialized from the source model', () => {
    const source = ref('initial');
    const proxy = usePassiveModel(source);

    expect(proxy.value).toBe('initial');
    expect(proxy).not.toBe(source);
  });

  it('writes proxy changes back to the source model', async () => {
    const source = ref('initial');
    const proxy = usePassiveModel(source);

    proxy.value = 'updated';
    await nextTick();

    expect(source.value).toBe('updated');
  });

  it('copies source model changes into the proxy without feedback writes', async () => {
    const source = ref('initial');
    const proxy = usePassiveModel(source);

    source.value = 'external';
    await nextTick();

    expect(proxy.value).toBe('external');

    source.value = 'latest';
    await nextTick();

    expect(proxy.value).toBe('latest');
  });

  it('supports deep syncing for object replacements and nested writes', async () => {
    const source = ref({
      amount: {
        value: '10',
      },
    });
    const proxy = usePassiveModel(source, { deep: true });

    source.value = {
      amount: {
        value: '20',
      },
    };
    await nextTick();

    expect(proxy.value.amount.value).toBe('20');

    proxy.value.amount.value = '30';
    await nextTick();

    expect(source.value.amount.value).toBe('30');
  });
});
