import { Interface, isAddress, isHexString } from 'ethers';
import type { JsonRpcApiProvider } from 'ethers';

const CLAIM_RPC_TIMEOUT_MS = 10_000;
const CLAIM_STATUS_INTERFACE = new Interface(['function used(bytes32) view returns (bool)']);
export type OutgoingClaimStatus = 'unclaimed' | 'consumed' | 'pending' | 'inconclusive';

/** Parses only JSON-RPC unsigned integer quantities; malformed reads are never permission to sign. */
const parseQuantity = (value: unknown): bigint => {
  if (typeof value !== 'string' || !/^0x[0-9a-f]+$/i.test(value)) {
    throw new Error('[Bridge]: Invalid Ethereum quantity');
  }
  return BigInt(value);
};

/** Checks claim consumption and the recipient's pending nonce before offering another wallet confirmation. */
export async function getOutgoingClaimStatus(
  provider: Pick<JsonRpcApiProvider, 'send'>,
  network: number,
  contracts: string[],
  recipient: string,
  requestHash: string
): Promise<OutgoingClaimStatus> {
  if (
    !Number.isSafeInteger(network) ||
    network <= 0 ||
    !isAddress(recipient) ||
    !isHexString(requestHash, 32) ||
    !contracts.length ||
    !contracts.every(isAddress)
  ) {
    return 'inconclusive';
  }

  /** Bounds each read so a disconnected wallet cannot stall bridge recovery forever. */
  const send = async (method: string, params: unknown[]): Promise<unknown> => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        provider.send(method, params),
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error('[Bridge]: Ethereum claim status RPC timed out')),
            CLAIM_RPC_TIMEOUT_MS
          );
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  };

  // Raw JSON-RPC avoids ethers' short-lived read cache. The final nonce and
  // chain checks must reach the wallet again to detect intervening changes.
  if (parseQuantity(await send('eth_chainId', [])) !== BigInt(network)) return 'inconclusive';

  // Use one mined block for every read, and include pending transactions so an
  // earlier wallet submission is not mistaken for an unsigned claim.
  const blockTag = `0x${parseQuantity(await send('eth_blockNumber', [])).toString(16)}`;
  const [[minedNonce, pendingNonce], consumed] = await Promise.all([
    Promise.allSettled([
      send('eth_getTransactionCount', [recipient, blockTag]).then(parseQuantity),
      send('eth_getTransactionCount', [recipient, 'pending']).then(parseQuantity),
    ]),
    Promise.allSettled(
      [...new Set(contracts.map((address) => address.toLowerCase()))].map(async (to) => {
        const result = await send('eth_call', [
          {
            to,
            data: CLAIM_STATUS_INTERFACE.encodeFunctionData('used', [requestHash]),
          },
          blockTag,
        ]);
        return CLAIM_STATUS_INTERFACE.decodeFunctionResult('used', result as string)[0] === true;
      })
    ),
  ]);

  // Positive evidence must survive another contract or nonce read failing.
  // These states block signing, so fresh reads are only needed to establish
  // that a claim is unclaimed, never to discard a known submission.
  if (consumed.some((result) => result.status === 'fulfilled' && result.value)) return 'consumed';
  if (
    minedNonce.status === 'fulfilled' &&
    pendingNonce.status === 'fulfilled' &&
    minedNonce.value !== pendingNonce.value
  ) {
    return 'pending';
  }

  // Recheck after the contract reads in case a wallet broadcast raced the
  // initial nonce lookup. Keep a detected pending nonce even if the network
  // recheck fails; an incomplete read cannot authorize another signature.
  const [currentNetwork, currentPendingNonce] = await Promise.allSettled([
    send('eth_chainId', []).then(parseQuantity),
    send('eth_getTransactionCount', [recipient, 'pending']).then(parseQuantity),
  ]);
  if (
    minedNonce.status === 'fulfilled' &&
    currentPendingNonce.status === 'fulfilled' &&
    minedNonce.value !== currentPendingNonce.value
  ) {
    return 'pending';
  }
  if (currentNetwork.status === 'fulfilled' && currentNetwork.value !== BigInt(network)) return 'inconclusive';

  const failedRead = [minedNonce, pendingNonce, ...consumed, currentNetwork, currentPendingNonce].find(
    (result) => result.status === 'rejected'
  );
  if (failedRead?.status === 'rejected') throw failedRead.reason;
  return 'unclaimed';
}
