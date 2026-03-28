import { plugin } from '@soramitsu-ui/ui';
import buttonDirective from '@/directives/button';
import loadingDirective from '@/directives/loading';

import type { App } from 'vue';
import '@soramitsu-ui/ui/styles';

export function install(app: App): void {
  app.use(plugin());
  app.directive('loading', loadingDirective);
  app.directive('button', buttonDirective);
}
