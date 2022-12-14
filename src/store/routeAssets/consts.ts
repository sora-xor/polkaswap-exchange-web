import type { Stage } from './types';

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
