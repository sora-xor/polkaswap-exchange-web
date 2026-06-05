export default {
  rpc: {
    quoteBuy: {
      description: 'Quote a Polkamarkt buy without mutating runtime storage.',
      params: [
        { name: 'marketId', type: 'u32' },
        { name: 'outcome', type: 'Text' },
        { name: 'collateralIn', type: 'Balance' },
        { name: 'at', type: 'Hash', isOptional: true },
      ],
      type: 'Option<PolkamarktBuyQuote>',
    },
    quoteSell: {
      description: 'Quote a Polkamarkt sell without mutating runtime storage.',
      params: [
        { name: 'marketId', type: 'u32' },
        { name: 'outcome', type: 'Text' },
        { name: 'sharesIn', type: 'Balance' },
        { name: 'at', type: 'Hash', isOptional: true },
      ],
      type: 'Option<PolkamarktSellQuote>',
    },
    marketState: {
      description: 'Return Polkamarkt mechanism, DPM balances, marginal prices, and implied probabilities.',
      params: [
        { name: 'marketId', type: 'u32' },
        { name: 'at', type: 'Hash', isOptional: true },
      ],
      type: 'Option<PolkamarktMarketState>',
    },
    claimable: {
      description: 'Return Polkamarkt trader and creator claimable balances.',
      params: [
        { name: 'account', type: 'AccountId' },
        { name: 'marketId', type: 'u32' },
        { name: 'at', type: 'Hash', isOptional: true },
      ],
      type: 'Option<PolkamarktClaimableInfo>',
    },
  },
  types: {
    PolkamarktBuyQuote: {
      marketId: 'u32',
      outcome: 'Text',
      collateralIn: 'Balance',
      feeAmount: 'Balance',
      pricingCollateral: 'Balance',
      sharesOut: 'Balance',
    },
    PolkamarktSellQuote: {
      marketId: 'u32',
      outcome: 'Text',
      sharesIn: 'Balance',
      grossCollateralOut: 'Balance',
      feeAmount: 'Balance',
      collateralOut: 'Balance',
    },
    PolkamarktClaimableInfo: {
      marketId: 'u32',
      account: 'AccountId',
      status: 'Text',
      resolutionOutcome: 'Option<Text>',
      yesShares: 'Balance',
      noShares: 'Balance',
      netCollateralPaid: 'Balance',
      traderPayout: 'Balance',
      claimablePayout: 'Balance',
      creatorFees: 'Balance',
      isCreator: 'bool',
    },
    PolkamarktEvidenceInput: {
      uri: 'Vec<u8>',
      hash: 'Option<[u8; 32]>',
    },
    PolkamarktMarketEvidence: {
      uri: 'Vec<u8>',
      hash: 'Option<[u8; 32]>',
      atBlock: 'BlockNumber',
    },
    PolkamarktEarlyResolutionReport: {
      reporter: 'AccountId',
      outcome: 'Text',
      bond: 'Balance',
      evidence: 'PolkamarktMarketEvidence',
    },
    PolkamarktMarketState: {
      marketId: 'u32',
      mechanism: 'Text',
      virtualDepth: 'Balance',
      realYesShares: 'Balance',
      realNoShares: 'Balance',
      dpmCollateral: 'Balance',
      marginalYesPriceBps: 'u32',
      marginalNoPriceBps: 'u32',
      impliedYesProbabilityBps: 'u32',
      impliedNoProbabilityBps: 'u32',
    },
  },
};
