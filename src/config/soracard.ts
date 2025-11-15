import { loadWalletCore } from '@/utils/walletCore';
const { WALLET_CONSTS } = await loadWalletCore();

export type SoraNetwork = (typeof WALLET_CONSTS.SoraNetwork)[keyof typeof WALLET_CONSTS.SoraNetwork];

export type SoraCardServiceConfig = Record<
  SoraNetwork,
  {
    sdkUrl?: string;
    apiKey?: string;
    env?: string;
    username?: string;
    pass?: string;
    unifiedApiKey?: string;
  }
>;

export type SoraCardConfig = {
  authService?: SoraCardServiceConfig;
  kycService?: SoraCardServiceConfig;
  allowedScriptOrigins?: string[];
};

const DEFAULT_ALLOWED_ORIGINS = [
  'https://auth.soracard.com',
  'https://auth-test.soracard.com',
  'https://kyc.soracard.com',
  'https://kyc-test.soracard.com',
];

const DEFAULT_SORA_CARD_CONFIG: Required<SoraCardConfig> = {
  authService: {
    [WALLET_CONSTS.SoraNetwork.Test]: {
      sdkUrl: 'https://auth-test.soracard.com/WebSDK/WebSDK.js',
      apiKey: '6974528a-ee11-4509-b549-a8d02c1aec0d',
      env: WALLET_CONSTS.SoraNetwork.Test,
    },
    [WALLET_CONSTS.SoraNetwork.Prod]: {
      sdkUrl: 'https://auth.soracard.com/WebSDK/WebSDK.js',
      apiKey: '7d841274-8fa3-4038-bacd-a4264912ea58',
      env: WALLET_CONSTS.SoraNetwork.Prod,
    },
  },
  kycService: {
    [WALLET_CONSTS.SoraNetwork.Test]: {
      sdkUrl: 'https://kyc-test.soracard.com/web/v2/webkyc.js',
      username: 'E7A6CB83-630E-4D24-88C5-18AAF96032A4',
      pass: '75A55B7E-A18F-4498-9092-58C7D6BDB333',
      env: WALLET_CONSTS.SoraNetwork.Test,
      unifiedApiKey: '6974528a-ee11-4509-b549-a8d02c1aec0d',
    },
    [WALLET_CONSTS.SoraNetwork.Prod]: {
      sdkUrl: 'https://kyc.soracard.com/web/v2/webkyc.js',
      username: '880b1171-9008-48b0-8a29-b46bbe2af0be',
      pass: '1b6c4482-a200-4f53-895a-a71245f119cb',
      env: WALLET_CONSTS.SoraNetwork.Prod,
      unifiedApiKey: '7d841274-8fa3-4038-bacd-a4264912ea58',
    },
  },
  allowedScriptOrigins: [...DEFAULT_ALLOWED_ORIGINS],
};

let soraCardConfig: Required<SoraCardConfig> = cloneConfig(DEFAULT_SORA_CARD_CONFIG);

function cloneConfig(config: Required<SoraCardConfig>): Required<SoraCardConfig> {
  return {
    authService: Object.entries(config.authService).reduce<SoraCardServiceConfig>((acc, [network, value]) => {
      acc[network as SoraNetwork] = value ? { ...value } : {};
      return acc;
    }, {} as SoraCardServiceConfig),
    kycService: Object.entries(config.kycService).reduce<SoraCardServiceConfig>((acc, [network, value]) => {
      acc[network as SoraNetwork] = value ? { ...value } : {};
      return acc;
    }, {} as SoraCardServiceConfig),
    allowedScriptOrigins: [...config.allowedScriptOrigins],
  };
}

const mergeServiceConfigs = (base: SoraCardServiceConfig, override?: SoraCardServiceConfig): SoraCardServiceConfig => {
  const result: SoraCardServiceConfig = {} as SoraCardServiceConfig;
  const networks = new Set<SoraNetwork>([
    ...Object.keys(base ?? {}).map((network) => network as SoraNetwork),
    ...Object.keys(override ?? {}).map((network) => network as SoraNetwork),
  ]);

  networks.forEach((network) => {
    const baseConfig = base?.[network] ?? {};
    if (override && Object.prototype.hasOwnProperty.call(override, network)) {
      const overrideConfig = override[network];
      const hasOverrides = overrideConfig && Object.keys(overrideConfig).length > 0;
      result[network] = hasOverrides ? { ...baseConfig, ...overrideConfig } : {};
    } else {
      result[network] = baseConfig ? { ...baseConfig } : {};
    }
  });

  return result;
};

export function setSoraCardConfig(config?: SoraCardConfig | null): void {
  if (!config) {
    soraCardConfig = cloneConfig(DEFAULT_SORA_CARD_CONFIG);
    return;
  }

  const allowedScriptOrigins =
    Array.isArray(config.allowedScriptOrigins) && config.allowedScriptOrigins.length
      ? config.allowedScriptOrigins
          .map((origin) => (typeof origin === 'string' ? origin.trim() : ''))
          .filter((origin) => origin.length > 0)
      : [...DEFAULT_ALLOWED_ORIGINS];

  soraCardConfig = {
    authService: mergeServiceConfigs(DEFAULT_SORA_CARD_CONFIG.authService, config.authService),
    kycService: mergeServiceConfigs(DEFAULT_SORA_CARD_CONFIG.kycService, config.kycService),
    allowedScriptOrigins,
  };
}

export function getSoraCardConfig(): Required<SoraCardConfig> {
  return soraCardConfig;
}

export function getSoraCardServiceConfig(
  network: SoraNetwork,
  service: keyof Pick<SoraCardConfig, 'authService' | 'kycService'>
) {
  return soraCardConfig[service]?.[network];
}

export function getAllowedSoraCardScriptOrigins(): string[] {
  return soraCardConfig.allowedScriptOrigins;
}
