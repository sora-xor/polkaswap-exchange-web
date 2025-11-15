import { VueDecorator } from 'vue-class-component';

/**
 * Enumerates the Vuex helpers the wallet exposes via decorators.
 */
export declare enum VuexOperation {
  State = 'state',
  Getter = 'getter',
  Mutation = 'mutation',
  Action = 'action',
}
/**
 * Creates a class-style Vue decorator that maps Vuex state, getters, actions
 * or mutations into component properties.
 */
export declare function attachDecorator(type: VuexOperation, name: string, modulesChain?: string): VueDecorator;
/**
 * Recursively walks through Vuex modules and builds a matching decorator tree
 * so consuming apps can import a single object and destructure nested helpers.
 */
export declare function createDecoratorsObject(
  obj: any,
  newObj: any,
  modules: Array<string>,
  type: VuexOperation,
  path?: string
): void;
