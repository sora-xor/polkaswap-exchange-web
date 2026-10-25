import { IPFS_GATEWAY_BASE_URL, toIpfsGatewayUrl } from '@/utils/ipfs';

/** Convenience helpers for constructing and consuming wallet IPFS endpoints. */
export class IpfsStorage {
  static IPFS_GATEWAY = `${IPFS_GATEWAY_BASE_URL}/ipfs/`;
  static UCAN_TOKEN_HOST_PROVIDER = 'https://ucan.polkaswap2.io/ucan.json';

  /** Retrieves dynamically issued UCAN tokens for authenticated storage operations. */
  static async getUcanTokens(): Promise<Record<string, string>> {
    const response = await fetch(this.UCAN_TOKEN_HOST_PROVIDER, { cache: 'no-cache' });
    return response.json();
  }

  /** Resolves safe bare content paths, returning an empty image URL for malformed chain content. */
  static constructFullIpfsUrl(path: string): string {
    if (typeof path !== 'string') return '';
    const nativeUrl = `ipfs://${path}`;
    if (!/^[a-z0-9][a-z0-9._-]*(?:[/?#]|$)/i.test(path) || toIpfsGatewayUrl(nativeUrl) === nativeUrl) {
      return '';
    }
    return this.IPFS_GATEWAY + path;
  }

  /** Extracts the hostname portion from a storage URL. */
  static getStorageHostname(link: string): string {
    if (!link) return '';
    return new URL(link).hostname;
  }

  /** Normalizes supported IPFS URLs into bare content paths suitable for asset registration. */
  static getIpfsPath(url: string): string {
    const parsedUrl = new URL(url.trim());
    const normalizedPath = parsedUrl.pathname.replace(/^\/+/, '');

    if (parsedUrl.protocol === 'ipfs:') {
      return [parsedUrl.hostname, normalizedPath].filter(Boolean).join('/');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Unsupported IPFS URL protocol');
    }

    const subdomainGatewayMatch = parsedUrl.hostname.match(/^([^./]+)\.ipfs\./i);

    if (subdomainGatewayMatch) {
      return [subdomainGatewayMatch[1], normalizedPath].filter(Boolean).join('/');
    }

    const pathGatewayMatch = parsedUrl.pathname.match(/^\/ipfs\/([^/].*)$/i);

    if (pathGatewayMatch) {
      return pathGatewayMatch[1];
    }

    throw new Error('Unsupported IPFS URL format');
  }

  /** Encodes a browser `File` as a base64 data URL. */
  static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string' && reader.result) {
          resolve(reader.result);
        } else {
          reject(new Error('FileReader returned an invalid data URL'));
        }
      };
      reader.onerror = (e) => reject(e);
      reader.onabort = () => reject(new Error('File read aborted'));
      reader.readAsDataURL(file);
    });
  }

  /** Reads a browser `File` into an ArrayBuffer. */
  static fileToBuffer(file: File): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(e);
      reader.onabort = () => reject(new Error('File read aborted'));
      reader.readAsArrayBuffer(file);
    });
  }
}
