import jwtDecode, { JwtPayload } from 'jwt-decode';

import { CardIssueStatus } from '../types/card';

// Defines user's KYC status.
// If accessToken expired, tries to get new JWT pair via refreshToken;
// if not, forces user to pass phone number again to create new JWT pair in sessionStorage.
export async function defineUserStatus(): Promise<CardIssueStatus | undefined> {
  const sessionRefreshToken = sessionStorage.getItem('refresh-token');
  let sessionAccessToken = sessionStorage.getItem('access-token');

  if (!(sessionAccessToken && sessionRefreshToken)) return;

  if (isAccessTokenExpired(sessionAccessToken)) {
    const accessToken = await getUpdatedJwtPair(sessionRefreshToken);

    if (accessToken) {
      sessionAccessToken = accessToken;
    } else {
      return;
    }
  }

  const status = await getKysStatus(sessionAccessToken);

  return status;
}

async function getUpdatedJwtPair(refreshToken: string | null): Promise<string | null> {
  const apiKey = '6974528a-ee11-4509-b549-a8d02c1aec0d';
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

async function getKysStatus(accessToken: string | null): Promise<CardIssueStatus | undefined> {
  if (!accessToken) return;

  try {
    const result = await fetch('https://sora-card.sc1.dev.sora2.soramitsu.co.jp/kyc-last-status', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const lastRecord = await result.json();
    const lastRecordStatus = lastRecord.verification_status;

    if (Object.keys(CardIssueStatus).includes(lastRecordStatus)) {
      return CardIssueStatus[lastRecordStatus];
    }
  } catch (error) {
    console.error('[SoraCard]: Error while getting KYC status', error);
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
