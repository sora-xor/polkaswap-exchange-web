import type { ChainNamespace } from '@reown/appkit-common';
import type { WalletConnectModal as WalletConnectLegacyModal } from '@walletconnect/modal';
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

const MODAL_THEME = {
  '--wcm-z-index': '9999',
  '--wcm-font-family': 'var(--s-font-family, "Inter", sans-serif)',
  '--wcm-accent-color': 'var(--s-color-theme-accent, #ff931e)',
  '--wcm-accent-fill-color': 'var(--s-color-theme-accent, #ff931e)',
} as const;

let modalInstance: WalletConnectLegacyModal | null = null;
let cachedProjectId: string | null = null;
let cachedNamespace: ChainNamespace | null = null;
let cachedChainsKey: string | null = null;
let walletConnectModalModulePromise: Promise<typeof import('@walletconnect/modal')> | null = null;

const loadWalletConnectModalCtor = async (): Promise<typeof import('@walletconnect/modal').WalletConnectModal> => {
  if (!walletConnectModalModulePromise) {
    walletConnectModalModulePromise = import('@walletconnect/modal');
  }

  const module = await walletConnectModalModulePromise;

  return module.WalletConnectModal;
};

const toNetworkId = (value: ChainId): string => {
  if (typeof value === 'number') return value.toString(10);
  return String(value);
};

const buildChains = (config: EnsureModalConfig): string[] => {
  const source = [...config.chains, ...(config.optionalChains ?? [])];
  const unique = new Set(source.map((id) => `${config.namespace}:${toNetworkId(id)}`));
  return Array.from(unique);
};

const ensureModalInstance = async (config: EnsureModalConfig): Promise<WalletConnectLegacyModal> => {
  const chains = buildChains(config);
  const chainsKey = chains.join('|');

  if (
    !modalInstance ||
    cachedProjectId !== config.projectId ||
    cachedNamespace !== config.namespace ||
    cachedChainsKey !== chainsKey
  ) {
    cachedProjectId = config.projectId;
    cachedNamespace = config.namespace;
    cachedChainsKey = chainsKey;

    const WalletConnectModalCtor = await loadWalletConnectModalCtor();

    modalInstance = new WalletConnectModalCtor({
      projectId: config.projectId,
      chains,
      enableAuthMode: false,
      enableExplorer: true,
      explorerRecommendedWalletIds: 'NONE',
      themeMode: 'light',
      themeVariables: MODAL_THEME,
    });
  }

  return modalInstance;
};

/**
 * Returns a lightweight WalletConnect modal bridge that does not rely on
 * Reown cloud-auth features, so IPFS-hosted origins can still open the QR flow.
 */
export const ensureWalletConnectModal = async (config: EnsureModalConfig): Promise<WalletConnectModal> => {
  const modal = await ensureModalInstance(config);

  const subscribeModal: WalletConnectModal['subscribeModal'] = (callback) => {
    return modal.subscribeModal((state) => callback({ open: Boolean(state?.open) }));
  };

  const openModal: WalletConnectModal['openModal'] = async (options) => {
    await modal.openModal({ uri: options?.uri });
  };

  const closeModal: WalletConnectModal['closeModal'] = async () => {
    modal.closeModal();
  };

  return {
    openModal,
    closeModal,
    subscribeModal,
  };
};

export const resetWalletConnectModalCache = (): void => {
  modalInstance = null;
  cachedProjectId = null;
  cachedNamespace = null;
  cachedChainsKey = null;
};
