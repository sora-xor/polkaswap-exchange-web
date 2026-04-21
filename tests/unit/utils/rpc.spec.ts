import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock('@/api', () => ({
  default: {
    post: postMock,
  },
}));

import { fetchRpc, getRpcEndpoint } from '@/utils/rpc';

describe('rpc utilities', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('maps websocket endpoints to matching rpc/http endpoints', () => {
    expect(getRpcEndpoint('wss://ws.sora2.soramitsu.co.jp')).toBe('https://rpc.sora2.soramitsu.co.jp');
    expect(getRpcEndpoint('wss://ws.stage.sora2.soramitsu.co.jp/')).toBe('https://rpc.stage.sora2.soramitsu.co.jp/');
    expect(getRpcEndpoint('ws://127.0.0.1:9944')).toBe('http://127.0.0.1:9944');
    expect(getRpcEndpoint('wss://rpc.example.com')).toBe('https://rpc.example.com');
  });

  it('validates required fetchRpc arguments', async () => {
    await expect(fetchRpc('', 'system_health')).rejects.toThrow('fetchRpc: argument url is required');
    await expect(fetchRpc('https://rpc.example.com', '')).rejects.toThrow('fetchRpc: argument method is required');
  });

  it('posts a JSON-RPC payload and returns the result', async () => {
    postMock.mockResolvedValue({ data: { result: { ok: true } } });

    await expect(fetchRpc('https://rpc.example.com', 'system_health', ['x'])).resolves.toEqual({ ok: true });
    expect(postMock).toHaveBeenCalledWith('https://rpc.example.com', {
      id: 1,
      jsonrpc: '2.0',
      method: 'system_health',
      params: ['x'],
    });
  });
});
