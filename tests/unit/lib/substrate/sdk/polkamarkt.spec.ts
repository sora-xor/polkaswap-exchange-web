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
  const batchTx = tx('batch');
  const buyTx = tx('buy');
  const sellTx = tx('sell');
  const reportTx = tx('report');
  const claimTx = tx('claim');
  const history: Record<string, any> = {};
  const conditionTxId = '0xcondition';
  const marketTxId = '0xmarket';
  const batchTxId = '0xbatch';
  const blockId = '0xblock';
  const phase = (index: number) => ({
    isApplyExtrinsic: true,
    asApplyExtrinsic: { toNumber: () => index },
  });

  const root = {
    account: { pair: { address: 'cnAccount' } },
    connection: { endpoint: 'wss://example.invalid' },
    chainDecimals: 18,
    api: {
      query: {
        polkamarkt: {
          nextConditionId: vi.fn().mockResolvedValue({ toString: () => '9' }),
          nextMarketId: vi.fn().mockResolvedValue({ toString: () => '14' }),
          earlyResolutionReports: vi.fn().mockResolvedValue(
            option({
              reporter: 'cnReporter',
              outcome: 'No',
              bond: '100000000000000000000',
              evidence: {
                uri: [104, 116, 116, 112, 115, 58, 47, 47, 111, 112, 101, 110, 97, 105, 46, 99, 111, 109],
                hash: [1, 2, 3],
                atBlock: '123',
              },
            })
          ),
        },
      },
      tx: {
        polkamarkt: {
          createConditionWithDetails: vi.fn(() => conditionTx),
          createMarket: vi.fn(() => marketTx),
          buy: vi.fn(() => buyTx),
          sell: vi.fn(() => sellTx),
          reportEarlyResolution: vi.fn(() => reportTx),
          claimMarket: vi.fn(() => claimTx),
          claimMarkets: vi.fn(() => claimTx),
          claimCreatorFees: vi.fn(() => claimTx),
        },
        utility: {
          batchAll: vi.fn(() => batchTx),
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
          marketState: vi.fn().mockResolvedValue(
            option({
              marketId: 7,
              mechanism: 'DynamicPariMutuel',
              virtualDepth: '100',
              realYesShares: '20',
              realNoShares: '10',
              dpmCollateral: '50',
              marginalYesPriceBps: 5600,
              marginalNoPriceBps: 4400,
              impliedYesProbabilityBps: 6400,
              impliedNoProbabilityBps: 3600,
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
              claimablePayout: '120',
              creatorFees: '5',
              isCreator: true,
            })
          ),
        },
      },
    },
    getTransactionFee: vi.fn(async (submittedTx) => (submittedTx === batchTx ? '345' : '123')),
    getHistory: vi.fn((id: string) => history[id] ?? null),
    system: {
      getExtrinsicsFromBlock: vi
        .fn()
        .mockResolvedValue([
          { hash: { toString: () => conditionTxId } },
          { hash: { toString: () => marketTxId } },
          { hash: { toString: () => batchTxId } },
        ]),
      getBlockEvents: vi.fn().mockResolvedValue([
        {
          phase: phase(0),
          event: {
            section: 'polkamarkt',
            method: 'ConditionCreated',
            data: { toJSON: () => ({ condition_id: '9' }) },
          },
        },
        {
          phase: phase(1),
          event: {
            section: 'polkamarkt',
            method: 'MarketCreated',
            data: { toJSON: () => ({ market_id: '51', condition_id: '9' }) },
          },
        },
        {
          phase: phase(2),
          event: {
            section: 'polkamarkt',
            method: 'ConditionCreated',
            data: { toJSON: () => ({ condition_id: '9' }) },
          },
        },
        {
          phase: phase(2),
          event: {
            section: 'polkamarkt',
            method: 'MarketCreated',
            data: { toJSON: () => ({ market_id: '51', condition_id: '9' }) },
          },
        },
      ]),
    },
    submitExtrinsic: vi.fn(async (submittedTx, _pair, historyData) => {
      const txId = submittedTx === conditionTx ? conditionTxId : submittedTx === batchTx ? batchTxId : marketTxId;
      history[historyData.id] = {
        ...historyData,
        status: 'finalized',
        blockId,
        txId,
      };
    }),
  } as any;

  return {
    root,
    module: new PolkamarktModule(root),
    conditionTx,
    marketTx,
    batchTx,
    buyTx,
    sellTx,
    reportTx,
    claimTx,
  };
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

  it('unwraps RPC option records and DPM quote values', async () => {
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
    await expect(module.getMarketState(7)).resolves.toMatchObject({
      marketId: 7,
      mechanism: 'DynamicPariMutuel',
      virtualDepth: '100',
      dpmCollateral: '50',
      marginalYesPriceBps: 5600,
      impliedYesProbabilityBps: 6400,
    });
  });

  it('does not expose removed Polkamarkt CLOB or AMM entrypoints', () => {
    const { module } = createRoot();
    const api = module as unknown as Record<string, unknown>;

    for (const method of [
      'placeOrder',
      'cancelOrder',
      'addLiquidity',
      'claimLiquidity',
      'claimCreatorLiquidity',
      'flipPosition',
      'splitPosition',
      'mergePositions',
      'quoteOrder',
      'quoteAddLiquidity',
      'quoteFlip',
    ]) {
      expect(api[method]).toBeUndefined();
    }
  });

  it('estimates creation fees with a batch and creates a DPM market from the finalized condition id', async () => {
    const { root, module, conditionTx, marketTx, batchTx } = createRoot();

    await expect(
      module.estimateMarketCreationFee({
        question: 'Will this market be created from Vue?',
        oracle: 'SORA governance',
        resolutionSource: 'Root',
        category: 'Crypto',
        closeBlock: 10_000,
      })
    ).resolves.toEqual({ conditionFee: '123', marketFee: '123', totalFee: '345' });
    expect(root.api.tx.polkamarkt.createMarket).toHaveBeenCalledWith(9, 10_000);
    expect(root.api.tx.utility.batchAll).toHaveBeenCalledWith([conditionTx, marketTx]);

    await expect(
      module.createMarket({
        question: 'Will this market be created from Vue?',
        oracle: 'SORA governance',
        resolutionSource: 'Root',
        category: 'Crypto',
        closeBlock: 10_000,
      })
    ).resolves.toEqual({ conditionId: 9, marketId: 51 });

    expect(root.api.tx.polkamarkt.createMarket).toHaveBeenLastCalledWith(9, 10_000);
    expect(root.api.tx.utility.batchAll).toHaveBeenCalledTimes(1);
    expect(root.submitExtrinsic).toHaveBeenCalledTimes(2);
    expect(root.submitExtrinsic).toHaveBeenNthCalledWith(
      1,
      conditionTx,
      root.account.pair,
      expect.objectContaining({
        type: Operation.PolkamarktCreateCondition,
      })
    );
    expect(root.submitExtrinsic).toHaveBeenNthCalledWith(
      2,
      marketTx,
      root.account.pair,
      expect.objectContaining({
        type: Operation.PolkamarktCreateMarket,
        amount: '0',
        symbol: 'KUSD',
      })
    );
  });

  it('only requires next condition id for fee estimation', async () => {
    const { root, module } = createRoot();
    root.api.query.polkamarkt.nextConditionId.mockResolvedValueOnce(null);

    await expect(
      module.estimateMarketCreationFee({
        question: 'Will this market avoid unsafe retries?',
        oracle: 'SORA governance',
        resolutionSource: 'Root',
        category: 'Crypto',
        closeBlock: 10_000,
      })
    ).rejects.toThrow('Unable to read next Polkamarkt condition id before estimating market creation fees.');
    expect(root.api.tx.utility.batchAll).not.toHaveBeenCalled();
    expect(root.submitExtrinsic).not.toHaveBeenCalled();

    root.api.query.polkamarkt.nextConditionId.mockClear();
    await expect(
      module.createMarket({
        question: 'Will this market avoid unsafe retries?',
        oracle: 'SORA governance',
        resolutionSource: 'Root',
        category: 'Crypto',
        closeBlock: 10_000,
      })
    ).resolves.toEqual({ conditionId: 9, marketId: 51 });
    expect(root.api.query.polkamarkt.nextConditionId).not.toHaveBeenCalled();
  });

  it('fails condition creation when the finalized extrinsic has no condition-created event', async () => {
    const { root, module } = createRoot();
    root.system.getBlockEvents.mockResolvedValueOnce([]);

    await expect(
      module.createCondition({
        question: 'Will missing events block unsafe retries?',
        oracle: 'SORA governance',
        resolutionSource: 'Root',
        category: 'Crypto',
      })
    ).rejects.toThrow('Finalized Polkamarkt transaction did not emit ConditionCreated.conditionId.');
  });

  it('submits DPM trades, reports, claims, and fee-estimate calls with runtime parameters', async () => {
    const { root, module, buyTx, sellTx, reportTx, claimTx } = createRoot();

    await module.submitBuyTrade({ marketId: 7, outcome: 'Yes', collateralIn: '100', minSharesOut: '90' });
    expect(root.api.tx.polkamarkt.buy).toHaveBeenCalledWith(7, 'Yes', '100', '90');
    expect(root.submitExtrinsic).toHaveBeenLastCalledWith(
      buyTx,
      root.account.pair,
      expect.objectContaining({ type: Operation.PolkamarktBuy })
    );

    await module.submitSellTrade({ marketId: 7, outcome: 'No', sharesIn: '80', minCollateralOut: '70' });
    expect(root.api.tx.polkamarkt.sell).toHaveBeenCalledWith(7, 'No', '80', '70');
    expect(root.submitExtrinsic).toHaveBeenLastCalledWith(
      sellTx,
      root.account.pair,
      expect.objectContaining({ type: Operation.PolkamarktSell })
    );

    await expect(
      module.estimateReportEarlyResolutionNetworkFee({
        marketId: 7,
        outcome: 'Yes',
        evidence: { uri: 'https://openai.com/release', hash: '0x'.padEnd(66, 'a') },
      })
    ).resolves.toBe('123');
    expect(root.api.tx.polkamarkt.reportEarlyResolution).toHaveBeenCalledWith(
      7,
      'Yes',
      expect.objectContaining({
        uri: Array.from(new TextEncoder().encode('https://openai.com/release')),
        hash: expect.any(Array),
      })
    );

    await module.reportEarlyResolution({
      marketId: 7,
      outcome: 'No',
      evidence: { uri: 'https://openai.com/news' },
    });
    expect(root.api.tx.polkamarkt.reportEarlyResolution).toHaveBeenLastCalledWith(
      7,
      'No',
      expect.objectContaining({
        uri: Array.from(new TextEncoder().encode('https://openai.com/news')),
        hash: null,
      })
    );
    expect(root.submitExtrinsic).toHaveBeenLastCalledWith(
      reportTx,
      root.account.pair,
      expect.objectContaining({
        type: Operation.PolkamarktReportEarlyResolution,
        amount: '100',
        symbol: 'KUSD',
      })
    );

    await module.claimMarket(7);
    expect(root.api.tx.polkamarkt.claimMarket).toHaveBeenCalledWith(7);
    expect(root.submitExtrinsic).toHaveBeenLastCalledWith(
      claimTx,
      root.account.pair,
      expect.objectContaining({ type: Operation.PolkamarktClaimMarket })
    );

    await module.claimCreatorFees(7);
    expect(root.api.tx.polkamarkt.claimCreatorFees).toHaveBeenCalledWith(7);

    await expect(
      module.estimateBuyTradeNetworkFee({ marketId: 7, outcome: 'Yes', collateralIn: '100', minSharesOut: '90' })
    ).resolves.toBe('123');
    await expect(
      module.estimateSellTradeNetworkFee({ marketId: 7, outcome: 'No', sharesIn: '80', minCollateralOut: '70' })
    ).resolves.toBe('123');
  });

  it('rejects malformed early resolution evidence before fee estimation or submission', async () => {
    const { root, module } = createRoot();

    expect(() =>
      module.estimateReportEarlyResolutionNetworkFee({
        marketId: 7,
        outcome: 'Yes',
        evidence: { uri: '   ' },
      })
    ).toThrow('Evidence URI is required.');
    expect(root.getTransactionFee).not.toHaveBeenCalled();
    expect(root.api.tx.polkamarkt.reportEarlyResolution).not.toHaveBeenCalled();

    expect(() =>
      module.reportEarlyResolution({
        marketId: 7,
        outcome: 'No',
        evidence: { uri: 'https://openai.com/news', hash: '0x1234' },
      })
    ).toThrow('Evidence hash must be a 32-byte hex value.');
    expect(root.submitExtrinsic).not.toHaveBeenCalled();
  });

  it('returns claimable trader and creator fee values', async () => {
    const { root, module } = createRoot();

    await expect(module.getClaimableInfo('cnAccount', 7)).resolves.toMatchObject({
      marketId: 7,
      account: 'cnAccount',
      resolutionOutcome: 'Yes',
      traderPayout: '120',
      claimablePayout: '120',
      creatorFees: '5',
      isCreator: true,
    });

    root.api.rpc.polkamarkt.claimable.mockResolvedValueOnce(
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
        isCreator: true,
      })
    );
    await expect(module.getClaimableInfo('cnAccount', 7)).resolves.toMatchObject({
      traderPayout: '120',
      claimablePayout: undefined,
    });

    await expect(module.getEarlyResolutionReport(7)).resolves.toMatchObject({
      marketId: 7,
      reporter: 'cnReporter',
      outcome: 'No',
      bond: '100000000000000000000',
      evidenceUri: 'https://openai.com',
      evidenceHash: '0x010203',
      evidenceBlock: 123,
    });
  });
});
