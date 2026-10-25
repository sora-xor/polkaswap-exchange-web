import { Operation } from '@sora-substrate/sdk';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { describe, expect, it } from 'vitest';

import { resolveBridgeExternalNetworkType, resolveBridgeOperation } from '@/stores/bridge/network';

describe('bridge network helpers', () => {
  it('resolves operation types for each bridge network and direction', () => {
    expect(resolveBridgeOperation(BridgeNetworkType.Eth, true)).toBe(Operation.EthBridgeOutgoing);
    expect(resolveBridgeOperation(BridgeNetworkType.Eth, false)).toBe(Operation.EthBridgeIncoming);
    expect(resolveBridgeOperation(BridgeNetworkType.Evm, true)).toBe(Operation.EvmOutgoing);
    expect(resolveBridgeOperation(BridgeNetworkType.Evm, false)).toBe(Operation.EvmIncoming);
    expect(resolveBridgeOperation(BridgeNetworkType.Sub, true)).toBe(Operation.SubstrateOutgoing);
    expect(resolveBridgeOperation(BridgeNetworkType.Sub, false)).toBe(Operation.SubstrateIncoming);
  });

  it('normalizes generated history network family values', () => {
    expect(resolveBridgeExternalNetworkType(BridgeNetworkType.Sub)).toBe(BridgeNetworkType.Sub);
    expect(resolveBridgeExternalNetworkType(BridgeNetworkType.Evm)).toBe(BridgeNetworkType.Evm);
    expect(resolveBridgeExternalNetworkType(BridgeNetworkType.Eth)).toBe(BridgeNetworkType.Eth);
  });
});
