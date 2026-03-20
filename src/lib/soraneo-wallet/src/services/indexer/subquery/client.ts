import { createClient, fetchExchange, subscriptionExchange } from '@urql/core';
import { SubscriptionClient } from 'subscriptions-transport-ws';

import { wsClientLazy, wsClientReconnect, wsClientRetryAttempts } from '@/consts/indexer';

import type { Client } from '@urql/core';

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

// https://github.com/apollographql/subscriptions-transport-ws/blob/51270cc7dbaf09c7b9aa67368f1de58148c7d334/README.md#constructorurl-options-websocketimpl
const createSubscriptionClient = (url: string) => {
  const wsUrl = resolveSubscriptionWsUrl(url);
  if (!wsUrl) {
    return null;
  }

  return new SubscriptionClient(wsUrl, {
    minTimeout: 6000, // the minimum amount of time the client should wait for a connection to be made (default 1000 ms)
    lazy: wsClientLazy, // connects only when first subscription created, and delay the socket initialization
    reconnect: wsClientReconnect, // automatic reconnect in case of connection error
    reconnectionAttempts: wsClientRetryAttempts,
  });
};

// https://formidable.com/open-source/urql/docs/advanced/subscriptions/#setting-up-subscriptions-transport-ws
const createSubscriptionExchange = (subscriptionClient: SubscriptionClient) => {
  return subscriptionExchange({
    forwardSubscription: (operation) => subscriptionClient.request(operation),
  });
};

export const createExplorerClient = (url: string): Client => {
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
  });

  return client;
};
