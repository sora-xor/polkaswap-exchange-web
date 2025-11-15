declare enum THEMES {
  POLKADOT = 'polkadot',
  SUBSTRATE = 'substrate',
  BEACHBALL = 'beachball',
}
interface WalletAvatar {
  title: string;
  size?: number;
  theme?: THEMES;
  address: string;
}
export declare const MOCK_WALLET_AVATAR: Array<WalletAvatar>;
export {};
