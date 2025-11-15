import { plugin } from '@soramitsu-ui/ui';

import type { App } from 'vue';
import '@soramitsu-ui/ui/styles';

export function install(app: App): void {
  app.use(plugin());
}
