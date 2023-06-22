import detectEthereumProvider from '@metamask/detect-provider';
import { decodeAddress } from '@polkadot/util-crypto';
import { FPNumber } from '@sora-substrate/util';
import { XOR, VAL, PSWAP, ETH } from '@sora-substrate/util/build/assets/consts';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { ethers } from 'ethers';

import { ZeroStringValue } from '@/consts';
import { KnownEthBridgeAsset, SmartContracts, SmartContractType } from '@/consts/evm';
import type { NetworkData } from '@/types/bridge';
import { settingsStorage } from '@/utils/storage';

import type { CodecString } from '@sora-substrate/util';
import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';

type ethersProvider = ethers.providers.Web3Provider;

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
    [KnownEthBridgeAsset.Other]: gasLimit.approve + gasLimit.sendERC20ToSidechain,
  },
  // SORA -> ETH
  {
    [XOR.address]: gasLimit.mintTokensByPeers,
    [VAL.address]: gasLimit.mintTokensByPeers,
    [PSWAP.address]: gasLimit.receiveBySidechainAssetId,
    [ETH.address]: gasLimit.receiveByEthereumAssetAddress,
    [KnownEthBridgeAsset.Other]: gasLimit.receiveByEthereumAssetAddress,
  },
];

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

async function getAccountAssetBalance(
  accountAddress: string,
  assetAddress: string
): Promise<{ value: CodecString; decimals: number }> {
  let value = ZeroStringValue;
  let decimals = FPNumber.DEFAULT_PRECISION;

  if (accountAddress && assetAddress) {
    try {
      const ethersInstance = await getEthersInstance();
      const isNativeEvmToken = isNativeEvmTokenAddress(assetAddress);
      if (isNativeEvmToken) {
        value = await getAccountBalance(accountAddress);
      } else {
        const tokenInstance = new ethers.Contract(
          assetAddress,
          SmartContracts[SmartContractType.ERC20].abi,
          ethersInstance.getSigner()
        );
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
  const tokenInstance = new ethers.Contract(
    assetAddress,
    SmartContracts[SmartContractType.ERC20].abi,
    ethersInstance.getSigner()
  );
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
    ethersInstance = new ethers.providers.Web3Provider(provider, 'any');
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
  const chainId = ethers.utils.hexValue(network.id);

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

  return network.chainId;
}

/**
 * Fetch EVM Network fee for passed asset address
 */
async function getEvmNetworkFee(address: string, isSoraToEvm: boolean): Promise<CodecString> {
  try {
    const ethersInstance = await getEthersInstance();
    const gasPrice = (await ethersInstance.getGasPrice()).toNumber();
    const gasLimits = EthereumGasLimits[+isSoraToEvm];
    const key = address in gasLimits ? address : KnownEthBridgeAsset.Other;
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

async function accountAddressToHex(address: string): Promise<string> {
  return ethers.utils.hexlify(Array.from(decodeAddress(address).values()));
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
  getAccount,
  getAccountBalance,
  getAccountAssetBalance,
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
