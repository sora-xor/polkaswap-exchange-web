import { Blacklist, WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';

export declare const sanitizeWhitelistPayload: (payload: string) => WhitelistArrayItem[];
export declare const sanitizeNftBlacklistPayload: (payload: string) => Blacklist;
