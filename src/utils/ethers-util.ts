import { ethers } from 'ethers'
import WalletConnectProvider from '@walletconnect/web3-provider'
import detectEthereumProvider from '@metamask/detect-provider'
import { decodeAddress } from '@polkadot/util-crypto'
import { BridgeNetworks } from '@sora-substrate/util'

import axios from '../api'
import storage from './storage'

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
      inputs: [{
        internalType: 'address',
        name: 'who',
        type: 'address'
      }],
      name: 'balanceOf',
      outputs: [{
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    // decimals
    {
      constant: true,
      inputs: [],
      name: 'decimals',
      outputs: [{ name: '', type: 'uint8' }],
      type: 'function'
    }
  ],
  allowance: [
    {
      constant: true,
      inputs: [
        {
          internalType: 'address',
          name: 'owner',
          type: 'address'
        },
        {
          internalType: 'address',
          name: 'spender',
          type: 'address'
        }
      ],
      name: 'allowance',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    }
  ]
}

type ethersProvider = ethers.providers.Web3Provider

let provider: any = null
let ethersInstance: ethersProvider | null = null

export enum EvmNetwork {
  Ethereum = 'ethereum',
  Energy = 'energy'
}

export enum EvmNetworkType {
  Mainnet = 'main',
  Ropsten = 'ropsten',
  Kovan = 'kovan',
  Rinkeby = 'rinkeby',
  Goerli = 'goerli',
  Private = 'private',
  EWC = 'EWC'
}

export const EvmNetworkTypeName = {
  '0x1': EvmNetworkType.Mainnet,
  '0x3': EvmNetworkType.Ropsten,
  '0x2a': EvmNetworkType.Kovan,
  '0x4': EvmNetworkType.Rinkeby,
  '0x5': EvmNetworkType.Goerli,
  '0x12047': EvmNetworkType.Private
}

export interface SubNetwork {
  name: EvmNetwork;
  id: BridgeNetworks;
  symbol: string;
  currency: string;
  defaultType: EvmNetworkType;
  CONTRACTS: {
    XOR: { MASTER: string };
    VAL: { MASTER: string };
    OTHER: { MASTER: string };
  };
}

export enum KnownBridgeAsset {
  VAL = 'VAL',
  XOR = 'XOR',
  Other = 'OTHER'
}

export enum ContractNetwork {
  Ethereum = 'ethereum',
  Other = 'other'
}

export enum Contract {
  Internal = 'internal',
  Other = 'other'
}

export enum OtherContractType {
  Bridge = 'BRIDGE',
  ERC20 = 'ERC20'
}

export enum Provider {
  Metamask,
  WalletConnect
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

async function onConnect (options: ConnectOptions): Promise<string> {
  if (options.provider === Provider.Metamask) {
    return onConnectMetamask()
  } else {
    return onConnectWallet(options.url)
  }
}

async function onConnectMetamask (): Promise<string> {
  provider = await detectEthereumProvider() as any
  if (!provider) {
    throw new Error('provider.messages.installExtension')
  }
  return getAccount()
}

async function onConnectWallet (url = 'https://cloudflare-eth.com'): Promise<string> {
  provider = new WalletConnectProvider({
    rpc: { 1: url }
  })
  await provider.enable()
  return getAccount()
}

async function getAccount (): Promise<string> {
  try {
    const ethersInstance = await getEthersInstance()
    await ethersInstance.send('eth_requestAccounts', [])
    const account = ethersInstance.getSigner()
    return account.getAddress()
  } catch (error) {
    console.error(error)
    return ''
  }
}

// TODO: remove this check, when MetaMask issue will be resolved
// https://github.com/MetaMask/metamask-extension/issues/10368
async function checkAccountIsConnected (address: string): Promise<boolean> {
  if (!address) return false

  const currentAccount = await getAccount()

  // TODO: check why sometimes currentAccount !== address with the same account
  return !!currentAccount && currentAccount.toLowerCase() === address.toLowerCase()
}

async function getEthersInstance (): Promise<ethersProvider> {
  if (!provider) {
    provider = await detectEthereumProvider() as any
  }
  if (!provider) {
    throw new Error('No ethereum provider instance!')
  }
  if (!ethersInstance) {
    ethersInstance = new ethers.providers.Web3Provider(provider)
  }
  return ethersInstance
}

async function watchEthereum (cb: {
  onAccountChange: Function;
  onNetworkChange: Function;
  onDisconnect: Function;
}): Promise<Function> {
  await getEthersInstance()

  const ethereum = (window as any).ethereum

  if (ethereum) {
    ethereum.on('accountsChanged', cb.onAccountChange)
    ethereum.on('chainChanged', cb.onNetworkChange)
    ethereum.on('disconnect', cb.onDisconnect)
  }

  return function disconnect () {
    if (ethereum) {
      ethereum.removeListener('accountsChanged', cb.onAccountChange)
      ethereum.removeListener('chainChanged', cb.onNetworkChange)
      ethereum.removeListener('disconnect', cb.onDisconnect)
    }
  }
}

function storeEvmUserAddress (address: string): void {
  storage.set('evmAddress', address)
}

function getEvmUserAddress (): string {
  return storage.get('evmAddress') || ''
}

function removeEvmUserAddress (): void {
  storage.remove('evmAddress')
}

function storeEvmNetworkType (network: string): void {
  storage.set('evmNetworkType', EvmNetworkTypeName[network] || network)
}

function getEvmNetworkTypeFromStorage (): string {
  return storage.get('evmNetworkType') || ''
}

function removeEvmNetworkType (): void {
  storage.remove('evmNetworkType')
}

async function getEvmNetworkType (): Promise<string> {
  const networkType = getEvmNetworkTypeFromStorage()
  if (!networkType || networkType === 'undefined') {
    const ethersInstance = await getEthersInstance()
    const network = await ethersInstance.getNetwork()
    return network.name
  }
  return networkType
}

async function readSmartContract (network: ContractNetwork, name: string): Promise<JsonContract | undefined> {
  try {
    const { data } = await axios.get(`/abi/${network}/${name}`)
    return data
  } catch (error) {
    console.error(error)
  }
}

async function accountAddressToHex (address: string): Promise<string> {
  return ethers.utils.hexlify(
    Array.from(decodeAddress(address).values())
  )
}

export default {
  onConnect,
  getAccount,
  checkAccountIsConnected,
  storeEvmUserAddress,
  getEvmUserAddress,
  storeEvmNetworkType,
  getEvmNetworkType,
  getEvmNetworkTypeFromStorage,
  removeEvmNetworkType,
  getEthersInstance,
  removeEvmUserAddress,
  watchEthereum,
  readSmartContract,
  accountAddressToHex
}
