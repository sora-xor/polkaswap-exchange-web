/** Convenience helpers for constructing and consuming wallet IPFS endpoints. */
export class IpfsStorage {
  static IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
  static UCAN_TOKEN_HOST_PROVIDER = 'https://ucan.polkaswap2.io/ucan.json';

  /** Retrieves dynamically issued UCAN tokens for authenticated storage operations. */
  static async getUcanTokens(): Promise<Record<string, string>> {
    const response = await fetch(this.UCAN_TOKEN_HOST_PROVIDER, { cache: 'no-cache' });
    return response.json();
  }

  /** Prefixes IPFS paths with the configured public gateway. */
  static constructFullIpfsUrl(path: string): string {
    return this.IPFS_GATEWAY + path;
  }

  /** Extracts the hostname portion from a storage URL. */
  static getStorageHostname(link: string): string {
    if (!link) return '';
    return new URL(link).hostname;
  }

  /** Normalizes gateway URLs into bare IPFS paths. */
  static getIpfsPath(url: string): string {
    const path = new URL(url).pathname;
    return path.replace(/\/ipfs\//, '');
  }

  /** Encodes a browser `File` as a base64 data URL. */
  static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (reader.result !== null) resolve(reader.result.toString() || '');
      };
      reader.onerror = (e) => reject(e);
    });
  }

  /** Reads a browser `File` into an ArrayBuffer. */
  static fileToBuffer(file: File): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(e);
    });
  }
}
