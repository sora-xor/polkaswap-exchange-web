import { describe, expect, it } from 'vitest';

import bridgePageSource from '@/features/bridge/pages/BridgePage.vue?raw';

describe('BridgePage Sub network readiness', () => {
  it('uses the reactive connection snapshot instead of raw connector internals', () => {
    expect(bridgePageSource).toContain('bridgeStore.subNetworkConnectionState');
    expect(bridgePageSource).toContain('subNetworkConnectionState.value.connecting');
    expect(bridgePageSource).toContain('subNetworkConnectionState.value.ready');
    expect(bridgePageSource).not.toContain('subBridgeConnector.value.network?.subNetworkConnection');
    expect(bridgePageSource).not.toContain('!subConnection.value?.nodeIsConnected');
  });

  it('disables the Sub bridge CTA while its selected network is not ready', () => {
    expect(bridgePageSource).toContain('!isSubBridgeReady.value ||');
    expect(bridgePageSource).toContain('networkSelected.value === subNetworkConnectionState.value.network');
  });
});
