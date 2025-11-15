import type { ApiPromise } from '@polkadot/api';
import type { WsProvider } from '@polkadot/rpc-provider';
import type { ApiInterfaceEvents, ApiOptions } from '@polkadot/api/types';
import type { ProviderInterfaceEmitCb } from '@polkadot/rpc-provider/types';

type ConnectionEventListener = [ApiInterfaceEvents, ProviderInterfaceEmitCb];

export interface ConnectionRunOptions {
  once?: boolean;
  timeout?: number;
  autoConnectMs?: number;
  eventListeners?: ConnectionEventListener[];
}

const disconnectApi = async (api: ApiPromise, eventListeners: ConnectionEventListener[]): Promise<void> => {
  if (!api) return;

  eventListeners.forEach(([eventName, eventHandler]) => api.off(eventName, eventHandler));

  try {
    // wait until the api connection is completed to check the "isConnected" flag
    await api.isReadyOrError;
  } catch {}

  try {
    // close the connection manually
    if (api.isConnected) {
      await api.disconnect();
    }
  } catch (error) {
    console.error(error);
  }
};

const createConnectionTimeout = (timeout: number): Promise<void> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Connection Timeout')), timeout);
  });
};

class Connection {
  public api: ApiPromise | null = null;
  public endpoint = '';
  public loading = false;

  private readonly ApiPromise!: typeof ApiPromise;
  private readonly WsProvider!: typeof WsProvider;
  private readonly apiOptions!: ApiOptions;

  private eventListeners: Array<[ApiInterfaceEvents, ProviderInterfaceEmitCb]> = [];

  constructor(apiPromise: typeof ApiPromise, wsProvider: typeof WsProvider, apiOptions: ApiOptions) {
    this.ApiPromise = apiPromise;
    this.WsProvider = wsProvider;
    this.apiOptions = apiOptions;
  }

  private async withLoading(func: Function): Promise<any> {
    this.loading = true;
    try {
      return await func();
    } finally {
      this.loading = false;
    }
  }

  private async run(endpoint: string, runOptions?: ConnectionRunOptions): Promise<void> {
    const { once = false, timeout = 0, autoConnectMs = 5000, eventListeners = [] } = runOptions ?? {};

    const providerAutoConnectMs = once ? false : autoConnectMs;
    const apiConnectionPromise = once ? 'isReadyOrError' : 'isReady';

    const provider = new this.WsProvider(endpoint, providerAutoConnectMs);
    // https://github.com/polkadot-js/api/issues/5798
    // Seems that the issue isn't related to the cache itself

    // const originalSend = provider.send;
    // provider.send = function <T>(method: string, params: unknown[], isCacheable?: boolean, subscription?: SubscriptionHandler): ReturnType<typeof originalSend<T>> {
    //   return originalSend.call(provider, method, params, false, subscription) as ReturnType<typeof originalSend<T>>;
    // };

    this.api = new this.ApiPromise({ ...this.apiOptions, provider, noInitWarn: true });
    this.endpoint = endpoint;

    const connectionRequests: Array<Promise<any>> = [];
    const apiInstance = this.api;

    if (!apiInstance) {
      throw new Error('Connection API instance not initialized');
    }

    let apiReadyPromise: Promise<unknown> | undefined;

    try {
      apiReadyPromise = apiInstance[apiConnectionPromise];
    } catch (error) {
      console.warn(`[Connection] Failed to access ${apiConnectionPromise} on ApiPromise`, error);
      apiReadyPromise = apiInstance.isReady.catch((readyError) => {
        throw readyError;
      });
    }

    if (apiReadyPromise) {
      connectionRequests.push(apiReadyPromise);
    }

    if (timeout) connectionRequests.push(createConnectionTimeout(timeout));

    try {
      eventListeners.forEach(([eventName, eventHandler]) => {
        this.addEventListener(eventName, eventHandler);
      });

      // we should manually call connect fn without autoConnectMs
      if (!providerAutoConnectMs) {
        this.api.connect();
      }

      await Promise.race(connectionRequests);
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  private async stop(): Promise<void> {
    if (this.api) {
      await disconnectApi(this.api, this.eventListeners);
    }
    this.api = null;
    this.endpoint = '';
    this.eventListeners = [];
  }

  public addEventListener(eventName: ApiInterfaceEvents, eventHandler: ProviderInterfaceEmitCb) {
    this.api?.on(eventName, eventHandler);
    this.eventListeners.push([eventName, eventHandler]);
  }

  public get opened(): boolean {
    return !!this.api;
  }

  /**
   * Open connection
   * @param endpoint address of node
   * @param options
   */
  public async open(endpoint?: string, options?: ConnectionRunOptions): Promise<void> {
    if (!(endpoint || this.endpoint)) throw new Error('You should set endpoint for connection');
    await this.withLoading(async () => await this.run(endpoint ?? this.endpoint, options));
  }

  /**
   * Close connection
   */
  public async close(): Promise<void> {
    await this.withLoading(async () => await this.stop());
  }
}

export { Connection };
