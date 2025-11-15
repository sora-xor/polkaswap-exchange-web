import { FPNumber } from '@sora-substrate/math';

export class Consts {
  /** XOR token */
  static readonly XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
  /** KXOR token */
  static readonly KXOR = '0x02000e0000000000000000000000000000000000000000000000000000000000';
  /** VAL token */
  static readonly VAL = '0x0200040000000000000000000000000000000000000000000000000000000000';
  /** PSWAP token */
  static readonly PSWAP = '0x0200050000000000000000000000000000000000000000000000000000000000';
  /** DAI token */
  static readonly DAI = '0x0200060000000000000000000000000000000000000000000000000000000000';
  /** ETH token */
  static readonly ETH = '0x0200070000000000000000000000000000000000000000000000000000000000';
  /** XST-USD token */
  static readonly XSTUSD = '0x0200080000000000000000000000000000000000000000000000000000000000';
  /** XST token */
  static readonly XST = '0x0200090000000000000000000000000000000000000000000000000000000000';
  /** TBCD token */
  static readonly TBCD = '0x02000a0000000000000000000000000000000000000000000000000000000000';
  /** KUSD token */
  static readonly KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
  /** VXOR token */
  static readonly VXOR = '0x006a271832f44c93bd8692584d85415f0f3dccef9748fecd129442c8edcb4361';

  /** XYK fee - 0.6% */
  static readonly XYK_FEE = new FPNumber(0.006);
  /** TBC fee - 0.3% */
  static readonly TBC_FEE = new FPNumber(0.003);
  /** Max `Rust` number value */
  static readonly MAX = new FPNumber('170141183460469231731.687303715884105727');
  /** Manimal significant balance */
  static readonly MIN = FPNumber.fromCodecValue(1);
  /** Irreducible reserve percent = 1% */
  static readonly IrreducibleReserve = new FPNumber(0.01);

  static readonly InternalSlippageTolerance = new FPNumber(0.001);

  /** ETH & DAI which are incentivized */
  static readonly incentivizedCurrenciesNum = FPNumber.TWO;
  /** 2.5 billion pswap reserved for tbc rewards */
  static readonly initialPswapTbcRewardsAmount = new FPNumber(2_500_000_000);

  static readonly GetNumSamples = 10;
}

export const DexIdByBaseAsset: Record<string, number> = {
  [Consts.XOR]: 0,
  [Consts.XSTUSD]: 1,
  [Consts.KUSD]: 2,
  [Consts.VXOR]: 3,
};

export enum Errors {
  AggregationError = 'Unable to aggregate the liquidity from sources.',
  AssetsMustNotBeSame = 'In this case assets must not be same.',
  BadLiquidity = 'Internal error. Liquidity source returned wrong liquidity.',
  BaseAssetIsNotMatchedWithAnyAssetArguments = 'The base asset is not matched with any asset arguments.',
  CalculationError = 'Specified parameters lead to arithmetic error',
  CantExchange = "Liquidity source can't exchange assets with the given IDs on the given DEXId.",
  InsufficientLiquidity = 'None of the sources has enough reserves to execute a trade',
  InvalidOrderAmount = 'Invalid Order Amount',
  InvalidFeeRatio = 'Invalid fee ratio value.',
  NotEnoughLiquidityInOrderBook = 'Not Enough Liquidity In OrderBook',
  NotEnoughReserves = "It's not enough reserves in the pool to perform the operation.",
  NotEnoughOutputReserves = 'Output asset reserves is not enough',
  PoolIsEmpty = 'The pool has empty liquidity.',
  PriceCalculationFailed = 'An error occurred while calculating the price.',
  RestrictedChameleonPool = 'Restricted Chameleon pool',
  SyntheticDoesNotExist = 'Synthetic asset does not exist.',
  SyntheticBaseBuySellLimitExceeded = 'Input/output amount of synthetic base asset exceeds the limit',
  UnavailableExchangePath = 'No route exists in a given DEX for given parameters to carry out the swap',
  UnknownOrderBook = 'Order book does not exist for this trading pair',
  UnsupportedQuotePath = 'Attempt to quote via unsupported path, i.e. both output and input tokens are not XOR.',
  // own
  UnsupportedLiquiditySource = 'Unsupported liquidity source',
}

export enum LiquiditySourceTypes {
  Default = '',
  XYKPool = 'XYKPool',
  XSTPool = 'XSTPool',
  MulticollateralBondingCurvePool = 'MulticollateralBondingCurvePool',
  OrderBook = 'OrderBook',
}

export enum RewardReason {
  Unspecified = 'Unspecified',
  BuyOnBondingCurve = 'BuyOnBondingCurve',
}

export enum PriceVariant {
  Buy = 'Buy',
  Sell = 'Sell',
}

export enum AssetType {
  Base = 'Base',
  SyntheticBase = 'SyntheticBase',
  Basic = 'Basic',
  Synthetic = 'Synthetic',
  ChameleonBase = 'ChameleonBase',
  ChameleonPoolAsset = 'ChameleonPoolAsset',
}

export enum SwapVariant {
  WithDesiredInput = 'WithDesiredInput',
  WithDesiredOutput = 'WithDesiredOutput',
}

export enum FilterMode {
  Disabled = 'Disabled',
  AllowSelected = 'AllowSelected',
  ForbidSelected = 'ForbidSelected',
}
