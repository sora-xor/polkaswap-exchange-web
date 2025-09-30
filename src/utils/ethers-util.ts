import { decodeAddress } from '@polkadot/util-crypto';
import { FPNumber } from '@sora-substrate/sdk';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { ethers } from 'ethers';

import { ZeroStringValue } from '@/consts';
import { SmartContracts, SmartContractType } from '@/consts/evm';
import type { NetworkData } from '@/types/bridge';
import type { AppEIPProvider } from '@/types/evm/provider';
import { PredefinedProvider } from '@/utils/connection/evm/providers';
import { settingsStorage } from '@/utils/storage';

import type { CodecString } from '@sora-substrate/sdk';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
import type { ChainsProps } from '@walletconnect/ethereum-provider/dist/types/EthereumProvider';

type ethersProvider = ethers.BrowserProvider;

let ethereumProvider!: any;
let ethersInstance: ethersProvider | null = null;

// Cache for ERC20 contract instances by token address (lowercased)
const tokenContractCache = new Map<string, ethers.Contract>();
// Cache for token decimals by token address (lowercased)
const tokenDecimalsCache = new Map<string, number>();
// TTL cache for gas price to reduce eth_gasPrice RPC spam
let gasPriceCache: { value: bigint; ts: number } | null = null;
const GAS_PRICE_TTL_MS = 5000; // 5 seconds

type ContractFactory = (
  contractAddress: string,
  contractAbi: ethers.InterfaceAbi,
  signer: ethers.JsonRpcSigner
) => ethers.Contract;

let contractFactory: ContractFactory = (contractAddress, contractAbi, signer) =>
  new ethers.Contract(contractAddress, contractAbi, signer);

export enum PROVIDER_ERROR {
  // 1013: Disconnected from chain. Attempting to connect
  DisconnectedFromChain = 1013,
  // 4001: User rejected the request
  UserRejectedRequest = 4001,
  // 4200: Unsupported method
  UnsupportedMethod = 4200,
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

const getErrorCodeMessage = (error: any) => {
  let code = error.code;
  let message = error.message;

  // Metamask, TrustWallet
  if ('info' in error) {
    code = error.info.error.code;
    message = error.info.error.message;
    // SubWallet
  } else if ('data' in error) {
    code = error.data;
  }

  return { code, message };
};

export const handleRpcProviderError = (error: any): string => {
  const { code, message } = getErrorCodeMessage(error);

  return handleErrorCode(code, message);
};

async function connectEvmProvider(appEvmProvider: AppEIPProvider, chainsProps: ChainsProps): Promise<string> {
  try {
    const ethereumProvider = await appEvmProvider.getProvider(chainsProps);

    if (!ethereumProvider) throw new Error(installExtensionKey);

    await ethereumProvider.connect?.();

    createWeb3Instance(ethereumProvider);

    switch (appEvmProvider.uuid) {
      case PredefinedProvider.WalletConnect: {
        return await getAccount();
      }
      default: {
        const accounts = await requestWalletAccounts();
        return accounts[0];
      }
    }
  } catch (error: any) {
    // [WalletConnect] user rejected request
    if (error.code === PROVIDER_ERROR.UserRejectedRequest) {
      return '';
    }
    // [WalletConnect] user cancelled qr modal
    if (error.message === 'Connection request reset. Please try again.') {
      return '';
    }
    throw error;
  }
}

function disconnectEvmProvider(appEvmProvider?: Nullable<AppEIPProvider>): void {
  // don't wait promise execution, that's for wallets lifecycle
  revokeWalletAccounts();
  ethereumProvider?.disconnect?.();
}

function createWeb3Instance(provider: any) {
  ethereumProvider = provider;
  // 'any' - because ethers throws errors after network switch
  ethersInstance = new ethers.BrowserProvider(ethereumProvider, 'any');
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

/**
 * Test helper: allow unit tests to inject a mocked provider without going through browser flows.
 * Should not be used in production code.
 */
export function __setTestEthersProvider(provider: ethersProvider | null, rawProvider: any = provider): void {
  ethereumProvider = rawProvider;
  ethersInstance = provider;
}

export function __resetTestEthersProvider(): void {
  ethereumProvider = undefined as any;
  ethersInstance = null;
}

export function __clearTokenContractCache(): void {
  tokenContractCache.clear();
}

export function __clearTokenDecimalsCache(): void {
  tokenDecimalsCache.clear();
  gasPriceCache = null;
}

export function __setContractFactory(factory: ContractFactory): void {
  contractFactory = factory;
}

export function __resetContractFactory(): void {
  contractFactory = (contractAddress, contractAbi, signer) => new ethers.Contract(contractAddress, contractAbi, signer);
}

async function getSigner(): Promise<ethers.JsonRpcSigner> {
  const ethersInstance = getEthersInstance();
  const signer = await ethersInstance.getSigner();

  return signer;
}

async function getAccount(): Promise<string> {
  const signer = await getSigner();
  const address = signer.getAddress();

  return address;
}

async function getContract(contractAddress: string, contractAbi: ethers.InterfaceAbi): Promise<ethers.Contract> {
  const signer = await getSigner();
  const contract = contractFactory(contractAddress, contractAbi, signer);

  return contract;
}

/**
 * Return memoized ERC20 contract instance for the given token address.
 */
async function getTokenContract(tokenAddress: string): Promise<ethers.Contract> {
  const key = tokenAddress?.toLowerCase?.() ?? tokenAddress;
  const cached = tokenContractCache.get(key);
  if (cached) return cached;

  const contract = await getContract(tokenAddress, SmartContracts[SmartContractType.ERC20]);
  tokenContractCache.set(key, contract);
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

/**
 * Get token decimals with memoization. Native token defaults to DEFAULT_PRECISION.
 */
async function getTokenDecimals(tokenAddress: string): Promise<number> {
  if (!isNativeEvmTokenAddress(tokenAddress)) {
    const key = tokenAddress?.toLowerCase?.() ?? tokenAddress;
    const cached = tokenDecimalsCache.get(key);
    if (typeof cached === 'number') return cached;
    try {
      const contract = await getTokenContract(tokenAddress);
      const result: bigint = await contract.decimals();
      const value = Number(result);
      tokenDecimalsCache.set(key, value);
      return value;
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
    const enable = ['on', 'addListener'].find((prop) => prop in provider) as string;

    provider[enable]('accountsChanged', cb.onAccountChange);
    provider[enable]('chainChanged', cb.onNetworkChange);
    provider[enable]('disconnect', cb.onDisconnect);
  }

  return function disconnect() {
    if (provider) {
      const disable = ['off', 'removeListener'].find((prop) => prop in provider) as string;

      provider[disable]('accountsChanged', cb.onAccountChange);
      provider[disable]('chainChanged', cb.onNetworkChange);
      provider[disable]('disconnect', cb.onDisconnect);
    }
  };
}

async function requestWalletAccounts(): Promise<string[]> {
  try {
    const permissions = await ethereumProvider.request({
      method: 'wallet_requestPermissions',
      params: [
        {
          eth_accounts: {},
        },
      ],
    });

    const permission = permissions.find((persmission) => persmission.parentCapability === 'eth_accounts');

    if (!permission) throw new Error('Permission not found');

    const caveat = permission.caveats?.find((caveat) => Array.isArray(caveat.value));

    if (!caveat) throw new Error('Accounts not found');

    return caveat.value as string[];
  } catch (error: any) {
    const { code } = getErrorCodeMessage(error);

    if (
      [
        PROVIDER_ERROR.UserRejectedRequest, // user reject request
        PROVIDER_ERROR.UnsupportedMethod, // trust wallet on method reject
      ].includes(code)
    )
      return [];

    const accounts = await ethereumProvider.request({
      method: 'eth_requestAccounts',
    });

    return accounts as string[];
  }
}

async function revokeWalletAccounts(): Promise<void> {
  try {
    await ethereumProvider.request({
      method: 'wallet_revokePermissions',
      params: [
        {
          eth_accounts: {},
        },
      ],
    });
  } catch {}
}

async function addToken(address: string, symbol: string, decimals: number, image?: string): Promise<void> {
  try {
    let logo = image;
    try {
      const { toDwebLink } = await import('@/utils/ipfs');
      logo = toDwebLink(image) ?? image;
    } catch {}
    await ethereumProvider.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20', // Initially only supports ERC20, but eventually more!
        options: {
          address, // The address that the token is at.
          symbol, // A ticker symbol or shorthand, up to 5 chars.
          decimals, // The number of decimals in the token
          image: logo, // A string url of the token logo (normalized to dweb.link if IPFS)
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
  const now = Date.now();
  if (gasPriceCache && now - gasPriceCache.ts < GAS_PRICE_TTL_MS) {
    return gasPriceCache.value;
  }
  const ethersInstance = getEthersInstance();
  const priorityFee = BigInt('1500000000'); // 1.5 GWEI
  const baseFeeHex = await ethersInstance.send('eth_gasPrice', []); // hex
  const baseFee = BigInt(parseInt(baseFeeHex, 16));
  const baseFeeMarket = (baseFee * BigInt(1355)) / BigInt(1000); // market rate like in Metamask
  const gasPrice = baseFeeMarket + priorityFee;

  gasPriceCache = { value: gasPrice, ts: now };
  return gasPrice;
}

function calcEvmFee(gasPrice: bigint, gasAmount: bigint) {
  return (gasPrice * gasAmount).toString();
}

async function waitForEvmTransaction(hash: string): Promise<ethers.TransactionReceipt | null> {
  const ethersInstance = getEthersInstance();
  const tx = await ethersInstance.waitForTransaction(hash);

  return tx;
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
  /**
   * Batch fetch ERC20 balances using Multicall3 aggregate3 when available.
   * Fallback to sequential calls if multicall is unavailable.
   */
  async getErc20BalancesBatch(
    pairs: Array<{ token: string; account: string }>
  ): Promise<Array<{ token: string; account: string; balance: string }>> {
    const results: Array<{ token: string; account: string; balance: string }> = [];
    try {
      const provider = getEthersInstance();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      const multicall = getMulticallAddress(chainId);
      if (!multicall) throw new Error('Multicall is not available');
      const multicallAbi = [
        'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) public payable returns (tuple(bool success, bytes returnData)[] returnData)',
      ];
      const erc20Iface = new ethers.Interface(['function balanceOf(address) view returns (uint256)']);
      const mc = new ethers.Contract(multicall, multicallAbi, provider);
      const calls = pairs.map(({ token, account }) => ({
        target: token,
        allowFailure: true,
        callData: erc20Iface.encodeFunctionData('balanceOf', [account]),
      }));
      const ret = await mc.aggregate3(calls);
      ret.forEach((item: any, idx: number) => {
        let bal = '0';
        if (item?.success && item?.returnData) {
          try {
            const [val] = erc20Iface.decodeFunctionResult('balanceOf', item.returnData);
            bal = (val as bigint).toString();
          } catch {}
        }
        results.push({ token: pairs[idx].token, account: pairs[idx].account, balance: bal });
      });
      return results;
    } catch (e) {
      // Fallback to sequential calls
      for (const p of pairs) {
        const bal = await getAccountTokenBalance(p.account, p.token);
        results.push({ token: p.token, account: p.account, balance: bal });
      }
      return results;
    }
  },
  /**
   * Batch fetch ERC20 allowances using Multicall3 aggregate3 when available.
   * Returns normalized string values (natural units) using token decimals.
   * Falls back to sequential calls if multicall is unavailable.
   */
  async getAllowancesBatch(
    pairs: Array<{ owner: string; spender: string; token: string }>
  ): Promise<Array<{ token: string; owner: string; spender: string; allowance: string }>> {
    const out: Array<{ token: string; owner: string; spender: string; allowance: string }> = [];
    try {
      const provider = getEthersInstance();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      const multicall = getMulticallAddress(chainId);
      if (!multicall) throw new Error('Multicall is not available');
      const multicallAbi = [
        'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) public payable returns (tuple(bool success, bytes returnData)[] returnData)',
      ];
      const erc20Iface = new ethers.Interface([
        'function allowance(address,address) view returns (uint256)',
        'function decimals() view returns (uint8)',
      ]);
      const mc = new ethers.Contract(multicall, multicallAbi, provider);
      const calls: any[] = [];
      // Make paired calls per token: [allowance, decimals]
      pairs.forEach(({ token, owner, spender }) => {
        calls.push({
          target: token,
          allowFailure: true,
          callData: erc20Iface.encodeFunctionData('allowance', [owner, spender]),
        });
        calls.push({
          target: token,
          allowFailure: true,
          callData: erc20Iface.encodeFunctionData('decimals', []),
        });
      });
      const ret = await mc.aggregate3(calls);
      for (let i = 0; i < pairs.length; i++) {
        const aIdx = 2 * i;
        const dIdx = 2 * i + 1;
        let raw = '0';
        let dec = FPNumber.DEFAULT_PRECISION;
        if (ret[aIdx]?.success) {
          try {
            const [val] = erc20Iface.decodeFunctionResult('allowance', ret[aIdx].returnData);
            raw = (val as bigint).toString();
          } catch {}
        }
        if (ret[dIdx]?.success) {
          try {
            const [val] = erc20Iface.decodeFunctionResult('decimals', ret[dIdx].returnData);
            dec = Number(val);
          } catch {}
        }
        const allowance = FPNumber.fromCodecValue(raw, dec).toString();
        out.push({ token: pairs[i].token, owner: pairs[i].owner, spender: pairs[i].spender, allowance });
      }
      return out;
    } catch (e) {
      // Fallback to sequential calls
      for (const p of pairs) {
        const val = await getAllowance(p.owner, p.spender, p.token);
        out.push({ token: p.token, owner: p.owner, spender: p.spender, allowance: val ?? '0' });
      }
      return out;
    }
  },
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
  waitForEvmTransaction,
  getEvmTransactionReceipt,
  getBlock,
  getBlockNumber,
  addToken,
  switchOrAddChain,
  isNativeEvmTokenAddress,
  // evm network storage
  getSelectedNetwork,
  storeSelectedNetwork,
  // bridge type
  getSelectedBridgeType,
  storeSelectedBridgeType,
  __setTestEthersProvider,
  __resetTestEthersProvider,
  __clearTokenContractCache,
  __clearTokenDecimalsCache,
  __setContractFactory,
  __resetContractFactory,
};

function getMulticallAddress(chainId: number): string | null {
  // Multicall3 canonical address deployed on many chains
  const CA11 = '0xcA11bde05977b3631167028862bE2a173976CA11';
  const supported = new Set([
    1, // Ethereum
    11155111, // Sepolia
    56,
    97, // BSC
    137,
    80001, // Polygon
    42161,
    421614, // Arbitrum One, Arbitrum Sepolia
    43114,
    43113, // Avalanche
    250,
    4002, // Fantom
    8217,
    1001, // Klaytn
  ]);
  return supported.has(chainId) ? CA11 : null;
}
