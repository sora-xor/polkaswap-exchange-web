import detectEthereumProvider from '@metamask/detect-provider';
import { decodeAddress } from '@polkadot/util-crypto';
import { FPNumber } from '@sora-substrate/util';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { EthAssetKind } from '@sora-substrate/util/build/bridgeProxy/eth/consts';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { ethers } from 'ethers';

import { ZeroStringValue } from '@/consts';
import { SmartContracts, SmartContractType } from '@/consts/evm';
import type { NetworkData } from '@/types/bridge';
import { settingsStorage } from '@/utils/storage';

import type { CodecString } from '@sora-substrate/util';
import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';

type ethersProvider = ethers.BrowserProvider;

let provider: any = null;
let ethersInstance: ethersProvider | null = null;

export enum Provider {
  Metamask,
  WalletConnect,
}

interface ConnectOptions {
  provider: Provider;
  url?: string;
}

// TODO [EVM]
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
const getEthBridgeGasLimit = (assetEvmAddress: string, kind: EthAssetKind, isSoraToEvm: boolean) => {
  if (isSoraToEvm) {
    switch (kind) {
      case EthAssetKind.SidechainOwned:
        return gasLimit.mintTokensByPeers;
      case EthAssetKind.Thischain:
        return gasLimit.receiveBySidechainAssetId;
      case EthAssetKind.Sidechain:
        return isNativeEvmTokenAddress(assetEvmAddress)
          ? gasLimit.receiveByEthereumAssetAddress.ETH
          : gasLimit.receiveByEthereumAssetAddress.OTHER;
      default:
        throw new Error(`Unknown kind "${kind}" for asset "${assetEvmAddress}"`);
    }
  } else {
    return isNativeEvmTokenAddress(assetEvmAddress)
      ? gasLimit.sendEthToSidechain
      : gasLimit.approve + gasLimit.sendERC20ToSidechain;
  }
};

async function onConnect(options: ConnectOptions): Promise<string> {
  if (options.provider === Provider.Metamask) {
    return onConnectMetamask();
  } else {
    return onConnectWallet(options.url);
  }
}

async function onConnectMetamask(): Promise<string> {
  provider = (await detectEthereumProvider({ timeout: 0 })) as any;
  if (!provider) {
    throw new Error('provider.messages.installExtension');
  }
  return getAccount();
}

async function onConnectWallet(url = 'https://cloudflare-eth.com'): Promise<string> {
  provider = new WalletConnectProvider({
    rpc: { 1: url },
  });
  await provider.enable();
  return getAccount();
}

async function getSigner(): Promise<ethers.JsonRpcSigner> {
  const ethersInstance = await getEthersInstance();
  const signer = await ethersInstance.getSigner();

  return signer;
}

async function getAccount(): Promise<string> {
  const ethersInstance = await getEthersInstance();
  await ethersInstance.send('eth_requestAccounts', []);
  const signer = await getSigner();
  return signer.getAddress();
}

async function getTokenContract(tokenAddress: string): Promise<ethers.Contract> {
  const signer = await getSigner();
  const contract = new ethers.Contract(tokenAddress, SmartContracts[SmartContractType.ERC20].abi, signer);

  return contract;
}

/**
 * Get account native token balance (ETH for Ethereum)
 * @param accountAddress address of account
 */
async function getAccountBalance(accountAddress: string): Promise<CodecString> {
  try {
    const ethersInstance = await getEthersInstance();
    const wei = await ethersInstance.getBalance(accountAddress);

    return wei.toString();
  } catch (error) {
    console.error(error);
    return ZeroStringValue;
  }
}

async function getAccountTokenBalance(accountAddress: string, tokenAddress: string): Promise<CodecString> {
  try {
    const tokenInstance = await getTokenContract(tokenAddress);
    const methodArgs = [accountAddress];
    const balance: bigint = await tokenInstance.balanceOf(...methodArgs);

    return balance.toString();
  } catch (error) {
    console.error(error);
    return ZeroStringValue;
  }
}

async function getTokenDecimals(tokenAddress: string): Promise<number> {
  if (!isNativeEvmTokenAddress(tokenAddress)) {
    try {
      const contract = await getTokenContract(tokenAddress);
      const result: bigint = await contract.decimals();

      return Number(result);
    } catch (error) {
      console.error(error);
    }
  }

  return FPNumber.DEFAULT_PRECISION;
}

async function getAccountAssetBalance(accountAddress: string, assetAddress: string): Promise<CodecString> {
  if (!(accountAddress && assetAddress)) return ZeroStringValue;

  return isNativeEvmTokenAddress(assetAddress)
    ? await getAccountBalance(accountAddress)
    : await getAccountTokenBalance(accountAddress, assetAddress);
}

async function getAllowance(accountAddress: string, contractAddress: string, assetAddress: string): Promise<string> {
  if (!(accountAddress && assetAddress && contractAddress)) return ZeroStringValue;

  const methodArgs = [accountAddress, contractAddress];
  const contract = await getTokenContract(assetAddress);
  const decimals = await getTokenDecimals(assetAddress);
  const allowance: bigint = await contract.allowance(...methodArgs);

  return FPNumber.fromCodecValue(allowance.toString(), decimals).toString();
}

// TODO: remove this check, when MetaMask issue will be resolved
// https://github.com/MetaMask/metamask-extension/issues/10368
async function checkAccountIsConnected(address: string): Promise<boolean> {
  if (!address) return false;

  const currentAccount = await getAccount();

  // TODO: check why sometimes currentAccount !== address with the same account
  return !!currentAccount && addressesAreEqual(currentAccount, address);
}

function addressesAreEqual(a: string, b: string): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

async function getEthersInstance(): Promise<ethersProvider> {
  if (!provider) {
    provider = (await detectEthereumProvider({ timeout: 0 })) as any;
  }
  if (!provider) {
    throw new Error('No ethereum provider instance!');
  }
  if (!ethersInstance) {
    // 'any' - because ethers throws errors after network switch
    ethersInstance = new ethers.BrowserProvider(provider, 'any');
  }
  return ethersInstance;
}

async function watchEthereum(cb: {
  onAccountChange: (addressList: string[]) => void;
  onNetworkChange: (networkId: string) => void;
  onDisconnect: FnWithoutArgs;
}): Promise<FnWithoutArgs> {
  await getEthersInstance();

  const ethereum = (window as any).ethereum;

  if (ethereum) {
    ethereum.on('accountsChanged', cb.onAccountChange);
    ethereum.on('chainChanged', cb.onNetworkChange);
    ethereum.on('disconnect', cb.onDisconnect);
  }

  return function disconnect() {
    if (ethereum) {
      ethereum.removeListener('accountsChanged', cb.onAccountChange);
      ethereum.removeListener('chainChanged', cb.onNetworkChange);
      ethereum.removeListener('disconnect', cb.onDisconnect);
    }
  };
}

async function addToken(address: string, symbol: string, decimals: number, image?: string): Promise<void> {
  const ethereum = (window as any).ethereum;

  try {
    await ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20', // Initially only supports ERC20, but eventually more!
        options: {
          address, // The address that the token is at.
          symbol, // A ticker symbol or shorthand, up to 5 chars.
          decimals, // The number of decimals in the token
          image, // A string url of the token logo
        },
      },
    });
  } catch (error) {
    console.error(error);
  }
}

/**
 * Add chain to Metamask
 * @param network network data
 * @param chainName translated chain name
 */
async function switchOrAddChain(network: NetworkData, chainName?: string): Promise<void> {
  const ethereum = (window as any).ethereum;
  const chainId = ethers.toQuantity(network.id);

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [
        {
          chainId,
        },
      ],
    });
  } catch (switchError: any) {
    console.error(switchError);
    // Chain is not added to wallet
    // "Unrecognized chain ID. Try adding the chain using wallet_addEthereumChain first."
    if (switchError.code === 4902) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId,
              chainName: chainName || network.name,
              endpointUrls: network.endpointUrls,
              nativeCurrency: network.nativeCurrency,
              blockExplorerUrls: network.blockExplorerUrls,
            },
          ],
        });
      } catch (addError) {
        console.error(addError);
      }
    }
  }
}

async function getEvmNetworkId(): Promise<number> {
  const ethersInstance = await getEthersInstance();
  const network = await ethersInstance.getNetwork();

  return Number(network.chainId);
}

/**
 * Fetch EVM Network fee for passed asset address
 */
async function getEvmNetworkFee(
  assetEvmAddress: string,
  assetKind: string,
  isSoraToEvm: boolean
): Promise<CodecString> {
  try {
    const ethersInstance = await getEthersInstance();
    const { maxFeePerGas } = await ethersInstance.getFeeData();
    const gasPrice = maxFeePerGas ?? BigInt(0);
    const gasLimit = BigInt(getEthBridgeGasLimit(assetEvmAddress, assetKind as EthAssetKind, isSoraToEvm));
    const fee = calcEvmFee(gasPrice, gasLimit);

    return fee;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

function calcEvmFee(gasPrice: bigint, gasAmount: bigint) {
  return (gasPrice * gasAmount).toString();
}

async function getEvmTransaction(hash: string): Promise<ethers.TransactionResponse | null> {
  const ethersInstance = await getEthersInstance();
  const tx = await ethersInstance.getTransaction(hash);

  return tx;
}

async function getEvmTransactionReceipt(hash: string): Promise<ethers.TransactionReceipt | null> {
  const ethersInstance = await getEthersInstance();
  const tx = await ethersInstance.getTransactionReceipt(hash);

  return tx;
}

async function getBlock(number: number): Promise<ethers.Block | null> {
  const ethersInstance = await getEthersInstance();
  const block = await ethersInstance.getBlock(Number(number));

  return block;
}

async function accountAddressToHex(address: string): Promise<string> {
  return ethers.hexlify(decodeAddress(address));
}

function hexToNumber(hex: string): number {
  const numberString = hex.replace(/^0x/, '');
  const number = parseInt(numberString, 16);

  return number;
}

function isNativeEvmTokenAddress(address: string): boolean {
  return hexToNumber(address) === 0;
}

function getEvmUserAddress(): string {
  return settingsStorage.get('evmAddress') || '';
}

function storeEvmUserAddress(address: string): void {
  settingsStorage.set('evmAddress', address);
}

function removeEvmUserAddress(): void {
  settingsStorage.remove('evmAddress');
}

function getSelectedNetwork(): Nullable<BridgeNetworkId> {
  const network = settingsStorage.get('evmNetwork');

  return network ? JSON.parse(network) : null;
}

function storeSelectedNetwork(network: BridgeNetworkId) {
  settingsStorage.set('evmNetwork' as any, JSON.stringify(network));
}

function getSelectedBridgeType(): Nullable<BridgeNetworkType> {
  const result = settingsStorage.get('bridgeType') as BridgeNetworkType;
  const value = result || null;

  return value;
}

function storeSelectedBridgeType(bridgeType: BridgeNetworkType) {
  settingsStorage.set('bridgeType' as any, bridgeType);
}

export default {
  onConnect,
  getSigner,
  getAccount,
  getAccountBalance,
  getAccountAssetBalance,
  getTokenContract,
  getTokenDecimals,
  getAllowance,
  checkAccountIsConnected,
  getEthersInstance,
  watchEthereum,
  accountAddressToHex,
  addressesAreEqual,
  calcEvmFee,
  hexToNumber,
  getEvmNetworkFee,
  getEvmNetworkId,
  getEvmTransaction,
  getEvmTransactionReceipt,
  getBlock,
  addToken,
  switchOrAddChain,
  isNativeEvmTokenAddress,
  // evm address storage
  getEvmUserAddress,
  storeEvmUserAddress,
  removeEvmUserAddress,
  // evm network storage
  getSelectedNetwork,
  storeSelectedNetwork,
  // bridge type
  getSelectedBridgeType,
  storeSelectedBridgeType,
};
