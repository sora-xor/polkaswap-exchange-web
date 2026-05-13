import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/consts';
import PolkaswapExplorer from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/explorer';
import { ConnectionStatus } from '@/lib/soraneo-wallet/src/types/common';

type SubscriptionPayload = {
  data?: {
    payload?: {
      _entity?: unknown;
    };
  };
  error?: unknown;
};
type SubscriptionHandler = (payload: SubscriptionPayload) => void;

const setup = () => {
  let subscriptionHandler: SubscriptionHandler | null = null;
  const unsubscribe = vi.fn();
  const explorer = new PolkaswapExplorer({
    type: IndexerType.POLKASWAP,
    createExplorerClient: vi.fn() as never,
    getStatus: () => ConnectionStatus.Available,
    setStatus: vi.fn(async () => undefined),
    getEndpoint: () => 'https://indexer.test/graphql',
  });

  vi.spyOn(explorer, 'subscribe').mockReturnValue(((handler: SubscriptionHandler) => {
    subscriptionHandler = handler;
    return unsubscribe;
  }) as never);

  return {
    explorer,
    unsubscribe,
    emit: (payload: SubscriptionPayload) => {
      if (!subscriptionHandler) {
        throw new Error('Subscription handler is not registered');
      }

      subscriptionHandler(payload);
    },
  };
};

describe('PolkaswapExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores empty entity subscription payloads and handles valid entities', () => {
    const { explorer, unsubscribe, emit } = setup();
    const parse = vi.fn((entity: { id: string }) => ({ parsedId: entity.id }));
    const handler = vi.fn();
    const errorHandler = vi.fn();

    expect(explorer.createEntitySubscription({} as never, { account: 'cnAccount' }, parse, handler, errorHandler)).toBe(
      unsubscribe
    );
    expect(explorer.subscribe).toHaveBeenCalledWith({}, { account: 'cnAccount' });

    expect(() => emit({})).not.toThrow();
    expect(() => emit({ data: undefined })).not.toThrow();
    expect(() => emit({ data: { payload: {} } })).not.toThrow();

    expect(parse).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
    expect(errorHandler).not.toHaveBeenCalled();

    emit({ data: { payload: { _entity: { id: 'tx-1' } } } });

    expect(parse).toHaveBeenCalledWith({ id: 'tx-1' });
    expect(handler).toHaveBeenCalledWith({ parsedId: 'tx-1' });
    expect(errorHandler).not.toHaveBeenCalled();
  });

  it('forwards subscription and parser errors to the optional error handler', () => {
    const { explorer, emit } = setup();
    const parserError = new Error('Invalid subscription entity');
    const subscriptionError = new Error('Subscription failed');
    const parse = vi.fn(() => {
      throw parserError;
    });
    const handler = vi.fn();
    const errorHandler = vi.fn();

    explorer.createEntitySubscription({} as never, {}, parse, handler, errorHandler);

    emit({ error: subscriptionError });
    emit({ data: { payload: { _entity: { id: 'bad-entity' } } } });

    expect(errorHandler).toHaveBeenNthCalledWith(1, subscriptionError);
    expect(errorHandler).toHaveBeenNthCalledWith(2, parserError);
    expect(handler).not.toHaveBeenCalled();
  });
});
