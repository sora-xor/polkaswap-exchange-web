import { ref } from 'vue';

import { checkDevicesAvailability, checkCameraPermission } from '../util';

import { useNotification } from './useNotification';

export function useCameraPermission() {
  const permissionDialogVisibility = ref(false);
  const { showAppNotification, t } = useNotification();

  const checkMediaDevicesAllowance = async (context: string): Promise<boolean> => {
    try {
      const cameraAvailability = await checkDevicesAvailability();

      if (!cameraAvailability) throw new Error(`[${context}]: Cannot find camera device`);

      const cameraPermission = await checkCameraPermission();

      if (cameraPermission === 'denied') throw new Error(`[${context}]: Check camera browser permissions`);

      permissionDialogVisibility.value = cameraPermission !== 'granted';

      await navigator.mediaDevices.getUserMedia({ video: true });
      return true;
    } catch (error) {
      console.error(error);
      showAppNotification(t('code.allowanceError'), context === 'QRcode' ? 'error' : undefined);
      return false;
    } finally {
      permissionDialogVisibility.value = false;
    }
  };

  return {
    permissionDialogVisibility,
    checkMediaDevicesAllowance,
  };
}
