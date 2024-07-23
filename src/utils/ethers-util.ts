import detectEthereumProvider from '@metamask/detect-provider';
import { decodeAddress } from '@polkadot/util-crypto';
import { FPNumber } from '@sora-substrate/util';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { EthereumProvider as WalletConnectEthereumProvider } from '@walletconnect/ethereum-provider';
import { ethers } from 'ethers';

import { ZeroStringValue } from '@/consts';
import { SmartContracts, SmartContractType } from '@/consts/evm';
import type { NetworkData } from '@/types/bridge';
import { settingsStorage } from '@/utils/storage';

import type { CodecString } from '@sora-substrate/util';
import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';
import type { ChainsProps } from '@walletconnect/ethereum-provider/dist/types/EthereumProvider';

type ethersProvider = ethers.BrowserProvider;

let ethereumProvider!: any;
let ethersInstance: ethersProvider | null = null;

export enum Provider {
  Fearless = 'Fearless',
  Metamask = 'Metamask',
  SubWallet = 'SubWallet',
  TrustWallet = 'TrustWallet',
  WalletConnect = 'WalletConnect',
}

const WALLET_CONNECT_PROJECT_ID = 'feeab08b50e0d407f4eb875d69e162e8';

export enum PROVIDER_ERROR {
  // 1013: Disconnected from chain. Attempting to connect
  DisconnectedFromChain = 1013,
  // 4001: User rejected the request
  UserRejectedRequest = 4001,
  // -32002: Already processing eth_requestAccounts. Please wait
  // -32002: Request of type 'wallet_requestPermissions' already pending for origin. Please wait
  AlreadyProcessing = -32002,
}

export const installExtensionKey = 'provider.messages.installExtension';

const handleErrorCode = (code: number, message?: string): string => {
  if (message) console.error(message);

  switch (code) {
    case PROVIDER_ERROR.AlreadyProcessing:
    case PROVIDER_ERROR.UserRejectedRequest:
      return 'provider.messages.extensionLogin';
    default:
      return 'provider.messages.checkExtension';
  }
};

export const handleRpcProviderError = (error: any): string => {
  let code = 0;
  let message!: string;

  // Metamask, TrustWallet
  if ('info' in error) {
    code = error.info.error.code;
    message = error.info.error.message;
    // SubWallet
  } else if ('error' in error) {
    code = error.error.data;
    message = error.error.message;
  }

  return handleErrorCode(code, message);
};

async function connectEvmProvider(provider: Provider, chains: ChainsProps): Promise<string> {
  switch (provider) {
    case Provider.WalletConnect:
      return await useWalletConnectProvider(chains);
    default:
      return await useExtensionProvider(provider);
  }
}

function clearWalletConnectSession(): void {
  // clear walletconnect localstorage
  for (const key in localStorage) {
    if (key.startsWith('wc@2')) {
      localStorage.removeItem(key);
    }
  }
  localStorage.removeItem('WCM_VERSION');
}

function disconnectEvmProvider(provider?: Nullable<Provider>): void {
  ethereumProvider?.disconnect?.();

  if (provider === Provider.WalletConnect) {
    clearWalletConnectSession();
  }
}

function createWeb3Instance(provider: any) {
  ethereumProvider = provider;
  // 'any' - because ethers throws errors after network switch
  ethersInstance = new ethers.BrowserProvider(ethereumProvider, 'any');
}

async function useExtensionProvider(provider: Provider): Promise<string> {
  const injectedWindow = window as any;

  let ethereumProvider!: any;

  switch (provider) {
    case Provider.Metamask:
      ethereumProvider = await detectEthereumProvider({ mustBeMetaMask: true, timeout: 0 });
      break;
    case Provider.SubWallet:
      ethereumProvider = injectedWindow.SubWallet;
      break;
    case Provider.TrustWallet:
      ethereumProvider = injectedWindow.trustwallet;
      break;
    case Provider.Fearless:
      ethereumProvider = injectedWindow.fearlessWallet;
      break;
    default:
      throw new Error('Unknown provider');
  }

  if (!ethereumProvider) {
    throw new Error(installExtensionKey);
  }

  createWeb3Instance(ethereumProvider);

  return await getAccount();
}

const checkWalletConnectAvailability = async (chainProps: ChainsProps): Promise<void> => {
  try {
    const chainIdCheck = chainProps.chains?.[0] ?? 1;
    const url = `https://rpc.walletconnect.com/v1/?chainId=eip155:${chainIdCheck}&projectId=${WALLET_CONNECT_PROJECT_ID}`;

    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'test', params: [] }),
    });
  } catch {
    throw new Error('provider.messages.notAvailable');
  }
};

async function useWalletConnectProvider(chainProps: ChainsProps): Promise<string> {
  try {
    await checkWalletConnectAvailability(chainProps);

    const ethereumProvider = await WalletConnectEthereumProvider.init({
      projectId: WALLET_CONNECT_PROJECT_ID,
      showQrModal: true,
      ...chainProps,
    });
    // show qr modal
    await ethereumProvider.enable();

    createWeb3Instance(ethereumProvider);

    return await getAccount();
  } catch (error: any) {
    // user cancelled qr modal
    if (error.message === 'Connection request reset. Please try again.') {
      return '';
    }
    throw error;
  }
}

function getEthersInstance(): ethersProvider {
  if (!ethereumProvider) {
    throw new Error('No ethereum provider instance!');
  }
  if (!ethersInstance) {
    throw new Error('No ethers instance!');
  }
  return ethersInstance;
}

async function getSigner(): Promise<ethers.JsonRpcSigner> {
  const ethersInstance = getEthersInstance();
  const signer = await ethersInstance.getSigner();

  return signer;
}

async function getAccount(): Promise<string> {
  const ethersInstance = getEthersInstance();
  await ethersInstance.send('eth_requestAccounts', []);
  const signer = await getSigner();
  return signer.getAddress();
}

async function getContract(contractAddress: string, contractAbi: ethers.InterfaceAbi): Promise<ethers.Contract> {
  const signer = await getSigner();
  const contract = new ethers.Contract(contractAddress, contractAbi, signer);

  return contract;
}

async function getTokenContract(tokenAddress: string): Promise<ethers.Contract> {
  const contract = await getContract(tokenAddress, SmartContracts[SmartContractType.ERC20]);

  return contract;
}

/**
 * Get account native token balance (ETH for Ethereum)
 * @param accountAddress address of account
 */
async function getAccountBalance(accountAddress: string): Promise<CodecString> {
  try {
    const ethersInstance = getEthersInstance();
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
      console.error(tokenAddress, error);
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

async function getAllowance(
  accountAddress: string,
  contractAddress: string,
  assetAddress: string
): Promise<string | null> {
  if (!(accountAddress && assetAddress && contractAddress && !isNativeEvmTokenAddress(assetAddress))) return null;

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

async function watchEthereum(cb: {
  onAccountChange: (addressList: string[]) => void;
  onNetworkChange: (networkId: string) => void;
  onDisconnect: (error: any) => void;
}): Promise<FnWithoutArgs> {
  const provider = ethereumProvider;

  if (provider) {
    provider.on('accountsChanged', cb.onAccountChange);
    provider.on('chainChanged', cb.onNetworkChange);
    provider.on('disconnect', cb.onDisconnect);
  }

  return function disconnect() {
    if (provider) {
      provider.off('accountsChanged', cb.onAccountChange);
      provider.off('chainChanged', cb.onNetworkChange);
      provider.off('disconnect', cb.onDisconnect);
    }
  };
}

async function addToken(address: string, symbol: string, decimals: number, image?: string): Promise<void> {
  try {
    await ethereumProvider.request({
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
  const chainId = ethers.toQuantity(network.evmId ?? network.id);

  try {
    await ethereumProvider.request({
      // https://eips.ethereum.org/EIPS/eip-3326
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
        await ethereumProvider.request({
          // https://eips.ethereum.org/EIPS/eip-3085
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
  const ethersInstance = getEthersInstance();
  const network = await ethersInstance.getNetwork();

  return Number(network.chainId);
}

async function getEvmGasPrice(): Promise<bigint> {
  const ethersInstance = getEthersInstance();
  const priorityFee = BigInt('1500000000'); // 1.5 GWEI
  const baseFeeHex = await ethersInstance.send('eth_gasPrice', []); // hex
  const baseFee = BigInt(parseInt(baseFeeHex, 16));
  const baseFeeMarket = (baseFee * BigInt(1355)) / BigInt(1000); // market rate like in Metamask
  const gasPrice = baseFeeMarket + priorityFee;

  return gasPrice;
}

function calcEvmFee(gasPrice: bigint, gasAmount: bigint) {
  return (gasPrice * gasAmount).toString();
}

async function getEvmTransaction(hash: string): Promise<ethers.TransactionResponse | null> {
  const ethersInstance = getEthersInstance();
  const tx = await ethersInstance.getTransaction(hash);

  return tx;
}

async function getEvmTransactionReceipt(hash: string): Promise<ethers.TransactionReceipt | null> {
  const ethersInstance = getEthersInstance();
  const tx = await ethersInstance.getTransactionReceipt(hash);

  return tx;
}

async function getBlock(number: number): Promise<ethers.Block | null> {
  try {
    const ethersInstance = getEthersInstance();
    const block = await ethersInstance.getBlock(Number(number));

    return block;
  } catch {
    return null;
  }
}

async function getBlockNumber(): Promise<number> {
  try {
    const ethersInstance = getEthersInstance();
    const blockNumber = await ethersInstance.getBlockNumber();

    return blockNumber;
  } catch {
    return 0;
  }
}

function accountAddressToHex(address: string): string {
  const publicKey = decodeAddress(address);
  return ethers.hexlify(publicKey);
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
  connectEvmProvider,
  disconnectEvmProvider,
  getSigner,
  getAccount,
  getAccountBalance,
  getAccountAssetBalance,
  getContract,
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
  getEvmGasPrice,
  getEvmNetworkId,
  getEvmTransaction,
  getEvmTransactionReceipt,
  getBlock,
  getBlockNumber,
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
