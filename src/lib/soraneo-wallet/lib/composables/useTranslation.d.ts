import { TranslationConsts } from '../consts';

type ValuesMap = Record<string, unknown> | undefined;
type TranslateFn = (key: string, values?: ValuesMap) => string;
type TranslateChoiceFn = (key: string, choice?: number, values?: ValuesMap) => string;
type TranslateExistsFn = (key: string) => boolean;
type FormatDateFn = (date: Nullable<number>, format?: string) => string;
type GetDayjsLocaleFn = () => string;
type TranslationHelpers = {
  readonly TranslationConsts: typeof TranslationConsts;
  readonly t: TranslateFn;
  readonly tc: TranslateChoiceFn;
  readonly te: TranslateExistsFn;
  readonly formatDate: FormatDateFn;
  readonly getDayjsLocale: GetDayjsLocaleFn;
};
declare function buildTranslationHelpers(): TranslationHelpers;
export declare function useTranslation(): {
  TranslationConsts: {
    readonly Polkaswap: 'Polkaswap';
    readonly Ethereum: 'Ethereum';
    readonly Etherscan: 'Etherscan';
    readonly Hashi: 'HASHI';
    readonly PolkadotJs: 'Polkadot{.js}';
    readonly Sora: 'SORA';
    readonly TBC: 'TBC';
    readonly XYK: 'XYK';
    readonly NFT: 'NFT';
    readonly CEX: 'CEX';
    readonly Polkadot: 'Polkadot';
    readonly SORAScan: 'SORAScan';
    readonly SoraMetrics: 'SoraMetrics';
    readonly Subscan: 'Subscan';
    readonly CedeStore: 'cede.store';
    readonly QR: 'QR';
    readonly IPFS: 'IPFS';
    readonly soraNetwork: {
      readonly Dev: 'SORA Devnet';
      readonly Test: 'SORA Testnet (private)';
      readonly Stage: 'SORA Testnet';
      readonly Prod: 'SORA Mainnet';
    };
    readonly JSON: 'JSON';
    readonly ADAR: 'ADAR';
    readonly Google: 'Google';
    readonly Kensetsu: 'Kensetsu';
    readonly Ceres: 'Ceres';
  };
  t: TranslateFn;
  tc: TranslateChoiceFn;
  te: TranslateExistsFn;
  dayjsLocale: import('vue').ComputedRef<string>;
  formatDate: FormatDateFn;
};
export declare const translationUtils: typeof buildTranslationHelpers;
export {};
