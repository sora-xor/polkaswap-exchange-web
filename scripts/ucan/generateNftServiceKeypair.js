import { writeFile } from 'fs';
import { join } from 'path';

import fetch from 'node-fetch';
import { KeyPair } from 'ucan-storage/keypair';
import { build } from 'ucan-storage/ucan-storage';

const SERVICE_ENDPOINT = 'https://api.nft.storage'; // default
const API_TOKEN = process.env.API_KEY;

/**
 * Obtaining the service DID
 *
 */
async function getServiceDid() {
  const didRes = await fetch(new URL('/did', SERVICE_ENDPOINT));
  const { ok, value: serviceDid } = await didRes.json();

  if (ok) {
    return serviceDid;
  } else {
    throw new Error('Could not get Service DID');
  }
}

/**
 * Registering marketplace DID
 *
 * @param {string} did
 * @param {string} token
 */
async function registerMarketplaceDid(did, token) {
  const registerRes = await fetch(new URL('/user/did', SERVICE_ENDPOINT), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      did,
    }),
  });

  if (!registerRes.ok) {
    throw new Error('Failed to register marketplace DID');
  }
}

/**
 * Obtaining a root UCAN token.
 * It will be valid for a duration of two weeks
 *
 * @param {string} token
 */
async function getRootToken(token) {
  const ucanReq = await fetch(new URL('/ucan/token', SERVICE_ENDPOINT), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!ucanReq.ok) {
    throw new Error('Failed to get root UCAN token');
  }

  const { value: rootUCAN } = await ucanReq.json();

  return rootUCAN;
}

/**
 * Obtaining UCAN token with specified expiration date (10 days)
 *
 * @param {KeyPair} kp
 * @param {string} serviceDid
 * @param {string} rootUCAN
 */
async function getUCAN(kp, serviceDid, rootUCAN) {
  // convert timestamp to seconds
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const expiration = nowInSeconds + 864000; // 10 days from now

  try {
    return await build({
      issuer: kp,
      audience: serviceDid,
      expiration: expiration,
      capabilities: [
        {
          with: `storage://${kp.did()}`,
          can: 'upload/*',
        },
      ],
      proofs: [rootUCAN],
    });
  } catch (error) {
    throw new Error('Could not create UCAN token:', error);
  }
}

(async function main() {
  try {
    const pair = await KeyPair.create();
    const privateKey = pair.export();

    const kp = await KeyPair.fromExportedKey(privateKey);

    const serviceDid = await getServiceDid();

    await registerMarketplaceDid(kp.did(), API_TOKEN);

    const rootUCAN = await getRootToken(API_TOKEN);

    const ucan = await getUCAN(kp, serviceDid, rootUCAN);

    const credentials = `{
      "marketplaceDid": "${kp.did()}",
      "ucan": "${ucan}"
    }\n`;

    writeFile(join(process.cwd(), 'ucan.json'), credentials, (err) => {
      if (err) throw new Error(err);

      process.stdout.write('The ucan file has been saved!\n');
    });
  } catch (error) {
    console.error(error);
  }
})();
