import { Vue } from 'vue-property-decorator';

export default class TranslationMixin extends Vue {
  private translationApi;
  /**
   * Contains wallet-specific words which shouldn't be translated.
   *
   * Will be extended in Polkaswap
   */
  readonly TranslationConsts: {
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
  t(key: string, values?: Record<string, unknown>): string;
  tc(key: string, choice?: number, values?: Record<string, unknown>): string;
  te(key: string): boolean;
  get dayjsLocale(): string;
  formatDate(date: Nullable<number>, format?: string): string;
}
