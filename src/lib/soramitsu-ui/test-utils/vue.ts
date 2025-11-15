import { mount, type MountingOptions } from '@vue/test-utils';
import type { Component } from 'vue';
import {
  createMemoryHistory,
  createRouter,
  type RouteRecordRaw,
  type Router,
  type RouterHistory,
  type RouterOptions,
} from 'vue-router';
import { createPinia, setActivePinia, type Pinia, type PiniaPlugin } from 'pinia';

type BaseMountOptions = MountingOptions<any>;

type MountResult = ReturnType<typeof mount> & {
  router?: Router;
  pinia?: Pinia;
};

export interface RouterPresetOptions extends Omit<RouterOptions, 'history' | 'routes'> {
  history?: RouterHistory;
  initialRoute?: string;
  routes?: RouteRecordRaw[];
}

export interface PiniaPresetOptions {
  autoActivate?: boolean;
  create?: () => Pinia;
  instance?: Pinia;
  plugins?: PiniaPlugin[];
}

export type MountHelperOptions = BaseMountOptions & {
  pinia?: boolean | Pinia | PiniaPresetOptions;
  router?: boolean | Router | RouterPresetOptions;
};

function resolveRouter(router?: MountHelperOptions['router']): Router | undefined {
  if (!router) {
    return undefined;
  }

  if (router === true) {
    return createRouter({
      history: createMemoryHistory(),
      routes: [],
    });
  }

  if (typeof (router as Router).install === 'function') {
    return router as Router;
  }

  const { history, initialRoute, routes = [], ...rest } = router as RouterPresetOptions;
  const resolvedHistory = history ?? createMemoryHistory();

  if (initialRoute) {
    resolvedHistory.replace?.(initialRoute);
  }

  const instance = createRouter({
    history: resolvedHistory,
    routes,
    ...rest,
  });

  if (initialRoute) {
    instance.push(initialRoute).catch(() => undefined);
  }

  return instance;
}

function resolvePinia(pinia?: MountHelperOptions['pinia']): Pinia | undefined {
  if (!pinia) {
    return undefined;
  }

  if (pinia === true) {
    const instance = createPinia();
    setActivePinia(instance);
    return instance;
  }

  if (typeof (pinia as Pinia).install === 'function') {
    const instance = pinia as Pinia;
    setActivePinia(instance);
    return instance;
  }

  const { autoActivate = true, create = createPinia, instance, plugins = [] } = pinia as PiniaPresetOptions;
  const resolvedInstance = instance ?? create();

  plugins.forEach((plugin) => {
    resolvedInstance.use(plugin);
  });

  if (autoActivate) {
    setActivePinia(resolvedInstance);
  }

  return resolvedInstance;
}

export function createTestRouter(options: Router | RouterPresetOptions | true = true): Router {
  const router = resolveRouter(options);

  if (!router) {
    throw new Error('createTestRouter requires router configuration');
  }

  return router;
}

export function createTestPinia(options: Pinia | PiniaPresetOptions | true = true): Pinia {
  const pinia = resolvePinia(options);

  if (!pinia) {
    throw new Error('createTestPinia requires pinia configuration');
  }

  return pinia;
}

export function mountWithProviders(component: Component, options: MountHelperOptions = {}): MountResult {
  const { router, pinia, global, ...rest } = options;
  const resolvedRouter = resolveRouter(router);
  const resolvedPinia = resolvePinia(pinia);

  const baseGlobal: NonNullable<BaseMountOptions['global']> = {
    ...(global ?? {}),
    stubs: {
      transition: false,
      'transition-group': false,
      ...(global?.stubs ?? {}),
    },
  };

  const plugins = [...(baseGlobal.plugins ?? [])];

  if (resolvedRouter) {
    plugins.push(resolvedRouter);
  }

  if (resolvedPinia) {
    plugins.push(resolvedPinia);
  }

  if (plugins.length > 0) {
    baseGlobal.plugins = plugins;
  }

  const wrapper = mount(component as any, {
    ...rest,
    global: baseGlobal,
  }) as MountResult;

  if (resolvedRouter) {
    Object.assign(wrapper, { router: resolvedRouter });
  }

  if (resolvedPinia) {
    Object.assign(wrapper, { pinia: resolvedPinia });
  }

  return wrapper;
}

export function mountWithRouter(component: Component, options: MountHelperOptions = {}): MountResult {
  return mountWithProviders(component, {
    ...options,
    router: options.router ?? true,
  });
}

export function mountWithPinia(component: Component, options: MountHelperOptions = {}): MountResult {
  return mountWithProviders(component, {
    ...options,
    pinia: options.pinia ?? true,
  });
}
