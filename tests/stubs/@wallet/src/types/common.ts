export type PolkadotJsAccount = {
  address: string;
  name?: string;
};

export type Whitelist = string[];

export type WhitelistArrayItem = {
  address: string;
  name: string;
};

export type WhitelistIdsBySymbol = Record<string, string>;
