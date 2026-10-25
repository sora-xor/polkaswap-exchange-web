import { describe, expect, it } from 'vitest';

import cjsSource from '../../../vendor/@polkadot/vue-identicon/cjs/Identicon.js?raw';
import esmSource from '../../../vendor/@polkadot/vue-identicon/Identicon.js?raw';

function componentRenderCall(source: string, marker: string): string {
  const start = source.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf('\n      );', start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('@polkadot/vue-identicon vendor patch', () => {
  it('does not pass empty array slots to component VNodes', () => {
    expect(componentRenderCall(esmSource, 'return h(\n        Empty')).not.toContain('[]');
    expect(componentRenderCall(esmSource, 'return h(\n        Jdenticon')).not.toContain('[]');
    expect(componentRenderCall(esmSource, 'return h(\n        component')).not.toContain('[]');
    expect(componentRenderCall(cjsSource, 'return (0, vue_1.h)(\n        index_js_1.Empty')).not.toContain('[]');
    expect(componentRenderCall(cjsSource, 'return (0, vue_1.h)(\n        index_js_1.Jdenticon')).not.toContain('[]');
    expect(componentRenderCall(cjsSource, 'return (0, vue_1.h)(\n        component')).not.toContain('[]');
  });
});
