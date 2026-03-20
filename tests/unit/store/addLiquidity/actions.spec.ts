import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAssetInfoMock = vi.hoisted(() => vi.fn());

vi.mock('@wallet', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, any>;
  return {
    ...actual,
    api: {
      ...actual.api,
      assets: {
        ...actual.api?.assets,
        getAssetInfo: getAssetInfoMock,
      },
    },
  };
});

vi.mock('@/store/direct-vuex', () => ({
  defineActions: (actions: Record<string, unknown>) => actions,
}));

vi.mock('@/store/addLiquidity', () => ({
  addLiquidityActionContext: (context: Record<string, unknown>) => context,
}));

import actions from '@/store/addLiquidity/actions';

describe('addLiquidity actions', () => {
  beforeEach(() => {
    getAssetInfoMock.mockReset();
  });

  it('handles missing addresses in setDataFromLiquidity without querying assets', async () => {
    const context = {
      dispatch: {
        setFirstTokenAddress: vi.fn(),
        setSecondTokenAddress: vi.fn(),
      },
    };

    await actions.setDataFromLiquidity(
      context as any,
      {
        firstAddress: '',
        secondAddress: undefined,
      } as any
    );

    expect(getAssetInfoMock).not.toHaveBeenCalled();
    expect(context.dispatch.setFirstTokenAddress).toHaveBeenCalledWith('');
    expect(context.dispatch.setSecondTokenAddress).toHaveBeenCalledWith('');
  });

  it('falls back to empty token address when getAssetInfo throws', async () => {
    getAssetInfoMock.mockImplementation(async (address: string) => {
      if (address === 'bad') throw new Error('boom');
      return { address: `resolved-${address}` };
    });

    const context = {
      dispatch: {
        setFirstTokenAddress: vi.fn(),
        setSecondTokenAddress: vi.fn(),
      },
    };

    await actions.setDataFromLiquidity(
      context as any,
      {
        firstAddress: 'bad',
        secondAddress: 'good',
      } as any
    );

    expect(getAssetInfoMock).toHaveBeenCalledTimes(2);
    expect(getAssetInfoMock).toHaveBeenNthCalledWith(1, 'bad');
    expect(getAssetInfoMock).toHaveBeenNthCalledWith(2, 'good');
    expect(context.dispatch.setFirstTokenAddress).toHaveBeenCalledWith('');
    expect(context.dispatch.setSecondTokenAddress).toHaveBeenCalledWith('resolved-good');
  });
});
