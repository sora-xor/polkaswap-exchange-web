import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IpfsStorage } from '@/lib/soraneo-wallet/src/util/ipfsStorage';
import { IPFS_GATEWAY_BASE_URL } from '@/utils/ipfs';

describe('IpfsStorage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('constructs gateway URLs and extracts host/path helpers', () => {
    expect(IpfsStorage.constructFullIpfsUrl('QmHash/metadata.json')).toBe(
      `${IPFS_GATEWAY_BASE_URL}/ipfs/QmHash/metadata.json`
    );
    expect(IpfsStorage.getStorageHostname('https://ipfs.io/ipfs/QmHash')).toBe('ipfs.io');
    expect(IpfsStorage.getStorageHostname('')).toBe('');
    expect(IpfsStorage.getIpfsPath('https://ipfs.io/ipfs/QmHash/metadata.json')).toBe('QmHash/metadata.json');
  });

  it('preserves configured gateway overrides for valid bare content paths', () => {
    const previousGateway = IpfsStorage.IPFS_GATEWAY;
    try {
      IpfsStorage.IPFS_GATEWAY = 'https://dedicated.example/gateway/ipfs/';
      expect(IpfsStorage.constructFullIpfsUrl('QmHash/dir/a%20b.png?download=1#preview')).toBe(
        'https://dedicated.example/gateway/ipfs/QmHash/dir/a%20b.png?download=1#preview'
      );
    } finally {
      IpfsStorage.IPFS_GATEWAY = previousGateway;
    }
  });

  it.each([
    '',
    '../api/v0/version',
    '%2e%2e/api/v0/version',
    'QmHash/../../api/v0/version',
    'QmHash/%2e%2e/%2e%2e/api/v0/version',
    'QmHash/%252e%252e/api/v0/version',
    'QmHash/%2f..%2f../api/v0/version',
    'QmHash/..\\..\\api/v0/version',
    '/api/v0/version',
    '//example.com/logo.png',
    'https://example.com/logo.png',
    'ipfs://QmHash/logo.png',
  ])('returns an empty image URL for non-bare or unsafe content paths: %s', (path) => {
    expect(IpfsStorage.constructFullIpfsUrl(path)).toBe('');
  });

  it('extracts IPFS paths from supported URL formats', () => {
    expect(IpfsStorage.getIpfsPath('ipfs://QmHash/metadata.json')).toBe('QmHash/metadata.json');
    expect(IpfsStorage.getIpfsPath('https://bafybeigdyrzt.ipfs.dweb.link/dir/file.png')).toBe(
      'bafybeigdyrzt/dir/file.png'
    );
    expect(IpfsStorage.getIpfsPath('https://bafybeigdyrzt.ipfs.dweb.link/ipfs/file.png')).toBe(
      'bafybeigdyrzt/ipfs/file.png'
    );
    expect(IpfsStorage.getIpfsPath('https://bafybeigdyrzt.ipfs.dweb.link')).toBe('bafybeigdyrzt');
  });

  it('ignores URL decorations when extracting the IPFS content path', () => {
    expect(IpfsStorage.getIpfsPath('  https://ipfs.io/ipfs/QmHash/metadata.json?download=1#preview  ')).toBe(
      'QmHash/metadata.json'
    );
    expect(IpfsStorage.getIpfsPath('https://bafybeigdyrzt.ipfs.dweb.link/dir/file.png?cache=false#image')).toBe(
      'bafybeigdyrzt/dir/file.png'
    );
  });

  it('rejects URLs that do not identify IPFS content', () => {
    expect(() => IpfsStorage.getIpfsPath('https://example.com/logo.png')).toThrow('Unsupported IPFS URL format');
    expect(() => IpfsStorage.getIpfsPath('ftp://ipfs.io/ipfs/QmHash/logo.png')).toThrow(
      'Unsupported IPFS URL protocol'
    );
  });

  it.each([
    'https://ipfs.io/ipfs/',
    'https://ipfs.io/ipfs//logo.png',
    'https://ipfs.io/not-ipfs/QmHash/logo.png',
    'https://example.com/logo.png?next=/ipfs/QmHash/logo.png',
    'https://ipfs.io@evil.example/logo.png',
    'ipns://name/logo.png',
    'javascript:alert(1)',
    '   ',
  ])('rejects adversarial or malformed IPFS URL input: %s', (url) => {
    expect(() => IpfsStorage.getIpfsPath(url)).toThrow();
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

  it('rejects invalid and aborted base64 reads instead of leaving them pending', async () => {
    class InvalidResultReader {
      result: string | ArrayBuffer | null = null;
      onload: Nullable<() => void> = null;
      onerror: Nullable<(error: unknown) => void> = null;
      onabort: Nullable<() => void> = null;

      readAsDataURL() {
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('FileReader', InvalidResultReader as never);
    await expect(IpfsStorage.fileToBase64(new File(['hello'], 'hello.txt'))).rejects.toThrow(
      'FileReader returned an invalid data URL'
    );

    class AbortedReader extends InvalidResultReader {
      readAsDataURL() {
        queueMicrotask(() => this.onabort?.());
      }
    }

    vi.stubGlobal('FileReader', AbortedReader as never);
    await expect(IpfsStorage.fileToBase64(new File(['hello'], 'hello.txt'))).rejects.toThrow('File read aborted');
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
