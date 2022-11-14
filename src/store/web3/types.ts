import type { BridgeNetworks, CodecString } from '@sora-substrate/util';

import type { SubNetwork } from '@/utils/ethers-util';

type Contracts = Partial<{
  XOR: string;
  VAL: string;
  OTHER: string;
}>;

export type Web3State = {
  evmAddress: string;
  evmBalance: CodecString;
  networkType: Nullable<string>;
  subNetworks: Array<SubNetwork>;
  evmNetwork: BridgeNetworks;
  contractAddress: { [key in BridgeNetworks]: Contracts };
  smartContracts: { [key in BridgeNetworks]: Contracts };
};
