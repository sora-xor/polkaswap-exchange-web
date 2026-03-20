import { Operation, FPNumber } from '@sora-substrate/sdk';

export declare const accountIdBasedOperations: Operation[];
export declare const syntheticAssetRegexp: RegExp;
export declare const kensetsuAssetRegexp: RegExp;
export declare const HiddenValue = '******';
export declare const BLOCK_PRODUCE_TIME = 6000;
export declare const MAX_ALERTS_NUMBER = 10;
export declare const Links: {
  connection: {
    wiki: string;
  };
};
export declare enum IndexerType {
  SUBQUERY = 'subquery',
  SUBSQUID = 'subsquid',
}
export declare enum Theme {
  Light = 'light',
  Dark = 'dark',
}
export declare enum AppWallet {
  Sora = 'sora',
  WalletConnect = 'walletconnect',
  GoogleDrive = 'google-drive',
  FearlessWallet = 'fearless-wallet',
  PolkadotJS = 'polkadot-js',
  SubwalletJS = 'subwallet-js',
  TalismanJS = 'talisman',
}
export declare enum AccountActionTypes {
  Rename = 'rename',
  Export = 'export',
  Logout = 'logout',
  Delete = 'delete',
  BookSend = 'bookSend',
  BookEdit = 'bookEdit',
  BookDelete = 'bookDelete',
}
export declare enum RouteNames {
  WalletConnection = 'WalletConnection',
  WalletSend = 'WalletSend',
  Wallet = 'Wallet',
  WalletAssetDetails = 'WalletAssetDetails',
  CreateToken = 'CreateToken',
  ReceiveToken = 'ReceiveToken',
  AddAsset = 'AddAsset',
  SelectAsset = 'SelectAsset',
}
export declare enum WalletTabs {
  Assets = 'WalletAssets',
  History = 'WalletHistory',
}
export declare enum TokenTabs {
  Token = 'CreateSimpleToken',
  NonFungibleToken = 'CreateNftToken',
}
export declare enum AddAssetTabs {
  Token = 'AddAssetToken',
  NFT = 'AddAssetNFT',
}
export declare enum WalletFilteringOptions {
  All = 'All',
  Currencies = 'Currencies',
  NFT = 'NFT',
}
export declare enum SoraNetwork {
  Dev = 'Dev',
  Test = 'Test',
  Stage = 'Stage',
  Prod = 'Prod',
}
export declare enum HashType {
  ID = 'id',
  Block = 'block',
  Account = 'account',
  EthAccount = 'ethAccount',
  EthTransaction = 'ethTransaction',
}
export declare enum ExplorerType {
  Sorascan = 'sorascan',
  Sorametrics = 'sorametrics',
  Subscan = 'subscan',
  Polkadot = 'polkadot',
}
export type ExplorerLink = {
  type: ExplorerType;
  value: string;
};
export declare enum Step {
  CreateSimpleToken = 'CreateSimpleToken',
  ConfirmSimpleToken = 'ConfirmSimpleToken',
  CreateNftToken = 'CreateNftToken',
  ConfirmNftToken = 'ConfirmNftToken',
  Warn = 'Warn',
}
export declare enum LoginStep {
  Import = 'Import',
  ImportCredentials = 'Import/Credentials',
  SeedPhrase = 'Create/SeedPhrase',
  ConfirmSeedPhrase = 'Create/ConfirmSeedPhrase',
  CreateCredentials = 'Create/Credentials',
  AccountList = 'AccountList',
  ExtensionList = 'ExtensionList',
}
export interface WalletPermissions {
  addAssets?: boolean;
  addLiquidity?: boolean;
  bridgeAssets?: boolean;
  createAssets?: boolean;
  sendAssets?: boolean;
  showAssetDetails?: boolean;
  swapAssets?: boolean;
}
export interface WalletAssetFilters {
  option: WalletFilteringOptions;
  verifiedOnly: boolean;
  zeroBalance: boolean;
}
export interface WalletInitOptions {
  withoutStore?: boolean;
  permissions?: WalletPermissions;
  appName?: string;
}
export interface NetworkFeeWarningOptions {
  type: Operation;
  isXor?: boolean;
  amount?: FPNumber;
}
export declare enum FontSizeRate {
  SMALL = 'small',
  MEDIUM = 'medium',
  NORMAL = 'normal',
}
export declare enum FontWeightRate {
  SMALL = 'small',
  MEDIUM = 'medium',
  NORMAL = 'normal',
}
export declare enum LogoSize {
  MINI = 'mini',
  SMALL = 'small',
  MEDIUM = 'medium',
  BIG = 'big',
  BIGGER = 'bigger',
  LARGE = 'large',
}
export declare enum PaginationButton {
  First = 'first',
  Prev = 'prev',
  Next = 'next',
  Last = 'last',
}
export declare enum ETH_BRIDGE_STATES {
  INITIAL = 'INITIAL',
  SORA_SUBMITTED = 'SORA_SUBMITTED',
  SORA_PENDING = 'SORA_PENDING',
  SORA_REJECTED = 'SORA_REJECTED',
  SORA_COMMITED = 'SORA_COMMITED',
  EVM_SUBMITTED = 'EVM_SUBMITTED',
  EVM_PENDING = 'EVM_PENDING',
  EVM_REJECTED = 'EVM_REJECTED',
  EVM_COMMITED = 'EVM_COMMITED',
}
export declare enum PassphraseTimeout {
  FIFTEEN_MINUTES = '15m',
  ONE_HOUR = '1h',
  FOUR_HOURS = '4h',
  ONE_DAY = '1D',
  ONE_WEEK = '1W',
}
export declare const PassphraseTimeoutDuration: Record<PassphraseTimeout, number>;
export declare const DefaultPassphraseTimeout: number;
export declare const ObjectInit: () => null;
/**
 * DO NOT IMPORT THIS CONST if you use TranslationMixin
 *
 * Contains wallet-specific words which shouldn't be translated.
 * It's used in TranslationMixin of SORA Wallet project and it's extended in Polkaswap TranslationMixin.
 */
export declare const TranslationConsts: {
  readonly Polkaswap: 'Polkaswap';
  readonly Ethereum: 'Ethereum';
  readonly Etherscan: 'Etherscan';
  readonly Hashi: 'HASHI';
  readonly PolkadotJs: 'Polkadot{.js}';
  readonly Sora: 'SORA';
  readonly TBC: 'TBC';
  readonly XYK: 'XYK';
  readonly NFT: 'NFT';
  readonly CEX: 'CEX';
  readonly Polkadot: 'Polkadot';
  readonly SORAScan: 'SORAScan';
  readonly SoraMetrics: 'SoraMetrics';
  readonly Subscan: 'Subscan';
  readonly CedeStore: 'cede.store';
  readonly QR: 'QR';
  readonly IPFS: 'IPFS';
  readonly soraNetwork: {
    readonly Dev: 'SORA Devnet';
    readonly Test: 'SORA Testnet (private)';
    readonly Stage: 'SORA Testnet';
    readonly Prod: 'SORA Mainnet';
  };
  readonly JSON: 'JSON';
  readonly ADAR: 'ADAR';
  readonly Google: 'Google';
  readonly Kensetsu: 'Kensetsu';
  readonly Ceres: 'Ceres';
};
export declare const CeresAddresses: string[];
