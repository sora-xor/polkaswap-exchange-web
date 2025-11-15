/** Convenience helpers for constructing and consuming wallet IPFS endpoints. */
export declare class IpfsStorage {
  static IPFS_GATEWAY: string;
  static UCAN_TOKEN_HOST_PROVIDER: string;
  /** Retrieves dynamically issued UCAN tokens for authenticated storage operations. */
  static getUcanTokens(): Promise<Record<string, string>>;
  /** Prefixes IPFS paths with the configured public gateway. */
  static constructFullIpfsUrl(path: string): string;
  /** Extracts the hostname portion from a storage URL. */
  static getStorageHostname(link: string): string;
  /** Normalizes gateway URLs into bare IPFS paths. */
  static getIpfsPath(url: string): string;
  /** Encodes a browser `File` as a base64 data URL. */
  static fileToBase64(file: File): Promise<string>;
  /** Reads a browser `File` into an ArrayBuffer. */
  static fileToBuffer(file: File): Promise<string | ArrayBuffer | null>;
}
