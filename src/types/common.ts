export { FilterOptions } from '@wallet/src/types/common';

/**
 * Shared utility types that need both module exports and global availability.
 * Keep definitions here and mirror them into the global ambient declarations via `src/types/index.d.ts`.
 */
export type Nullable<T> = T | null | undefined;

export type FnWithoutArgs<T = void> = () => T;

export type AsyncFnWithoutArgs<T = void> = () => Promise<T>;

export type DataMap<T> = Record<string, T>;

export type DoubleMap<T> = DataMap<DataMap<T>>;

export enum ConnectionStatus {
  Idle = 'idle',
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnecting = 'disconnecting',
  Disconnected = 'disconnected',
  Error = 'error',
}

export type WindowInjectedWeb3 = typeof window & {
  injectedWeb3?: {
    'fearless-wallet'?: {
      enable: (origin: string) => Promise<void>;
      version: string;
    };
  };
};
