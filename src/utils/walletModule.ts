import { createAsyncComponent, type AsyncComponentFactory } from '@/utils/asyncComponent';

type WalletModule = typeof import('@/shims/wallet');

let walletModulePromise: Promise<WalletModule> | null = null;

export const loadWalletModule = () => {
  if (!walletModulePromise) {
    walletModulePromise = import('@/shims/wallet');
  }

  return walletModulePromise;
};

const componentCache = new Map<string, AsyncComponentFactory>();

export const resolveWalletComponent = (name: string): AsyncComponentFactory => {
  if (!componentCache.has(name)) {
    componentCache.set(
      name,
      createAsyncComponent(
        async () => {
          const module = await loadWalletModule();
          const component = module.components?.[name as keyof typeof module.components];

          if (!component) {
            throw new Error(`Wallet component "${name}" is unavailable`);
          }

          return component;
        },
        { name: `wallet/${name}` }
      )
    );
  }

  return componentCache.get(name)!;
};

export const walletComponents = new Proxy(
  {},
  {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string') {
        return undefined;
      }

      return resolveWalletComponent(prop);
    },
  }
) as Record<string, AsyncComponentFactory>;
