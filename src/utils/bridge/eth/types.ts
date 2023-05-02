import type { JsonContract } from '@/utils/ethers-util';

export type EthBridgeContractsAddresses = Partial<{
  XOR: string;
  VAL: string;
  OTHER: string;
}>;

export type EthBridgeSmartContracts = Partial<{
  XOR: JsonContract;
  VAL: JsonContract;
  OTHER: {
    BRIDGE: JsonContract;
    ERC20: JsonContract;
  };
}>;
