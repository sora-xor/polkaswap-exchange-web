import { describe, expect, it } from 'vitest';
import { assessBotFundingPreflight } from '@/features/bot-trading/funding-preflight';
import { KUSD, XOR } from '@/lib/substrate/sdk/assets/consts';

const UNIT = '1000000000000000000';

describe('simple bot funding preflight', () => {
  it('reports exact separate KUSD and XOR shortfalls without rounding or changing balances', () => {
    const balances = {
      [KUSD.address]: '9102677405771664461',
      [XOR.address]: '119868161609067204',
    };
    const result = assessBotFundingPreflight({
      inputAsset: KUSD,
      capitalCodec: '10000000000000000000',
      feeReserveXorCodec: UNIT,
      availableCodecByAddress: balances,
    });
    expect(result).toEqual({
      sufficient: false,
      assets: [
        {
          asset: KUSD,
          availableCodec: balances[KUSD.address],
          requiredCodec: '10000000000000000000',
          shortfallCodec: '897322594228335539',
          available: '9.102677405771664461',
          required: '10',
          shortfall: '0.897322594228335539',
        },
        {
          asset: XOR,
          availableCodec: balances[XOR.address],
          requiredCodec: UNIT,
          shortfallCodec: '880131838390932796',
          available: '0.119868161609067204',
          required: '1',
          shortfall: '0.880131838390932796',
        },
      ],
    });
    expect(balances[KUSD.address]).toBe('9102677405771664461');
  });

  it('counts an XOR-input reserve inside the total capital cap exactly once', () => {
    const result = assessBotFundingPreflight({
      inputAsset: XOR,
      capitalCodec: '10000000000000000000',
      feeReserveXorCodec: UNIT,
      availableCodecByAddress: { [XOR.address]: '10000000000000000000' },
    });
    expect(result.sufficient).toBe(true);
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]).toMatchObject({ required: '10', shortfall: '0' });
  });

  it('requires the reserve when it exceeds an XOR-input cap', () => {
    const result = assessBotFundingPreflight({
      inputAsset: XOR,
      capitalCodec: '500000000000000000',
      feeReserveXorCodec: UNIT,
      availableCodecByAddress: { [XOR.address]: '750000000000000000' },
    });
    expect(result.sufficient).toBe(false);
    expect(result.assets[0]).toMatchObject({ required: '1', available: '0.75', shortfall: '0.25' });
  });

  it('distinguishes a missing or malformed balance from a verified zero', () => {
    const base = { inputAsset: KUSD, capitalCodec: UNIT, feeReserveXorCodec: UNIT };
    expect(() => assessBotFundingPreflight({ ...base, availableCodecByAddress: { [KUSD.address]: '0' } })).toThrow(
      'bots.errors.balance'
    );
    expect(() =>
      assessBotFundingPreflight({
        ...base,
        availableCodecByAddress: { [KUSD.address]: '1.0', [XOR.address]: '0' },
      })
    ).toThrow('bots.errors.balance');
    expect(
      assessBotFundingPreflight({
        ...base,
        availableCodecByAddress: { [KUSD.address]: '0', [XOR.address]: '0' },
      }).assets.map((asset) => asset.shortfall)
    ).toEqual(['1', '1']);
  });

  it('rejects malformed budget amounts and values outside the chain u128 range', () => {
    const base = {
      inputAsset: XOR,
      feeReserveXorCodec: UNIT,
      availableCodecByAddress: { [XOR.address]: UNIT },
    };
    expect(() => assessBotFundingPreflight({ ...base, capitalCodec: '1.5' })).toThrow('bots.errors.amount');
    expect(() => assessBotFundingPreflight({ ...base, capitalCodec: String(1n << 128n) })).toThrow(
      'bots.errors.amount'
    );
    expect(() => assessBotFundingPreflight({ ...base, capitalCodec: UNIT, feeReserveXorCodec: '-1' })).toThrow(
      'bots.errors.amount'
    );
  });
});
