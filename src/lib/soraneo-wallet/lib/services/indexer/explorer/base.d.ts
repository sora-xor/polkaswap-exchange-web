import { IndexerType } from '../../../consts';
import { ConnectionStatus } from '../../../types/common';
import { Client, OperationResult, TypedDocumentNode, AnyVariables } from '@urql/core';

export type CreateExplorerClientFn = (url: string) => Client;
export type GetStatusFn = () => ConnectionStatus;
export type SetStatusFn = (status: ConnectionStatus) => Promise<void>;
export type GetEndpointFn = () => Nullable<string>;
export default class BaseExplorer {
  client: Client;
  type: IndexerType;
  protected createExplorerClient: CreateExplorerClientFn;
  protected getStatus: GetStatusFn;
  protected setStatus: SetStatusFn;
  protected getEndpoint: GetEndpointFn;
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
  });
  private handlePayloadStatus;
  initClient(): void;
  request<T>(query: TypedDocumentNode<T>, variables?: AnyVariables): Promise<T | undefined>;
  subscribe<T>(
    subscription: TypedDocumentNode<T>,
    variables?: AnyVariables
  ): (handler: (payload: OperationResult<T, any>) => void) => () => void;
}
