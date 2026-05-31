import { describe, expect, it, vi } from 'vitest';

import { PolkamarktModule, eventNumber, parseRuntimeNumber, rpcRecord } from '@/lib/substrate/sdk/polkamarkt';
import { Operation } from '@/lib/substrate/sdk/types';

const option = (value: Record<string, unknown>) => ({
  isSome: true,
  unwrap: () => ({
    toJSON: () => value,
  }),
});

function createRoot() {
  const tx = (name: string) =>
    Object.assign({ name }, { paymentInfo: vi.fn().mockResolvedValue({ partialFee: '123' }) });
  const conditionTx = tx('condition');
  const marketTx = tx('market');
  const buyTx = tx('buy');
  const sellTx = tx('sell');
  const flipTx = tx('flip');
  const liquidityTx = tx('liquidity');
  const claimTx = tx('claim');

  const root = {
    account: { pair: { address: 'cnAccount' } },
    connection: { endpoint: 'wss://example.invalid' },
    chainDecimals: 18,
    api: {
      query: {
        polkamarkt: {
          nextConditionId: vi.fn().mockResolvedValue({ toString: () => '9' }),
          nextMarketId: vi.fn().mockResolvedValue({ toString: () => '14' }),
        },
      },
      tx: {
        polkamarkt: {
          createConditionWithDetails: vi.fn(() => conditionTx),
          createMarket: vi.fn(() => marketTx),
          buy: vi.fn(() => buyTx),
          sell: vi.fn(() => sellTx),
          flipPosition: vi.fn(() => flipTx),
          addLiquidity: vi.fn(() => liquidityTx),
          claimMarket: vi.fn(() => claimTx),
          claimMarkets: vi.fn(() => claimTx),
        },
      },
      rpc: {
        polkamarkt: {
          quoteBuy: vi.fn().mockResolvedValue(
            option({
              marketId: 7,
              outcome: 'Yes',
              collateralIn: '100',
              feeAmount: '1',
              pricingCollateral: '99',
              sharesOut: '180',
            })
          ),
          quoteSell: vi.fn().mockResolvedValue(
            option({
              marketId: 7,
              outcome: 'No',
              sharesIn: '200',
              grossCollateralOut: '120',
              feeAmount: '2',
              collateralOut: '118',
            })
          ),
          claimable: vi.fn().mockResolvedValue(
            option({
              marketId: 7,
              account: 'cnAccount',
              status: 'Resolved',
              resolutionOutcome: 'Yes',
              yesShares: '10',
              noShares: '0',
              netCollateralPaid: '100',
              traderPayout: '120',
              creatorFees: '5',
              creatorLiquidity: '6',
              isCreator: true,
            })
          ),
        },
      },
    },
    getTransactionFee: vi.fn().mockResolvedValue('123'),
    submitExtrinsic: vi.fn().mockResolvedValue(undefined),
  } as any;

  return { root, module: new PolkamarktModule(root), conditionTx, marketTx, buyTx, sellTx, flipTx, liquidityTx, claimTx };
}

describe('PolkamarktModule', () => {
  it('parses runtime ids from storage and events', () => {
    expect(parseRuntimeNumber('12,345')).toBe(12345);
    expect(
      eventNumber(
        [
          {
            event: {
              section: 'polkamarkt',
              method: 'MarketCreated',
              data: { toJSON: () => ({ market_id: '42' }) },
            },
          },
        ],
        'MarketCreated',
        'market_id'
      )
    ).toBe(42);
  });

  it('unwraps RPC option records and quote values', async () => {
    const { module } = createRoot();

    expect(rpcRecord(option({ marketId: 1 }))).toEqual({ marketId: 1 });
    await expect(module.quoteBuyTrade({ marketId: 7, outcome: 'Yes', collateralIn: '100' })).resolves.toEqual({
      marketId: 7,
      outcome: 'Yes',
      collateralIn: '100',
      feeAmount: '1',
      pricingCollateral: '99',
      sharesOut: '180',
    });
    await expect(module.quoteSellTrade({ marketId: 7, outcome: 'No', sharesIn: '200' })).resolves.toMatchObject({
      outcome: 'No',
      collateralOut: '118',
    });
  });

  it('creates condition and market with fallback ids and history metadata', async () => {
    const { root, module, conditionTx, marketTx } = createRoot();

    await expect(
      module.createCondition({
        question: 'Will this market be created from Vue?',
        oracle: 'SORA governance',
        resolutionSource: 'Root',
        category: 'Crypto',
      })
    ).resolves.toEqual({ conditionId: 9 });
    expect(root.submitExtrinsic).toHaveBeenCalledWith(conditionTx, root.account.pair, {
      type: Operation.PolkamarktCreateCondition,
    });

    await expect(module.createMarket({ conditionId: 9, closeBlock: 10_000, seedLiquidity: '100000000000000000000' }))
      .resolves.toMatchObject({ conditionId: 9, marketId: 14 });
    expect(root.submitExtrinsic).toHaveBeenLastCalledWith(
      marketTx,
      root.account.pair,
      expect.objectContaining({
        type: Operation.PolkamarktCreateMarket,
        amount: '100',
        symbol: 'KUSD',
      })
    );
  });

  it('submits trade, liquidity, claim, and fee-estimate calls with runtime parameters', async () => {
    const { root, module, buyTx, liquidityTx, claimTx } = createRoot();

    await module.submitBuyTrade({ marketId: 7, outcome: 'Yes', collateralIn: '100', minSharesOut: '90' });
    expect(root.api.tx.polkamarkt.buy).toHaveBeenCalledWith(7, 'Yes', '100', '90');
    expect(root.submitExtrinsic).toHaveBeenLastCalledWith(
      buyTx,
      root.account.pair,
      expect.objectContaining({ type: Operation.PolkamarktBuy })
    );

    await module.addLiquidity({ marketId: 7, collateralAmount: '100', minLpShares: '1' });
    expect(root.api.tx.polkamarkt.addLiquidity).toHaveBeenCalledWith(7, '100', '1');
    expect(root.submitExtrinsic).toHaveBeenLastCalledWith(
      liquidityTx,
      root.account.pair,
      expect.objectContaining({ type: Operation.PolkamarktAddLiquidity })
    );

    await module.claimMarket(7);
    expect(root.api.tx.polkamarkt.claimMarket).toHaveBeenCalledWith(7);
    expect(root.submitExtrinsic).toHaveBeenLastCalledWith(
      claimTx,
      root.account.pair,
      expect.objectContaining({ type: Operation.PolkamarktClaimMarket })
    );

    await expect(module.estimateBuyTradeNetworkFee({ marketId: 7, outcome: 'Yes', collateralIn: '100', minSharesOut: '90' }))
      .resolves.toBe('123');
  });

  it('returns claimable trader, creator, and liquidity values', async () => {
    const { module } = createRoot();

    await expect(module.getClaimableInfo('cnAccount', 7)).resolves.toMatchObject({
      marketId: 7,
      account: 'cnAccount',
      resolutionOutcome: 'Yes',
      traderPayout: '120',
      creatorFees: '5',
      creatorLiquidity: '6',
      isCreator: true,
    });
  });
});
