export default {
  rpc: {},
  types: {
    AssetIdOf: 'AssetId',
    Amount: 'i128',
    AmountOf: 'Amount',
    CurrencyId: 'AssetId',
    CurrencyIdOf: 'AssetId',
    BasisPoints: 'u16',
    Fixed: 'FixedU128',
    FarmId: 'u64',
    DEXId: 'u32',
    DEXIdOf: 'DEXId',
    DEXInfo: {
      baseAssetId: 'AssetId',
      defaultFee: 'BasisPoints',
      defaultProtocolFee: 'BasisPoints',
    },
    BalancePrecision: 'u8',
    AssetSymbol: 'Text',
    AssetName: 'Text',
    AssetId32: '[u8; 32]',
    SwapWithDesiredInput: {
      desiredAmountIn: 'Balance',
      minAmountOut: 'Balance',
    },
    SwapWithDesiredOutput: {
      desiredAmountOut: 'Balance',
      maxAmountIn: 'Balance',
    },
    SwapAmount: {
      _enum: {
        WithDesiredInput: 'SwapWithDesiredInput',
        WithDesiredOutput: 'SwapWithDesiredOutput',
      },
    },
    QuoteWithDesiredInput: {
      desiredAmountIn: 'Balance',
    },
    QuoteWithDesiredOutput: {
      desiredAmountOut: 'Balance',
    },
    QuoteAmount: {
      _enum: {
        WithDesiredInput: 'QuoteWithDesiredInput',
        WithDesiredOutput: 'QuoteWithDesiredOutput',
      },
    },
    SwapVariant: {
      _enum: ['WithDesiredInput', 'WithDesiredOutput'],
    },
    TechAmount: 'Amount',
    TechBalance: 'Balance',
    SwapOutcome: {
      amount: 'Balance',
      fee: 'Balance',
    },
    LiquiditySourceType: {
      _enum: [
        'XYKPool',
        'BondingCurvePool',
        'MulticollateralBondingCurvePool',
        'MockPool',
        'MockPool2',
        'MockPool3',
        'MockPool4',
        'XSTPool',
        'OrderBook',
      ],
    },
    FilterMode: {
      _enum: ['Disabled', 'ForbidSelected', 'AllowSelected'],
    },
    SwapOutcomeInfo: {
      amount: 'Balance',
      fee: 'Balance',
    },
    TradingPair: {
      baseAssetId: 'AssetId',
      targetAssetId: 'AssetId',
    },
    PermissionId: 'u32',
    HolderId: 'AccountId',
    OwnerId: 'AccountId',
    Mode: {
      _enum: ['Permit', 'Forbid'],
    },
    Scope: {
      _enum: {
        Limited: 'H512',
        Unlimited: 'Null',
      },
    },
    OracleKey: 'AssetId',
    ChargeFeeInfo: {
      tip: 'Compact<Balance>',
      target_asset_id: 'AssetId',
    },
    SwapAction: 'Null', // define properly if needed
    ValidationFunction: 'Null', // define properly if needed
    Permission: 'Null', // define properly if needed
    DistributionAccounts: 'Null',
    MultisigAccount: {
      signatories: 'Vec<AccountId>',
      threshold: 'u8',
    },
    Farmer: 'Null',
    Farm: 'Null',
    SmoothPriceState: 'Null',
    MultiCurrencyBalanceOf: 'Null',
    Duration: 'Null',
    PostDispatchInfo: {
      actualWeight: 'Option<Weight>',
      paysFee: 'Pays',
    },
    DispatchErrorWithPostInfoTPostDispatchInfo: {
      postInfo: 'PostDispatchInfo',
      error: 'DispatchError',
    },
    DispatchResultWithPostInfo: 'Result<PostDispatchInfo, DispatchErrorWithPostInfoTPostDispatchInfo>',
    Public: '[u8; 33]',
    RewardReason: {
      _enum: ['Unspecified', 'BuyOnBondingCurve', 'LiquidityProvisionFarming', 'MarketMakerVolume'],
    },
    StorageVersion: 'Null', // Generic storage version
    MarketMakerInfo: {
      count: 'u32',
      volume: 'Balance',
    },
    CrowdloanReward: {
      id: 'Vec<u8>',
      address: 'Vec<u8>',
      contribution: 'Fixed',
      xorReward: 'Fixed',
      valReward: 'Fixed',
      pswapReward: 'Fixed',
      xstusdReward: 'Fixed',
      percent: 'Fixed',
    },
    PredefinedAssetId: {
      _enum: [
        // Order must match rust definition
        'XOR',
        'DOT',
        'KSM',
        'USDT',
        'VAL',
        'PSWAP',
        'DAI',
        'ETH',
        'XSTUSD',
        'XST',
        'TBCD',
        'KEN',
        'KUSD',
        'KGOLD',
        'KXOR',
        'KARMA',
      ],
    },
    RewardInfo: {
      limit: 'Balance',
      totalAvailable: 'Balance',
      rewards: 'BTreeMap<RewardReason, Balance>',
    },
    TechTradingPair: {
      baseAssetId: 'TechAssetId',
      targetAssetId: 'TechAssetId',
    },
    TechAssetId: {
      _enum: {
        Wrapped: 'PredefinedAssetId',
        Escaped: 'AssetId',
      },
    },
    TechPurpose: {
      _enum: {
        FeeCollector: 'Null',
        FeeCollectorForPair: 'TechTradingPair',
        LiquidityKeeper: 'TechTradingPair',
        Identifier: 'Vec<u8>',
      },
    },
    TechAccountId: {
      _enum: {
        Pure: '(DEXId, TechPurpose)',
        Generic: '(Vec<u8>, Vec<u8>)',
        Wrapped: 'AccountId',
        WrappedRepr: 'AccountId',
      },
    },
    PriceInfo: {
      priceFailures: 'u32',
      spotPrices: 'Vec<Balance>',
      averagePrice: 'Balance',
      needsUpdate: 'bool',
      lastSpotPrice: 'Balance',
    },
    ContentSource: 'Text',
    Description: 'Text',
  },
};
