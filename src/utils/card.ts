import jwtDecode, { JwtPayload } from 'jwt-decode';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import store from '../store';

import { KycStatus, Status, VerificationStatus } from '../types/card';

const getSoraProxyEndpoints = (soraNetwork: string) => {
  const test = {
    referenceNumberEndpoint: 'https://backend.dev.sora-card.tachi.soramitsu.co.jp/get-reference-number',
    lastKycStatusEndpoint: 'https://backend.dev.sora-card.tachi.soramitsu.co.jp/kyc-last-status',
  };

  const prod = {
    referenceNumberEndpoint: '',
    lastKycStatusEndpoint: '',
  };

  return soraNetwork === WALLET_CONSTS.SoraNetwork.Prod ? prod : test;
};

// Defines user's KYC status.
// If accessToken expired, tries to get new JWT pair via refreshToken;
// if not, forces user to pass phone number again to create new JWT pair in sessionStorage.
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
  localStorage.removeItem('PW-token');
  localStorage.removeItem('PW-refresh-token');
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
