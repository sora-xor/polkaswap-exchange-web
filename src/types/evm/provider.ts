import type { ChainsProps } from '@walletconnect/ethereum-provider/dist/types/EthereumProvider';
import type { Eip1193Provider } from 'ethers';

export type EIP1193Provider = Eip1193Provider & {
  connect?: (...args: any[]) => Promise<void>;
};

declare global {
  interface Window {
    fearlessWallet?: {
      provider: EIP1193Provider;
    };
  }

  interface WindowEventMap {
    'eip6963:announceProvider': CustomEvent;
  }
}

export type EIP6963ProviderInfo = {
  rdns: string;
  uuid: string;
  name: string;
  icon: string;
};

export type EIP6963ProviderDetail = {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
};

export type EIP6963AnnounceProviderEvent = {
  detail: EIP6963ProviderDetail;
};

export type AppEIPProvider = EIP6963ProviderInfo & {
  installed?: boolean;
  installUrl?: string;
  getProvider: (chainProps?: ChainsProps) => Promise<Nullable<EIP1193Provider>>;
};
