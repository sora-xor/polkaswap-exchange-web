import { pipe, subscribe } from 'wonka';

import { IndexerType } from '../../../consts';
import { ConnectionStatus } from '../../../types/common';

import type { Client, OperationResult, TypedDocumentNode, AnyVariables } from '@urql/core';

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
  }

  public initClient() {
    if (this.client) return true;
    const url = this.getEndpoint();
    if (!url) {
      this.setStatus(ConnectionStatus.Unavailable);
      return false;
    }
    this.setStatus(ConnectionStatus.Loading);
    this.client = this.createExplorerClient(url);
    return true;
  }

  public async request<T>(query: TypedDocumentNode<T>, variables: AnyVariables = {}) {
    for (let attempt = 0; attempt <= REQUEST_RETRY_LIMIT; attempt += 1) {
      if (!this.initClient()) return null;

      const payload = await this.client.query(query, variables).toPromise();
      const isNetworkError = !!payload.error?.networkError;
      const isLastAttempt = attempt === REQUEST_RETRY_LIMIT;

      if (!isNetworkError || isLastAttempt) {
        this.handlePayloadStatus(payload);
        return payload.data;
      }

      this.resetClient();
      await new Promise((resolve) => setTimeout(resolve, REQUEST_RETRY_DELAY_MS * (attempt + 1)));
    }

    return null;
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
