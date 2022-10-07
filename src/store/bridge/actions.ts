import compact from 'lodash/fp/compact';
import { defineActions } from 'direct-vuex';
import { ethers } from 'ethers';

import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { BridgeCurrencyType, BridgeHistory, BridgeNetworks, FPNumber, Operation } from '@sora-substrate/util';
import type { ActionContext } from 'vuex';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

import { bridgeActionContext } from '@/store/bridge';
import { MaxUint256 } from '@/consts';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { waitForApprovedRequest } from '@/utils/bridge/eth/utils';
import { EthBridgeHistory } from '@/utils/bridge/eth/history';
import ethersUtil, { ABI, KnownEthBridgeAsset, OtherContractType } from '@/utils/ethers-util';
import type { SignTxResult } from './types';

// EVM
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { EvmTxStatus, EvmDirection } from '@sora-substrate/util/build/evm/consts';
import type { EvmHistory, EvmTransaction } from '@sora-substrate/util/build/evm/types';
import type { EvmNetwork } from '@sora-substrate/util/build/evm/consts';
import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';

const balanceSubscriptions = new TokenBalanceSubscriptions();

function checkEvmNetwork(context: ActionContext<any, any>): void {
  const { rootGetters } = bridgeActionContext(context);
  if (!rootGetters.web3.isValidNetwork) {
    throw new Error('Change evm network in Metamask');
  }
}

function evmTransactionToEvmHistoryItem(
  assetDataByAddress: (address: string) => Nullable<RegisteredAccountAssetWithDecimals>,
  tx: EvmTransaction
): EvmHistory {
  const id = tx.soraHash || tx.evmHash;
  const asset = assetDataByAddress(tx.soraAssetAddress);
  const transactionState = tx.status;

  // TODO [EVM] add: txId, blockId, startTime, endTime
  return {
    id,
    txId: id, // TODO [EVM] remove mock
    type: tx.direction === EvmDirection.Outgoing ? Operation.EvmOutgoing : Operation.EvmIncoming,
    hash: tx.soraHash,
    transactionState,
    externalNetwork: evmBridgeApi.externalNetwork,
    evmHash: tx.evmHash,
    amount: FPNumber.fromCodecValue(tx.amount, asset?.decimals).toString(),
    assetAddress: asset?.address,
    symbol: asset?.symbol,
    from: tx.soraAccount,
    to: tx.evmAccount,
  };
}

function evmTransactionsToEvmHistory(
  assetDataByAddress: (address: string) => Nullable<RegisteredAccountAssetWithDecimals>,
  txs: EvmTransaction[]
): Record<string, EvmHistory> {
  return txs.reduce((buffer, tx) => {
    const historyItem = evmTransactionToEvmHistoryItem(assetDataByAddress, tx);

    if (!historyItem.id) return buffer;

    return { ...buffer, [historyItem.id]: historyItem };
  }, {});
}

function bridgeDataToHistoryItem(
  context: ActionContext<any, any>,
  { date = Date.now(), payload = {}, ...params } = {}
): EvmHistory {
  const { getters, state, rootState } = bridgeActionContext(context);

  return {
    type: (params as any).type ?? (state.isSoraToEvm ? Operation.EvmOutgoing : Operation.EvmIncoming),
    amount: (params as any).amount ?? state.amount,
    symbol: (params as any).symbol ?? getters.asset?.symbol,
    assetAddress: (params as any).assetAddress ?? getters.asset?.address,
    startTime: date,
    endTime: date,
    status: '',
    hash: '',
    transactionState: EvmTxStatus.Pending,
    soraNetworkFee: (params as any).soraNetworkFee ?? getters.soraNetworkFee,
    // evmNetworkFee: (params as any).evmNetworkFee ?? getters.evmNetworkFee,
    externalNetwork: rootState.web3.evmNetworkSelected as unknown as EvmNetwork,
    to: (params as any).to ?? rootState.web3.evmAddress,
    payload,
  };
}

const actions = defineActions({
  async updateBalanceSubscription(context): Promise<void> {
    const { getters, commit, rootGetters } = bridgeActionContext(context);
    const updateBalance = (balance: AccountBalance) => commit.setAssetBalance(balance);

    balanceSubscriptions.remove('asset', { updateBalance });

    if (
      rootGetters.wallet.account.isLoggedIn &&
      getters.asset?.address &&
      !(getters.asset.address in rootGetters.wallet.account.accountAssetsAddressTable)
    ) {
      balanceSubscriptions.add('asset', { updateBalance, token: getters.asset });
    }
  },
  async resetBalanceSubscription(context): Promise<void> {
    const { commit } = bridgeActionContext(context);
    balanceSubscriptions.remove('asset', {
      updateBalance: (balance: AccountBalance) => commit.setAssetBalance(balance),
    });
  },
  async setAssetAddress(context, address?: string): Promise<void> {
    const { commit, dispatch } = bridgeActionContext(context);
    commit.setAssetAddress(address);
    dispatch.updateBalanceSubscription();
  },
  // Reset balance subscription & amount, but save selected asset
  async resetBridgeForm(context): Promise<void> {
    const { commit, dispatch } = bridgeActionContext(context);
    dispatch.resetBalanceSubscription();
    commit.setAmount();
    commit.setSoraToEvm(true);
  },
  async updateEvmBlockNumber(context, value?: number): Promise<void> {
    const { commit } = bridgeActionContext(context);
    const blockNumber = value ?? (await (await ethersUtil.getEthersInstance()).getBlockNumber());
    commit.setEvmBlockNumber(blockNumber);
  },

  removeInternalHistory(context, { tx, force = false }: { tx: Partial<EvmHistory>; force: boolean }): void {
    const { commit, state, rootState } = bridgeActionContext(context);

    const { hash, txId, evmHash } = tx;

    const item = evmBridgeApi.historyList.find(
      (item: EvmHistory) => item.hash === hash || item.txId === txId || item.evmHash === evmHash
    );

    if (!item) return;

    const inProgress = state.inProgressIds[item.id];
    // in not force mode, do not remove tx in progress
    if (!force && inProgress) return;
    // update in progress id if needed
    if (hash && inProgress) {
      commit.addTxIdInProgress(hash);
      commit.removeTxIdFromProgress(item.id);
    }
    // update active view if needed
    if (hash && state.historyId === item.id) {
      commit.setHistoryId(hash);
    }
    // update moonpay records if needed
    if (item.payload?.moonpayId) {
      rootState.moonpay.api.accountRecords = {
        ...rootState.moonpay.api.accountRecords,
        [item.payload.moonpayId]: item.evmHash,
      };
    }
    // remove tx from history
    evmBridgeApi.removeHistory(item.id);
    commit.setInternalHistory();
  },

  async getHistory(context): Promise<void> {
    const { commit, rootState, rootGetters } = bridgeActionContext(context);

    if (!rootGetters.wallet.account.isLoggedIn) return;

    const externalNetwork = rootState.web3.evmNetworkSelected;

    const hashes = await evmBridgeApi.getUserTxHashes(externalNetwork);
    const transactions = await evmBridgeApi.getTxsDetails(externalNetwork, hashes);
    const externalHistory = evmTransactionsToEvmHistory(rootGetters.assets.assetDataByAddress, transactions);

    commit.setExternalHistory(externalHistory);
  },

  subscribeOnHistory(context): void {
    const { commit, dispatch, rootState, rootGetters } = bridgeActionContext(context);

    dispatch.unsubscribeFromHistory();

    if (!rootGetters.wallet.account.isLoggedIn) return;

    const externalNetwork = rootState.web3.evmNetworkSelected;

    const hashesSubscription = evmBridgeApi.subscribeOnUserTxHashes(externalNetwork).subscribe((hashes) => {
      commit.resetHistoryDataSubscription();

      const dataSubscription = evmBridgeApi
        .subscribeOnTxsDetails(externalNetwork, hashes)
        .subscribe((transactions: EvmTransaction[]) => {
          const externalHistory = evmTransactionsToEvmHistory(rootGetters.assets.assetDataByAddress, transactions);

          commit.setExternalHistory(externalHistory);

          for (const id in externalHistory) {
            dispatch.removeInternalHistory({ tx: externalHistory[id], force: false });
          }
        });

      commit.setHistoryDataSubscription(dataSubscription);
    });

    commit.setHistoryHashesSubscription(hashesSubscription);
  },

  unsubscribeFromHistory(context): void {
    const { commit } = bridgeActionContext(context);

    commit.resetHistoryDataSubscription();
    commit.resetHistoryHashesSubscription();
  },

  /**
   * Fetch EVM Network fee for selected bridge asset
   */
  async getEvmNetworkFee(context): Promise<void> {
    const { getters, commit, state } = bridgeActionContext(context);
    if (!getters.asset?.address) {
      return;
    }
    commit.getEvmNetworkFeeRequest();
    try {
      const fee = await ethersUtil.getEvmNetworkFee(getters.asset.address, state.isSoraToEvm);
      commit.getEvmNetworkFeeSuccess(fee);
    } catch (error) {
      commit.getEvmNetworkFeeFailure();
    }
  },

  async generateHistoryItem(context, playground): Promise<EvmHistory> {
    const { commit } = bridgeActionContext(context);
    const historyData = bridgeDataToHistoryItem(context, playground);
    const historyItem = evmBridgeApi.generateHistoryItem(historyData);

    if (!historyItem) {
      throw new Error('[Bridge]: "generateHistoryItem" failed');
    }

    commit.setInternalHistory();

    return historyItem;
  },

  async signEvmTransactionEvmToSora(context, id: string): Promise<void> {
    // const { commit, rootState, rootGetters, rootDispatch } = bridgeActionContext(context);
    // const tx = ethBridgeApi.getHistory(id);
    // if (!tx?.id) throw new Error('TX cannot be empty!');
    // if (!tx.amount) throw new Error('TX amount cannot be empty!');
    // if (!tx.assetAddress) throw new Error('TX assetAddress cannot be empty!');
    // const asset = rootGetters.assets.assetDataByAddress(tx.assetAddress);
    // if (!asset?.externalAddress) throw new Error(`Asset not registered: ${tx.assetAddress}`);
    // checkEvmNetwork(context);
    // try {
    //   const contract = rootGetters.web3.contractAbi(KnownEthBridgeAsset.Other);
    //   const evmAccount = rootState.web3.evmAddress;
    //   const isExternalAccountConnected = await ethersUtil.checkAccountIsConnected(evmAccount);
    //   if (!isExternalAccountConnected) throw new Error('Connect account in Metamask');
    //   const ethersInstance = await ethersUtil.getEthersInstance();
    //   const contractAddress = rootGetters.web3.contractAddress(KnownEthBridgeAsset.Other) as string;
    //   const isNativeEvmToken = ethersUtil.isNativeEvmTokenAddress(asset.externalAddress);
    //   // don't check allowance for native EVM token
    //   if (!isNativeEvmToken) {
    //     const allowance = await ethersUtil.getAllowance(evmAccount, contractAddress, asset.externalAddress);
    //     if (FPNumber.lte(new FPNumber(allowance), new FPNumber(tx.amount))) {
    //       commit.addTxIdInApprove(tx.id);
    //       const tokenInstance = new ethers.Contract(
    //         asset.externalAddress,
    //         contract[OtherContractType.ERC20].abi,
    //         ethersInstance.getSigner()
    //       );
    //       const methodArgs = [
    //         contractAddress, // address spender
    //         MaxUint256, // uint256 amount
    //       ];
    //       checkEvmNetwork(context);
    //       const transaction = await tokenInstance.approve(...methodArgs);
    //       await transaction.wait(2);
    //       commit.removeTxIdFromApprove(tx.id);
    //     }
    //   }
    //   const soraAccountAddress = rootState.wallet.account.address;
    //   const accountId = await ethersUtil.accountAddressToHex(soraAccountAddress);
    //   const contractInstance = new ethers.Contract(
    //     contractAddress,
    //     contract[OtherContractType.Bridge].abi,
    //     ethersInstance.getSigner()
    //   );
    //   const decimals = isNativeEvmToken
    //     ? undefined
    //     : await (async () => {
    //         const tokenInstance = new ethers.Contract(asset.externalAddress, ABI.balance, ethersInstance.getSigner());
    //         const decimals = await tokenInstance.decimals();
    //         return +decimals;
    //       })();
    //   const amount = new FPNumber(tx.amount, decimals).toCodecString();
    //   const method = isNativeEvmToken ? 'sendEthToSidechain' : 'sendERC20ToSidechain';
    //   const methodArgs = isNativeEvmToken
    //     ? [
    //         accountId, // bytes32 to
    //       ]
    //     : [
    //         accountId, // bytes32 to
    //         amount, // uint256 amount
    //         asset.externalAddress, // address tokenAddress
    //       ];
    //   const overrides = isNativeEvmToken ? { value: amount } : {};
    //   checkEvmNetwork(context);
    //   const transaction: ethers.providers.TransactionResponse = await contractInstance[method](
    //     ...methodArgs,
    //     overrides
    //   );
    //   const fee = transaction.gasPrice
    //     ? ethersUtil.calcEvmFee(transaction.gasPrice.toNumber(), transaction.gasLimit.toNumber())
    //     : undefined;
    //   return {
    //     hash: transaction.hash,
    //     fee,
    //   };
    // } catch (error) {
    //   commit.removeTxIdFromApprove(tx.id);
    //   console.error(error);
    //   throw error;
    // }
  },
});

export default actions;
