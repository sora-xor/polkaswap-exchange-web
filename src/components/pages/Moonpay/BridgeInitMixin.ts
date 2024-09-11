import { Operation } from '@sora-substrate/sdk';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { Component, Mixins } from 'vue-property-decorator';

import BridgeHistoryMixin from '@/components/mixins/BridgeHistoryMixin';
import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { MoonpayNotifications } from '@/components/pages/Moonpay/consts';
import { KnownEthBridgeAsset } from '@/consts/evm';
import type { BridgeRegisteredAsset } from '@/store/assets/types';
import { state, action, mutation, getter } from '@/store/decorators';
import type { BridgeTxData } from '@/store/moonpay/types';
import { getMaxValue, hasInsufficientNativeTokenForFee } from '@/utils';
import { getEthNetworkFee } from '@/utils/bridge/eth/utils';
import ethersUtil from '@/utils/ethers-util';
import type { MoonpayTransaction } from '@/utils/moonpay';
import { MoonpayEVMTransferAssetData, MoonpayApi } from '@/utils/moonpay';

import type { CodecString } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset, AccountBalance } from '@sora-substrate/sdk/build/assets/types';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
import type { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

const createError = (text: string, notification: MoonpayNotifications) => {
  const error = new Error(text);
  error.name = notification;
  return error;
};

@Component
export default class MoonpayBridgeInitMixin extends Mixins(BridgeHistoryMixin, WalletConnectMixin) {
  @state.moonpay.api moonpayApi!: MoonpayApi;
  @state.moonpay.bridgeTransactionData bridgeTransactionData!: Nullable<EthHistory>;
  @state.web3.ethBridgeEvmNetwork ethBridgeEvmNetwork!: EvmNetwork;
  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @state.assets.registeredAssets private registeredAssets!: Record<string, BridgeRegisteredAsset>;

  @getter.settings.moonpayApiKey moonpayApiKey!: string;
  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => RegisteredAccountAsset;
  @getter.web3.contractAddress contractAddress!: (asset: KnownEthBridgeAsset) => string;

  @mutation.moonpay.setConfirmationVisibility setConfirmationVisibility!: (flag: boolean) => void;
  @mutation.moonpay.setNotificationVisibility setNotificationVisibility!: (flag: boolean) => void;
  @mutation.moonpay.setNotificationKey setNotificationKey!: (key: string) => void;
  @mutation.moonpay.setBridgeTxData setBridgeTxData!: (options?: BridgeTxData) => void;

  @action.web3.selectExternalNetwork selectExternalNetwork!: (network: {
    id: BridgeNetworkId;
    type: BridgeNetworkType;
  }) => Promise<void>;

  @action.moonpay.getTransactionTranserData private getTransactionTranserData!: (
    hash: string
  ) => Promise<Nullable<MoonpayEVMTransferAssetData>>;

  async prepareEvmNetwork(): Promise<void> {
    await this.selectExternalNetwork({
      id: this.ethBridgeEvmNetwork,
      type: BridgeNetworkType.Eth,
    }); // WalletConnectMixin
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

  async getBridgeMoonpayTransaction(): Promise<EthHistory> {
    if (!this.bridgeTransactionData) {
      throw new Error('bridgeTransactionData is empty');
    }

    this.updateInternalHistory();

    const tx = this.getBridgeHistoryItemByMoonpayId(this.bridgeTransactionData.payload.moonpayId);

    if (!tx) {
      const historyItem = await this.generateHistoryItem(this.bridgeTransactionData);

      return historyItem as EthHistory;
    }

    return tx;
  }

  getBridgeHistoryItemByMoonpayId(moonpayId: string): Nullable<EthHistory> {
    const externalHash = this.moonpayApi.accountRecords?.[moonpayId];

    if (!externalHash) return null;

    return Object.values(this.history).find((item) => item.externalHash === externalHash) as Nullable<EthHistory>;
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
  async prepareBridgeHistoryItemData(transaction: MoonpayTransaction): Promise<EthHistory> {
    return await this.withLoading(async () => {
      // this is not really good, but we should change evm network before fetching transaction data
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

      const [soraAddress, registeredAsset] =
        Object.entries(this.registeredAssets).find(([soraAddress, registeredAsset]) =>
          ethersUtil.addressesAreEqual(registeredAsset.address, ethTransferData.address)
        ) ?? [];

      if (!(soraAddress && registeredAsset)) {
        throw createError(
          `Asset is not registered: ethereum address ${ethTransferData.address}`,
          MoonpayNotifications.SupportError
        );
      }

      const isExternalNative = ethersUtil.isNativeEvmTokenAddress(registeredAsset.address);
      const externalBalance = await ethersUtil.getAccountAssetBalance(ethTransferData.to, registeredAsset.address);
      const asset = this.getAsset(soraAddress);

      const evmNetworkFee: CodecString = await getEthNetworkFee(
        asset,
        registeredAsset.kind,
        this.contractAddress,
        ethTransferData.amount,
        false,
        this.soraAddress,
        ethTransferData.to
      );

      const evmNativeBalance = await ethersUtil.getAccountBalance(ethTransferData.to);
      const hasEthForFee = !hasInsufficientNativeTokenForFee(evmNativeBalance, evmNetworkFee);

      if (!hasEthForFee) {
        throw createError('Insufficient ETH for fee', MoonpayNotifications.FeeError);
      }

      const accountAsset = {
        ...asset,
        balance: {} as AccountBalance,
        externalBalance,
      };
      const maxAmount = getMaxValue(accountAsset, evmNetworkFee, { isExternalBalance: true, isExternalNative }); // max balance (minus fee if eth asset)
      const amount = Math.min(Number(maxAmount), Number(ethTransferData.amount));

      if (amount <= 0) {
        throw createError('Insufficient amount', MoonpayNotifications.AmountError);
      }

      return {
        type: Operation.EthBridgeIncoming,
        amount: String(amount),
        amount2: String(amount),
        symbol: accountAsset.symbol,
        assetAddress: accountAsset.address,
        soraNetworkFee: this.networkFees[Operation.EthBridgeIncoming],
        externalNetworkFee: evmNetworkFee,
        externalNetwork: this.ethBridgeEvmNetwork,
        externalNetworkType: BridgeNetworkType.Eth,
        to: ethTransferData.to,
        payload: {
          moonpayId: transaction.id,
        },
      };
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
