import { Component, Mixins } from 'vue-property-decorator';
import { BridgeNetworks, Operation } from '@sora-substrate/util';
import type { BridgeHistory, CodecString } from '@sora-substrate/util';
import type { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import ethersUtil from '@/utils/ethers-util';
import { getMaxValue, hasInsufficientEvmNativeTokenForFee } from '@/utils';
import { MoonpayEVMTransferAssetData, MoonpayApi } from '@/utils/moonpay';
import { MoonpayNotifications } from '@/components/pages/Moonpay/consts';
import { state, action, mutation, getter } from '@/store/decorators';

import BridgeHistoryMixin from '@/components/mixins/BridgeHistoryMixin';
import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';

import type { MoonpayTransaction } from '@/utils/moonpay';
import type { RegisterAssetWithExternalBalance } from '@/store/assets/types';
import type { BridgeTxData } from '@/store/moonpay/types';

const createError = (text: string, notification: MoonpayNotifications) => {
  const error = new Error(text);
  error.name = notification;
  return error;
};

@Component
export default class MoonpayBridgeInitMixin extends Mixins(BridgeHistoryMixin, WalletConnectMixin) {
  @state.moonpay.api moonpayApi!: MoonpayApi;
  @state.moonpay.bridgeTransactionData bridgeTransactionData!: Nullable<BridgeHistory>;
  @state.web3.evmBalance evmBalance!: CodecString;
  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;

  @getter.settings.moonpayApiKey moonpayApiKey!: string;

  @mutation.moonpay.setConfirmationVisibility setConfirmationVisibility!: (flag: boolean) => void;
  @mutation.moonpay.setNotificationVisibility setNotificationVisibility!: (flag: boolean) => void;
  @mutation.moonpay.setNotificationKey setNotificationKey!: (key: string) => void;
  @mutation.moonpay.setBridgeTxData setBridgeTxData!: (options?: BridgeTxData) => void;

  @action.moonpay.getTransactionTranserData private getTransactionTranserData!: (
    hash: string
  ) => Promise<Nullable<MoonpayEVMTransferAssetData>>;

  @action.moonpay.findRegisteredAssetByExternalAddress private findRegisteredAssetByExternalAddress!: (
    address: string
  ) => Promise<Nullable<RegisterAssetWithExternalBalance>>;

  async prepareEvmNetwork(networkId = BridgeNetworks.ETH_NETWORK_ID): Promise<void> {
    this.setEvmNetwork(networkId); // WalletConnectMixin
    await this.setEvmNetworkType(); // WalletConnectMixin
  }

  initMoonpayApi(): void {
    this.moonpayApi.publicKey = this.moonpayApiKey;
    this.moonpayApi.soraNetwork = this.soraNetwork ?? '';
  }

  async prepareMoonpayTxForBridgeTransfer(tx: MoonpayTransaction, startBridgeButtonVisibility = false): Promise<void> {
    try {
      const data = await this.prepareBridgeHistoryItemData(tx);
      this.setBridgeTxData({ data, startBridgeButtonVisibility });
      this.setNotificationVisibility(false);
      this.setConfirmationVisibility(true);
    } catch (error: any) {
      await this.handleBridgeInitError(error);
    }
  }

  async getBridgeMoonpayTransaction(): Promise<BridgeHistory> {
    if (!this.bridgeTransactionData) {
      throw new Error('bridgeTransactionData is empty');
    }

    this.setHistory();

    const tx = this.getBridgeHistoryItemByMoonpayId(this.bridgeTransactionData.payload.moonpayId);

    if (!tx) {
      const historyItem = await this.generateHistoryItem(this.bridgeTransactionData);

      return historyItem;
    }

    return tx;
  }

  getBridgeHistoryItemByMoonpayId(moonpayId: string): Nullable<BridgeHistory> {
    return this.history.find((item) => item.payload?.moonpayId === moonpayId);
  }

  async startBridgeForMoonpayTransaction(): Promise<void> {
    const tx = await this.getBridgeMoonpayTransaction();
    await this.showHistory(tx.id as string);
    this.setBridgeTxData();
  }

  /**
   * @param transaction moonpay transaction data
   * @returns string - bridge history item id
   */
  async prepareBridgeHistoryItemData(transaction: MoonpayTransaction): Promise<BridgeHistory> {
    return await this.withLoading<BridgeHistory>(async () => {
      // this is not really good, but we should change evm network to ethereum before fetching transaction data
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

      const evmNetworkFee: CodecString = await ethersUtil.fetchEvmNetworkFee(registeredAsset.address, false);
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
      } as BridgeHistory;
    });
  }

  async showNotification(key: string): Promise<void> {
    this.setNotificationKey(key);
    this.setNotificationVisibility(true);
  }

  async handleBridgeInitError(error: Error): Promise<void> {
    if (Object.values(MoonpayNotifications).includes(error.name as MoonpayNotifications)) {
      await this.showNotification(error.name);
    } else {
      console.error(error);
    }
  }
}
