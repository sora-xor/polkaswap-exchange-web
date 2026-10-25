/**
 * Safely resolves provider connection status. Some wallet providers expose
 * `isConnected` as a getter/function that can throw if accessed outside the
 * provider runtime context.
 */
export const isProviderConnected = (provider: Nullable<{ isConnected?: unknown }>): boolean => {
  if (!provider) return false;

  try {
    const connectionState = provider.isConnected;

    if (typeof connectionState === 'function') {
      return !!connectionState.call(provider);
    }

    return !!connectionState;
  } catch {
    return false;
  }
};

/**
 * Formats a connected account address when the chain API exposes
 * `formatAddress`. Falls back to raw address for partially initialised APIs.
 */
export const formatConnectedAddress = (
  chainApi: Nullable<{ formatAddress?: (address: string, isShort?: boolean) => string }>,
  address: string
): string => {
  if (!address) return '';

  const formatter = chainApi?.formatAddress;

  if (typeof formatter !== 'function') {
    return address;
  }

  try {
    return formatter.call(chainApi, address, false);
  } catch {
    return address;
  }
};
