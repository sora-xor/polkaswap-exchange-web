import { defineComponent } from 'vue';

import { checkDevicesAvailability, checkCameraPermission } from '../../util';

import NotificationMixin from './NotificationMixin';

export default defineComponent({
  mixins: [NotificationMixin],
  data() {
    return {
      permissionDialogVisibility: false,
    };
  },
  methods: {
    async checkMediaDevicesAllowance(this: any, context: string): Promise<boolean> {
      try {
        const cameraAvailability = await checkDevicesAvailability();

        if (!cameraAvailability) throw new Error(`[${context}]: Cannot find camera device`);

        const cameraPermission = await checkCameraPermission();

        if (cameraPermission === 'denied') throw new Error(`[${context}]: Check camera browser permissions`);

        this.permissionDialogVisibility = cameraPermission !== 'granted';

        // request to allow use camera
        await navigator.mediaDevices.getUserMedia({ video: true });
        return true;
      } catch (error) {
        console.error(error);

        this.showAppNotification(this.t('code.allowanceError'), context === 'QRcode' ? 'error' : undefined);

        return false;
      } finally {
        this.permissionDialogVisibility = false;
      }
    },
  },
});
