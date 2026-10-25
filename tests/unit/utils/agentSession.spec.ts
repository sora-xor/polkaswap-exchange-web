import { describe, expect, it } from 'vitest';

import { isAgentAutomationSession, POLKASWAP_AGENT_QUERY_PARAM } from '@/utils/agentSession';

describe('agent session detection', () => {
  it('detects explicit browser automation sessions from the URL query', () => {
    expect(isAgentAutomationSession(`?${POLKASWAP_AGENT_QUERY_PARAM}=1`)).toBe(true);
    expect(isAgentAutomationSession({ search: `?foo=bar&${POLKASWAP_AGENT_QUERY_PARAM}=true` })).toBe(true);
  });

  it('does not treat ordinary app visits as agent sessions', () => {
    expect(isAgentAutomationSession('')).toBe(false);
    expect(isAgentAutomationSession('?foo=bar')).toBe(false);
    expect(isAgentAutomationSession(`?${POLKASWAP_AGENT_QUERY_PARAM}=0`)).toBe(false);
  });
});
