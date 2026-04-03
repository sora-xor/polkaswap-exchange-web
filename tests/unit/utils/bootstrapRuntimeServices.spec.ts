import { describe, expect, it, vi } from 'vitest';

import { bootstrapRuntimeServices } from '@/utils/bootstrapRuntimeServices';

describe('bootstrapRuntimeServices', () => {
  it('starts node and indexer bootstrap tasks in parallel', async () => {
    const events: string[] = [];
    let resolveNode!: () => void;
    let resolveIndexerInit!: () => void;
    let resolveIndexer!: () => void;

    const connectToNode = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          events.push('node:start');
          resolveNode = () => {
            events.push('node:done');
            resolve();
          };
        })
    );

    const initializeIndexer = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          events.push('indexer:init:start');
          resolveIndexerInit = () => {
            events.push('indexer:init:done');
            resolve();
          };
        })
    );

    const subscribeToIndexer = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          events.push('indexer:start');
          resolveIndexer = () => {
            events.push('indexer:done');
            resolve();
          };
        })
    );

    const pending = bootstrapRuntimeServices({
      connectToNode,
      initializeIndexer,
      subscribeToIndexer,
      hasIndexerEndpoint: true,
    });

    expect(connectToNode).toHaveBeenCalledTimes(1);
    expect(initializeIndexer).toHaveBeenCalledTimes(1);
    expect(subscribeToIndexer).toHaveBeenCalledTimes(1);
    expect(events).toEqual(['node:start', 'indexer:init:start', 'indexer:start']);

    resolveIndexerInit();
    resolveIndexer();
    resolveNode();

    await pending;

    expect(events).toEqual([
      'node:start',
      'indexer:init:start',
      'indexer:start',
      'indexer:init:done',
      'indexer:done',
      'node:done',
    ]);
  });

  it('logs and swallows indexer initialization failures', async () => {
    const logger = { warn: vi.fn() };
    const error = new Error('indexer down');

    await expect(
      bootstrapRuntimeServices({
        connectToNode: vi.fn().mockResolvedValue(undefined),
        initializeIndexer: vi.fn().mockRejectedValue(error),
        subscribeToIndexer: vi.fn().mockResolvedValue(undefined),
        hasIndexerEndpoint: true,
        logger,
      })
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith('[bootstrap] initializeIndexer skipped', error);
  });

  it('logs and swallows exchange-rate subscription failures', async () => {
    const logger = { warn: vi.fn() };
    const error = new Error('indexer down');

    await expect(
      bootstrapRuntimeServices({
        connectToNode: vi.fn().mockResolvedValue(undefined),
        initializeIndexer: vi.fn().mockResolvedValue(undefined),
        subscribeToIndexer: vi.fn().mockRejectedValue(error),
        hasIndexerEndpoint: true,
        logger,
      })
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith('[bootstrap] subscribeOnExchangeRatesApi skipped', error);
  });

  it('propagates node bootstrap failures', async () => {
    const error = new Error('node down');

    await expect(
      bootstrapRuntimeServices({
        connectToNode: vi.fn().mockRejectedValue(error),
        initializeIndexer: vi.fn().mockResolvedValue(undefined),
        subscribeToIndexer: vi.fn().mockResolvedValue(undefined),
        hasIndexerEndpoint: true,
      })
    ).rejects.toThrow('node down');
  });
});
