export class IpfsStorage {
  static IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
  static UCAN_TOKEN_HOST_PROVIDER = 'https://ucan.polkaswap2.io/ucan.json';

  static async getUcanTokens(): Promise<Record<string, string>> {
    const response = await fetch(this.UCAN_TOKEN_HOST_PROVIDER, { cache: 'no-cache' });
    return response.json();
  }

  static constructFullIpfsUrl(path: string): string {
    return this.IPFS_GATEWAY + path;
  }

  static getStorageHostname(link: string): string {
    if (!link) return '';
    return new URL(link).hostname;
  }

  static getIpfsPath(url: string): string {
    const path = new URL(url).pathname;
    return path.replace(/\/ipfs\//, '');
  }

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

  static fileToBuffer(file: File): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(e);
    });
  }
}
