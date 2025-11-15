import { createAppKit } from '@reown/appkit/vue';

import { TranslationConsts } from '../../consts';

import type { AppKit, AppKitOptions } from '@reown/appkit';
import type { AppKitNetwork, ChainNamespace } from '@reown/appkit-common';
import type { ChainId } from './provider/base';

type WalletConnectModalState = { open: boolean };

export type WalletConnectModal = {
  openModal: (options?: { uri?: string }) => Promise<void>;
  closeModal: () => Promise<void>;
  subscribeModal: (callback: (state: WalletConnectModalState) => void) => () => void;
};

type EnsureModalConfig = {
  projectId: string;
  namespace: ChainNamespace;
  chains: ChainId[];
  optionalChains?: ChainId[];
};

const APPKIT_THEME: NonNullable<AppKitOptions['themeVariables']> = {
  '--w3m-font-family': 'var(--s-font-family, "Inter", sans-serif)',
  '--w3m-accent': 'var(--s-color-theme-accent, #ff931e)',
  '--w3m-color-mix': 'var(--s-color-theme-accent, #ff931e)',
  '--w3m-color-mix-strength': 25,
  '--w3m-qr-color': 'var(--s-color-theme-accent, #ff931e)',
  '--w3m-z-index': 9999,
};

const DEFAULT_ICON_PATH = '/favicon.ico';
const DEFAULT_CHAIN_ID = 'sora-mainnet';

let appKitPromise: Promise<AppKit> | null = null;
let cachedProjectId: string | null = null;
let cachedNamespace: ChainNamespace | null = null;
let cachedNetworks: AppKitNetwork[] = [];

const toNetworkId = (value: ChainId): string => {
  if (typeof value === 'number') {
    return value.toString(10);
  }

  return String(value);
};

const buildRpcUrls = (namespace: ChainNamespace, id: ChainId, projectId: string): string[] => {
  const plainId = toNetworkId(id);

  return [`https://rpc.walletconnect.com/v1/?chainId=${namespace}:${plainId}&projectId=${projectId}`];
};

const buildNetworkName = (namespace: ChainNamespace, id: ChainId): string => {
  if (namespace === 'polkadot') {
    const plainId = toNetworkId(id);
    return plainId.length > 8 ? `Substrate ${plainId.slice(2, 8).toUpperCase()}` : `Substrate ${plainId}`;
  }

  return `${namespace.toUpperCase()} ${toNetworkId(id)}`;
};

const buildNetworks = (config: EnsureModalConfig): AppKitNetwork[] => {
  const { namespace, chains, projectId } = config;
  const unique = new Map<string, AppKitNetwork>();
  const sourceIds = chains.length ? chains : [DEFAULT_CHAIN_ID];

  sourceIds.forEach((id) => {
    const plainId = toNetworkId(id);
    const network: AppKitNetwork = {
      id,
      name: buildNetworkName(namespace, id),
      nativeCurrency: {
        name: 'SORA',
        symbol: 'XOR',
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: buildRpcUrls(namespace, id, projectId),
        },
        public: {
          http: buildRpcUrls(namespace, id, projectId),
        },
      },
      testnet: false,
      chainNamespace: namespace,
      caipNetworkId: `${namespace}:${plainId}`,
    };

    unique.set(plainId, network);
  });

  const networks = Array.from(unique.values());

  if (networks.length === 0) {
    throw new Error('Unable to resolve AppKit networks');
  }

  return networks;
};

const getMetadata = (): NonNullable<AppKitOptions['metadata']> => {
  const origin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://polkaswap.io';

  return {
    name: TranslationConsts.Polkaswap,
    description: TranslationConsts.Polkaswap,
    url: origin,
    icons: [`${origin}${DEFAULT_ICON_PATH}`],
  };
};

const ensureAppKit = async (config: EnsureModalConfig): Promise<AppKit> => {
  const { namespace, chains, optionalChains, projectId } = config;

  if (!appKitPromise || cachedProjectId !== projectId || cachedNamespace !== namespace) {
    cachedProjectId = projectId;
    cachedNamespace = namespace;
    cachedNetworks = buildNetworks(config);

    const defaultNetwork = cachedNetworks[0];

    appKitPromise = Promise.resolve(
      createAppKit({
        projectId,
        networks: cachedNetworks as [AppKitNetwork, ...AppKitNetwork[]],
        defaultNetwork,
        metadata: getMetadata(),
        manualWCControl: true,
        enableWalletGuide: false,
        showWallets: true,
        themeVariables: APPKIT_THEME,
      })
    );
  }

  const appKit = await appKitPromise;
  const requestedChainIds = new Set([...chains, ...(optionalChains ?? [])].map(toNetworkId));

  if (requestedChainIds.size) {
    const requestedNetworks = Array.from(requestedChainIds)
      .map((id) => appKit.getCaipNetwork(namespace, id))
      .filter((network): network is NonNullable<typeof network> => Boolean(network));

    if (requestedNetworks.length) {
      appKit.setRequestedCaipNetworks(requestedNetworks, namespace);
    }
  }

  return appKit;
};

/**
 * Lazily creates (or reuses) an AppKit instance configured for the provided
 * WalletConnect namespace and returns a minimal modal bridge compatible with
 * the existing provider API.
 */
export const ensureWalletConnectModal = async (config: EnsureModalConfig): Promise<WalletConnectModal> => {
  const appKit = await ensureAppKit(config);
  const { namespace } = config;

  const subscribeModal: WalletConnectModal['subscribeModal'] = (callback) => {
    return appKit.subscribeState((state) => callback({ open: Boolean(state?.open) }));
  };

  const openModal: WalletConnectModal['openModal'] = async (options) => {
    await appKit.open({
      view: 'Connect',
      namespace,
      uri: options?.uri,
    });
  };

  const closeModal: WalletConnectModal['closeModal'] = async () => {
    await appKit.close();
  };

  return {
    openModal,
    closeModal,
    subscribeModal,
  };
};

/**
 * Clears the cached AppKit instance to ensure isolation between tests.
 */
export const resetWalletConnectModalCache = (): void => {
  appKitPromise = null;
  cachedProjectId = null;
  cachedNamespace = null;
  cachedNetworks = [];
};
