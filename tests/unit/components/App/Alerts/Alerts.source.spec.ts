import { describe, expect, it } from 'vitest';

import alertsSource from '@/components/App/Alerts/Alerts.vue?raw';

describe('App alerts source', () => {
  it('uses app-owned async shell imports instead of the global component registry', () => {
    expect(alertsSource).toContain("from '@/app/shell/components'");
    expect(alertsSource).toContain('<alerts-select-token');
    expect(alertsSource).not.toContain("import { lazyComponent } from '@/router';");
    expect(alertsSource).not.toContain('Components.AlertList');
    expect(alertsSource).not.toContain('Components.CreateAlert');
    expect(alertsSource).not.toContain('Components.SelectToken');
  });
});
