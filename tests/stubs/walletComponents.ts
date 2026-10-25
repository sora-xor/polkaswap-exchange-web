import { vi } from 'vitest';

type StorageStub = {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

const createStorageStub = (): StorageStub => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
});

export const formattedAmountStub = {
  name: 'FormattedAmountStub',
  template: '<div class="formatted-amount-stub"><slot /><slot name="prefix" /></div>',
};

export const tokenLogoStub = {
  name: 'TokenLogoStub',
  template: '<div class="token-logo-stub" />',
};

export const dialogBaseStub = {
  name: 'DialogBaseStub',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:visible'],
  template:
    '<div class="dialog-base-stub" :data-visible="visible" @update:visible="$emit(\'update:visible\', $event)"><slot /></div>',
};

export const infoLineStub = {
  name: 'InfoLineStub',
  props: ['label', 'value'],
  template: '<div class="info-line-stub"><slot name="info-line-prefix" />{{ label }}<slot />{{ value }}</div>',
};

export const externalLinkStub = {
  name: 'ExternalLinkStub',
  props: ['href'],
  template: '<a class="external-link-stub" :href="href"><slot /></a>',
};

export const formattedAddressStub = {
  name: 'FormattedAddressStub',
  props: ['value'],
  template: '<span class="formatted-address-stub">{{ value }}</span>',
};

const defaultComponents = {
  FormattedAmount: formattedAmountStub,
  TokenLogo: tokenLogoStub,
  DialogBase: dialogBaseStub,
  InfoLine: infoLineStub,
  ExternalLink: externalLinkStub,
  FormattedAddress: formattedAddressStub,
};

const defaultWalletConsts = {
  TranslationConsts: {},
  LogoSize: {
    SMALL: 'small',
  },
  FontWeightRate: {
    MEDIUM: 'medium',
  },
  FontSizeRate: {
    MEDIUM: 'medium',
  },
  SoraNetwork: {
    Dev: 'Dev',
    Test: 'Test',
    Stage: 'Stage',
    Prod: 'Prod',
  },
  IndexerType: {
    POLKASWAP: 'polkaswap',
  },
};

const defaultIndexerTypes = {
  Status: {
    IDLE: 'IDLE',
    READY: 'READY',
  },
  IndexerType: {
    POLKASWAP: 'polkaswap',
  },
  OrderStatus: {
    Filled: 'Filled',
    PartialFill: 'PartialFill',
    Cancelled: 'Cancelled',
    Unknown: 'Unknown',
  },
} as const;

type IndexerTypes = typeof defaultIndexerTypes;

export type WalletComponentsMock = {
  __esModule: true;
  components: typeof defaultComponents & Record<string, unknown>;
  WALLET_CONSTS: typeof defaultWalletConsts & Record<string, unknown>;
  storage: StorageStub;
  settingsStorage: StorageStub;
  en: Record<string, unknown>;
  INDEXER_TYPES: IndexerTypes & Record<string, unknown>;
  [key: string]: unknown;
};

export function createWalletComponentsMock(overrides: Partial<WalletComponentsMock> = {}): WalletComponentsMock {
  const { components, WALLET_CONSTS, storage, settingsStorage, en, INDEXER_TYPES, ...rest } = overrides;

  return {
    __esModule: true,
    components: {
      ...defaultComponents,
      ...(components ?? {}),
    },
    WALLET_CONSTS: {
      ...defaultWalletConsts,
      ...(WALLET_CONSTS ?? {}),
    },
    INDEXER_TYPES: {
      ...defaultIndexerTypes,
      ...(INDEXER_TYPES ?? {}),
    },
    storage: storage ?? createStorageStub(),
    settingsStorage: settingsStorage ?? createStorageStub(),
    en: en ?? {},
    ...rest,
  };
}
