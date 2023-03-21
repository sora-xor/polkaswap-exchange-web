import jwtDecode, { JwtPayload } from 'jwt-decode';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import store from '../store';

import { KycStatus, Status, VerificationStatus } from '../types/card';

const getSoraProxyEndpoints = (soraNetwork: string) => {
  const test = {
    referenceNumberEndpoint: 'https://backend.dev.sora-card.tachi.soramitsu.co.jp/get-reference-number',
    lastKycStatusEndpoint: 'https://backend.dev.sora-card.tachi.soramitsu.co.jp/kyc-last-status',
    kycAttemptCountEndpoint: 'https://backend.dev.sora-card.tachi.soramitsu.co.jp/kyc-attempt-count',
    newAccessTokenEndpoint: 'https://api-auth-test.soracard.com/RequestNewAccessToken',
  };

  const prod = {
    referenceNumberEndpoint: '',
    lastKycStatusEndpoint: '',
    kycAttemptCountEndpoint: '',
    newAccessTokenEndpoint: '',
  };

  return soraNetwork === WALLET_CONSTS.SoraNetwork.Prod ? prod : test;
};

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

async function getUpdatedJwtPair(refreshToken: string): Promise<Nullable<string>> {
  const soraNetwork = store.state.wallet.settings.soraNetwork || WALLET_CONSTS.SoraNetwork.Test;
  const { apiKey } = soraCard(soraNetwork).authService;
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

  const soraNetwork = store.state.wallet.settings.soraNetwork || WALLET_CONSTS.SoraNetwork.Test;

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
    const rejectReason: string = lastRecord.additional_description;

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
  try {
    const priceResult = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sora&vs_currencies=eur', {
      cache: 'no-cache',
    });

    const parsedData = await priceResult.json();

    return parsedData.sora.eur;
  } catch (error) {
    console.error(error);
  }
};

export const getFreeKycAttemptCount = async () => {
  const sessionRefreshToken = localStorage.getItem('PW-refresh-token');
  let sessionAccessToken = localStorage.getItem('PW-token');

  if (!(sessionAccessToken && sessionRefreshToken)) {
    return null;
  }

  if (isAccessTokenExpired(sessionAccessToken)) {
    const accessToken = await getUpdatedJwtPair(sessionRefreshToken);

    if (accessToken) {
      sessionAccessToken = accessToken;
    } else {
      return null;
    }
  }

  const soraNetwork = store.state.wallet.settings.soraNetwork || WALLET_CONSTS.SoraNetwork.Test;

  try {
    const result = await fetch(getSoraProxyEndpoints(soraNetwork).kycAttemptCountEndpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionAccessToken}`,
      },
    });

    const { free_attempt: freeAttempt } = await result.json();

    return freeAttempt;
  } catch (error) {
    console.error('[SoraCard]: Error while getting KYC attempt', error);
  }
};

export const clearTokensFromLocalStorage = () => {
  localStorage.removeItem('PW-token');
  localStorage.removeItem('PW-refresh-token');
};

export const clearPayWingsKeysFromLocalStorage = () => {
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

export function soraCard(soraNetwork: string) {
  const getAuthServiceData = (soraNetwork: string) => {
    const test = {
      sdkURL: 'https://auth-test.soracard.com/WebSDK/WebSDK.js',
      apiKey: '6974528a-ee11-4509-b549-a8d02c1aec0d',
      env: WALLET_CONSTS.SoraNetwork.Test,
    };

    const prod = {
      sdkURL: '',
      apiKey: '',
      env: WALLET_CONSTS.SoraNetwork.Prod,
    };

    return soraNetwork === WALLET_CONSTS.SoraNetwork.Prod ? prod : test;
  };

  const getKycServiceData = (soraNetwork: string) => {
    const test = {
      sdkURL: 'https://kyc-test.soracard.com/web/v2/webkyc.js',
      username: 'E7A6CB83-630E-4D24-88C5-18AAF96032A4',
      pass: '75A55B7E-A18F-4498-9092-58C7D6BDB333',
      env: WALLET_CONSTS.SoraNetwork.Test,
      unifiedApiKey: '6974528a-ee11-4509-b549-a8d02c1aec0d',
    };

    const prod = {
      sdkURL: '',
      username: '',
      pass: '',
      env: WALLET_CONSTS.SoraNetwork.Prod,
      unifiedApiKey: '',
    };

    return soraNetwork === WALLET_CONSTS.SoraNetwork.Prod ? prod : test;
  };

  const authService = getAuthServiceData(soraNetwork);
  const kycService = getKycServiceData(soraNetwork);
  const soraProxy = getSoraProxyEndpoints(soraNetwork);

  return {
    authService,
    kycService,
    soraProxy,
  };
}
