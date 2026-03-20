import { describe, expect, it, vi } from 'vitest';

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
    const navigate = vi.fn();
    const context = {
      step: Step.ConfirmSimpleToken,
      currentTab: Step.CreateSimpleToken,
      showTabs: false,
      showHeader: false,
      createTokenTitle: 'confirm',
      navigate,
      t: (key: string) => key,
    };

    (CreateToken as any).methods.handleBack.call(context);

    expect(context.step).toBe(Step.CreateSimpleToken);
    expect(context.showTabs).toBe(true);
    expect(context.showHeader).toBe(true);
    expect(context.createTokenTitle).toBe('createToken.titleCommon');
    expect(navigate).toHaveBeenCalledWith({ name: RouteNames.CreateToken });
  });
});
