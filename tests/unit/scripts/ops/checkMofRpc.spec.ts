import { describe, expect, it } from 'vitest';

import {
  MofRpcCheckError,
  assertUsableHttpStatus,
  buildJsonRpcRequest,
  buildWebSocketAccept,
  normalizeMofRpcCheckOptions,
  parseMofRpcCheckArgs,
  parseHttpHeaders,
  parseJsonRpcPayload,
  validateJsonRpcErrorPayload,
  validateSystemHealthPayload,
  validateWebSocketHandshake,
} from '../../../../scripts/ops/check-mof-rpc.mjs';

describe('MOF RPC ops checker', () => {
  it('builds strict JSON-RPC 2.0 requests', () => {
    expect(buildJsonRpcRequest('system_health')).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'system_health',
      params: [],
    });
    expect(buildJsonRpcRequest('chain_getBlockHash', [0], 7)).toEqual({
      jsonrpc: '2.0',
      id: 7,
      method: 'chain_getBlockHash',
      params: [0],
    });
  });

  it('rejects malformed JSON-RPC request construction', () => {
    expect(() => buildJsonRpcRequest('')).toThrow(MofRpcCheckError);
    expect(() => buildJsonRpcRequest('system_health', {} as never)).toThrow(MofRpcCheckError);
  });

  it('normalizes strict production checker options', () => {
    expect(
      normalizeMofRpcCheckOptions({
        endpoint: 'https://ws.mof.sora.org',
        origin: 'https://polkaswap.io/#/swap',
        timeoutMs: 2_000,
        attempts: 2,
        requireSynced: false,
      })
    ).toMatchObject({
      endpoint: 'https://ws.mof.sora.org/',
      origin: 'https://polkaswap.io',
      timeoutMs: 2_000,
      attempts: 2,
      requireSynced: false,
    });
  });

  it('rejects unsafe or invalid checker options', () => {
    expect(() => normalizeMofRpcCheckOptions({ endpoint: 'not a url' })).toThrow(/valid URL/);
    expect(() => normalizeMofRpcCheckOptions({ endpoint: 'http://ws.mof.sora.org/' })).toThrow(/endpoint/);
    expect(() => normalizeMofRpcCheckOptions({ endpoint: 'https://user:secret@ws.mof.sora.org/' })).toThrow(
      /credentials/
    );
    expect(() => normalizeMofRpcCheckOptions({ origin: 'http://polkaswap.io' })).toThrow(/origin/);
    expect(() => normalizeMofRpcCheckOptions({ origin: 'https://user:secret@polkaswap.io' })).toThrow(/credentials/);
    expect(() => normalizeMofRpcCheckOptions({ timeoutMs: 999 })).toThrow(/timeout-ms/);
    expect(() => normalizeMofRpcCheckOptions({ attempts: 0 })).toThrow(/attempts/);
    expect(() => normalizeMofRpcCheckOptions({ attempts: 26 })).toThrow(/attempts/);
  });

  it('parses CLI arguments without accepting unknown or partial options', () => {
    expect(
      parseMofRpcCheckArgs([
        '--endpoint',
        'https://ws.mof.sora.org',
        '--origin',
        'https://polkaswap.io/swap',
        '--timeout-ms',
        '2000',
        '--attempts',
        '3',
        '--allow-syncing',
      ])
    ).toMatchObject({
      endpoint: 'https://ws.mof.sora.org/',
      origin: 'https://polkaswap.io',
      timeoutMs: 2_000,
      attempts: 3,
      requireSynced: false,
    });

    expect(() => parseMofRpcCheckArgs(['--endpoint'])).toThrow(/requires a value/);
    expect(() => parseMofRpcCheckArgs(['--fallback', 'https://mof2.sora.org'])).toThrow(/Unknown argument/);
  });

  it('rejects redirects, rate limits, and gateway errors instead of accepting fallbacks', () => {
    expect(() => assertUsableHttpStatus(200, 'health')).not.toThrow();
    expect(() => assertUsableHttpStatus(302, 'health')).toThrow(/redirect/);
    expect(() => assertUsableHttpStatus(429, 'health')).toThrow(/429/);
    expect(() => assertUsableHttpStatus(502, 'health')).toThrow(/gateway error/);
    expect(() => assertUsableHttpStatus(503, 'health')).toThrow(/gateway error/);
    expect(() => assertUsableHttpStatus(504, 'health')).toThrow(/gateway error/);
  });

  it('parses JSON-RPC payloads and rejects id/protocol mismatches', () => {
    expect(parseJsonRpcPayload('{"jsonrpc":"2.0","id":1,"result":true}')).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: true,
    });

    expect(() => parseJsonRpcPayload('not json')).toThrow(/not valid JSON/);
    expect(() => parseJsonRpcPayload('{"jsonrpc":"1.0","id":1,"result":true}')).toThrow(/JSON-RPC 2.0/);
    expect(() => parseJsonRpcPayload('{"jsonrpc":"2.0","id":2,"result":true}')).toThrow(/id/);
    expect(
      parseJsonRpcPayload('{"jsonrpc":"2.0","id":null,"error":{"code":-32700,"message":"Parse error"}}', null)
    ).toMatchObject({ id: null, error: { code: -32700 } });
  });

  it('validates healthy synced system_health payloads', () => {
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      result: { peers: 19, isSyncing: false, shouldHavePeers: true },
    };

    expect(validateSystemHealthPayload(payload)).toEqual(payload.result);
  });

  it('rejects unhealthy system_health payloads', () => {
    expect(() =>
      validateSystemHealthPayload({
        jsonrpc: '2.0',
        id: 1,
        result: { peers: 0, isSyncing: false, shouldHavePeers: true },
      })
    ).toThrow(/no connected peers/);
    expect(() =>
      validateSystemHealthPayload({
        jsonrpc: '2.0',
        id: 1,
        result: { peers: 1, isSyncing: true, shouldHavePeers: true },
      })
    ).toThrow(/still syncing/);
    expect(() =>
      validateSystemHealthPayload(
        {
          jsonrpc: '2.0',
          id: 1,
          result: { peers: 1, isSyncing: true, shouldHavePeers: true },
        },
        { requireSynced: false }
      )
    ).not.toThrow();
    expect(() =>
      validateSystemHealthPayload({
        jsonrpc: '2.0',
        id: 1,
        result: { peers: 1, isSyncing: false, shouldHavePeers: false },
      })
    ).toThrow(/should not have peers/);
  });

  it('requires negative probes to return JSON-RPC errors', () => {
    expect(
      validateJsonRpcErrorPayload({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32601, message: 'Method not found' },
      })
    ).toEqual({ code: -32601, message: 'Method not found' });

    expect(() =>
      validateJsonRpcErrorPayload({
        jsonrpc: '2.0',
        id: 1,
        result: null,
      })
    ).toThrow(/Expected a JSON-RPC error/);
  });

  it('validates WebSocket upgrade headers', () => {
    const key = 'x3JJHMbDL1EzLkh9GBhXDw==';
    const accept = buildWebSocketAccept(key);
    const rawHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Connection: upgrade',
      'Upgrade: websocket',
      `Sec-WebSocket-Accept: ${accept}`,
      '',
    ].join('\r\n');

    expect(parseHttpHeaders(rawHeaders).status).toBe(101);
    expect(() => validateWebSocketHandshake(rawHeaders, key)).not.toThrow();
  });

  it('rejects adversarial WebSocket handshakes', () => {
    const key = 'x3JJHMbDL1EzLkh9GBhXDw==';

    expect(() => validateWebSocketHandshake('HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/html\r\n', key)).toThrow(
      /gateway error/
    );
    expect(() =>
      validateWebSocketHandshake(
        ['HTTP/1.1 101 Switching Protocols', 'Connection: close', 'Upgrade: websocket', '', ''].join('\r\n'),
        key
      )
    ).toThrow(/connection upgrade/);
    expect(() =>
      validateWebSocketHandshake(
        [
          'HTTP/1.1 101 Switching Protocols',
          'Connection: upgrade',
          'Upgrade: websocket',
          'Sec-WebSocket-Accept: wrong',
          '',
        ].join('\r\n'),
        key
      )
    ).toThrow(/accept key/);
  });
});
