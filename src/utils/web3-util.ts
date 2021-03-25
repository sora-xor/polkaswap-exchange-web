import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import WalletConnectProvider from '@walletconnect/web3-provider'
import detectEthereumProvider from '@metamask/detect-provider'
import { decodeAddress } from '@polkadot/util-crypto'

import axios from '@/api'
import storage from './storage'

export const ABI = {
  balance: [
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

export enum EthNetwork {
  Mainnet = 'main',
  Ropsten = 'ropsten',
  Kovan = 'kovan',
  Rinkeby = 'rinkeby',
  Goerli = 'goerli'
}

export const EthNetworkName = {
  '0x1': EthNetwork.Mainnet,
  '0x3': EthNetwork.Ropsten,
  '0x2a': EthNetwork.Kovan,
  '0x4': EthNetwork.Rinkeby,
  '0x5': EthNetwork.Goerli
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
  const web3Instance = new Web3(provider)
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
    let accounts = await web3Instance.eth.getAccounts()

    if (!Array.isArray(accounts) || !accounts.length) {
      accounts = await web3Instance.eth.requestAccounts()
    }

    return accounts.length ? accounts[0] : ''
  } catch (error) {
    console.error(error)
    return ''
  }
}

async function getInstance (): Promise<Web3> {
  if (!provider) {
    provider = await detectEthereumProvider() as any
  }
  if (!provider) {
    throw new Error('No Web3 instance!')
  }
  return new Web3(provider)
}

async function watchEthereum (cb: {
  onAccountChange: Function;
  onNetworkChange: Function;
  onDisconnect: Function;
}) {
  const ethereum = (window as any).ethereum

  if (ethereum) {
    ethereum.on('accountsChanged', cb.onAccountChange)
    ethereum.on('chainChanged', cb.onNetworkChange)
  }

  await getInstance()

  if (provider) {
    provider.on('disconnect', cb.onDisconnect)
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

function storeEthNetwork (network: string): void {
  const networkName = EthNetworkName[network]
  storage.set('ethNetwork', networkName || network)
}

function getEthNetworkFromStorage (): string {
  return storage.get('ethNetwork') || ''
}

async function getEthNetwork (): Promise<string> {
  const network = getEthNetworkFromStorage()
  if (!network) {
    const web3 = await getInstance()
    return await web3.eth.net.getNetworkType()
  }
  return network
}

function removeEthNetwork (): void {
  storage.remove('ethNetwork')
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
  storeEthUserAddress,
  getEthUserAddress,
  storeEthNetwork,
  getEthNetwork,
  getEthNetworkFromStorage,
  removeEthNetwork,
  getInstance,
  removeEthUserAddress,
  watchEthereum,
  readSmartContract,
  getInfoFromContract,
  executeContractMethod,
  accountAddressToHex
}
