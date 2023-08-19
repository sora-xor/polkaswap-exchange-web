type Nullable<T> = T | null | undefined;

type FnWithoutArgs<T = void> = () => T;

type AsyncFnWithoutArgs<T = void> = () => Promise<T>;

type DataMap<T> = {
  [key: string]: T;
};

type DoubleMap<T> = DataMap<DataMap<T>>;

type WindowInjectedWeb3 = typeof window & {
  injectedWeb3?: {
    'fearless-wallet'?: {
      enable: (origin: string) => Promise<void>;
      saveSoraCardToken?: (token: string) => Promise<void>;
      version: string;
    };
  };
};
