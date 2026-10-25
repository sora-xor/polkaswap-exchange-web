import { AppWallet } from '../../consts';

/** Selects guidance for the provider, including WalletConnect's named session sources. */
export function walletDescriptionKey(source: string): string {
  if (source.startsWith(AppWallet.WalletConnect)) return 'connection.wallet.walletConnectDescription';
  if (source === AppWallet.GoogleDrive) return 'connection.wallet.googleDescription';
  if (source === AppWallet.Sora) return 'connection.wallet.localDescription';
  return 'connection.wallet.extensionDescription';
}
