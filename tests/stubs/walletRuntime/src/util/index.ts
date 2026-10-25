const noop = (..._args: unknown[]) => undefined;
const asyncNoop = async (..._args: unknown[]) => undefined;

export class AppError extends Error {
  public key: string;
  public payload: any;

  constructor({ key = '', payload = {} } = {}) {
    super(key);
    this.name = 'AppHandledError';
    this.key = key;
    this.payload = payload;
  }

  get message(): string {
    return JSON.stringify({ key: this.key, payload: this.payload });
  }
}

export const addGDriveWalletLocally = asyncNoop;
export const addSoraWalletLocally = asyncNoop;
export const addWcSubWalletLocally = asyncNoop;
export const beforeTransactionSign = asyncNoop;
export const checkCameraPermission = async () => ({ state: 'granted' });
export const checkDevicesAvailability = async () => ({ camera: true, microphone: true });
export const delay = asyncNoop;
export const formatAccountAddress = (value: string) => value;
export const getAccountIdentity = asyncNoop;
export const getCssVariableValue = (name: string) => `var(${name})`;
export const getScrollbarWidth = () => 0;
export const getExplorerLinks = () => ({ account: noop, extrinsic: noop });
export const groupRewardsByAssetsList = () => ({ transactions: [] });
export const translationUtils = {
  t: (key: string) => key,
  tc: (key: string) => key,
  te: () => true,
  formatDate: (value: unknown) => String(value ?? ''),
  TranslationConsts: {},
};

export default {
  AppError,
  addGDriveWalletLocally,
  addSoraWalletLocally,
  addWcSubWalletLocally,
  beforeTransactionSign,
  checkCameraPermission,
  checkDevicesAvailability,
  delay,
  formatAccountAddress,
  getAccountIdentity,
  getCssVariableValue,
  getExplorerLinks,
  getScrollbarWidth,
  groupRewardsByAssetsList,
  translationUtils,
};
