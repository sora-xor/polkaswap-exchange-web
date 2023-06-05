import { RewardReason } from '@sora-substrate/liquidity-proxy/build/consts';
import { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import { KnownSymbols } from '@sora-substrate/util/build/assets/consts';

import { MOCK_ACCOUNT_ASSETS } from '../tokens';

import type { LPRewardsInfo } from '@sora-substrate/liquidity-proxy/build/types';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

const NETWORK_FEES = {
  Swap: '700000000000000',
};

export const MOCK_FIAT_PRICE_AND_APY_OBJECT: any = {
  '0x0200000000000000000000000000000000000000000000000000000000000000': {
    price: '1230000000000000000',
  },
};

interface SwapInfo {
  title: string;
  tokenFrom: AccountAsset;
  tokenTo: AccountAsset;
  minMaxReceived: CodecString;
  isExchangeB: boolean;
  liquidityProviderFee: CodecString;
  rewards: Array<LPRewardsInfo>;
  priceImpact: string;
  price: string;
  priceReversed: string;
  isLoggedIn: boolean;
  networkFees: NetworkFeesObject;
}

export const MOCK_SWAP_INFO: Array<SwapInfo> = [
  {
    title: 'With All Set Parameters',
    tokenFrom: MOCK_ACCOUNT_ASSETS[0],
    tokenTo: MOCK_ACCOUNT_ASSETS[1],
    minMaxReceived: '1234567890123456789',
    isExchangeB: false,
    liquidityProviderFee: '3000000000000000',
    rewards: [],
    priceImpact: '-0.1',
    price: '0.4',
    priceReversed: '2.2',
    isLoggedIn: true,
    networkFees: NETWORK_FEES as NetworkFeesObject,
  },
  {
    title: 'With Empty minMaxReceived',
    tokenFrom: MOCK_ACCOUNT_ASSETS[0],
    tokenTo: MOCK_ACCOUNT_ASSETS[1],
    minMaxReceived: '',
    isExchangeB: false,
    liquidityProviderFee: '3000000000000000',
    rewards: [],
    priceImpact: '-0.1',
    price: '0.4',
    priceReversed: '2.2',
    isLoggedIn: true,
    networkFees: NETWORK_FEES as NetworkFeesObject,
  },
  {
    title: 'With isExchangeB',
    tokenFrom: MOCK_ACCOUNT_ASSETS[0],
    tokenTo: MOCK_ACCOUNT_ASSETS[1],
    minMaxReceived: '1234567890123456789',
    isExchangeB: true,
    liquidityProviderFee: '3000000000000000',
    rewards: [],
    priceImpact: '-0.1',
    price: '0.4',
    priceReversed: '2.2',
    isLoggedIn: true,
    networkFees: NETWORK_FEES as NetworkFeesObject,
  },
  {
    title: 'With Empty liquidityProviderFee',
    tokenFrom: MOCK_ACCOUNT_ASSETS[0],
    tokenTo: MOCK_ACCOUNT_ASSETS[1],
    minMaxReceived: '1234567890123456789',
    isExchangeB: false,
    liquidityProviderFee: '',
    rewards: [],
    priceImpact: '-0.1',
    price: '0.4',
    priceReversed: '2.2',
    isLoggedIn: true,
    networkFees: NETWORK_FEES as NetworkFeesObject,
  },
  {
    title: 'With Rewards',
    tokenFrom: MOCK_ACCOUNT_ASSETS[0],
    tokenTo: MOCK_ACCOUNT_ASSETS[1],
    minMaxReceived: '1234567890123456789',
    isExchangeB: false,
    liquidityProviderFee: '3000000000000000',
    rewards: [
      {
        amount: '1000000000000000000',
        currency: KnownSymbols.XOR,
        reason: RewardReason.Unspecified,
      },
    ],
    priceImpact: '-0.1',
    price: '0.4',
    priceReversed: '2.2',
    isLoggedIn: true,
    networkFees: NETWORK_FEES as NetworkFeesObject,
  },
  {
    title: 'With Warning priceImpact',
    tokenFrom: MOCK_ACCOUNT_ASSETS[0],
    tokenTo: MOCK_ACCOUNT_ASSETS[1],
    minMaxReceived: '1234567890123456789',
    isExchangeB: false,
    liquidityProviderFee: '3000000000000000',
    rewards: [],
    priceImpact: '-1.8',
    price: '0.4',
    priceReversed: '2.2',
    isLoggedIn: true,
    networkFees: NETWORK_FEES as NetworkFeesObject,
  },
  {
    title: 'With Error priceImpact',
    tokenFrom: MOCK_ACCOUNT_ASSETS[0],
    tokenTo: MOCK_ACCOUNT_ASSETS[1],
    minMaxReceived: '1234567890123456789',
    isExchangeB: false,
    liquidityProviderFee: '3000000000000000',
    rewards: [],
    priceImpact: '-10',
    price: '0.4',
    priceReversed: '2.2',
    isLoggedIn: true,
    networkFees: NETWORK_FEES as NetworkFeesObject,
  },
  {
    title: 'With Logged Out',
    tokenFrom: MOCK_ACCOUNT_ASSETS[0],
    tokenTo: MOCK_ACCOUNT_ASSETS[1],
    minMaxReceived: '1234567890123456789',
    isExchangeB: false,
    liquidityProviderFee: '3000000000000000',
    rewards: [],
    priceImpact: '-0.1',
    price: '0.4',
    priceReversed: '2.2',
    isLoggedIn: false,
    networkFees: NETWORK_FEES as NetworkFeesObject,
  },
  {
    title: 'With Empty networkFee',
    tokenFrom: MOCK_ACCOUNT_ASSETS[0],
    tokenTo: MOCK_ACCOUNT_ASSETS[1],
    minMaxReceived: '1234567890123456789',
    isExchangeB: false,
    liquidityProviderFee: '3000000000000000',
    rewards: [],
    priceImpact: '-0.1',
    price: '0.4',
    priceReversed: '2.2',
    isLoggedIn: true,
    networkFees: {
      Swap: '',
    } as NetworkFeesObject,
  },
];
