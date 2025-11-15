import { createClient, fetchExchange, subscriptionExchange } from '@urql/core';
import { SubscribePayload, createClient as createWSClient } from 'graphql-ws';

import { wsClientLazy, wsClientReconnect, wsClientRetryAttempts } from '@/consts/indexer';

import type { Client } from '@urql/core';

export type { Client, OperationResult, TypedDocumentNode, AnyVariables } from '@urql/core';

const createSubscriptionClient = (url: string) => {
  const wsUrl = url.replace(/^http/, 'ws');

  return createWSClient({
    url: wsUrl,
    lazy: wsClientLazy,
    retryAttempts: wsClientRetryAttempts,
    shouldRetry: () => wsClientReconnect,
  });
};

const createSubscriptionExchange = (subscriptionClient: ReturnType<typeof createWSClient>) => {
  return subscriptionExchange({
    forwardSubscription: (operation) => {
      return {
        subscribe: (sink) => {
          const dispose = subscriptionClient.subscribe(operation as SubscribePayload, sink);
          return {
            unsubscribe: dispose,
          };
        },
      };
    },
  });
};

export const createExplorerClient = (url: string): Client => {
  const exchanges = [fetchExchange];
  const subscriptionClient = createSubscriptionClient(url);
  const subscriptionExchange = createSubscriptionExchange(subscriptionClient);
  exchanges.push(subscriptionExchange);

  const client = createClient({
    url,
    exchanges,
    requestPolicy: 'network-only',
  });

  return client;
};
