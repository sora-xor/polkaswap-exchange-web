export const POLKASWAP_AGENT_QUERY_PARAM = 'polkaswap-agent';

const AGENT_SESSION_VALUES = new Set(['1', 'true']);

/**
 * Detects browser automation sessions that should not be blocked by the
 * first-launch disclaimer modal. This is a transient URL signal and does not
 * persist disclaimer acceptance.
 */
export function isAgentAutomationSession(locationSearch?: Pick<Location, 'search'> | string): boolean {
  const search =
    typeof locationSearch === 'string'
      ? locationSearch
      : locationSearch?.search ?? (typeof window !== 'undefined' ? window.location.search : '');

  const normalizedSearch = search.startsWith('?') ? search : `?${search}`;
  const value = new URLSearchParams(normalizedSearch).get(POLKASWAP_AGENT_QUERY_PARAM);

  return AGENT_SESSION_VALUES.has((value ?? '').toLowerCase());
}
