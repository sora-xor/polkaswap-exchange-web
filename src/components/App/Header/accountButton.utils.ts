import type { PolkadotJsAccount } from '@/lib/soraneo-wallet/src/types/common';

type TranslateFn = (key: string) => string;

export function getAccountTooltip(isLoggedIn: boolean, t: TranslateFn): string {
  return isLoggedIn ? t('connectedAccount') : t('connectWalletTextTooltip');
}

export function getAccountLabel(
  isLoggedIn: boolean,
  account: PolkadotJsAccount | undefined,
  t: TranslateFn,
  formatAddress: (address: string, symbols: number) => string
): string {
  if (!isLoggedIn || !account) {
    return t('connectWalletText');
  }

  return account.name || formatAddress(account.address, 8);
}
