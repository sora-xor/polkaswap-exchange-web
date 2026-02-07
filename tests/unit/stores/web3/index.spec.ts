import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWeb3Store } from '@/stores/web3';
import { setLegacyStoreOverride } from '@/utils/legacy-store';

const createLegacyStoreMock = () => {
  const setDialogVisibility = vi.fn();
  const selectExternalNetwork = vi.fn();

  return {
    state: { web3: {} },
    getters: { web3: {} },
    commit: {
      web3: {
        setSelectNetworkDialogVisibility: setDialogVisibility,
      },
    },
    dispatch: {
      web3: {
        selectExternalNetwork,
      },
    },
    spies: { setDialogVisibility, selectExternalNetwork },
  };
};

describe('useWeb3Store legacy proxies', () => {
  const legacyStore = createLegacyStoreMock();

  beforeEach(() => {
    setActivePinia(createPinia());
    setLegacyStoreOverride(legacyStore as unknown as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    setLegacyStoreOverride(null);
  });

  it('delegates dialog visibility mutation to legacy store', () => {
    const web3Store = useWeb3Store();

    web3Store.setSelectNetworkDialogVisibility(false);

    expect(legacyStore.spies.setDialogVisibility).toHaveBeenCalledWith(false);
  });

  it('delegates selectExternalNetwork dispatch to legacy store', async () => {
    const web3Store = useWeb3Store();
    const payload = { id: 1, type: BridgeNetworkType.Eth as const };

    await web3Store.selectExternalNetwork(payload);

    expect(legacyStore.spies.selectExternalNetwork).toHaveBeenCalledWith(payload);
  });
});
