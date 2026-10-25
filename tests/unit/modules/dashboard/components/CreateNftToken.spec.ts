import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const formatterMocks = vi.hoisted(() => ({
  formatStringValue: vi.fn((value: string) => `formatted-${value}`),
  getCorrectSupply: vi.fn((value: string) => `correct-${value}`),
}));

const walletStoreMocks = vi.hoisted(() => ({
  nftStorage: null,
  createNftStorageInstance: vi.fn(async () => undefined),
}));

const walletApiMocks = vi.hoisted(() => ({
  registerAsset: vi.fn(async () => undefined),
}));

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useNumberFormatter', () => ({
  __esModule: true,
  useNumberFormatter: () => formatterMocks,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreMocks,
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    assets: {
      register: walletApiMocks.registerAsset,
    },
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/FileUploader.vue', () => ({
  default: {
    name: 'FileUploader',
    template: '<div class="file-uploader"><slot /></div>',
  },
}));

import CreateNftToken from '@/modules/dashboard/components/CreateNftToken.vue';

const mountComponent = () =>
  mount(CreateNftToken, {
    global: {
      stubs: {
        's-input': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<div class="s-input"><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /><slot name="suffix" /></div>',
        },
        's-float-input': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input class="s-float-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        's-switch': {
          props: ['modelValue'],
          emits: ['update:modelValue', 'change'],
          template:
            '<input type="checkbox" class="s-switch" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked); $emit(\'change\', $event.target.checked)" />',
        },
        's-tooltip': {
          template: '<span><slot /></span>',
        },
        's-icon': {
          template: '<i />',
        },
        's-button': {
          template: '<button><slot /></button>',
        },
      },
      directives: {
        loading: () => undefined,
        maska: () => undefined,
      },
    },
  });

const stubImageFetch = () => {
  const fetchMock = vi.fn(async () => ({
    blob: async () => new Blob(['png'], { type: 'image/png' }),
  }));

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
};

const fillRequiredNftFields = (exposed: any) => {
  exposed.tokenSymbol.value = 'NFT';
  exposed.tokenName.value = 'Collectible';
  exposed.tokenDescription.value = 'Test NFT';
  exposed.tokenSupply.value = '1';
};

beforeEach(() => {
  formatterMocks.formatStringValue.mockClear();
  formatterMocks.getCorrectSupply.mockClear();
  walletStoreMocks.nftStorage = null;
  walletStoreMocks.createNftStorageInstance.mockClear();
  walletApiMocks.registerAsset.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CreateNftToken.vue', () => {
  it('computes disabled state and formats supply', async () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    expect(exposed.isCreateDisabled.value).toBe(true);

    exposed.tokenContentLink.value = 'https://ipfs.io/ipfs/QmToken/nft.png';
    exposed.tokenContentIpfsParsed.value = 'QmToken/nft.png';
    exposed.tokenSymbol.value = 'NFT';
    exposed.tokenName.value = 'Collectible';
    exposed.tokenDescription.value = 'Test NFT';
    exposed.tokenSupply.value = '1';

    await flushPromises();

    expect(exposed.isCreateDisabled.value).toBe(false);
    expect(exposed.formattedTokenSupply.value).toBe('formatted-1');
  });

  it('registers NFT metadata with indivisible supply by default', async () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    exposed.tokenContentLink.value = 'https://ipfs.io/ipfs/QmToken/nft.png';
    exposed.tokenContentIpfsParsed.value = 'QmToken/nft.png';
    exposed.tokenSymbol.value = 'NFT';
    exposed.tokenName.value = ' Collectible ';
    exposed.tokenDescription.value = ' Test NFT ';
    exposed.tokenSupply.value = '1';
    exposed.extensibleSupply.value = true;

    await flushPromises();
    await exposed.registerAsset();

    expect(formatterMocks.getCorrectSupply).toHaveBeenCalledWith('1', 0);
    expect(walletApiMocks.registerAsset).toHaveBeenCalledWith('NFT', 'Collectible', 'correct-1', true, true, {
      content: 'QmToken/nft.png',
      description: 'Test NFT',
    });
  });

  it('registers subdomain gateway NFT image links with the CID preserved', async () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    stubImageFetch();

    exposed.handleInputLinkChange('https://bafybeigdyrzt.ipfs.dweb.link/logo.png');
    fillRequiredNftFields(exposed);

    await flushPromises();
    await exposed.registerAsset();

    expect(exposed.badSource.value).toBe(false);
    expect(walletApiMocks.registerAsset).toHaveBeenCalledWith('NFT', 'Collectible', 'correct-1', false, true, {
      content: 'bafybeigdyrzt/logo.png',
      description: 'Test NFT',
    });
  });

  it('rejects image links that are not supported IPFS URL formats', async () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    stubImageFetch();

    exposed.handleInputLinkChange('https://example.com/logo.png');
    fillRequiredNftFields(exposed);

    await flushPromises();
    await exposed.registerAsset();

    expect(exposed.badSource.value).toBe(true);
    expect(exposed.tokenContentIpfsParsed.value).toBe('');
    expect(exposed.isCreateDisabled.value).toBe(true);
    expect(walletApiMocks.registerAsset).not.toHaveBeenCalled();
  });

  it.each(['https://ipfs.io/ipfs//logo.png', 'javascript:alert(1)'])(
    'rejects fetched image links that cannot produce a supported IPFS path: %s',
    async (url) => {
      const wrapper = mountComponent();
      const exposed = (wrapper.vm as any).$?.exposed!;

      stubImageFetch();

      exposed.handleInputLinkChange(url);
      fillRequiredNftFields(exposed);

      await flushPromises();
      await exposed.registerAsset();

      expect(exposed.badSource.value).toBe(true);
      expect(exposed.contentSrcLink.value).toBe('');
      expect(exposed.tokenContentIpfsParsed.value).toBe('');
      expect(walletApiMocks.registerAsset).not.toHaveBeenCalled();
    }
  );

  it('clears previously parsed content when a replacement image link fails IPFS parsing', async () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    stubImageFetch();

    exposed.handleInputLinkChange('https://bafybeigdyrzt.ipfs.dweb.link/logo.png');

    await flushPromises();

    expect(exposed.badSource.value).toBe(false);
    expect(exposed.tokenContentIpfsParsed.value).toBe('bafybeigdyrzt/logo.png');

    exposed.handleInputLinkChange('https://ipfs.io/ipfs//replacement.png');
    fillRequiredNftFields(exposed);

    await flushPromises();
    await exposed.registerAsset();

    expect(exposed.badSource.value).toBe(true);
    expect(exposed.contentSrcLink.value).toBe('');
    expect(exposed.tokenContentIpfsParsed.value).toBe('');
    expect(walletApiMocks.registerAsset).not.toHaveBeenCalled();
  });
});
