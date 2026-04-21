import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IpfsStorage } from '@/lib/soraneo-wallet/src/util/ipfsStorage';

describe('IpfsStorage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('constructs gateway URLs and extracts host/path helpers', () => {
    expect(IpfsStorage.constructFullIpfsUrl('QmHash/metadata.json')).toBe('https://ipfs.io/ipfs/QmHash/metadata.json');
    expect(IpfsStorage.getStorageHostname('https://ipfs.io/ipfs/QmHash')).toBe('ipfs.io');
    expect(IpfsStorage.getStorageHostname('')).toBe('');
    expect(IpfsStorage.getIpfsPath('https://ipfs.io/ipfs/QmHash/metadata.json')).toBe('QmHash/metadata.json');
  });

  it('retrieves UCAN tokens without caching', async () => {
    const json = vi.fn().mockResolvedValue({ space: 'token' });
    const fetchMock = vi.fn().mockResolvedValue({ json });

    vi.stubGlobal('fetch', fetchMock);

    await expect(IpfsStorage.getUcanTokens()).resolves.toEqual({ space: 'token' });

    expect(fetchMock).toHaveBeenCalledWith('https://ucan.polkaswap2.io/ucan.json', { cache: 'no-cache' });
    expect(json).toHaveBeenCalledTimes(1);
  });

  it('reads files as base64 data URLs', async () => {
    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: Nullable<() => void> = null;
      onerror: Nullable<(error: unknown) => void> = null;

      readAsDataURL() {
        this.result = 'data:text/plain;base64,SGVsbG8=';
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('FileReader', MockFileReader as never);

    await expect(IpfsStorage.fileToBase64(new File(['hello'], 'hello.txt'))).resolves.toBe(
      'data:text/plain;base64,SGVsbG8='
    );
  });

  it('rejects file reads when FileReader reports an error', async () => {
    const error = new Error('read failed');

    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: Nullable<() => void> = null;
      onerror: Nullable<(error: unknown) => void> = null;

      readAsDataURL() {
        queueMicrotask(() => this.onerror?.(error));
      }
    }

    vi.stubGlobal('FileReader', MockFileReader as never);

    await expect(IpfsStorage.fileToBase64(new File(['hello'], 'hello.txt'))).rejects.toBe(error);
  });

  it('reads files into array buffers', async () => {
    const buffer = new TextEncoder().encode('hello').buffer;

    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: Nullable<() => void> = null;
      onerror: Nullable<(error: unknown) => void> = null;

      readAsArrayBuffer() {
        this.result = buffer;
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('FileReader', MockFileReader as never);

    await expect(IpfsStorage.fileToBuffer(new File(['hello'], 'hello.txt'))).resolves.toBe(buffer);
  });
});
