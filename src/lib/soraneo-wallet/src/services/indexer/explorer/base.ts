import { pipe, subscribe } from 'wonka';

import { IndexerType } from '@/consts';
import { ConnectionStatus } from '@/types/common';

import type { Client, OperationResult, TypedDocumentNode, AnyVariables } from '@urql/core';

export type CreateExplorerClientFn = (url: string) => Client;
export type GetStatusFn = () => ConnectionStatus;
export type SetStatusFn = (status: ConnectionStatus) => Promise<void>;
export type GetEndpointFn = () => Nullable<string>;

export default class BaseExplorer {
  public client!: Client;
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

  public initClient() {
    if (this.client) return;
    const url = this.getEndpoint();
    if (!url) {
      this.setStatus(ConnectionStatus.Unavailable);
      throw new Error(`${this.type} endpoint is not set`);
    }
    this.setStatus(ConnectionStatus.Loading);
    this.client = this.createExplorerClient(url);
  }

  public async request<T>(query: TypedDocumentNode<T>, variables: AnyVariables = {}) {
    this.initClient();

    const payload = await this.client.query(query, variables).toPromise();

    this.handlePayloadStatus(payload);

    return payload.data;
  }

  // https://formidable.com/open-source/urql/docs/advanced/subscriptions/#one-off-subscriptions
  public subscribe<T>(subscription: TypedDocumentNode<T>, variables: AnyVariables = {}) {
    this.initClient();

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
