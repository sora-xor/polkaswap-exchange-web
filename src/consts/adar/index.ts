import type { Stage } from '@/store/routeAssets/types';

export enum AdarPageNames {
  Send = 'Send',
  KYC = 'KYC',
  RouteAssets = 'ADAR/NewRouteAssets',
}

export enum AdarComponents {
  UploadCSVDialog = 'ADAR/RouteAssets/UploadCSVDialog',
  TemplateSummary = 'ADAR/RouteAssets/RoutingTemplate/TemplateSummary',
  TransactionOverview = 'ADAR/RouteAssets/RoutingTemplate/TransactionOverview',
  AuthorizeRoutingTemplateDialog = 'ADAR/RouteAssets/AuthorizeRoutingTemplateDialog',
  UploadCSV = 'ADAR/RouteAssets/UploadCSV',
  RoutingTemplate = 'ADAR/RouteAssets/RoutingTemplate',
  RouteAssetsAuthorize = 'ADAR/RouteAssets/Stages/Authorize',
  RouteAssetsDone = 'ADAR/RouteAssets/Stages/Done',
  RouteAssetsProcessTemplate = 'ADAR/RouteAssets/Stages/ProcessTemplate',
  RouteAssetsReviewDetails = 'ADAR/RouteAssets/Stages/ReviewDetails',
  RouteAssetsRouting = 'ADAR/RouteAssets/Stages/Routing',
  RouteAssetsTransactionOverview = 'ADAR/RouteAssets/Stages/TransactionOverview',
  RouteAssetsUploadTemplate = 'ADAR/RouteAssets/Stages/UploadTemplate',
  RouteAssetsNavigation = 'ADAR/App/Header/RouteAssetsNavigation',
  RouteAssetsFixIssuesDialog = 'ADAR/RouteAssets/FixIssuesDialog',
  RouteAssetsSelectInputAssetDialog = 'ADAR/RouteAssets/SelectInputAssetDialog',
  RouteAssetsSwapDialog = 'ADAR/RouteAssets/SwapDialog',
  RouteAssetsFailedTransactionsDialog = 'ADAR/RouteAssets/FailedTransactionsDialog',
}

export const Stages: Array<Stage> = [
  createStage('Upload template', 'uploadTemplate'),
  createStage('Process template', 'processTemplate'),
  createStage('Transaction Overview', 'transactionOverview'),
  createStage('Review details', 'reviewDetails'),
  createStage('Authorize', 'authorize'),
  createStage('Routing', 'routing'),
  createStage('Done', 'done'),
];

function createStage(title: string, componentName: string): Stage {
  return {
    title,
    component: componentName,
  };
}
