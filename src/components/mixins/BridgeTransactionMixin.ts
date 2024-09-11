import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';
import { soraExplorerLinks } from '@/utils';

import type { IBridgeTransaction } from '@sora-substrate/sdk';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';

@Component
export default class BridgeTransactionMixin extends Mixins(NetworkFormatterMixin) {
  get tx(): Nullable<IBridgeTransaction> {
    console.warn('[BridgeTransactionMixin] "tx" computed property is not implemented');
    return null;
  }

  get isOutgoing(): boolean {
    return this.isOutgoingTx(this.tx);
  }

  get isEvmTxType(): boolean {
    return (
      !!this.externalNetworkType && [BridgeNetworkType.Eth, BridgeNetworkType.Evm].includes(this.externalNetworkType)
    );
  }

  get txInternalAccount(): string {
    return this.tx?.from ?? '';
  }

  get txExternalAccount(): string {
    return this.tx?.to ?? '';
  }

  get txSoraId(): string {
    return this.tx?.txId ?? '';
  }

  get txSoraHash(): string {
    return this.tx?.hash ?? '';
  }

  get txInternalBlockNumber(): number | undefined {
    return this.tx?.blockHeight;
  }

  get txInternalBlockId(): string {
    return this.tx?.blockId ?? '';
  }

  get txInternalEventIndex(): number | undefined {
    return this.tx?.payload?.eventIndex;
  }

  get txExternalHash(): string | undefined {
    return this.tx?.externalHash;
  }

  get txExternalBlockNumber(): number | undefined {
    return this.tx?.externalBlockHeight;
  }

  get txExternalBlockId(): string {
    return this.tx?.externalBlockId ?? '';
  }

  get txExternalEventIndex(): number | undefined {
    return this.tx && 'externalEventIndex' in this.tx ? this.tx.externalEventIndex : undefined;
  }

  get externalNetworkType(): Nullable<BridgeNetworkType> {
    return this.tx?.externalNetworkType;
  }

  get externalNetworkId(): Nullable<BridgeNetworkId> {
    return this.tx?.externalNetwork;
  }

  get internalExplorerLinks(): Array<WALLET_CONSTS.ExplorerLink> {
    return soraExplorerLinks(
      this.soraNetwork,
      this.txSoraId,
      this.txInternalBlockNumber ?? this.txInternalBlockId,
      this.txInternalEventIndex
    );
  }

  get externalExplorerLinks(): Array<WALLET_CONSTS.ExplorerLink> {
    if (!(this.externalNetworkType && this.externalNetworkId)) return [];

    return this.getNetworkExplorerLinks(
      this.externalNetworkType,
      this.externalNetworkId,
      this.txExternalHash,
      this.txExternalBlockNumber ?? this.txExternalBlockId,
      this.txExternalEventIndex
    );
  }

  get internalAccountLinks(): Array<WALLET_CONSTS.ExplorerLink> {
    return soraExplorerLinks(this.soraNetwork, this.txInternalAccount, undefined, undefined, true);
  }

  get externalAccountLinks(): Array<WALLET_CONSTS.ExplorerLink> {
    if (!(this.externalNetworkType && this.externalNetworkId)) return [];

    return this.getNetworkExplorerLinks(
      this.externalNetworkType,
      this.externalNetworkId,
      this.txExternalAccount,
      undefined,
      undefined,
      this.EvmLinkType.Account
    );
  }

  getNetworkText(text: string, networkId?: Nullable<BridgeNetworkId>, approximate = false): string {
    const network = networkId ? this.getNetworkName(this.externalNetworkType, networkId) : this.TranslationConsts.Sora;
    const approx = approximate ? this.TranslationConsts.Max : '';

    return [approx, network, text].filter((item) => !!item).join(' ');
  }
}
