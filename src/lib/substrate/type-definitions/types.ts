import type runtime from './runtime';
import type dexApi from './dexApi';
import type dexManager from './dexManager';
import type tradingPair from './tradingPair';
import type template from './template';
import type assets from './assets';
import type irohaMigration from './irohaMigration';
import type liquidityProxy from './liquidityProxy';
import type ethBridge from './ethBridge';
import type bridgeProxy from './bridgeProxy';
import type pswapDistribution from './pswapDistribution';
import type rewards from './rewards';
import type farming from './farming';
import type ceresStaking from './ceresStaking';
import type ceresLiquidityLocker from './ceresLiquidityLocker';
import type ceresTokenLocker from './ceresTokenLocker';
import type ceresGovernancePlatform from './ceresGovernancePlatform';
import type ceresLaunchpad from './ceresLaunchpad';
import type demeterFarmingPlatform from './demeterFarmingPlatform';
import type hermesGovernancePlatform from './hermesGovernancePlatform';
import type vestedRewards from './vestedRewards';
import type leafProvider from './leafProvider';
import type basicChannel from './basicChannel';
import type intentivizedChannel from './intentivizedChannel';

export type SoraDefinitions = typeof runtime.types &
  typeof dexApi.types &
  typeof dexManager.types &
  typeof tradingPair.types &
  typeof template.types &
  typeof assets.types &
  typeof irohaMigration.types &
  typeof liquidityProxy.types &
  typeof ethBridge.types &
  typeof bridgeProxy.types &
  typeof pswapDistribution.types &
  typeof rewards.types &
  typeof farming.types &
  typeof ceresStaking.types &
  typeof ceresLiquidityLocker.types &
  typeof ceresTokenLocker.types &
  typeof ceresGovernancePlatform.types &
  typeof ceresLaunchpad.types &
  typeof demeterFarmingPlatform.types &
  typeof hermesGovernancePlatform.types &
  typeof vestedRewards.types &
  typeof leafProvider.types &
  typeof basicChannel.types &
  typeof intentivizedChannel.types;
