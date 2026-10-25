import { createAppKit } from '@reown/appkit/vue';

import { app as appMeta } from '@/consts';
import { EVM_NETWORKS } from '@/consts/evm';
import { resolveStaticAssetUrl } from '@/utils/staticAssets';

import { getWalletConnectProjectId } from './walletconnectProject';

import type { AppKit, AppKitOptions } from '@reown/appkit';
import type { ChainsProps } from '@walletconnect/ethereum-provider/dist/types/EthereumProvider';

type AppKitNetworkConfig = AppKitOptions['networks'][number];

const APPKIT_THEME: NonNullable<AppKitOptions['themeVariables']> = {
  '--w3m-font-family': 'var(--s-font-family, "Inter", sans-serif)',
  '--w3m-accent': 'var(--s-color-theme-accent)',
  '--w3m-color-mix': 'var(--s-color-theme-accent)',
  '--w3m-color-mix-strength': 25,
  '--w3m-qr-color': 'var(--s-color-theme-accent)',
  '--w3m-z-index': 9999,
};

const DEFAULT_ICON_PATH = 'favicon.ico';

let appKitPromise: Promise<AppKit> | null = null;
let cachedProjectId: string | null = null;
let cachedNetworks: AppKitNetworkConfig[] = [];
let networksInitialized = false;

const isTestnet = (name: string): boolean => /test|dev|mumbai|sepolia|fuji|baobab|mordor|sepolia/i.test(name);

const buildRpcUrls = (chainId: number, projectId: string, endpoints?: string[]): string[] => {
  const rpcUrls = new Set<string>();

  rpcUrls.add(`https://rpc.walletconnect.com/v1/?chainId=eip155:${chainId}&projectId=${projectId}`);

  endpoints?.forEach((endpoint) => {
    if (!endpoint) return;
    // Skip endpoints that clearly require user-specific API keys (e.g., Infura project placeholders)
    if (/(infura|alchemy)\.io/.test(endpoint) && endpoint.endsWith('/')) return;
    rpcUrls.add(endpoint);
  });

  return Array.from(rpcUrls);
};

const buildNetworks = (projectId: string): AppKitNetworkConfig[] => {
  return Object.values(EVM_NETWORKS).map((network) => {
    const rpcHttp = buildRpcUrls(network.id, projectId, network.endpointUrls);
    const defaultExplorerUrl = network.blockExplorerUrls?.[0];
    const nativeCurrency = network.nativeCurrency ?? {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    };

    return {
      id: network.id,
      name: network.name,
      network: network.shortName?.toLowerCase() ?? `chain-${network.id}`,
      nativeCurrency,
      rpcUrls: {
        default: {
          http: rpcHttp,
        },
        public: {
          http: rpcHttp,
        },
      },
      blockExplorers: defaultExplorerUrl
        ? {
            default: {
              name: `${network.shortName ?? network.name} Explorer`,
              url: defaultExplorerUrl,
            },
          }
        : undefined,
      testnet: isTestnet(network.name),
      chainNamespace: 'eip155',
      caipNetworkId: `eip155:${network.id}`,
    };
  });
};

const getMetadata = (): NonNullable<AppKitOptions['metadata']> => {
  const defaultHref =
    typeof window !== 'undefined' && typeof window.location?.href === 'string'
      ? window.location.href
      : 'https://polkaswap.io/';
  const iconUrl = resolveStaticAssetUrl(DEFAULT_ICON_PATH);
  const metadataUrl = defaultHref;

  return {
    name: appMeta.name,
    description: appMeta.title,
    url: metadataUrl,
    icons: [iconUrl],
  };
};

const normalizeChains = (chains?: number[]): number[] => {
  return Array.from(new Set((chains ?? []).filter((id): id is number => typeof id === 'number')));
};

const ensureAppKitInstance = async (chainProps: ChainsProps): Promise<AppKit> => {
  const projectId = await getWalletConnectProjectId();

  if (!appKitPromise || cachedProjectId !== projectId) {
    cachedProjectId = projectId;
    cachedNetworks = buildNetworks(projectId);

    const defaultChainId = normalizeChains('chains' in chainProps ? chainProps.chains : chainProps.optionalChains)[0];
    const defaultNetwork = cachedNetworks.find((network) => network.id === defaultChainId) ?? cachedNetworks[0];

    appKitPromise = Promise.resolve(
      createAppKit({
        projectId,
        basic: true,
        networks: cachedNetworks as [AppKitNetworkConfig, ...AppKitNetworkConfig[]],
        defaultNetwork,
        metadata: getMetadata(),
        manualWCControl: true,
        enableWalletGuide: false,
        showWallets: true,
        features: {
          email: false,
          socials: false,
          emailCapture: false,
          analytics: false,
          allWallets: false,
        },
        themeVariables: APPKIT_THEME,
      })
    );
    networksInitialized = false;
  }

  const appKit = await appKitPromise;

  if (!networksInitialized) {
    // Ensure the internal requested networks map includes all configured networks initially.
    const initialNetworks = cachedNetworks
      .map((network) => appKit.getCaipNetwork('eip155', network.id))
      .filter((network): network is ReturnType<AppKit['getCaipNetwork']> => Boolean(network));

    if (initialNetworks.length) {
      appKit.setRequestedCaipNetworks(initialNetworks, 'eip155');
    }

    networksInitialized = true;
  }

  return appKit;
};

const updateRequestedNetworks = (appKit: AppKit, chainProps: ChainsProps): void => {
  const baseChains = 'chains' in chainProps ? normalizeChains(chainProps.chains) : [];
  const optionalChains = 'optionalChains' in chainProps ? normalizeChains(chainProps.optionalChains) : [];
  const requestedIds = Array.from(new Set([...baseChains, ...optionalChains]));

  if (!requestedIds.length) return;

  const caipNetworks = requestedIds
    .map((id) => appKit.getCaipNetwork('eip155', id))
    .filter((network): network is ReturnType<AppKit['getCaipNetwork']> => Boolean(network));

  if (caipNetworks.length) {
    appKit.setRequestedCaipNetworks(caipNetworks, 'eip155');
  }
};

export const ensureAppKit = async (chainProps: ChainsProps): Promise<AppKit> => {
  const appKit = await ensureAppKitInstance(chainProps);

  updateRequestedNetworks(appKit, chainProps);

  return appKit;
};

export const resetAppKitCache = (): void => {
  appKitPromise = null;
  cachedProjectId = null;
  cachedNetworks = [];
  networksInitialized = false;
};
