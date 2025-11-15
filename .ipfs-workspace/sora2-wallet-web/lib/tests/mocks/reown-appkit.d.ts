export type AppKitOptions = {
  networks: any[];
  defaultNetwork?: any;
  metadata?: {
    name: string;
    description?: string;
    url?: string;
    icons?: string[];
  };
  manualWCControl?: boolean;
  enableWalletGuide?: boolean;
  showWallets?: boolean;
  themeVariables?: Record<string, string | number>;
};
export type AppKit = {
  open: (options?: unknown) => Promise<void>;
  close: () => Promise<void>;
  subscribeState: (callback: (state: { open: boolean }) => void) => () => void;
  setRequestedCaipNetworks: (networks: unknown[], namespace: string) => void;
  getCaipNetwork: (namespace: string, id: unknown) => unknown;
};
export declare const createAppKit: (_options: AppKitOptions) => AppKit;
