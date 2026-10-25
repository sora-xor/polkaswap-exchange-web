import type { OverrideVersionedType } from '@polkadot/types/types';

const versioned: OverrideVersionedType[] = [
  {
    minmax: [2, undefined],
    types: {
      RewardReason: {
        _enum: ['Unspecified', 'BuyOnBondingCurve', 'LiquidityProvisionFarming', 'MarketMakerVolume'],
      },
    },
  },
];

export default versioned;
