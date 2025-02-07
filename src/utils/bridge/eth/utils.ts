import { decodeAddress } from '@polkadot/util-crypto';
import { Operation, FPNumber } from '@sora-substrate/sdk';
import { BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import { SmartContractType, SmartContracts } from '@/consts/evm';
import { asZeroValue } from '@/utils';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import ethersUtil from '@/utils/ethers-util';

import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { EthHistory, EthApprovedRequest } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { Subscription } from 'rxjs';

const { ETH_BRIDGE_STATES } = WALLET_CONSTS;

type EthTxParams = {
  asset: RegisteredAccountAsset;
  value: string;
  recipient: string;
  contractAddress: string;
  request?: EthApprovedRequest;
};

export const isOutgoingTx = (tx: EthHistory): boolean => {
  return tx.type === Operation.EthBridgeOutgoing;
};

export const isUnsignedFromPart = (tx: EthHistory): boolean => {
  if (isOutgoingTx(tx)) {
    return !tx.blockId && !tx.txId;
  } else {
    return !tx.externalHash;
  }
};

export const isUnsignedToPart = (tx: EthHistory): boolean => {
  if (tx.type === Operation.EthBridgeOutgoing) {
    return !tx.externalHash;
  } else if (tx.type === Operation.EthBridgeIncoming) {
    return false;
  } else {
    return true;
  }
};

export const isUnsignedTx = (tx: EthHistory): boolean => {
  return isUnsignedFromPart(tx);
};

export const isWaitingForAction = (tx: EthHistory): boolean => {
  return tx.transactionState === ETH_BRIDGE_STATES.EVM_REJECTED && isUnsignedToPart(tx);
};

export const getTransaction = (id: string): EthHistory => {
  const tx = ethBridgeApi.getHistory(id) as EthHistory;

  if (!tx) throw new Error(`[Bridge]: Transaction is not exists: ${id}`);

  return tx;
};

export const updateTransaction = async (id: string, params = {}) => {
  const tx = getTransaction(id);
  ethBridgeApi.saveHistory({ ...tx, ...params });
};

async function getRequestData(hash: string) {
  const request = await ethBridgeApi.api.query.ethBridge.requests(0, hash);
  const value = (request as any).value;

  let data;

  if (value.isOutgoing) {
    data = value.asOutgoing;
  } else if (value.isIncoming) {
    data = value.asIncoming;
  }

  return data[0];
}

function toPk20BytesHex(address: string) {
  const publicKey = decodeAddress(address, false);
  const publicKey20Bytes = Buffer.from(publicKey.slice(0, 20));
  const publicKey20BytesHex = `0x${publicKey20Bytes.toString('hex')}`;

  return publicKey20BytesHex;
}

function formatApprovedRequest(hash: string, request: any, proofs: any[]): EthApprovedRequest {
  const formattedItem = {} as EthApprovedRequest;
  const transferRequest = request.asTransfer;

  formattedItem.hash = hash;
  formattedItem.from = toPk20BytesHex(transferRequest.from.toString());
  formattedItem.to = transferRequest.to.toString();
  formattedItem.amount = new FPNumber(transferRequest.amount).toCodecString();

  formattedItem.r = [];
  formattedItem.s = [];
  formattedItem.v = [];

  for (const proof of proofs) {
    formattedItem.r.push(proof.r.toString());
    formattedItem.s.push(proof.s.toString());
    formattedItem.v.push(proof.v.toNumber() + 27);
  }

  return formattedItem;
}

export const waitForApprovedRequest = async (tx: EthHistory): Promise<EthApprovedRequest> => {
  const hash = tx.hash;

  if (!hash) throw new Error(`[Bridge]: Tx hash cannot be empty`);
  if (!Number.isFinite(tx.externalNetwork))
    throw new Error(`[Bridge]: Tx externalNetwork should be a number, ${tx.externalNetwork} received`);

  let subscription!: Subscription;

  await new Promise<void>((resolve, reject) => {
    subscription = ethBridgeApi.subscribeOnRequestStatus(hash).subscribe((status) => {
      switch (status) {
        case BridgeTxStatus.Failed:
        case BridgeTxStatus.Frozen:
        case BridgeTxStatus.Broken:
          reject(new Error('[Bridge]: Transaction was failed or canceled'));
          break;
        case BridgeTxStatus.Ready:
          resolve();
          break;
      }
    });
  });

  subscription.unsubscribe();

  // [HARDCODE] hardcoded "0" ethNetwork
  const request = await getRequestData(hash);
  const proofs = await ethBridgeApi.api.query.ethBridge.requestApprovals(0, hash);
  const approvedRequest = formatApprovedRequest(hash, request, proofs as any);

  if (!approvedRequest) throw new Error(`[Bridge]: getApprovedRequest is empty, hash="${hash}"`);

  return approvedRequest as EthApprovedRequest;
};

const getSoraBlockHashByRequestHash = async (ethereumHash: string) => {
  const height = await ethBridgeApi.api.query.ethBridge.requestSubmissionHeight(0, ethereumHash);
  const blockNumber = (height as any).toNumber();
  const blockHash = (await ethBridgeApi.api.rpc.chain.getBlockHash(blockNumber)).toString();

  return blockHash;
};

export const waitForIncomingRequest = async (tx: EthHistory): Promise<{ hash: string; blockId: string }> => {
  if (!tx.externalHash) throw new Error('[Bridge]: externalHash cannot be empty!');
  if (!Number.isFinite(tx.externalNetwork))
    throw new Error(`[Bridge]: Tx externalNetwork should be a number, ${tx.externalNetwork} received`);

  let subscription!: Subscription;

  await new Promise<void>((resolve, reject) => {
    subscription = ethBridgeApi.subscribeOnRequest(tx.externalHash as string).subscribe((request) => {
      if (request) {
        switch (request.status) {
          case BridgeTxStatus.Failed:
          case BridgeTxStatus.Frozen:
          case BridgeTxStatus.Broken:
            reject(new Error('[Bridge]: Transaction was failed or canceled'));
            break;
          case BridgeTxStatus.Done:
            resolve();
            break;
        }
      }
    });
  });

  subscription.unsubscribe();

  const hash = await ethBridgeApi.getSoraHashByEthereumHash(tx.externalHash as string);
  const blockId = await getSoraBlockHashByRequestHash(tx.externalHash as string);

  return { hash, blockId };
};

export async function getIncomingEvmTransactionData({ asset, value, recipient, contractAddress }: EthTxParams) {
  const accountId = ethersUtil.accountAddressToHex(recipient);
  const amount = new FPNumber(value, asset.externalDecimals).toCodecString();

  const contractAbi = SmartContracts[SmartContractType.EthBridge];
  const contract = await ethersUtil.getContract(contractAddress, contractAbi);

  const method = 'sendERC20ToSidechain';
  const args = [
    accountId, // bytes32 to
    amount, // uint256 amount
    asset.externalAddress, // address tokenAddress
  ];

  return {
    contract,
    method,
    args,
  };
}

export async function getOutgoingEvmTransactionData({
  asset,
  value,
  recipient,
  contractAddress,
  request,
}: EthTxParams) {
  if (!request) throw new Error('request is required!');

  const contractAbi = SmartContracts[SmartContractType.EthBridge];
  const contract = await ethersUtil.getContract(contractAddress, contractAbi);

  const amount = new FPNumber(value, asset.externalDecimals).toCodecString();
  const method = 'receiveByEthereumAssetAddress';
  const args: Array<any> = [
    asset.externalAddress, // address tokenAddress
    amount, // uint256 amount
    recipient, // address to
    request.from, // address from
    request.hash, // bytes32 txHash
    request.v, // uint8[] memory v
    request.r, // bytes32[] memory r
    request.s, // bytes32[] memory s
  ];

  return {
    contract,
    method,
    args,
  };
}

const gasLimit = {
  approve: BigInt(45000),
  sendERC20ToSidechain: BigInt(53000),
  receiveByEthereumAssetAddress: BigInt(221000),
};

/**
 * It's in gwei.
 */
const getEthBridgeOutgoingGasLimit = (): bigint => {
  return gasLimit.receiveByEthereumAssetAddress;
};

const getEthBridgeIncomingGasLimit = (): bigint => {
  return gasLimit.sendERC20ToSidechain;
};

export async function getEthNetworkFee(
  asset: RegisteredAccountAsset,
  contractAddress: string,
  value: string,
  isOutgoing: boolean,
  soraAccount: string,
  evmAccount: string
) {
  let gasLimitTotal!: bigint;

  if (isOutgoing) {
    gasLimitTotal = getEthBridgeOutgoingGasLimit();
  } else {
    const allowance = await ethersUtil.getAllowance(evmAccount, contractAddress, asset.externalAddress);
    const approveGasLimit = !!allowance && Number(allowance) < Number(value) ? gasLimit.approve : BigInt(0);

    let txGasLimit!: bigint;

    try {
      if (asZeroValue(value)) {
        throw new Error('Calculation with Zero amount is not allowed');
      }

      const txParams = {
        asset,
        value,
        recipient: soraAccount,
        contractAddress,
      };
      const { contract, method, args } = await getIncomingEvmTransactionData(txParams);
      const signer = contract.runner;
      const tx = await contract[method].populateTransaction(...args);

      txGasLimit = (await signer?.estimateGas?.(tx)) ?? BigInt(0);
    } catch {
      txGasLimit = getEthBridgeIncomingGasLimit();
    }

    gasLimitTotal = txGasLimit + approveGasLimit;
  }

  const gasPrice = await ethersUtil.getEvmGasPrice();

  return ethersUtil.calcEvmFee(gasPrice, gasLimitTotal);
}
