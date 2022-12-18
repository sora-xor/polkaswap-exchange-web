import jwtDecode, { JwtPayload } from 'jwt-decode';

import { CardIssueStatus, Token } from '../types/card';

// Defines user's KYC status.
// If accessToken expired, tries to get new JWT pair via refreshToken;
// if not, forces user to pass phone number again to create new JWT pair in sessionStorage.
export async function defineUserStatus(): Promise<CardIssueStatus | undefined> {
  let sessionAccessToken = sessionStorage.getItem('access-token');
  let sessionRefreshToken = sessionStorage.getItem('refresh-token');

  if (!(sessionAccessToken && sessionRefreshToken)) return;

  if (isAccessTokenExpired(sessionAccessToken)) {
    const { accessToken, refreshToken } = await getUpdatedJwtPair(sessionRefreshToken);

    if (accessToken && refreshToken) {
      sessionAccessToken = accessToken;
      sessionRefreshToken = refreshToken;
    } else {
      return;
    }
  }
  const status = await getKysStatus(sessionAccessToken);

  return status;
}

async function getUpdatedJwtPair(refreshToken: string | null): Promise<Record<Token, string>> {
  const apiKey = '6974528a-ee11-4509-b549-a8d02c1aec0d';

  try {
    const result = await fetch('https://api-auth-test.soracard.com/RequestNewAccessToken', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${apiKey}, Bearer ${refreshToken}`,
      },
    });

    // TODO: parse refresh & access tokens
    console.log('result', result);

    return {
      accessToken: '',
      refreshToken: '',
    };
  } catch (error) {
    console.error('[SoraCard]: Error while getting new JWT pair', error);
  }

  return {
    accessToken: '',
    refreshToken: '',
  };
}

async function getKysStatus(accessToken: string | null): Promise<CardIssueStatus | undefined> {
  if (!accessToken) return;

  try {
    const result = await fetch('https://sora-card.sc1.dev.sora2.soramitsu.co.jp/kyc-status', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await result.json();
    // TODO: define KYC status based on response
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
