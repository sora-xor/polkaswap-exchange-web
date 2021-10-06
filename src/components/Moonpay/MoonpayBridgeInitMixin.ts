import { Component, Mixins } from 'vue-property-decorator';
import { Action, Getter, State } from 'vuex-class';
import { BridgeNetworks, RegisteredAccountAsset, CodecString, Operation } from '@sora-substrate/util';

import ethersUtil from '@/utils/ethers-util';
import { getMaxValue, hasInsufficientEvmNativeTokenForFee } from '@/utils';
import { MoonpayEVMTransferAssetData, MoonpayApi } from '@/utils/moonpay';
import { MoonpayNotifications } from '@/components/Moonpay/consts';

import BridgeHistoryMixin from '@/components/mixins/BridgeHistoryMixin';
import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import LoadingMixin from '@/components/mixins/LoadingMixin';

import type { Asset, BridgeHistory } from '@sora-substrate/util';
import type { ApiKeysObject } from '@/store/settings';
import type { MoonpayTransaction } from '@/utils/moonpay';

const createError = (text: string, notification: MoonpayNotifications) => {
  const error = new Error(text);
  error.name = notification;
  return error;
};

@Component
export default class MoonpayBridgeInitMixin extends Mixins(BridgeHistoryMixin, WalletConnectMixin, LoadingMixin) {
  @State((state) => state.moonpay.api) moonpayApi!: MoonpayApi;
  @State((state) => state.settings.apiKeys) apiKeys!: ApiKeysObject;
  @State((state) => state.moonpay.bridgeTransactionData) bridgeTransactionData!: any; // TODO: type

  @Action('getEvmNetworkFee', { namespace: 'web3' }) fetchEvmNetworkFee!: ({
    asset,
    isSoraToEvm,
  }: {
    asset: Asset;
    isSoraToEvm: boolean;
  }) => Promise<CodecString>;

  @Action('getTransactionTranserData', { namespace: 'moonpay' }) getTransactionTranserData!: (
    hash: string
  ) => Promise<Nullable<MoonpayEVMTransferAssetData>>;

  @Action('findRegisteredAssetByExternalAddress', { namespace: 'moonpay' }) findRegisteredAssetByExternalAddress!: (
    address: string
  ) => Promise<Nullable<RegisteredAccountAsset>>;

  @Action('setConfirmationVisibility', { namespace: 'moonpay' }) setConfirmationVisibility!: (
    flag: boolean
  ) => Promise<void>;

  @Action('setNotificationVisibility', { namespace: 'moonpay' }) setNotificationVisibility!: (
    flag: boolean
  ) => Promise<void>;

  @Action('setNotificationKey', { namespace: 'moonpay' }) setNotificationKey!: (key: string) => Promise<void>;

  @Action('setBridgeTransactionData', { namespace: 'moonpay' }) setBridgeTransactionData!: (
    data?: any,
    startBridgeButtonVisibility?: boolean // TODO: type
  ) => Promise<void>;

  @Getter soraNetwork!: string; // wallet
  @Getter('evmBalance', { namespace: 'web3' }) evmBalance!: CodecString;

  async prepareEvmNetwork(networkId = BridgeNetworks.ETH_NETWORK_ID): Promise<void> {
    await this.setEvmNetwork(networkId); // WalletConnectMixin
    await this.setEvmNetworkType(); // WalletConnectMixin
    await this.syncExternalAccountWithAppState(); // WalletConnectMixin
  }

  initMoonpayApi(): void {
    this.moonpayApi.setPublicKey(this.apiKeys.moonpay);
    this.moonpayApi.setNetwork(this.soraNetwork);
  }

  async prepareMoonpayTxForBridgeTransfer(tx: MoonpayTransaction): Promise<void> {
    try {
      const bridgeTransactionData = await this.prepareBridgeHistoryItemData(tx);
      await this.setBridgeTransactionData(bridgeTransactionData);
      await this.setNotificationVisibility(false);
      await this.setConfirmationVisibility(true);
    } catch (error) {
      await this.handleBridgeInitError(error);
    }
  }

  async getBridgeMoonpayTransaction(): Promise<BridgeHistory> {
    if (!this.bridgeTransactionData) {
      throw new Error('bridgeTransactionData is empty');
    }

    await this.getHistory();

    const tx = this.getBridgeHistoryItemByMoonpayId(this.bridgeTransactionData.payload.moonpayId);

    if (!tx) {
      const historyItem = await this.generateHistoryItem(this.bridgeTransactionData);

      return historyItem;
    }

    return tx;
  }

  getBridgeHistoryItemByMoonpayId(moonpayId: string): Nullable<BridgeHistory> {
    return this.bridgeHistory.find((item) => item.payload?.moonpayId === moonpayId);
  }

  async startBridgeForBridgeTransactionData(): Promise<void> {
    const tx = await this.getBridgeMoonpayTransaction();
    await this.showHistory(tx.id as string);
  }

  /**
   * @param transaction moonpay transaction data
   * @returns string - bridge history item id
   */
  async prepareBridgeHistoryItemData(transaction: MoonpayTransaction): Promise<any> {
    return await this.withLoading(async () => {
      // this is not really good, because we should change evm network to ethereum before fetching transaction data
      await this.prepareEvmNetwork();
      // get necessary ethereum transaction data
      const ethTransferData = await this.getTransactionTranserData(transaction.cryptoTransactionId);

      if (!ethTransferData) {
        throw createError(
          `Cannot fetch transaction data: ${transaction.cryptoTransactionId}`,
          MoonpayNotifications.TransactionError
        );
      }

      // check connection to account
      const isAccountConnected = await ethersUtil.checkAccountIsConnected(ethTransferData.to);

      if (!isAccountConnected) {
        throw createError(
          `Account for transfer is not connected: ${ethTransferData.to}`,
          MoonpayNotifications.AccountAddressError
        );
      }

      // while registered assets updating, evmBalance updating too
      const registeredAsset = await this.findRegisteredAssetByExternalAddress(ethTransferData.address);

      if (!registeredAsset) {
        throw createError(
          `Asset is not registered: ethereum address ${ethTransferData.address}`,
          MoonpayNotifications.SupportError
        );
      }

      const evmNetworkFee: CodecString = await this.fetchEvmNetworkFee({
        asset: registeredAsset as Asset,
        isSoraToEvm: false,
      });
      const hasEthForFee = !hasInsufficientEvmNativeTokenForFee(this.evmBalance, evmNetworkFee);

      if (!hasEthForFee) {
        throw createError('Insufficient ETH for fee', MoonpayNotifications.FeeError);
      }

      const maxAmount = getMaxValue(registeredAsset, evmNetworkFee, true); // max balance (minus fee if eth asset)
      const amount = Math.min(Number(maxAmount), Number(ethTransferData.amount));

      if (amount <= 0) {
        throw createError('Insufficient amount', MoonpayNotifications.AmountError);
      }

      return {
        type: Operation.EthBridgeIncoming,
        amount: String(amount),
        symbol: registeredAsset.symbol,
        assetAddress: registeredAsset.address,
        soraNetworkFee: this.getSoraNetworkFee(Operation.EthBridgeIncoming),
        ethereumNetworkFee: evmNetworkFee,
        externalNetwork: BridgeNetworks.ETH_NETWORK_ID,
        to: ethTransferData.to,
        payload: {
          moonpayId: transaction.id,
        },
      };
    });
  }

  async showNotification(key: string): Promise<void> {
    await this.setNotificationKey(key);
    await this.setNotificationVisibility(true);
  }

  async handleBridgeInitError(error: Error): Promise<void> {
    if (Object.values(MoonpayNotifications).includes(error.name as MoonpayNotifications)) {
      await this.showNotification(error.name);
    } else {
      console.error(error);
    }
  }
}
