import { describe, expect, it } from 'vitest';

import mutations from '@/store/web3/mutations';
import { initialState } from '@/store/web3/state';

describe('web3 mutations - setEthBridgeSettings', () => {
  it('ignores empty settings payloads without throwing', () => {
    const state = initialState();
    const initialNetwork = state.ethBridgeEvmNetwork;
    const initialAddress = { ...state.ethBridgeContractAddress };

    expect(() => mutations.setEthBridgeSettings(state, undefined as any)).not.toThrow();

    expect(state.ethBridgeEvmNetwork).toBe(initialNetwork);
    expect(state.ethBridgeContractAddress).toEqual(initialAddress);
  });

  it('stores provided network and contract addresses', () => {
    const state = initialState();

    mutations.setEthBridgeSettings(state, {
      evmNetwork: 1 as any,
      address: {
        XOR: 'xor-contract',
        VAL: 'val-contract',
        OTHER: 'other-contract',
      },
    });

    expect(state.ethBridgeEvmNetwork).toBe(1);
    expect(state.ethBridgeContractAddress).toEqual({
      XOR: 'xor-contract',
      VAL: 'val-contract',
      OTHER: 'other-contract',
    });
  });

  it('preserves existing contract addresses when payload is partial', () => {
    const state = initialState();
    state.ethBridgeContractAddress = Object.freeze({
      XOR: 'existing-xor',
      VAL: 'existing-val',
      OTHER: 'existing-other',
    });

    mutations.setEthBridgeSettings(state, {
      evmNetwork: 11155111 as any,
      address: {
        XOR: 'next-xor',
      } as any,
    });

    expect(state.ethBridgeContractAddress).toEqual({
      XOR: 'next-xor',
      VAL: 'existing-val',
      OTHER: 'existing-other',
    });
  });
});

describe('web3 mutations - env-driven collections', () => {
  it('defaults evm network apps to empty array for invalid payload', () => {
    const state = initialState();

    mutations.setEvmNetworksApp(state, undefined as any);

    expect(state.evmNetworkApps).toEqual([]);
  });

  it('defaults sub-network apps to empty object for invalid payload', () => {
    const state = initialState();

    mutations.setSubNetworkApps(state, undefined as any);

    expect(state.subNetworkApps).toEqual({});
  });
});
