import { describe, expect, it, vi } from 'vitest';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@/platform/wallet/navigation', () => ({
  navigateWallet: navigate,
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useWalletTranslation', () => ({
  useWalletTranslation: () => ({
    t: (key: string) => key,
    TranslationConsts: { NFT: 'NFT' },
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/components/CreateSimpleToken.vue', () => ({
  default: { name: 'CreateSimpleTokenStub' },
}));

vi.mock('@/lib/soraneo-wallet/src/components/CreateNftToken.vue', () => ({
  default: { name: 'CreateNftTokenStub' },
}));

import CreateToken from '@/lib/soraneo-wallet/src/components/CreateToken.vue';
import { RouteNames, Step } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet CreateToken', () => {
  it('returns from the confirm screen to the create screen and restores the shared title', () => {
    const state = (CreateToken as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    state.step.value = Step.ConfirmSimpleToken;
    state.currentTab.value = Step.CreateSimpleToken;
    state.showTabs.value = false;
    state.showHeader.value = false;
    state.createTokenTitle.value = 'confirm';
    state.handleBack();

    expect(state.step.value).toBe(Step.CreateSimpleToken);
    expect(state.showTabs.value).toBe(true);
    expect(state.showHeader.value).toBe(true);
    expect(state.createTokenTitle.value).toBe('createToken.titleCommon');
    expect(navigate).toHaveBeenCalledWith({ name: RouteNames.CreateToken });
  });

  it('routes the initial back action through the wallet navigation boundary', () => {
    const state = (CreateToken as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    state.handleBack();

    expect(navigate).toHaveBeenCalledWith({ name: RouteNames.Wallet });
  });

  it('resolves token and NFT tab strings to renderable components', () => {
    const state = (CreateToken as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    expect(state.currentTabComponent.value.name).toBe('CreateSimpleTokenStub');

    state.handleChangeTab(Step.CreateNftToken);

    expect(state.currentTabComponent.value.name).toBe('AsyncComponentWrapper');
  });
});
