import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import WalletConnectProvider from '@walletconnect/web3-provider'
import detectEthereumProvider from '@metamask/detect-provider'
import { decodeAddress } from '@polkadot/util-crypto'

import axios from '@/api'
import storage from './storage'

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

let provider: any = null
let web3Istance: any = null

export enum KnownBridgeAsset {
  VAL = 'VAL',
  XOR = 'XOR',
  Other = 'OTHER'
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

interface ExecutionInfo {
  web3: Web3;
  contractInfo: InfoContract;
  contractAddress: string;
  method: string;
  methodArgs: string[];
  accountPrivate: string;
  accountAddress: string;
}

interface InfoContract {
  abi: AbiItem;
  code: string;
}

interface JsonContract {
  abi: AbiItem;
  evm: {
    bytecode: {
      object: string;
    };
  };
}

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
    throw new Error('providers.metamask')
  }
  const web3Instance = await getInstance()
  const accounts = await web3Instance.eth.requestAccounts()
  return accounts.length ? accounts[0] : ''
}

async function onConnectWallet (url = 'https://cloudflare-eth.com'): Promise<string> {
  provider = new WalletConnectProvider({
    rpc: { 1: url }
  })
  await provider.enable()

  const account = await getAccount()

  return account
}

async function getAccount (): Promise<string> {
  try {
    const web3Instance = await getInstance()
    const accounts = await web3Instance.eth.getAccounts()

    return accounts.length ? accounts[0] : ''
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

async function getInstance (): Promise<Web3> {
  if (!provider) {
    provider = await detectEthereumProvider() as any
  }
  if (!provider) {
    throw new Error('No Web3 instance!')
  }
  if (!web3Istance) {
    web3Istance = new Web3(provider)
  }
  return web3Istance
}

async function watchEthereum (cb: {
  onAccountChange: Function;
  onNetworkChange: Function;
  onDisconnect: Function;
}): Promise<Function> {
  await getInstance()

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

function storeEthUserAddress (address: string): void {
  storage.set('ethAddress', address)
}

function getEthUserAddress (): string {
  return storage.get('ethAddress') || ''
}

function removeEthUserAddress (): void {
  storage.remove('ethAddress')
}

function storeNetworkType (network: string): void {
  storage.set('networkType', EvmNetworkTypeName[network] || network)
}

function getNetworkTypeFromStorage (): string {
  return storage.get('networkType') || ''
}

function removeNetworkType (): void {
  storage.remove('networkType')
}

async function getNetworkType (): Promise<string> {
  const networkType = getNetworkTypeFromStorage()
  if (!networkType || networkType === 'undefined') {
    const web3 = await getInstance()
    return await web3.eth.net.getNetworkType()
  }
  return networkType
}

async function readSmartContract (contract: Contract, name: string): Promise<JsonContract | undefined> {
  try {
    const { data } = await axios.get(`/abi/${contract}/${name}`)
    return data
  } catch (error) {
    console.error(error)
  }
}

function getInfoFromContract (contract: JsonContract): InfoContract {
  return {
    abi: contract.abi,
    code: `0x${contract.evm.bytecode.object}`
  }
}

async function accountAddressToHex (address: string): Promise<string> {
  const web3 = await getInstance()

  return web3.utils.bytesToHex(Array.from(decodeAddress(address).values()))
}

async function executeContractMethod ({
  contractInfo,
  contractAddress,
  method,
  methodArgs,
  accountAddress
}: ExecutionInfo) {
  const web3 = await getInstance()
  const createWeb3Contract = ({ abi }) => {
    return new web3.eth.Contract(abi)
  }

  const contract = createWeb3Contract(contractInfo)

  contract.options.address = contractAddress

  const contractMethod = contract.methods[method](...methodArgs)
  const gas = await contractMethod.estimateGas()

  return contractMethod
    .send({
      gas,
      from: accountAddress
    })
}

export default {
  onConnect,
  getAccount,
  checkAccountIsConnected,
  storeEthUserAddress,
  getEthUserAddress,
  storeNetworkType,
  getNetworkType,
  getNetworkTypeFromStorage,
  removeNetworkType,
  getInstance,
  removeEthUserAddress,
  watchEthereum,
  readSmartContract,
  getInfoFromContract,
  executeContractMethod,
  accountAddressToHex
}
