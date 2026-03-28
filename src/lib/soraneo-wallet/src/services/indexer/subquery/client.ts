import { createClient, fetchExchange, subscriptionExchange } from '@urql/core';
import { SubscribePayload, createClient as createWSClient } from 'graphql-ws';

import { wsClientLazy, wsClientReconnect, wsClientRetryAttempts } from '@/consts/indexer';

import type { Client } from '@urql/core';
import type { ExplorerClient } from '../explorer/base';

export type { Client, OperationResult, TypedDocumentNode, AnyVariables } from '@urql/core';

const shouldDisableSubscriptionWs = (url: URL): boolean => {
  // `api.subquery.network/sq/*` endpoints currently reject websocket handshake
  // in production for this app setup; skip ws exchange to avoid retry churn.
  return url.hostname === 'api.subquery.network' && url.pathname.startsWith('/sq/');
};

const resolveSubscriptionWsUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (shouldDisableSubscriptionWs(parsed)) {
      return null;
    }

    if (parsed.protocol === 'http:') {
      parsed.protocol = 'ws:';
      return parsed.toString();
    }

    if (parsed.protocol === 'https:') {
      parsed.protocol = 'wss:';
      return parsed.toString();
    }

    if (parsed.protocol === 'ws:' || parsed.protocol === 'wss:') {
      return parsed.toString();
    }

    return null;
  } catch {
    return url.replace(/^http/, 'ws');
  }
};

const createSubscriptionClient = (url: string) => {
  const wsUrl = resolveSubscriptionWsUrl(url);
  if (!wsUrl) {
    return null;
  }

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

export const createExplorerClient = (url: string): ExplorerClient => {
  const exchanges = [fetchExchange];
  const subscriptionClient = createSubscriptionClient(url);
  if (subscriptionClient) {
    const subscriptionExchange = createSubscriptionExchange(subscriptionClient);
    exchanges.push(subscriptionExchange);
  }

  const client = createClient({
    url,
    exchanges,
    requestPolicy: 'network-only',
  }) as ExplorerClient;

  client.supportsSubscriptions = Boolean(subscriptionClient);

  return client;
};
