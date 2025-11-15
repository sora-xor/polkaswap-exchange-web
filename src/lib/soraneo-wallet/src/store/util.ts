import { createDecorator, VueDecorator } from 'vue-class-component';
import { mapGetters, mapState, mapActions, mapMutations } from 'vuex';

/**
 * Enumerates the Vuex helpers the wallet exposes via decorators.
 */
export enum VuexOperation {
  State = 'state',
  Getter = 'getter',
  Mutation = 'mutation',
  Action = 'action',
}

/**
 * Resolves the Vuex helper that should be used for a given decorator type.
 */
function getVuexMapFn(type: VuexOperation): any {
  switch (type) {
    case VuexOperation.State:
      return mapState;
    case VuexOperation.Getter:
      return mapGetters;
    case VuexOperation.Mutation:
      return mapMutations;
    case VuexOperation.Action:
      return mapActions;
  }
}

/**
 * Detects whether a decorator maps into a computed property (state/getter) so
 * we can register it under the correct Vue component option.
 */
function isComputedDecorator(type: VuexOperation): boolean {
  return [VuexOperation.State, VuexOperation.Getter].includes(type);
}

/**
 * Creates a class-style Vue decorator that maps Vuex state, getters, actions
 * or mutations into component properties.
 */
export function attachDecorator(type: VuexOperation, name: string, modulesChain?: string): VueDecorator {
  const mapFn = getVuexMapFn(type);
  const featuresType = isComputedDecorator(type) ? 'computed' : 'methods';
  return createDecorator((options, key) => {
    let features = { ...options[featuresType] };
    if (!features) {
      features = {};
    }
    const mapObject = { [name]: name };
    const map = modulesChain ? mapFn(modulesChain, mapObject) : mapFn(mapObject);
    features[key] = map[name];
    options[featuresType] = features;
  });
}

const uiLibGetters = ['libraryDesignSystem', 'libraryTheme'];

/**
 * Recursively walks through Vuex modules and builds a matching decorator tree
 * so consuming apps can import a single object and destructure nested helpers.
 */
export function createDecoratorsObject(
  obj: any,
  newObj: any,
  modules: Array<string>,
  type: VuexOperation,
  path?: string
): void {
  let keys = Object.keys(obj);
  if (!keys.length) {
    // cuz Object.keys refers only to enumerable props
    keys = Object.getOwnPropertyNames(obj);
  }
  for (const key of keys) {
    const value = obj[key];
    if (uiLibGetters.includes(key)) return;
    if (path && modules.includes(path)) {
      newObj[key] = attachDecorator(type, key, path);
    } else {
      newObj[key] = {};
      createDecoratorsObject(value, newObj[key], modules, type, path ? `${path}/${key}` : key);
    }
  }
}
