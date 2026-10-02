import { spawn } from 'node:child_process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  canAutoStartPreviewServer,
  ensurePreviewServer,
  resolvePreviewServerConfig,
} from '../../../../scripts/playwright/preview-server-helper.mjs';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

describe('playwright smoke preview server helper', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('auto-starts only for loopback http origins', () => {
    expect(canAutoStartPreviewServer('http://127.0.0.1:8896')).toBe(true);
    expect(canAutoStartPreviewServer('http://localhost:4173')).toBe(true);
    expect(canAutoStartPreviewServer('https://polkaswap.io')).toBe(false);
  });

  it('derives preview host, port, prefix, and health URL from the effective app base URL', () => {
    expect(resolvePreviewServerConfig('http://127.0.0.1:8896/ipfs/polkaswap-e2e/')).toEqual({
      host: '127.0.0.1',
      port: '8896',
      prefix: '/ipfs/polkaswap-e2e/',
      healthUrl: 'http://127.0.0.1:8896/healthz',
    });
  });

  it('supports root-prefix preview runs', () => {
    expect(resolvePreviewServerConfig('http://127.0.0.1:43123/')).toEqual({
      host: '127.0.0.1',
      port: '43123',
      prefix: '/',
      healthUrl: 'http://127.0.0.1:43123/healthz',
    });
  });

  it.each([
    ['https://polkaswap.io', 'https://polkaswap.io/'],
    ['https://polkaswap.io', 'https://polkaswap.io/ipfs/release/'],
    ['http://127.0.0.1:8896', 'https://polkaswap.io/'],
    ['https://polkaswap.io', 'http://127.0.0.1:8896/'],
  ])('leaves static/non-loopback targets to browser validation: %s -> %s', async (rawBaseUrl, appBaseUrl) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const stopPreviewServer = await ensurePreviewServer(rawBaseUrl, appBaseUrl);
    await stopPreviewServer();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('checks and reuses a healthy loopback preview without spawning', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const stopPreviewServer = await ensurePreviewServer('http://127.0.0.1:8896', 'http://127.0.0.1:8896/ipfs/demo/');
    await stopPreviewServer();

    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8896/healthz', { redirect: 'manual' });
    expect(spawn).not.toHaveBeenCalled();
  });

  it('spawns only the loopback preview and stops the child it created', async () => {
    const kill = vi.fn();
    vi.mocked(spawn).mockReturnValue({ kill, killed: false } as unknown as ReturnType<typeof spawn>);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 503 }).mockResolvedValue({ ok: true }));

    const stopPreviewServer = await ensurePreviewServer('http://127.0.0.1:8896', 'http://127.0.0.1:8896/ipfs/demo/');

    expect(spawn).toHaveBeenCalledWith(
      process.execPath,
      [
        expect.stringContaining('ipfs-preview-server.mjs'),
        '--host',
        '127.0.0.1',
        '--port',
        '8896',
        '--prefix',
        '/ipfs/demo/',
      ],
      { cwd: process.cwd(), stdio: 'ignore' }
    );
    await stopPreviewServer();
    expect(kill).toHaveBeenCalledWith('SIGTERM');
  });
});
