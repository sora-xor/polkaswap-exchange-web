import { defineStore } from 'pinia';

import { FPNumber } from '@sora-substrate/sdk';
import { ethers } from 'ethers';

import { EthAddress } from '@/consts';
import { SmartContracts, SmartContractType } from '@/consts/evm';
import type { BridgeTxData, MoonpayState } from '@/stores/moonpay/types';
import { useWalletStore } from '@/stores/wallet';
import {
  MoonpayApi,
  type MoonpayCurrency,
  type MoonpayEVMTransferAssetData,
  type MoonpayTransaction,
} from '@/utils/moonpay';
import ethersUtil from '@/utils/ethers-util';
import type { MoonpayNotifications } from '@/features/deposit/components/moonpay/consts';
import type { Nullable, FnWithoutArgs } from '@/types/common';

import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';

const POLLING_INTERVAL = 15_000;

const initialState = (): MoonpayState => ({
  api: new MoonpayApi(),
  dialogVisibility: false,
  notificationVisibility: false,
  notificationKey: '',
  confirmationVisibility: false,
  pollingTimestamp: 0,
  transactions: [],
  transactionsFetching: false,
  bridgeTransactionData: null,
  startBridgeButtonVisibility: false,
  currencies: [],
});

export const useMoonpayStore = defineStore('moonpay', {
  state: (): MoonpayState => initialState(),
  actions: {
    reset(): void {
      this.$patch(initialState());
    },
    setAccountRecord(moonpayId: string, externalHash: string): void {
      if (!(moonpayId && externalHash)) {
        return;
      }

      this.api.accountRecords = {
        ...this.api.accountRecords,
        [moonpayId]: externalHash,
      };
    },
    setDialogVisibility(flag: boolean): void {
      this.dialogVisibility = flag;
    },
    setNotificationVisibility(flag: boolean): void {
      this.notificationVisibility = flag;
    },
    setNotificationKey(key: MoonpayNotifications | ''): void {
      this.notificationKey = key;
    },
    setConfirmationVisibility(flag: boolean): void {
      this.confirmationVisibility = flag;
    },
    setBridgeTxData({ data = null, startBridgeButtonVisibility = false }: BridgeTxData = {}): void {
      this.bridgeTransactionData = data;
      this.startBridgeButtonVisibility = startBridgeButtonVisibility;
    },
    async getTransactions(clearTransactions = false): Promise<void> {
      const walletStore = useWalletStore();

      if (!walletStore.isLoggedIn || this.transactionsFetching || !this.api.publicKey) return;

      if (clearTransactions) {
        this.transactions = [];
      }
      this.transactionsFetching = true;

      try {
        const transactions = await this.api.getTransactionsByExtId(walletStore.address);
        this.transactions = Array.isArray(transactions) ? transactions : [];
        console.info('Moonpay: user transactions request');
      } catch (error) {
        console.error(error);
        this.transactions = [];
      } finally {
        this.transactionsFetching = false;
      }
    },
    async getCurrencies(): Promise<void> {
      this.currencies = [];

      try {
        const currencies = await this.api.getCurrencies();
        this.currencies = Array.isArray(currencies) ? currencies : [];
      } catch (error) {
        console.error(error);
        this.currencies = [];
      }
    },
    async createTransactionsPolling(): Promise<FnWithoutArgs> {
      this.pollingTimestamp = Date.now();

      let polling: ReturnType<typeof setInterval> | null = setInterval(() => {
        void this.getTransactions();
      }, POLLING_INTERVAL);

      return () => {
        if (polling !== null) {
          clearInterval(polling);
          this.pollingTimestamp = 0;
          polling = null;
        }
      };
    },
    async getTransactionTranserData(hash: string): Promise<Nullable<MoonpayEVMTransferAssetData>> {
      try {
        console.info(`Moonpay: found latest moonpay transaction.\nChecking ethereum transaction by hash:\n${hash}`);

        await ethersUtil.waitForEvmTransaction(hash);

        const tx = await ethersUtil.getEvmTransaction(hash);

        if (!tx) throw new Error(`Transaction "${hash}" not found`);

        console.info('Moonpay: ethereum transaction data received:', tx);

        if (tx.data === '0x') {
          const { to: receiver, value } = tx;

          return {
            amount: new FPNumber(value as any).toString(),
            address: EthAddress,
            to: receiver ?? '',
          };
        }

        const abi = SmartContracts[SmartContractType.ERC20];
        const inter = new ethers.Interface(abi);
        const decodedInput = inter.parseTransaction({ data: tx.data });

        if (!decodedInput) throw new Error(`Unable to parse transaction data: "${tx.data}"`);

        return {
          amount: new FPNumber(decodedInput.args.getValue('value')).toString(),
          address: tx.to ?? '',
          to: decodedInput.args.getValue('to'),
        };
      } catch (error) {
        console.error(error);
        return null;
      }
    },
  },
});

export type MoonpayStore = ReturnType<typeof useMoonpayStore>;
