/**
 * Starts independent runtime connectivity tasks during bootstrap.
 *
 * The node websocket, indexer warm-up, and exchange-rate subscription do not
 * depend on each other, so they should be kicked off in parallel to avoid
 * delaying footer and widget readiness on slower handshakes.
 */
export async function bootstrapRuntimeServices({
  connectToNode,
  initializeIndexer,
  subscribeToIndexer,
  hasIndexerEndpoint,
  logger = console,
}: {
  connectToNode?: () => Promise<void>;
  initializeIndexer?: () => Promise<void>;
  subscribeToIndexer?: () => Promise<void>;
  hasIndexerEndpoint: boolean;
  logger?: Pick<Console, 'warn'>;
}): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (typeof connectToNode === 'function') {
    tasks.push(connectToNode());
  }

  if (hasIndexerEndpoint && typeof initializeIndexer === 'function') {
    tasks.push(
      initializeIndexer().catch((error) => {
        logger.warn('[bootstrap] initializeIndexer skipped', error);
      })
    );
  }

  if (hasIndexerEndpoint && typeof subscribeToIndexer === 'function') {
    tasks.push(
      subscribeToIndexer().catch((error) => {
        logger.warn('[bootstrap] subscribeOnExchangeRatesApi skipped', error);
      })
    );
  }

  await Promise.all(tasks);
}
