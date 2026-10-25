import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { describe, expect, it } from 'vitest';
import { ref } from 'vue';

import { useWidgetTokenSelect } from '@/composables/useWidgetTokenSelect';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

const mockAsset = {
  address: 'mock-address',
  symbol: 'MOCK',
  name: 'Mock Asset',
  precision: 18,
  icon: '',
} as const satisfies Asset;

describe('useWidgetTokenSelect', () => {
  it('exposes XOR asset by default', () => {
    const { selectedToken } = useWidgetTokenSelect();

    expect(selectedToken.value.address).toBe(XOR.address);
  });

  it('prefers predefined token over fallback asset', () => {
    const predefined = ref<Asset | null>({ ...mockAsset });
    const { selectedToken } = useWidgetTokenSelect({ predefinedToken: predefined });

    expect(selectedToken.value.address).toBe(mockAsset.address);

    predefined.value = null;
    expect(selectedToken.value.address).toBe(XOR.address);
  });

  it('blocks selection when loading sources resolve truthy', () => {
    const loading = ref(true);
    const parentLoading = ref(true);
    const api = useWidgetTokenSelect({ loading, parentLoading: () => parentLoading.value });

    api.handleSelectToken();
    expect(api.showSelectTokenDialog.value).toBe(false);

    loading.value = false;
    parentLoading.value = false;

    api.handleSelectToken();
    expect(api.showSelectTokenDialog.value).toBe(true);

    api.changeToken({ ...mockAsset });
    expect(api.selectedToken.value.address).toBe(mockAsset.address);
  });

  it('ignores token updates if the same asset selected', () => {
    const api = useWidgetTokenSelect();
    const initial = api.selectedToken.value;

    api.changeToken({ ...XOR });
    expect(api.selectedToken.value).toBe(initial);
  });
});
