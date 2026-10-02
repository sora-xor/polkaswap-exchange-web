import { describe, expect, it } from 'vitest';
import { assertPreparedContext } from '@/features/bot-trading/policy';
import type { AgentPreparedSwap } from '@/features/agent-trading/types';
import { executionBot, executionStatus } from './execution-fixtures';

/** Context-only fixture; the existing live suite tests integrity using service-issued complete envelopes. */
function contextFixture() {
  const bot = executionBot();
  const status = executionStatus();
  const prepared = {
    envelope: {
      preparedAt: 1000,
      expiresAt: 301000,
      preparedAtBlock: 42,
      expiresAtBlock: 50,
      network: { genesisHash: bot.network, runtimeSpecVersion: status.node.runtimeSpecVersion },
      signer: { address: bot.account, source: status.wallet.source },
    },
  } as AgentPreparedSwap;
  return { bot, status, prepared };
}

describe('last-boundary prepared swap context', () => {
  it('accepts fresh context synchronously, including the supported age and block endpoints', () => {
    const h = contextFixture();
    expect(assertPreparedContext(h.bot, h.prepared, h.status, 1000)).toBeUndefined();
    h.status.node.blockNumber = 50;
    expect(assertPreparedContext(h.bot, h.prepared, h.status, 31000)).toBeUndefined();
  });

  it.each([999, 31001, NaN, Infinity, -1, 1000.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects future preparation, over-age or invalid check time %s',
    (now) => {
      const h = contextFixture();
      expect(() => assertPreparedContext(h.bot, h.prepared, h.status, now)).toThrow('bots.errors.intent');
    }
  );

  it('rejects expiration exactly at the boundary even if the short quote age is still valid', () => {
    const h = contextFixture();
    h.prepared.envelope.expiresAt = 2000;
    expect(() => assertPreparedContext(h.bot, h.prepared, h.status, 1999)).not.toThrow();
    expect(() => assertPreparedContext(h.bot, h.prepared, h.status, 2000)).toThrow('bots.errors.intent');
  });

  it.each([
    ['preparedAt', NaN],
    ['preparedAt', -1],
    ['preparedAt', 1000.5],
    ['expiresAt', Infinity],
    ['expiresAt', 999],
    ['expiresAt', 1000],
    ['expiresAt', Number.MAX_SAFE_INTEGER + 1],
    ['preparedAtBlock', -1],
    ['preparedAtBlock', 42.5],
    ['expiresAtBlock', 41],
    ['expiresAtBlock', NaN],
    ['expiresAtBlock', Number.MAX_SAFE_INTEGER + 1],
  ] as const)('rejects malformed envelope %s=%s', (field, value) => {
    const h = contextFixture();
    h.prepared.envelope[field] = value;
    expect(() => assertPreparedContext(h.bot, h.prepared, h.status, 2000)).toThrow('bots.errors.intent');
  });

  it.each([41, 51, NaN, Infinity, 42.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects regressed, expired or invalid current block %s',
    (block) => {
      const h = contextFixture();
      h.status.node.blockNumber = block;
      expect(() => assertPreparedContext(h.bot, h.prepared, h.status, 2000)).toThrow('bots.errors.intent');
    }
  );

  it.each(['network', 'runtime', 'wallet', 'source', 'node-disconnected', 'wallet-disconnected'])(
    'refuses a changed %s after asynchronous admission',
    (change) => {
      const h = contextFixture();
      if (change === 'network') h.status.node.genesisHash = 'other-network';
      if (change === 'runtime') h.status.node.runtimeSpecVersion++;
      if (change === 'wallet') h.status.wallet.address = 'other-account';
      if (change === 'source') h.status.wallet.source = 'other-wallet';
      if (change === 'node-disconnected') h.status.node.connected = false;
      if (change === 'wallet-disconnected') h.status.wallet.connected = false;
      expect(() => assertPreparedContext(h.bot, h.prepared, h.status, 2000)).toThrow('bots.errors.intent');
    }
  );

  it.each([0, -1, NaN, Infinity, 123.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid matching runtime versions %s',
    (runtime) => {
      const h = contextFixture();
      h.prepared.envelope.network.runtimeSpecVersion = runtime;
      h.status.node.runtimeSpecVersion = runtime;
      expect(() => assertPreparedContext(h.bot, h.prepared, h.status, 2000)).toThrow('bots.errors.intent');
    }
  );

  it('retains the bot authority binding independently of the latest connected context', () => {
    const h = contextFixture();
    h.bot.network = 'other-network';
    expect(() => assertPreparedContext(h.bot, h.prepared, h.status, 2000)).toThrow('bots.errors.intent');
    h.bot.network = h.status.node.genesisHash;
    h.bot.account = 'other-account';
    expect(() => assertPreparedContext(h.bot, h.prepared, h.status, 2000)).toThrow('bots.errors.intent');
  });
});
