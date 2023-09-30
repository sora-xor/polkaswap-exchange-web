import { FPNumber } from '@sora-substrate/math';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import jwtDecode, { JwtPayload } from 'jwt-decode';

import store from '@/store';
import { waitForSoraNetworkFromEnv } from '@/utils';

import { AttemptCounter, Fees, KycStatus, Status, UserInfo, VerificationStatus } from '../types/card';

const soraCardTestBaseEndpoint = 'https://backend.dev.sora-card.tachi.soramitsu.co.jp';
const soraCardProdBaseEndpoint = 'https://backend.sora-card.odachi.soramitsu.co.jp';
const SoraProxyEndpoints = {
  [WALLET_CONSTS.SoraNetwork.Test]: {
    referenceNumberEndpoint: `${soraCardTestBaseEndpoint}/get-reference-number`,
    lastKycStatusEndpoint: `${soraCardTestBaseEndpoint}/kyc-last-status`,
    kycAttemptCountEndpoint: `${soraCardTestBaseEndpoint}/kyc-attempt-count`,
    priceOracleEndpoint: `${soraCardTestBaseEndpoint}/prices/xor_euro`,
    ibanEndpoint: `${soraCardTestBaseEndpoint}/ibans`,
    fees: `${soraCardTestBaseEndpoint}/fees`,
    x1TransactionStatus: `${soraCardTestBaseEndpoint}/ws/x1-payment-status`,
    newAccessTokenEndpoint: 'https://api-auth-test.soracard.com/RequestNewAccessToken',
  },
  [WALLET_CONSTS.SoraNetwork.Prod]: {
    referenceNumberEndpoint: `${soraCardProdBaseEndpoint}/get-reference-number`,
    lastKycStatusEndpoint: `${soraCardProdBaseEndpoint}/kyc-last-status`,
    kycAttemptCountEndpoint: `${soraCardProdBaseEndpoint}/kyc-attempt-count`,
    priceOracleEndpoint: `${soraCardProdBaseEndpoint}/prices/xor_euro`,
    ibanEndpoint: `${soraCardProdBaseEndpoint}/ibans`,
    fees: `${soraCardProdBaseEndpoint}/fees`,
    x1TransactionStatus: `${soraCardProdBaseEndpoint}/ws/x1-payment-status`,
    newAccessTokenEndpoint: 'https://api-auth.soracard.com/RequestNewAccessToken',
  },
};
const AuthServiceData = {
  [WALLET_CONSTS.SoraNetwork.Test]: {
    sdkURL: 'https://auth-test.soracard.com/WebSDK/WebSDK.js',
    apiKey: '6974528a-ee11-4509-b549-a8d02c1aec0d',
    env: WALLET_CONSTS.SoraNetwork.Test,
  },
  [WALLET_CONSTS.SoraNetwork.Prod]: {
    sdkURL: 'https://auth.soracard.com/WebSDK/WebSDK.js',
    apiKey: '7d841274-8fa3-4038-bacd-a4264912ea58',
    env: WALLET_CONSTS.SoraNetwork.Prod,
  },
};
const KycServiceData = {
  [WALLET_CONSTS.SoraNetwork.Test]: {
    sdkURL: 'https://kyc-test.soracard.com/web/v2/webkyc.js',
    username: 'E7A6CB83-630E-4D24-88C5-18AAF96032A4',
    pass: '75A55B7E-A18F-4498-9092-58C7D6BDB333',
    env: WALLET_CONSTS.SoraNetwork.Test,
    unifiedApiKey: '6974528a-ee11-4509-b549-a8d02c1aec0d',
  },
  [WALLET_CONSTS.SoraNetwork.Prod]: {
    sdkURL: 'https://kyc.soracard.com/web/v2/webkyc.js',
    username: '880b1171-9008-48b0-8a29-b46bbe2af0be',
    pass: '1b6c4482-a200-4f53-895a-a71245f119cb',
    env: WALLET_CONSTS.SoraNetwork.Prod,
    unifiedApiKey: '7d841274-8fa3-4038-bacd-a4264912ea58',
  },
};

function getSoraProxyEndpoints(soraNetwork: WALLET_CONSTS.SoraNetwork) {
  if (soraNetwork === WALLET_CONSTS.SoraNetwork.Prod) {
    return SoraProxyEndpoints.Prod;
  }
  return SoraProxyEndpoints.Test;
}

function getAuthServiceData(soraNetwork: WALLET_CONSTS.SoraNetwork) {
  if (soraNetwork === WALLET_CONSTS.SoraNetwork.Prod) {
    return AuthServiceData.Prod;
  }
  return AuthServiceData.Test;
}

function getKycServiceData(soraNetwork: WALLET_CONSTS.SoraNetwork) {
  if (soraNetwork === WALLET_CONSTS.SoraNetwork.Prod) {
    return KycServiceData.Prod;
  }
  return KycServiceData.Test;
}

// Defines user's KYC status.
// If accessToken expired, tries to get new JWT pair via refreshToken;
// if not, forces user to pass phone number again to create new JWT pair in localStorage.
export async function defineUserStatus(): Promise<Status> {
  const sessionRefreshToken = localStorage.getItem('PW-refresh-token');
  let sessionAccessToken = localStorage.getItem('PW-token');

  if (!(sessionAccessToken && sessionRefreshToken)) {
    return emptyStatusFields();
  }

  if (isAccessTokenExpired(sessionAccessToken)) {
    const accessToken = await getUpdatedJwtPair(sessionRefreshToken);

    if (accessToken) {
      sessionAccessToken = accessToken;
    } else {
      return emptyStatusFields();
    }
  }

  const { kycStatus, verificationStatus, rejectReason } = await getUserStatus(sessionAccessToken);

  return { kycStatus, verificationStatus, rejectReason };
}

export async function getUpdatedJwtPair(refreshToken: string): Promise<string | null> {
  const soraNetwork = store.state.wallet.settings.soraNetwork ?? (await waitForSoraNetworkFromEnv());
  const { apiKey } = getAuthServiceData(soraNetwork);
  const buffer = Buffer.from(apiKey);

  try {
    const response = await fetch(getSoraProxyEndpoints(soraNetwork).newAccessTokenEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${buffer.toString('base64')}, Bearer ${refreshToken}`,
      },
    });

    if (response.status === 200 && response.ok === true) {
      const accessToken = response.headers.get('accesstoken');

      if (accessToken) {
        localStorage.setItem('PW-token', accessToken);
      }

      return accessToken;
    }
  } catch (error) {
    console.error('[SoraCard]: Error while getting new JWT pair', error);
  }

  return null;
}

async function getUserStatus(accessToken: string): Promise<Status> {
  if (!accessToken) return emptyStatusFields();

  const soraNetwork = store.state.wallet.settings.soraNetwork ?? (await waitForSoraNetworkFromEnv());

  try {
    const result = await fetch(getSoraProxyEndpoints(soraNetwork).lastKycStatusEndpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const lastRecord = await result.json();

    if (!lastRecord) return emptyStatusFields();

    const verificationStatus: VerificationStatus = lastRecord.verification_status;
    const kycStatus: KycStatus = lastRecord.kyc_status;
    const rejectReasons = lastRecord.rejection_reasons.map((reason) => reason.Description);

    console.log('rejectReasons', rejectReasons);

    console.log('lastRecord', lastRecord);

    if (Object.keys(VerificationStatus).includes(verificationStatus) && Object.keys(KycStatus).includes(kycStatus)) {
      return { verificationStatus, kycStatus, rejectReason };
    }

    return emptyStatusFields();
  } catch (error) {
    console.error('[SoraCard]: Error while getting KYC and verification statuses', error);
    return emptyStatusFields();
  }
}

const isAccessTokenExpired = (accessToken: string): boolean => {
  try {
    const decoded: JwtPayload = jwtDecode(accessToken);

    if (decoded.exp) {
      if (Date.now() <= decoded.exp * 1000) {
        return false;
      }
    }

    return true;
  } catch {
    return true;
  }
};

export const getXorPerEuroRatio = async () => {
  const soraNetwork = store.state.wallet.settings.soraNetwork ?? (await waitForSoraNetworkFromEnv());

  try {
    const priceResult = await fetch(getSoraProxyEndpoints(soraNetwork).priceOracleEndpoint);
    const parsedData = await priceResult.json();

    return parsedData.price;
  } catch (error) {
    console.error(error);
  }
};

export const getFees = async (): Promise<Fees> => {
  const soraNetwork = store.state.wallet.settings.soraNetwork ?? (await waitForSoraNetworkFromEnv());

  try {
    const data = await fetch(getSoraProxyEndpoints(soraNetwork).fees);
    const fees = await data.json();

    const value = new FPNumber(fees.retry_fee);

    console.log('value.toLocaleString(', value.toLocaleString());
    console.log('value.toLocaleString(', value.dp(3).toLocaleString());

    return { application: fees.application_fee, retry: fees.retry_fee };
  } catch (error) {
    console.error(error);
    return { application: null, retry: null };
  }
};

export const getUserIbanInfo = async (): Promise<UserInfo> => {
  const sessionRefreshToken = localStorage.getItem('PW-refresh-token');
  let sessionAccessToken = localStorage.getItem('PW-token');

  if (!(sessionAccessToken && sessionRefreshToken)) {
    return emptyIbanInfo();
  }

  if (isAccessTokenExpired(sessionAccessToken)) {
    const accessToken = await getUpdatedJwtPair(sessionRefreshToken);

    if (accessToken) {
      sessionAccessToken = accessToken;
    } else {
      return emptyIbanInfo();
    }
  }

  const soraNetwork = store.state.wallet.settings.soraNetwork ?? (await waitForSoraNetworkFromEnv());

  try {
    const result = await fetch(getSoraProxyEndpoints(soraNetwork).ibanEndpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionAccessToken}`,
      },
    });

    const data = await result.json();

    if (data.IBANs && data.IBANs[0].StatusDescription === 'Active') {
      const iban = data.IBANs[0].Iban;
      const availableBalance = data.IBANs[0].AvailableBalance;

      return { iban, availableBalance };
    } else {
      return emptyIbanInfo();
    }
  } catch (error) {
    console.error('[SoraCard]: Error while getting IBAN', error);
    return emptyIbanInfo();
  }
};

export const getFreeKycAttemptCount = async (): Promise<AttemptCounter> => {
  const sessionRefreshToken = localStorage.getItem('PW-refresh-token');
  let sessionAccessToken = localStorage.getItem('PW-token');

  if (!(sessionAccessToken && sessionRefreshToken)) {
    return emptyCounterFields();
  }

  if (isAccessTokenExpired(sessionAccessToken)) {
    const accessToken = await getUpdatedJwtPair(sessionRefreshToken);

    if (accessToken) {
      sessionAccessToken = accessToken;
    } else {
      return emptyCounterFields();
    }
  }

  const soraNetwork = store.state.wallet.settings.soraNetwork ?? (await waitForSoraNetworkFromEnv());

  try {
    const result = await fetch(getSoraProxyEndpoints(soraNetwork).kycAttemptCountEndpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionAccessToken}`,
      },
    });

    const {
      free_attempt: hasFreeAttempts,
      free_attempts_left: freeAttemptsLeft,
      total_free_attempts: totalFreeAttempts,
    } = await result.json();

    return { hasFreeAttempts, freeAttemptsLeft, totalFreeAttempts };
  } catch (error) {
    console.error('[SoraCard]: Error while getting KYC attempt', error);
    return emptyCounterFields();
  }
};

export const clearTokensFromLocalStorage = () => {
  localStorage.removeItem('PW-token');
  localStorage.removeItem('PW-refresh-token');
};

export const clearPayWingsKeysFromLocalStorage = (logout = false) => {
  if (logout) {
    localStorage.removeItem('PW-token');
    localStorage.removeItem('PW-refresh-token');
  }
  localStorage.removeItem('PW-ProcessID');
  localStorage.removeItem('PW-conf');
  localStorage.removeItem('PW-Country');
  localStorage.removeItem('PW-PhoneNumber');
  localStorage.removeItem('PW-PhoneNumberValid');
  localStorage.removeItem('PW-Email');
  localStorage.removeItem('PW-AuthUserID');
  localStorage.removeItem('PW-DocumentSubtype');
  localStorage.removeItem('PW-KycReferenceID');
  localStorage.removeItem('PW-KycStart');
  localStorage.removeItem('PW-otpID');
  localStorage.removeItem('PW-OTPLength');
  localStorage.removeItem('PW-FirstName');
  localStorage.removeItem('PW-MiddleName');
  localStorage.removeItem('PW-LastName');
  localStorage.removeItem('PW-Check');
  localStorage.removeItem('PW-WhitelabelReferenceID');
  localStorage.removeItem('PW-KycReferenceID');
  localStorage.removeItem('PW-documents');
  localStorage.removeItem('PW-document');
  localStorage.removeItem('PW-VideoID');
  localStorage.removeItem('PW-Authorization');
  localStorage.removeItem('PW-retry');
  localStorage.removeItem('PW-AppReferenceID');
};

const emptyStatusFields = (): Status => ({
  verificationStatus: undefined,
  kycStatus: undefined,
});

const emptyIbanInfo = (): UserInfo => ({
  iban: null,
  availableBalance: null,
});

const emptyCounterFields = (): AttemptCounter => ({
  hasFreeAttempts: undefined,
  freeAttemptsLeft: undefined,
  totalFreeAttempts: undefined,
});

export function soraCard(soraNetwork: WALLET_CONSTS.SoraNetwork) {
  const authService = getAuthServiceData(soraNetwork);
  const kycService = getKycServiceData(soraNetwork);
  const soraProxy = getSoraProxyEndpoints(soraNetwork);

  return {
    authService,
    kycService,
    soraProxy,
  };
}
