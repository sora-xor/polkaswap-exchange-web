import type { ActionContext } from 'vuex';

import * as vuexCompat from './vuex-compat';

type ModuleGetterArgs = [any, any, any, any];
type ModuleContextShape = Record<string, unknown>;

const resolveModuleGetterContext = vuexCompat.localGetterContext as (
  args: ModuleGetterArgs,
  module?: unknown,
  definition?: unknown
) => ModuleContextShape;

const resolveModuleActionContext = vuexCompat.localActionContext as (
  context: ActionContext<any, any>,
  module?: unknown,
  definition?: unknown
) => ModuleContextShape;

/**
 * Stable facade for module-local getter context helpers.
 */
export const localModuleGetterContext = (
  args: ModuleGetterArgs,
  module?: unknown,
  definition?: unknown
): ModuleContextShape => {
  return resolveModuleGetterContext(args, module, definition);
};

/**
 * Stable facade for module-local action context helpers.
 */
export const localModuleActionContext = (
  context: ActionContext<any, any>,
  module?: unknown,
  definition?: unknown
): ModuleContextShape => {
  return resolveModuleActionContext(context, module, definition);
};
