import { describe, expect, it, vi } from 'vitest';

import QrCodeScanButton from '@/lib/soraneo-wallet/src/components/QrCode/QrCodeScanButton.vue';

describe('QrCodeScanButton', () => {
  it('does not throw when dropdown ref is unavailable', () => {
    const handler = (QrCodeScanButton as any).prototype.handleButtonClick as (() => void) | undefined;

    expect(typeof handler).toBe('function');
    expect(() => handler?.call({ dropdown: undefined })).not.toThrow();
  });

  it('forwards click to dropdown handleClick when refs exist', () => {
    const handler = (QrCodeScanButton as any).prototype.handleButtonClick as (() => void) | undefined;
    const handleClick = vi.fn();

    handler?.call({
      dropdown: {
        $refs: {
          dropdown: {
            handleClick,
          },
        },
      },
    });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
