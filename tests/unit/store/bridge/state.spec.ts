import { describe, expect, it, vi } from 'vitest';
import { isReactive } from 'vue';

vi.mock('@/utils/bridge/sub/classes/adapter', () => {
  class MockSubNetworksConnector {}

  return { SubNetworksConnector: MockSubNetworksConnector };
});

import { initialState } from '@/store/bridge/state';
import { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';

describe('bridge state', () => {
  it('keeps subBridgeConnector as a raw SubNetworksConnector instance', () => {
    const state = initialState();

    expect(state.subBridgeConnector).toBeInstanceOf(SubNetworksConnector);
    expect(isReactive(state.subBridgeConnector)).toBe(false);
  });
});
