import { ethers } from 'ethers';
import WalletConnectProvider from '@walletconnect/web3-provider';
import detectEthereumProvider from '@metamask/detect-provider';
import { decodeAddress } from '@polkadot/util-crypto';
import { FPNumber } from '@sora-substrate/util';
import { XOR, VAL, PSWAP, ETH } from '@sora-substrate/util/build/assets/consts';

import type { BridgeNetworks, CodecString } from '@sora-substrate/util';

import axiosInstance from '@/api';
import { ZeroStringValue } from '@/consts';

type AbiType = 'function' | 'constructor' | 'event' | 'fallback';
type StateMutabilityType = 'pure' | 'view' | 'nonpayable' | 'payable';

interface AbiInput {
  name: string;
  type: string;
  indexed?: boolean;
  components?: AbiInput[];
  internalType?: string;
}

interface AbiOutput {
  name: string;
  type: string;
  components?: AbiOutput[];
  internalType?: string;
}

interface AbiItem {
  anonymous?: boolean;
  constant?: boolean;
  inputs?: AbiInput[];
  name?: string;
  outputs?: AbiOutput[];
  payable?: boolean;
  stateMutability?: StateMutabilityType;
  type: AbiType;
  gas?: number;
}

export const ABI = {
  balance: [
    // balanceOf
    {
      constant: true,
      inputs: [
        {
          internalType: 'address',
          name: 'who',
          type: 'address',
        },
      ],
      name: 'balanceOf',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    // decimals
    {
      constant: true,
      inputs: [],
      name: 'decimals',
      outputs: [{ name: '', type: 'uint8' }],
      type: 'function',
    },
  ],
  allowance: [
    {
      constant: true,
      inputs: [
        {
          internalType: 'address',
          name: 'owner',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'spender',
          type: 'address',
        },
      ],
      name: 'allowance',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
  ],
};

type ethersProvider = ethers.providers.Web3Provider;

let provider: any = null;
let ethersInstance: ethersProvider | null = null;

export enum EvmNetwork {
  Ethereum = 'ethereum',
  Energy = 'energy',
}

export enum EvmNetworkType {
  Mainnet = 'main',
  Ropsten = 'ropsten',
  Kovan = 'kovan',
  Rinkeby = 'rinkeby',
  Goerli = 'goerli',
  Private = 'private',
  EWC = 'EWC',
  Mordor = 'classicMordor', // Ethereum Classic Mordor
}

export interface SubNetwork {
  id: BridgeNetworks;
  defaultType: EvmNetworkType;
  name: EvmNetwork;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  CONTRACTS: {
    XOR: { MASTER: string };
    VAL: { MASTER: string };
    OTHER: { MASTER: string };
  };
}

export enum KnownBridgeAsset {
  VAL = 'VAL',
  XOR = 'XOR',
  Other = 'OTHER',
}

export enum ContractNetwork {
  Ethereum = 'ethereum',
  Other = 'other',
}

export enum Contract {
  Internal = 'internal',
  Other = 'other',
}

export enum OtherContractType {
  Bridge = 'BRIDGE',
  ERC20 = 'ERC20',
}

export enum Provider {
  Metamask,
  WalletConnect,
}

interface ConnectOptions {
  provider: Provider;
  url?: string;
}

interface JsonContract {
  abi: AbiItem;
  evm: {
    bytecode: {
      object: string;
    };
  };
}

// TODO [EVM]
const gasLimit = {
  approve: 70000,
  sendERC20ToSidechain: 86000,
  sendEthToSidechain: 50000,
  mintTokensByPeers: 255000,
  receiveByEthereumAssetAddress: 250000,
  receiveBySidechainAssetId: 255000,
};

/**
 * It's in gwei.
 * Zero index means ETH -> SORA
 * First index means SORA -> ETH
 */
// TODO [EVM]
const EthereumGasLimits = [
  // ETH -> SORA
  {
    [XOR.address]: gasLimit.approve + gasLimit.sendERC20ToSidechain,
    [VAL.address]: gasLimit.approve + gasLimit.sendERC20ToSidechain,
    [PSWAP.address]: gasLimit.approve + gasLimit.sendERC20ToSidechain,
    [ETH.address]: gasLimit.sendEthToSidechain,
    [KnownBridgeAsset.Other]: gasLimit.approve + gasLimit.sendERC20ToSidechain,
  },
  // SORA -> ETH
  {
    [XOR.address]: gasLimit.mintTokensByPeers,
    [VAL.address]: gasLimit.mintTokensByPeers,
    [PSWAP.address]: gasLimit.receiveBySidechainAssetId,
    [ETH.address]: gasLimit.receiveByEthereumAssetAddress,
    [KnownBridgeAsset.Other]: gasLimit.receiveByEthereumAssetAddress,
  },
];

export const EvmNetworkTypeName = {
  '0x1': EvmNetworkType.Mainnet,
  '0x3': EvmNetworkType.Ropsten,
  '0x2a': EvmNetworkType.Kovan,
  '0x4': EvmNetworkType.Rinkeby,
  '0x5': EvmNetworkType.Goerli,
  '0x3f': EvmNetworkType.Mordor, // Ethereum Classic Mordor
  '0x12047': EvmNetworkType.Private,
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

async function getAccount(): Promise<string> {
  const ethersInstance = await getEthersInstance();
  await ethersInstance.send('eth_requestAccounts', []);
  const account = ethersInstance.getSigner();
  return account.getAddress();
}

async function getAccountBalance(accountAddress: string): Promise<CodecString> {
  try {
    const ethersInstance = await getEthersInstance();
    const wei = await ethersInstance.getBalance(accountAddress);
    const balance = ethers.utils.formatEther(wei.toString());
    return new FPNumber(balance).toCodecString();
  } catch (error) {
    console.error(error);
    return ZeroStringValue;
  }
}

// TODO [EVM]: check FirstTestToken
async function getAccountAssetBalance(
  accountAddress: string,
  assetAddress: string
): Promise<{ value: CodecString; decimals: number }> {
  let value = ZeroStringValue;
  let decimals = 18;

  if (accountAddress && assetAddress) {
    try {
      const ethersInstance = await getEthersInstance();
      const isNativeEvmToken = isNativeEvmTokenAddress(assetAddress);
      if (isNativeEvmToken) {
        value = await getAccountBalance(accountAddress);
      } else {
        const tokenInstance = new ethers.Contract(assetAddress, ABI.balance, ethersInstance.getSigner());
        const methodArgs = [accountAddress];
        const balance = await tokenInstance.balanceOf(...methodArgs);
        decimals = await tokenInstance.decimals();
        value = FPNumber.fromCodecValue(balance._hex, +decimals).toCodecString();
      }
    } catch (error) {
      console.error(assetAddress);
      console.error(error);
    }
  }

  return { value, decimals };
}

async function getAllowance(accountAddress: string, contractAddress: string, assetAddress: string): Promise<string> {
  const ethersInstance = await getEthersInstance();
  const tokenInstance = new ethers.Contract(assetAddress, ABI.allowance, ethersInstance.getSigner());
  const methodArgs = [accountAddress, contractAddress];
  const allowance = await tokenInstance.allowance(...methodArgs);

  return FPNumber.fromCodecValue(allowance._hex).toString();
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
  return a.toLowerCase() === b.toLowerCase();
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
    ethersInstance = new ethers.providers.Web3Provider(provider, 'any');
  }
  return ethersInstance;
}

async function watchEthereum(cb: {
  onAccountChange: (addressList: string[]) => void;
  onNetworkChange: (networkId: string) => void;
  onDisconnect: VoidFunction;
}): Promise<VoidFunction> {
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

async function addChain(network: SubNetwork): Promise<void> {
  const ethereum = (window as any).ethereum;
  const chainId = ethers.utils.hexValue(network.id);

  try {
    ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId,
          rpcUrls: network.rpcUrls,
          chainName: network.name,
          nativeCurrency: network.nativeCurrency,
          blockExplorerUrls: network.blockExplorerUrls,
        },
      ],
    });
  } catch (error) {
    console.error(error);
  }
}

async function getEvmNetworkType(): Promise<string> {
  const ethersInstance = await getEthersInstance();
  const network = await ethersInstance.getNetwork();
  const networkType = ethers.utils.hexValue(network.chainId);

  return EvmNetworkTypeName[networkType] ?? network.name;
}

/**
 * Fetch EVM Network fee for passed asset address
 */
async function fetchEvmNetworkFee(address: string, isSoraToEvm: boolean): Promise<CodecString> {
  try {
    const ethersInstance = await getEthersInstance();
    const gasPrice = (await ethersInstance.getGasPrice()).toNumber();
    const gasLimits = EthereumGasLimits[+isSoraToEvm];
    const key = address in gasLimits ? address : KnownBridgeAsset.Other;
    const gasLimit = gasLimits[key];
    const fee = calcEvmFee(gasPrice, gasLimit);

    return fee;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

function calcEvmFee(gasPrice: number, gasAmount: number) {
  return FPNumber.fromCodecValue(gasPrice).mul(new FPNumber(gasAmount)).toCodecString();
}

async function getEvmTransaction(hash: string): Promise<ethers.providers.TransactionResponse> {
  const ethersInstance = await getEthersInstance();
  const tx = await ethersInstance.getTransaction(hash);

  return tx;
}

async function getEvmTransactionReceipt(hash: string): Promise<ethers.providers.TransactionReceipt> {
  const ethersInstance = await getEthersInstance();
  const tx = await ethersInstance.getTransactionReceipt(hash);

  return tx;
}

async function getBlock(number: number): Promise<ethers.providers.Block> {
  const ethersInstance = await getEthersInstance();
  const block = await ethersInstance.getBlock(number);

  return block;
}

async function readSmartContract(network: ContractNetwork, name: string): Promise<JsonContract | undefined> {
  try {
    const { data } = await axiosInstance.get(`/abi/${network}/${name}`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

async function accountAddressToHex(address: string): Promise<string> {
  return ethers.utils.hexlify(Array.from(decodeAddress(address).values()));
}

function isNativeEvmTokenAddress(address: string): boolean {
  const numberString = address.replace(/^0x/, '');
  const number = parseInt(numberString, 16);

  return number === 0;
}

export default {
  onConnect,
  getAccount,
  getAccountBalance,
  getAccountAssetBalance,
  getAllowance,
  checkAccountIsConnected,
  getEvmNetworkType,
  getEthersInstance,
  watchEthereum,
  readSmartContract,
  accountAddressToHex,
  addressesAreEqual,
  fetchEvmNetworkFee,
  calcEvmFee,
  getEvmTransaction,
  getEvmTransactionReceipt,
  getBlock,
  addToken,
  addChain,
  isNativeEvmTokenAddress,
};
