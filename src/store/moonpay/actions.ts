import { defineActions } from 'direct-vuex';
import { FPNumber } from '@sora-substrate/util';
import { ethers } from 'ethers';

import { moonpayActionContext } from '@/store/moonpay';
import ethersUtil from '@/utils/ethers-util';
import { EthAddress } from '@/consts';
import type { MoonpayEVMTransferAssetData } from '@/utils/moonpay';

const POLLING_INTERVAL = 15_000;

const actions = defineActions({
  async getCurrencies(context): Promise<void> {
    const { state, commit } = moonpayActionContext(context);
    commit.resetCurrencies();

    try {
      const currencies = await state.api.getCurrencies();
      commit.setCurrencies(currencies);
    } catch (error) {
      console.error(error);
      commit.resetCurrencies();
    }
  },
  async getTransactions(context, clearTransactions: Nullable<boolean> = false): Promise<void> {
    const { state, commit, rootGetters, rootState } = moonpayActionContext(context);
    if (!rootGetters.wallet.account.isLoggedIn || state.transactionsFetching || !state.api.publicKey) return;

    commit.updateTxsRequest(clearTransactions);

    try {
      const transactions = await state.api.getTransactionsByExtId(rootState.wallet.account.address);
      console.info('Moonpay: user transactions request');
      commit.updateTxsSuccess(transactions);
    } catch (error) {
      console.error(error);
      commit.updateTxsFailure();
    }
  },
  async createTransactionsPolling(context): Promise<FnWithoutArgs> {
    const { dispatch, commit } = moonpayActionContext(context);
    commit.setPollingTimestamp();

    let polling: NodeJS.Timeout | null = setInterval(() => dispatch.getTransactions(), POLLING_INTERVAL);

    const stopPolling = () => {
      if (polling !== null) {
        clearInterval(polling);
        commit.setPollingTimestamp(0);
        polling = null;
      }
    };

    return stopPolling;
  },
  async getTransactionTranserData(_, hash: string): Promise<Nullable<MoonpayEVMTransferAssetData>> {
    try {
      const confirmations = 1;
      const timeout = 0;
      const ethersInstance = await ethersUtil.getEthersInstance();

      console.info(`Moonpay: found latest moonpay transaction.\nChecking ethereum transaction by hash:\n${hash}`);

      // wait until transaction complete
      // ISSUE: moonpay sending eth in ropsten, erc20 in rinkeby
      await ethersInstance.waitForTransaction(hash, confirmations, timeout);

      const tx = await ethersInstance.getTransaction(hash);

      console.info('Moonpay: ethereum transaction data received:', tx);

      if (tx.data === '0x') {
        // Parse ETH transfer
        const { to = '', value } = tx;
        const amount = new FPNumber(value as any).toString(); // transferred amount
        const address = EthAddress;

        return {
          amount,
          address,
          to,
        };
      } else {
        // Parse ERC-20 transfer
        const abi = ['function transfer(address to, uint256 value)'];
        const inter = new ethers.utils.Interface(abi);
        const decodedInput = inter.parseTransaction({ data: tx.data });
        const address = tx.to ?? ''; // asset address
        const {
          value, // BigNumber
          to = '', // ethereum address
        } = decodedInput.args;
        const amount = new FPNumber(value).toString(); // transferred amount

        return {
          amount,
          address,
          to,
        };
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  },
});

export default actions;
