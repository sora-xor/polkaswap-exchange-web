import { Operation, FPNumber } from '@sora-substrate/util';
import { BridgeTxStatus } from '@sora-substrate/util/build/bridgeProxy/consts';
import { EthCurrencyType, EthAssetKind } from '@sora-substrate/util/build/bridgeProxy/eth/consts';
import { ethers } from 'ethers';

import { SmartContractType, KnownEthBridgeAsset, SmartContracts } from '@/consts/evm';
import type { BridgeRegisteredAsset } from '@/store/assets/types';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import ethersUtil from '@/utils/ethers-util';

import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { EthHistory, EthApprovedRequest } from '@sora-substrate/util/build/bridgeProxy/eth/types';
import type { Subscription } from 'rxjs';

type EthTxParams = {
  asset: RegisteredAccountAsset;
  value: string;
  recipient: string;
  getContractAddress: (symbol: KnownEthBridgeAsset) => Nullable<string>;
  request?: EthApprovedRequest;
};

export const isUnsignedFromPart = (tx: EthHistory): boolean => {
  if (tx.type === Operation.EthBridgeOutgoing) {
    return !tx.blockId && !tx.txId;
  } else if (tx.type === Operation.EthBridgeIncoming) {
    return !tx.externalHash;
  } else {
    return true;
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

export const getTransaction = (id: string): EthHistory => {
  const tx = ethBridgeApi.getHistory(id) as EthHistory;

  if (!tx) throw new Error(`[Bridge]: Transaction is not exists: ${id}`);

  return tx;
};

export const updateTransaction = async (id: string, params = {}) => {
  const tx = getTransaction(id);
  ethBridgeApi.saveHistory({ ...tx, ...params });
};

export const waitForApprovedRequest = async (tx: EthHistory): Promise<EthApprovedRequest> => {
  if (!tx.hash) throw new Error(`[Bridge]: Tx hash cannot be empty`);
  if (!Number.isFinite(tx.externalNetwork))
    throw new Error(`[Bridge]: Tx externalNetwork should be a number, ${tx.externalNetwork} received`);

  let subscription!: Subscription;

  await new Promise<void>((resolve, reject) => {
    subscription = ethBridgeApi.subscribeOnRequestStatus(tx.hash as string).subscribe((status) => {
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

  return ethBridgeApi.getApprovedRequest(tx.hash as string);
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

  const soraHash = await ethBridgeApi.getSoraHashByEthereumHash(tx.externalHash as string);
  const soraBlockHash = await ethBridgeApi.getSoraBlockHashByRequestHash(tx.externalHash as string);

  return { hash: soraHash, blockId: soraBlockHash };
};

export async function getIncomingEvmTransactionData({ asset, value, recipient, getContractAddress }: EthTxParams) {
  const isNativeEvmToken = ethersUtil.isNativeEvmTokenAddress(asset.externalAddress);

  const [signer, accountId] = await Promise.all([ethersUtil.getSigner(), ethersUtil.accountAddressToHex(recipient)]);

  const amount = new FPNumber(value, asset.externalDecimals).toCodecString();

  const contractAddress = getContractAddress(KnownEthBridgeAsset.Other)!;
  const contractAbi = SmartContracts[SmartContractType.EthBridge][KnownEthBridgeAsset.Other].abi;
  const contract = new ethers.Contract(contractAddress, contractAbi, signer);

  const method = isNativeEvmToken ? 'sendEthToSidechain' : 'sendERC20ToSidechain';
  const methodArgs = isNativeEvmToken
    ? [
        accountId, // bytes32 to
      ]
    : [
        accountId, // bytes32 to
        amount, // uint256 amount
        asset.externalAddress, // address tokenAddress
      ];
  const overrides = isNativeEvmToken ? { value: amount } : {};
  const args = [...methodArgs, overrides];

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
  getContractAddress,
  request,
}: EthTxParams) {
  if (!request) throw new Error('request is required!');

  const signer = await ethersUtil.getSigner();
  const symbol = asset.symbol as KnownEthBridgeAsset;
  const isValOrXor = [KnownEthBridgeAsset.XOR, KnownEthBridgeAsset.VAL].includes(symbol);
  const bridgeAsset: KnownEthBridgeAsset = isValOrXor ? symbol : KnownEthBridgeAsset.Other;
  const contractAddress = getContractAddress(bridgeAsset)!;
  const contractAbi = SmartContracts[SmartContractType.EthBridge][bridgeAsset].abi;

  const contract = new ethers.Contract(contractAddress, contractAbi, signer);
  const amount = new FPNumber(value, asset.externalDecimals).toCodecString();

  const method = isValOrXor
    ? 'mintTokensByPeers'
    : request.currencyType === EthCurrencyType.TokenAddress
    ? 'receiveByEthereumAssetAddress'
    : 'receiveBySidechainAssetId';

  const args: Array<any> = [
    isValOrXor || request.currencyType === EthCurrencyType.TokenAddress
      ? asset.externalAddress // address tokenAddress OR
      : asset.address, // bytes32 assetId
    amount, // uint256 amount
    recipient, // address beneficiary
  ];
  args.push(
    ...(isValOrXor
      ? [
          request.hash, // bytes32 txHash
          request.v, // uint8[] memory v
          request.r, // bytes32[] memory r
          request.s, // bytes32[] memory s
          request.from, // address from
        ]
      : [
          request.from, // address from
          request.hash, // bytes32 txHash
          request.v, // uint8[] memory v
          request.r, // bytes32[] memory r
          request.s, // bytes32[] memory s
        ])
  );

  return {
    contract,
    method,
    args,
  };
}

const gasLimit = {
  approve: 47000,
  sendERC20ToSidechain: 53000,
  sendEthToSidechain: 26093,
  mintTokensByPeers: 211000,
  receiveByEthereumAssetAddress: {
    ETH: 155000,
    OTHER: 181000,
  },
  receiveBySidechainAssetId: 184000,
};

/**
 * It's in gwei.
 */
const getEthBridgeOutgoingGasLimit = (assetEvmAddress: string, assetKind: EthAssetKind) => {
  switch (assetKind) {
    case EthAssetKind.SidechainOwned:
      return gasLimit.mintTokensByPeers;
    case EthAssetKind.Thischain:
      return gasLimit.receiveBySidechainAssetId;
    case EthAssetKind.Sidechain:
      return ethersUtil.isNativeEvmTokenAddress(assetEvmAddress)
        ? gasLimit.receiveByEthereumAssetAddress.ETH
        : gasLimit.receiveByEthereumAssetAddress.OTHER;
    default:
      throw new Error(`Unknown kind "${assetKind}" for asset "${assetEvmAddress}"`);
  }
};

export async function getEthNetworkFee(
  asset: RegisteredAccountAsset,
  assetKind: EthAssetKind,
  getContractAddress: (symbol: KnownEthBridgeAsset) => Nullable<string>,
  value: string,
  isOutgoing: boolean,
  soraAccount: string,
  evmAccount: string
) {
  let gasLimit!: bigint;

  if (isOutgoing) {
    gasLimit = BigInt(getEthBridgeOutgoingGasLimit(asset.externalAddress, assetKind));
  } else {
    const bridgeContractAddress = getContractAddress(KnownEthBridgeAsset.Other) as string;
    const allowance = await ethersUtil.getAllowance(evmAccount, bridgeContractAddress, asset.externalAddress);
    const approveGasLimit = !!allowance && Number(allowance) < Number(value) ? BigInt(45_000) : BigInt(0);

    const params = {
      asset,
      value,
      recipient: soraAccount,
      getContractAddress,
    };

    const { contract, method, args } = await getIncomingEvmTransactionData(params);
    const signer = contract.runner!;
    const tx = await contract[method].populateTransaction(...args);
    const txGasLimit = await signer.estimateGas!(tx);

    gasLimit = txGasLimit + approveGasLimit;
  }

  const gasPrice = await ethersUtil.getEvmGasPrice();

  return ethersUtil.calcEvmFee(gasPrice, gasLimit);
}
