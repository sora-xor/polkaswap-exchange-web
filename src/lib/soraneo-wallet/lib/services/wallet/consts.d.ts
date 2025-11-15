import { AppWallet } from '../../consts/index';
import { WalletInfo } from './types';

export declare const KnownWallets: {
  'fearless-wallet': WalletInfo;
  'google-drive': WalletInfo;
  'polkadot-js': WalletInfo;
  sora: WalletInfo;
  'subwallet-js': WalletInfo;
  talisman: WalletInfo;
  walletconnect: WalletInfo;
};
export declare const PredefinedWallets: AppWallet[];
export declare const RecommendedWallets: AppWallet[];
/** Wallets with saved accounts in App */
export declare const AppStorageWallets: AppWallet[];
/** Wallets with App signature */
export declare const InternalWallets: AppWallet[];
/** Wallets for Desktop mode */
export declare const DesktopWallets: AppWallet[];
/** Wallets as browser extensions */
export declare const ExtensionWallets: AppWallet[];
