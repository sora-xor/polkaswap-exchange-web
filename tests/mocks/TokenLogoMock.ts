import { AccountAsset, Asset, KnownSymbols, WhitelistArrayItem } from '@sora-substrate/util';

import { LogoSize } from '@/consts';
import { MOCK_ACCOUNT_ASSETS } from './tokens';

interface TokenLogo {
  title: string;
  tokenSymbol?: string;
  token?: AccountAsset | Asset;
  size?: LogoSize;
}

const assetXor = MOCK_ACCOUNT_ASSETS[0];

export const MOCK_WHITELIST_ITEM = {
  symbol: assetXor.symbol,
  name: assetXor.name,
  address: assetXor.address,
  decimals: assetXor.decimals,
  icon: 'base64_image',
} as WhitelistArrayItem;

export const MOCK_TOKEN_LOGO: Array<TokenLogo> = [
  {
    title: 'With Default Props',
  },
  {
    title: 'With Token Symbol',
    tokenSymbol: KnownSymbols.XOR,
  },
  {
    title: 'With Mini Logo Size',
    token: assetXor,
    size: LogoSize.MINI,
  },
  {
    title: 'With Small Logo Size',
    token: assetXor,
    size: LogoSize.SMALL,
  },
  {
    title: 'With Medium (default) Logo Size',
    token: assetXor,
    size: LogoSize.MEDIUM,
  },
  {
    title: 'With Big Logo Size',
    token: assetXor,
    size: LogoSize.BIG,
  },
  {
    title: 'With Large Logo Size',
    token: assetXor,
    size: LogoSize.LARGE,
  },
];
