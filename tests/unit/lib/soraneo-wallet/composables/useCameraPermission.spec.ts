import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  checkDevicesAvailabilityMock,
  checkCameraPermissionMock,
  showAppNotificationMock,
  tMock,
} = vi.hoisted(() => ({
  checkDevicesAvailabilityMock: vi.fn(),
  checkCameraPermissionMock: vi.fn(),
  showAppNotificationMock: vi.fn(),
  tMock: vi.fn((key: string) => key),
}));

vi.mock('@/lib/soraneo-wallet/src/util', () => ({
  checkDevicesAvailability: checkDevicesAvailabilityMock,
  checkCameraPermission: checkCameraPermissionMock,
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useNotification', () => ({
  useNotification: () => ({
    showAppNotification: showAppNotificationMock,
    t: tMock,
  }),
}));

import { useCameraPermission } from '@/lib/soraneo-wallet/src/composables/useCameraPermission';

describe('useCameraPermission', () => {
  beforeEach(() => {
    checkDevicesAvailabilityMock.mockReset();
    checkCameraPermissionMock.mockReset();
    showAppNotificationMock.mockReset();
    tMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false and shows a generic notification when no camera device is available', async () => {
    checkDevicesAvailabilityMock.mockResolvedValue(false);
    const mediaDevices = { getUserMedia: vi.fn() };

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: mediaDevices,
    });

    const camera = useCameraPermission();

    await expect(camera.checkMediaDevicesAllowance('Swap')).resolves.toBe(false);
    expect(mediaDevices.getUserMedia).not.toHaveBeenCalled();
    expect(showAppNotificationMock).toHaveBeenCalledWith('code.allowanceError', undefined);
    expect(camera.permissionDialogVisibility.value).toBe(false);
  });

  it('returns false and shows an error notification for denied QR permissions', async () => {
    checkDevicesAvailabilityMock.mockResolvedValue(true);
    checkCameraPermissionMock.mockResolvedValue('denied');

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });

    const camera = useCameraPermission();

    await expect(camera.checkMediaDevicesAllowance('QRcode')).resolves.toBe(false);
    expect(showAppNotificationMock).toHaveBeenCalledWith('code.allowanceError', 'error');
    expect(camera.permissionDialogVisibility.value).toBe(false);
  });

  it('keeps the dialog visible while awaiting non-granted permissions and resolves true on success', async () => {
    checkDevicesAvailabilityMock.mockResolvedValue(true);
    checkCameraPermissionMock.mockResolvedValue('prompt');

    let resolveMedia!: () => void;
    const mediaPromise = new Promise<void>((resolve) => {
      resolveMedia = resolve;
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(() => mediaPromise) },
    });

    const camera = useCameraPermission();
    const allowancePromise = camera.checkMediaDevicesAllowance('QRcode');
    await Promise.resolve();

    resolveMedia();
    await expect(allowancePromise).resolves.toBe(true);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true });
    expect(showAppNotificationMock).not.toHaveBeenCalled();
    expect(camera.permissionDialogVisibility.value).toBe(false);
  });
});
