import { describe, expect, it } from 'vitest';

import { Status } from '@soramitsu-ui/ui/types';
import {
  isNodeConnected,
  isNodeConnecting,
  resolveNodeIcon,
  resolveNodeStatus,
} from '@/features/bridge/components/nodeIcon.utils';

describe('nodeIcon.utils', () => {
  const connected = { nodeIsConnected: true, nodeAddressConnecting: null } as const;
  const connecting = { nodeIsConnected: false, nodeAddressConnecting: 'wss://example' } as const;

  it('detects connection and loading states', () => {
    expect(isNodeConnected(connected)).toBe(true);
    expect(isNodeConnecting(connected)).toBe(false);

    expect(isNodeConnected(connecting)).toBe(false);
    expect(isNodeConnecting(connecting)).toBe(true);

    expect(isNodeConnected(null)).toBe(false);
    expect(isNodeConnecting(null)).toBe(false);
  });

  it('resolves status and icon for node connection', () => {
    expect(resolveNodeStatus(connected)).toBe(Status.SUCCESS);
    expect(resolveNodeIcon(connected)).toBe('globe-16');

    expect(resolveNodeStatus(connecting)).toBe(Status.INFO);
    expect(resolveNodeIcon(connecting)).toBe('el-icon-loading');

    expect(resolveNodeStatus(null)).toBe(Status.ERROR);
    expect(resolveNodeIcon(null)).toBe('globe-16');
  });
});
