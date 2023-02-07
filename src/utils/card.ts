import jwtDecode, { JwtPayload } from 'jwt-decode';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import store from '../store';

import { KycStatus, Status, VerificationStatus } from '../types/card';

// Defines user's KYC status.
// If accessToken expired, tries to get new JWT pair via refreshToken;
// if not, forces user to pass phone number again to create new JWT pair in sessionStorage.
export async function defineUserStatus(): Promise<Status> {
  const sessionRefreshToken = sessionStorage.getItem('refresh-token');
  let sessionAccessToken = sessionStorage.getItem('access-token');

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

  const { kycStatus, verificationStatus } = await getUserStatus(sessionAccessToken);

  return { kycStatus, verificationStatus };
}

async function getUpdatedJwtPair(refreshToken: string): Promise<Nullable<string>> {
  const soraNetwork = store.state.wallet.settings.soraNetwork || WALLET_CONSTS.SoraNetwork.Test;
  const { apiKey } = soraCard(soraNetwork).authService;
  const buffer = Buffer.from(apiKey);

  try {
    const response = await fetch('https://api-auth-test.soracard.com/RequestNewAccessToken', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${buffer.toString('base64')}, Bearer ${refreshToken}`,
      },
    });

    if (response.status === 200 && response.ok === true) {
      const accessToken = response.headers.get('accesstoken');
      const expirationTime = response.headers.get('expirationtime');

      if (accessToken && expirationTime) {
        sessionStorage.setItem('access-token', accessToken);
        sessionStorage.setItem('expiration-time', expirationTime);
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

  try {
    const result = await fetch('https://sora-card.sc1.dev.sora2.soramitsu.co.jp/kyc-last-status', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const lastRecord = await result.json();

    if (!lastRecord) return emptyStatusFields();

    const verificationStatus: VerificationStatus = lastRecord.verification_status;
    const kycStatus: KycStatus = lastRecord.kyc_status;

    if (Object.keys(VerificationStatus).includes(verificationStatus) && Object.keys(KycStatus).includes(kycStatus)) {
      return { verificationStatus, kycStatus };
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
    const priceResult = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sora&vs_currencies=eur');

    const parsedData = await priceResult.json();

    return parsedData.sora.eur;
  } catch (error) {
    console.error(error);
  }
};

export const clearTokensFromSessionStorage = () => {
  sessionStorage.removeItem('access-token');
  sessionStorage.removeItem('refresh-token');
  sessionStorage.removeItem('expiration-time');
};

const emptyStatusFields = (): Status => ({
  verificationStatus: undefined,
  kycStatus: undefined,
});

export function soraCard(soraNetwork: string) {
  const getAuthServiceData = (soraNetwork: string) => {
    const test = {
      sdkURL: 'https://auth-test.paywings.io/auth/sdk.js',
      authURL: 'https://auth-test.soracard.com',
      apiKey: '6974528a-ee11-4509-b549-a8d02c1aec0d',
    };

    const prod = {
      sdkURL: '',
      authURL: '',
      apiKey: '',
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

  const getSoraProxyEndpoints = (soraNetwork: string) => {
    const test = {
      referenceNumberEndpoint: 'https://sora-card.sc1.dev.sora2.soramitsu.co.jp/get-reference-number',
    };

    const prod = {
      referenceNumberEndpoint: '',
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
