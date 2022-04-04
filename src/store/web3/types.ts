import type { BridgeNetworks, CodecString } from '@sora-substrate/util';

type Contracts = Partial<{
  XOR: string;
  VAL: string;
  OTHER: string;
}>;

export type Web3State = {
  evmAddress: string;
  evmBalance: CodecString;
  networkType: string;
  subNetworks: Array<any>;
  evmNetwork: BridgeNetworks;
  contractAddress: { [key in BridgeNetworks]: Contracts };
  smartContracts: { [key in BridgeNetworks]: Contracts };
};
