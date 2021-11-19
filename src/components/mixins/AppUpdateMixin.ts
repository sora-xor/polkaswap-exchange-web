import { Component, Vue, Watch } from 'vue-property-decorator';
import { State } from 'vuex-class';

import AppUpdateMessage from '@/components/App/Message/Update.vue';

@Component
export default class AppUpdateMixin extends Vue {
  @State((state) => state.settings.appUpdateCallback) appUpdateCallback!: Nullable<VoidFunction>;

  @Watch('appUpdateCallback')
  private updateIsAvailable(): void {
    this.showAppUpdateNotification();
  }

  appIsRefreshing = false;

  created(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', this.refreshApp);
    }
  }

  showAppUpdateNotification(): void {
    if (this.appUpdateCallback) {
      const h = this.$createElement;

      this.$notify({
        message: h(AppUpdateMessage, {
          props: {
            refresh: this.appUpdateCallback,
          },
        }),
        type: 'warning',
        title: '',
        duration: 0,
      });
    }
  }

  refreshApp(): void {
    if (this.appIsRefreshing) return;

    this.appIsRefreshing = true;

    window.location.reload();
  }
}
