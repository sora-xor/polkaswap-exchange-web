import { pipe, subscribe } from 'wonka';

import { IndexerType } from '../../../consts';
import { ConnectionStatus } from '../../../types/common';
import { StatsCoreNotReadyError } from '../coreRefresh';

import type { Client, OperationResult, TypedDocumentNode, AnyVariables } from '@urql/core';

export type ExplorerRequestOptions = { requestPolicy?: 'network-only'; retryPendingCore?: boolean };

export type ExplorerClient = Client & { supportsSubscriptions?: boolean };
export type CreateExplorerClientFn = (url: string) => ExplorerClient;
export type GetStatusFn = () => ConnectionStatus;
export type SetStatusFn = (status: ConnectionStatus) => Promise<void>;
export type GetEndpointFn = () => Nullable<string>;

const REQUEST_RETRY_LIMIT = 2;
const REQUEST_RETRY_DELAY_MS = 400;

export default class BaseExplorer {
  public client!: ExplorerClient;
  public type!: IndexerType;
  private clientEndpoint: Nullable<string> = null;

  protected createExplorerClient!: CreateExplorerClientFn;
  protected getStatus!: GetStatusFn;
  protected setStatus!: SetStatusFn;
  protected getEndpoint!: GetEndpointFn;

  constructor({
    type,
    createExplorerClient,
    getStatus,
    setStatus,
    getEndpoint,
  }: {
    type: IndexerType;
    createExplorerClient: CreateExplorerClientFn;
    getStatus: GetStatusFn;
    setStatus: SetStatusFn;
    getEndpoint: GetEndpointFn;
  }) {
    this.type = type;
    this.createExplorerClient = createExplorerClient;
    this.getStatus = getStatus;
    this.setStatus = setStatus;
    this.getEndpoint = getEndpoint;
  }

  private handlePayloadStatus<T>(payload: OperationResult<T, any>) {
    const isNetworkError = !!payload.error?.networkError;
    const status = isNetworkError ? ConnectionStatus.Unavailable : ConnectionStatus.Available;
    this.setStatus(status);
  }

  private resetClient() {
    this.client = undefined as unknown as ExplorerClient;
    this.clientEndpoint = null;
  }

  public initClient() {
    const url = this.getEndpoint();
    if (this.client && this.clientEndpoint === url) return true;
    if (this.client) this.resetClient();
    if (!url) {
      this.setStatus(ConnectionStatus.Unavailable);
      return false;
    }
    this.setStatus(ConnectionStatus.Loading);
    this.client = this.createExplorerClient(url);
    this.clientEndpoint = url;
    return true;
  }

  /** Return only error-free query data, retrying network failures without exposing partial responses. */
  public async request<T>(
    query: TypedDocumentNode<T>,
    variables: AnyVariables = {},
    options: ExplorerRequestOptions = {}
  ) {
    const { requestPolicy, retryPendingCore } = options;
    const endpoint = retryPendingCore ? this.getEndpoint() : null;
    for (let attempt = 0; attempt <= REQUEST_RETRY_LIMIT; attempt += 1) {
      if (!this.initClient()) return null;
      if (retryPendingCore && (this.getEndpoint() !== endpoint || this.clientEndpoint !== endpoint)) return null;

      const payload = await (
        requestPolicy ? this.client.query(query, variables, { requestPolicy }) : this.client.query(query, variables)
      ).toPromise();
      if (retryPendingCore && (this.getEndpoint() !== endpoint || this.clientEndpoint !== endpoint)) return null;
      const isNetworkError = !!payload.error?.networkError;
      const isLastAttempt = attempt === REQUEST_RETRY_LIMIT;
      const errors = payload.error?.graphQLErrors;
      if (
        retryPendingCore &&
        !isNetworkError &&
        errors?.length &&
        errors.every((error) => error.extensions?.code === 'STATS_CORE_NOT_READY')
      ) {
        this.handlePayloadStatus(payload);
        if (isLastAttempt) throw new StatsCoreNotReadyError('Current indexer prices are being refreshed');
        await new Promise((resolve) => setTimeout(resolve, 1_000 * (attempt + 1)));
        continue;
      }

      if (!isNetworkError || isLastAttempt) {
        this.handlePayloadStatus(payload);
        return payload.error ? undefined : payload.data;
      }

      this.resetClient();
      await new Promise((resolve) => setTimeout(resolve, REQUEST_RETRY_DELAY_MS * (attempt + 1)));
    }

    return null;
  }

  /** Freeze the client/endpoint; use uncached JSON POST so older schemas fail closed without HTTP negotiation errors. */
  public captureNetworkOnly(): this {
    if (this.client && this.getEndpoint() !== this.clientEndpoint) throw new Error('Indexer changed');
    if (!this.initClient()) throw new Error('Indexer unavailable');
    const client = this.client;
    const endpoint = this.getEndpoint();
    if (this.clientEndpoint !== endpoint) throw new Error('Indexer changed');
    const session = Object.create(this) as this;
    session.request = async <T>(query: TypedDocumentNode<T>, variables: AnyVariables = {}) => {
      if (this.client !== client || this.getEndpoint() !== endpoint) throw new Error('Indexer changed');
      const payload = await client
        .query(query, variables, {
          requestPolicy: 'network-only',
          preferGetMethod: false,
          fetchOptions: { cache: 'no-store', credentials: 'omit', headers: { accept: 'application/json' } },
        })
        .toPromise();
      this.handlePayloadStatus(payload);
      if (this.client !== client || this.getEndpoint() !== endpoint) throw new Error('Indexer changed');
      return payload.error ? undefined : payload.data;
    };
    session.captureNetworkOnly = () => {
      if (this.client !== client || this.getEndpoint() !== endpoint) throw new Error('Indexer changed');
      return session;
    };
    return session;
  }

  // https://formidable.com/open-source/urql/docs/advanced/subscriptions/#one-off-subscriptions
  public subscribe<T>(subscription: TypedDocumentNode<T>, variables: AnyVariables = {}) {
    if (!this.initClient()) {
      return () => () => undefined;
    }

    if (this.client.supportsSubscriptions === false) {
      return () => () => undefined;
    }

    return (handler: (payload: OperationResult<T, any>) => void) => {
      const { unsubscribe } = pipe(
        this.client.subscription(subscription, variables),
        subscribe((payload) => {
          this.handlePayloadStatus(payload);
          handler(payload);
        })
      );

      return unsubscribe;
    };
  }
}
