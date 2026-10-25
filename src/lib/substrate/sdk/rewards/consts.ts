export enum RewardingEvents {
  // Strategic
  LiquidityProvision = 'LiquidityProvision',
  // Externals
  XorErc20 = 'XorErc20',
  SoraFarmHarvest = 'SoraFarmHarvest',
  NftAirdrop = 'NftAirdrop',
  // Strategic
  BuyOnBondingCurve = 'BuyOnBondingCurve',
  LiquidityProvisionFarming = 'LiquidityProvisionFarming',
  MarketMakerVolume = 'MarketMakerVolume',

  Unspecified = 'Unspecified',
}

export enum RewardType {
  Provision = 'Provision',
  Strategic = 'Strategic',
  Crowdloan = 'Crowdloan',
  External = 'External',
}
