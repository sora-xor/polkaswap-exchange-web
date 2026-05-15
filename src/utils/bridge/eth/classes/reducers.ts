import first from 'lodash/fp/first';

import * as POLKASWAP_TYPES from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/types';
import { BridgeReducer } from '@/utils/bridge/common/classes';
import type { IBridgeReducerOptions, GetBridgeHistoryInstance, SignExternal } from '@/utils/bridge/common/types';
import { getTransactionEvents, getEvmTransactionFee, onEvmTransactionPending } from '@/utils/bridge/common/utils';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';
import type { EthBridgeHistory } from '@/utils/bridge/eth/classes/history';
import { getTransaction, waitForApprovedRequest, waitForIncomingRequest } from '@/utils/bridge/eth/utils';

import type { IBridgeTransaction } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { TransactionResponse } from 'ethers';

type EthBridgeReducerOptions<T extends IBridgeTransaction> = IBridgeReducerOptions<T> & {
  getBridgeHistoryInstance: GetBridgeHistoryInstance<EthBridgeHistory>;
  signExternalOutgoing: SignExternal;
  signExternalIncoming: SignExternal;
};

export class EthBridgeReducer extends BridgeReducer<EthHistory> {
  protected readonly getBridgeHistoryInstance!: GetBridgeHistoryInstance<EthBridgeHistory>;
  protected readonly signExternalOutgoing!: SignExternal;
  protected readonly signExternalIncoming!: SignExternal;

  constructor(options: EthBridgeReducerOptions<EthHistory>) {
    super(options);

    this.getBridgeHistoryInstance = options.getBridgeHistoryInstance;
    this.signExternalOutgoing = options.signExternalOutgoing;
    this.signExternalIncoming = options.signExternalIncoming;
  }

  /** Finds an already-submitted EVM bridge transaction for the SORA request before prompting to sign again. */
  private async findSubmittedEvmTxBySoraHash(id: string): Promise<TransactionResponse | null> {
    const { to, hash, startTime } = this.getTransaction(id);

    if (!(to && hash)) {
      return null;
    }

    const bridgeHistory = await this.getBridgeHistoryInstance();

    return await bridgeHistory.findEthTxBySoraHash(to, hash, startTime);
  }

  private async restoreSubmittedEvmTx(id: string): Promise<boolean> {
    const transaction = await this.findSubmittedEvmTxBySoraHash(id);

    if (!transaction) {
      return false;
    }

    this.updateTransactionParams(id, { externalHash: transaction.hash });

    return true;
  }

  async onEvmPending(id: string): Promise<void> {
    await onEvmTransactionPending(id, this.getTransaction.bind(this), this.updateTransactionParams.bind(this));
  }

  async onEvmSubmitted(id: string, signExternal: SignExternal): Promise<void> {
    const tx = this.getTransaction(id);

    if (!tx.externalHash) {
      this.beforeSubmit(id);

      try {
        if (await this.restoreSubmittedEvmTx(id)) {
          return;
        }
      } catch (error) {
        console.info('[Bridge]: Unable to restore submitted Ethereum transaction before signing', error);
      }

      try {
        const signedTx = await signExternal(id);
        // update after sign
        this.updateTransactionParams(id, {
          externalHash: signedTx.hash,
          externalNetworkFee: getEvmTransactionFee(signedTx),
        });
      } catch (error: any) {
        // maybe transaction already completed, try to restore ethereum transaction hash
        if (error.code !== 'ACTION_REJECTED') {
          if (await this.restoreSubmittedEvmTx(id)) {
            return;
          }
        }
        throw error;
      }
    }
  }

  private async restoreOutgoingRequestHash(id: string): Promise<void> {
    const { blockId, txId } = this.getTransaction(id);

    if (!(blockId && txId)) {
      return;
    }

    const transactionEvents = await getTransactionEvents(blockId, txId, ethBridgeApi.api);
    const requestEvent = transactionEvents.find((e) => ethBridgeApi.api.events.ethBridge.RequestRegistered.is(e.event));
    const hash = requestEvent?.event.data[0]?.toString();

    if (!hash) {
      throw new Error(`[Bridge]: Unable to restore ETH bridge request hash from SORA transaction "${txId}"`);
    }

    this.updateTransactionParams(id, { hash });
  }

  protected async ensureOutgoingRequestHash(id: string): Promise<void> {
    const { hash } = this.getTransaction(id);

    if (hash) {
      const requestStatus = await ethBridgeApi.getRequestStatus(hash);

      if (requestStatus != null) {
        return;
      }
    }

    await this.restoreOutgoingRequestHash(id);
  }
}

export class EthBridgeOutgoingReducer extends EthBridgeReducer {
  async changeState(transaction: EthHistory): Promise<void> {
    if (!transaction.id) throw new Error('[Bridge]: TX ID cannot be empty');

    switch (transaction.transactionState) {
      case ETH_BRIDGE_STATES.INITIAL:
      case ETH_BRIDGE_STATES.SORA_REJECTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.SORA_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
        });
      }

      case ETH_BRIDGE_STATES.SORA_SUBMITTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.SORA_PENDING,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
          handler: async (id: string) => {
            this.beforeSubmit(id);

            const tx = getTransaction(id);

            // transaction not signed
            if (!tx.txId) {
              await this.beforeSign(id);
              const asset = this.getAssetByAddress(tx.assetAddress as string) as RegisteredAccountAsset;
              await ethBridgeApi.transfer(asset, tx.to as string, tx.amount as string, id);
            }

            // signed sora transaction has to be parsed by polkaswap
            if (tx.txId && !tx.blockId) {
              // format account address to sora format
              const { from: address } = getTransaction(id);
              const bridgeHistory = await this.getBridgeHistoryInstance();
              const historyItem = first(await bridgeHistory.fetchHistoryElements(address as string, 0, [tx.txId]));

              if (historyItem) {
                this.updateTransactionParams(id, {
                  blockId: historyItem.blockHash,
                  hash: (historyItem.data as POLKASWAP_TYPES.HistoryElementEthBridgeOutgoing).requestHash,
                });
              } else {
                throw new Error(`[Bridge]: Can not restore TX from Polkaswap: ${tx.txId}`);
              }
            }
          },
        });
      }

      case ETH_BRIDGE_STATES.SORA_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
          handler: async (id: string) => {
            await this.waitForTransactionStatus(id);
            await this.waitForTransactionBlockId(id);

            await this.ensureOutgoingRequestHash(id);

            const tx = this.getTransaction(id);

            const { to } = await waitForApprovedRequest(tx);

            this.updateTransactionParams(id, { to });
          },
        });
      }

      case ETH_BRIDGE_STATES.EVM_SUBMITTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_PENDING,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmSubmitted(id, this.signExternalOutgoing),
        });
      }

      case ETH_BRIDGE_STATES.EVM_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_COMMITED,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => {
            await this.onEvmPending(id);
            await this.onComplete(id);
          },
        });
      }

      case ETH_BRIDGE_STATES.EVM_REJECTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
        });
      }
    }
  }
}

export class EthBridgeIncomingReducer extends EthBridgeReducer {
  async changeState(transaction: EthHistory): Promise<void> {
    if (!transaction.id) throw new Error('[Bridge]: TX ID cannot be empty');

    switch (transaction.transactionState) {
      case ETH_BRIDGE_STATES.INITIAL:
      case ETH_BRIDGE_STATES.EVM_REJECTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
        });
      }

      case ETH_BRIDGE_STATES.EVM_SUBMITTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_PENDING,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmSubmitted(id, this.signExternalIncoming),
        });
      }

      case ETH_BRIDGE_STATES.EVM_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.SORA_PENDING,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmPending(id),
        });
      }

      case ETH_BRIDGE_STATES.SORA_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.SORA_COMMITED,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
          handler: async (id: string) => {
            const tx = this.getTransaction(id);
            const { hash, blockId } = await waitForIncomingRequest(tx);
            this.updateTransactionParams(id, { hash, blockId });
            await this.onComplete(id);
          },
        });
      }

      case ETH_BRIDGE_STATES.SORA_REJECTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.SORA_PENDING,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
        });
      }
    }
  }
}
