import { rpc as ormlRpc, types as ormlTypes, typesAlias as ormlAlias } from '@open-web3/orml-type-definitions';
import { jsonrpcFromDefs, typesAliasFromDefs, typesFromDefs } from '@open-web3/orml-type-definitions/utils';

import runtime from './runtime';
import dexApi from './dexApi';
import dexManager from './dexManager';
import tradingPair from './tradingPair';
import template from './template';
import assets from './assets';
import irohaMigration from './irohaMigration';
import liquidityProxy from './liquidityProxy';
import ethBridge from './ethBridge';
import bridgeProxy from './bridgeProxy';
import pswapDistribution from './pswapDistribution';
import rewards from './rewards';
import farming from './farming';
import ceresStaking from './ceresStaking';
import ceresLiquidityLocker from './ceresLiquidityLocker';
import ceresTokenLocker from './ceresTokenLocker';
import ceresGovernancePlatform from './ceresGovernancePlatform';
import ceresLaunchpad from './ceresLaunchpad';
import demeterFarmingPlatform from './demeterFarmingPlatform';
import hermesGovernancePlatform from './hermesGovernancePlatform';
import vestedRewards from './vestedRewards';
import leafProvider from './leafProvider';
import basicChannel from './basicChannel';
import intentivizedChannel from './intentivizedChannel';

import versionedOverrides from './versioned';

export type { SoraDefinitions } from './types';

const soraDefs = {
  assets,
  ceresGovernancePlatform,
  ceresLiquidityLocker,
  ceresStaking,
  ceresTokenLocker,
  ceresLaunchpad,
  demeterFarmingPlatform,
  dexApi,
  dexManager,
  ethBridge,
  bridgeProxy,
  farming,
  hermesGovernancePlatform,
  irohaMigration,
  liquidityProxy,
  pswapDistribution,
  rewards,
  runtime,
  template,
  tradingPair,
  vestedRewards,
  leafProvider,
  basicChannel,
  intentivizedChannel,
};

const overrides = {
  Address: 'AccountId',
  LookupSource: 'AccountId',
  AssetId: 'AssetId32',
  Keys: 'SessionKeys3',
  RefCount: 'u32',
  Balance: 'u128',
  TAssetBalance: 'Balance',
  MultiCurrencyBalance: 'Balance',
  MultiCurrencyBalanceOf: 'MultiCurrencyBalance',
  AccountInfo: 'AccountInfoWithDualRefCount',
};

export const types = {
  ...ormlTypes,
  ...typesFromDefs(soraDefs),
  ...overrides,
};

export const localTypes = {
  ...typesFromDefs(soraDefs),
  ...overrides,
};

export const typesBundle = {
  spec: {
    sora: {
      types,
    } as any,
  },
};

export const rpc = jsonrpcFromDefs(soraDefs, { ...ormlRpc });
export const typesAlias = typesAliasFromDefs(soraDefs, { ...ormlAlias });

export const slimOverrideBundle = {
  spec: {
    sora: {
      types: [...versionedOverrides].map((version) => {
        return {
          minmax: version.minmax,
          types: {
            ...types,
            ...version.types,
          },
        };
      }),
    },
  },
};

export const fullOverrideBundle = {
  spec: {
    sora: {
      alias: typesAlias,
      rpc,
      types: [...versionedOverrides].map((version) => {
        return {
          minmax: version.minmax,
          types: {
            ...types,
            ...version.types,
          },
        };
      }),
    },
  },
};
