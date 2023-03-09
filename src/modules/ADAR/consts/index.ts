import type { Stage } from '@/store/routeAssets/types';

export enum AdarPageNames {
  Send = 'Send',
  KYC = 'KYC',
  RouteAssets = 'RouteAssets',
  About = 'About',
}

export enum AdarComponents {
  RouteAssetsAuthorize = 'RouteAssets/Stages/Authorize',
  RouteAssetsDone = 'RouteAssets/Stages/Done',
  RouteAssetsProcessTemplate = 'RouteAssets/Stages/ProcessTemplate',
  RouteAssetsReviewDetails = 'RouteAssets/Stages/ReviewDetails',
  RouteAssetsRouting = 'RouteAssets/Stages/Routing',
  RouteAssetsTransactionOverview = 'RouteAssets/Stages/TransactionOverview',
  RouteAssetsUploadTemplate = 'RouteAssets/Stages/UploadTemplate',
  RouteAssetsNavigation = 'App/Header/RouteAssetsNavigation',
  RouteAssetsFixIssuesDialog = 'RouteAssets/FixIssuesDialog',
  RouteAssetsSelectInputAssetDialog = 'RouteAssets/SelectInputAssetDialog',
  RouteAssetsSwapDialog = 'RouteAssets/SwapDialog',
  RouteAssetsFailedTransactionsDialog = 'RouteAssets/FailedTransactionsDialog',
  RouteAssetsConfirmFinishRoutingDialog = 'RouteAssets/ConfirmFinishingRoutingDialog',
}

export const Stages: Array<Stage> = [
  createStage('Upload template', 'uploadTemplate'),
  createStage('Process template', 'processTemplate'),
  createStage('Transaction Overview', 'transactionOverview'),
  createStage('Review details', 'reviewDetails'),
  // createStage('Authorize', 'authorize'),
  createStage('Routing', 'routing'),
  createStage('Done', 'done'),
];

function createStage(title: string, componentName: string): Stage {
  return {
    title,
    component: componentName,
  };
}

export const slippageMultiplier = 1.15;
