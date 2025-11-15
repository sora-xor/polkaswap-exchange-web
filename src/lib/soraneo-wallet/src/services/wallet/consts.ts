import FearlessWalletLogo from '../../assets/img/FearlessWalletLogo.svg';
import GoogleLogo from '../../assets/img/GoogleLogo.svg';
import PolkadotJsLogo from '../../assets/img/PolkadotLogo.svg';
import SoraWalletLogo from '../../assets/img/Sora.svg';
import SubWalletLogo from '../../assets/img/SubWalletLogo.svg';
import TalismanLogo from '../../assets/img/TalismanLogo.svg';
import WalletConnectLogo from '../../assets/img/WalletConnect.svg';
import { AppWallet } from '../../consts/index';

import type { WalletInfo } from './types';

const GDriveWalletInfo: WalletInfo = {
  extensionName: AppWallet.GoogleDrive,
  title: 'Google',
  chromeUrl: '',
  mozillaUrl: '',
  logo: {
    src: GoogleLogo as string,
    alt: 'Google',
  },
};

const WalletConnectInfo: WalletInfo = {
  extensionName: AppWallet.WalletConnect,
  title: 'WalletConnect',
  chromeUrl: '',
  mozillaUrl: '',
  logo: {
    src: WalletConnectLogo as string,
    alt: 'WalletConnect',
  },
};

const FearlessWalletInfo: WalletInfo = {
  extensionName: 'fearless-wallet',
  title: 'Fearless Wallet',
  chromeUrl: 'https://chrome.google.com/webstore/detail/fearless-wallet/nhlnehondigmgckngjomcpcefcdplmgc',
  mozillaUrl: 'https://chrome.google.com/webstore/detail/fearless-wallet/nhlnehondigmgckngjomcpcefcdplmgc',
  logo: {
    src: FearlessWalletLogo as string,
    alt: 'Fearless Wallet Extension',
  },
};

const PolkadotJsInfo: WalletInfo = {
  extensionName: 'polkadot-js',
  title: 'Polkadot{.js}',
  chromeUrl: 'https://chrome.google.com/webstore/detail/polkadot%7Bjs%7D-extension/mopnmbcafieddcagagdcbnhejhlodfdd',
  mozillaUrl: 'https://addons.mozilla.org/firefox/addon/polkadot-js-extension',
  logo: {
    src: PolkadotJsLogo as string,
    alt: 'Polkadot{.js} Extension',
  },
};

const SubWalletInfo: WalletInfo = {
  extensionName: 'subwallet-js',
  title: 'SubWallet',
  chromeUrl: 'https://chrome.google.com/webstore/detail/subwallet/onhogfjeacnfoofkfgppdlbmlmnplgbn',
  mozillaUrl: 'https://addons.mozilla.org/firefox/addon/subwallet',
  logo: {
    src: SubWalletLogo as string,
    alt: 'SubWallet',
  },
};

const TalismanInfo: WalletInfo = {
  extensionName: 'talisman',
  title: 'Talisman',
  chromeUrl: 'https://chrome.google.com/webstore/detail/talisman-wallet/fijngjgcjhjmmpcmkeiomlglpeiijkld',
  mozillaUrl: 'https://addons.mozilla.org/firefox/addon/talisman-wallet-extension',
  logo: {
    src: TalismanLogo as string,
    alt: 'Talisman',
  },
};

const SoraWalletInfo: WalletInfo = {
  extensionName: AppWallet.Sora,
  title: 'SORA Wallet',
  chromeUrl: '',
  mozillaUrl: '',
  logo: {
    src: SoraWalletLogo as string,
    alt: 'SORA Wallet',
  },
};

export const KnownWallets = {
  [AppWallet.FearlessWallet]: FearlessWalletInfo,
  [AppWallet.GoogleDrive]: GDriveWalletInfo,
  [AppWallet.PolkadotJS]: PolkadotJsInfo,
  [AppWallet.Sora]: SoraWalletInfo,
  [AppWallet.SubwalletJS]: SubWalletInfo,
  [AppWallet.TalismanJS]: TalismanInfo,
  [AppWallet.WalletConnect]: WalletConnectInfo,
};

export const PredefinedWallets = [AppWallet.FearlessWallet, AppWallet.PolkadotJS];
export const RecommendedWallets = [AppWallet.FearlessWallet];

/** Wallets with saved accounts in App */
export const AppStorageWallets = [AppWallet.Sora];
/** Wallets with App signature */
export const InternalWallets = [AppWallet.Sora, AppWallet.GoogleDrive];
/** Wallets for Desktop mode */
export const DesktopWallets = [AppWallet.Sora, AppWallet.WalletConnect];
/** Wallets as browser extensions */
export const ExtensionWallets = [
  AppWallet.FearlessWallet,
  AppWallet.PolkadotJS,
  AppWallet.SubwalletJS,
  AppWallet.TalismanJS,
];
