import { afterEach, describe, expect, it, vi } from 'vitest';

import { IPFS_GATEWAY_BASE_URL } from '@/utils/ipfs';

const imageUtilMocks = vi.hoisted(() => ({
  saveAsMock: vi.fn(),
}));

vi.mock('file-saver', () => ({
  saveAs: imageUtilMocks.saveAsMock,
}));

import {
  IMAGE_EXTENSIONS,
  buildCssUrl,
  createSvgBlob,
  dataURItoBlob,
  getBase64Icon,
  sanitizeIconSource,
  svgSaveAs,
} from '@/lib/soraneo-wallet/src/util/image';

const decodeDataUriPayload = (dataUri: string): string => {
  const payload = dataUri.split(',')[1] ?? '';
  return Buffer.from(payload, 'base64').toString('utf-8');
};

describe('wallet util/image', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    imageUtilMocks.saveAsMock.mockReset();
  });

  it.each([
    ['ipfs://QmToken/logo.png', `${IPFS_GATEWAY_BASE_URL}/ipfs/QmToken/logo.png`],
    ['ipns://example.com/logo.png', `${IPFS_GATEWAY_BASE_URL}/ipns/example.com/logo.png`],
    ['https://ipfs.io/ipfs/QmToken/logo.png', `${IPFS_GATEWAY_BASE_URL}/ipfs/QmToken/logo.png`],
    ['https://bafytoken.ipfs.dweb.link/logo.png', `${IPFS_GATEWAY_BASE_URL}/ipfs/bafytoken/logo.png`],
    ['https://dedicated.example/ipfs/QmToken/logo.png', 'https://dedicated.example/ipfs/QmToken/logo.png'],
  ])('resolves CSS icon sources through maintained gateways: %s', (source, expected) => {
    expect(sanitizeIconSource(source)).toBe(expected);
  });

  it.each([
    'ipfs://QmToken/logo\".png',
    'ipfs://QmToken/logo(1).png',
    'ipfs://QmToken/bad icon.png',
    'ipfs://QmToken/../../api/v0/version',
  ])('preserves safety checks for native IPFS icon sources: %s', (source) => {
    expect(sanitizeIconSource(source)).toBe('');
  });

  it('converts base64 data URIs into blobs', async () => {
    const dataUri = 'data:image/png;base64,QUJD';

    const blob = dataURItoBlob(dataUri);

    expect(blob.type).toBe('image/png');
    expect(blob.size).toBe(3);
  });

  it('sanitizes SVG data URIs by stripping dangerous content and normalizing dimensions', () => {
    const rawSvg =
      '<svg viewBox="0 0 10 10"><script>alert(1)</script><rect width="10" height="10" onload="evil()" fill="red" /></svg>';
    const encoded = Buffer.from(rawSvg, 'utf-8').toString('base64');

    const sanitized = sanitizeIconSource(`data:image/svg+xml;base64,${encoded}`);
    const decoded = decodeDataUriPayload(sanitized);

    expect(sanitized.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(decoded).not.toContain('<script');
    expect(decoded).not.toContain('onload=');
    expect(decoded).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(decoded).toContain('width="80px"');
    expect(decoded).toContain('height="80px"');
  });

  it('keeps only safe icon sources', () => {
    expect(sanitizeIconSource('https://cdn.polkaswap.io/icon.svg')).toBe('https://cdn.polkaswap.io/icon.svg');
    expect(sanitizeIconSource('http://cdn.polkaswap.io/icon.svg')).toBe('');
    expect(sanitizeIconSource('https://cdn.polkaswap.io/ic on.svg')).toBe('');
    expect(sanitizeIconSource('data:text/html;base64,QUJD')).toBe('');
    expect(sanitizeIconSource(null)).toBe('');
  });

  it('escapes CSS url values', () => {
    const cssUrl = buildCssUrl('https://cdn.polkaswap.io/icon")\\\nnext.svg');

    expect(cssUrl).toBe('url("https://cdn.polkaswap.io/icon\\"\\)\\\\\\\nnext.svg")');
  });

  it('serializes svg elements into blobs and downloads them directly as svg', async () => {
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.setAttribute('viewBox', '0 0 10 10');
    svgElement.innerHTML = '<circle cx="5" cy="5" r="4" />';

    const blob = createSvgBlob(svgElement);
    expect(blob.type).toBe('image/svg+xml');
    expect(blob.size).toBeGreaterThan(0);

    await svgSaveAs(svgElement, 'wallet-icon', IMAGE_EXTENSIONS.SVG);

    expect(imageUtilMocks.saveAsMock).toHaveBeenCalledWith(expect.any(Blob), 'wallet-icon.svg');
  });

  it('rasterizes svg icons for non-svg downloads', async () => {
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.innerHTML = '<circle cx="5" cy="5" r="4" />';

    const drawImage = vi.fn();
    const fillRect = vi.fn();
    const toDataURL = vi.fn(() => 'data:image/png;base64,QUJD');
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:wallet-icon');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ fillStyle: '', fillRect, drawImage }),
          toDataURL,
        } as any;
      }

      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    class ImageStub {
      public width = 80;
      public height = 80;
      public onload: null | (() => void) = null;
      public onerror: null | ((error: Error) => void) = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('Image', ImageStub);

    await svgSaveAs(svgElement, 'wallet-icon', IMAGE_EXTENSIONS.PNG);

    expect(fillRect).toHaveBeenCalledTimes(1);
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(toDataURL).toHaveBeenCalledWith('image/png');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:wallet-icon');
    expect(imageUtilMocks.saveAsMock).toHaveBeenCalledWith(expect.any(Blob), 'wallet-icon.png');
  });

  it('returns normalized base64 icons for safe inputs', async () => {
    const pngIcon = 'data:image/png;base64,QUJD';
    const svgIcon = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString(
      'base64'
    )}`;

    const toDataURL = vi.fn(() => 'data:image/png;base64,UE5H');
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          setAttribute: vi.fn(),
          getContext: () => ({ drawImage: vi.fn() }),
          toDataURL,
        } as any;
      }

      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    class ImageStub {
      public onload: null | (() => void) = null;
      public onerror: null | ((error: Error) => void) = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('Image', ImageStub);

    await expect(getBase64Icon(pngIcon)).resolves.toBe(pngIcon);
    await expect(getBase64Icon('https://cdn.polkaswap.io/icon.png')).resolves.toBe('https://cdn.polkaswap.io/icon.png');
    await expect(getBase64Icon(svgIcon)).resolves.toBe('data:image/png;base64,UE5H');
    await expect(getBase64Icon('javascript:alert(1)')).resolves.toBe('');
  });

  it('falls back to an empty icon when SVG rasterization fails', async () => {
    const svgIcon = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString(
      'base64'
    )}`;

    class ImageStub {
      public onload: null | (() => void) = null;
      public onerror: null | ((error: Error) => void) = null;

      set src(_value: string) {
        queueMicrotask(() => this.onerror?.(new Error('invalid image')));
      }
    }

    vi.stubGlobal('Image', ImageStub);

    await expect(getBase64Icon(svgIcon)).resolves.toBe('');
  });
});
