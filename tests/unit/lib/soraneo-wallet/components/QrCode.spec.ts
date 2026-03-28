import { describe, expect, it, vi } from 'vitest';

const writeMock = vi.hoisted(() =>
  vi.fn((value: string) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('data-value', value);
    return svg as unknown as SVGSVGElement;
  })
);

vi.mock('@zxing/browser', () => ({
  BrowserQRCodeSvgWriter: class {
    write = writeMock;
  },
}));

import QrCode from '@/lib/soraneo-wallet/src/components/QrCode/QrCode.vue';

describe('Wallet QrCode', () => {
  it('renders a fresh svg element into the container', () => {
    const container = document.createElement('div');
    container.appendChild(document.createElement('span'));
    const state = (QrCode as any).setup(
      {
        value: 'payload',
        size: 128,
      },
      {
        attrs: {},
        emit: vi.fn(),
        expose: vi.fn(),
        slots: {},
      }
    );

    state.container.value = container;
    state.renderCode();

    expect(writeMock).toHaveBeenCalledWith('payload', 128, 128, expect.any(Map));
    expect(container.childNodes).toHaveLength(1);
    expect(container.firstChild?.nodeName.toLowerCase()).toBe('svg');
    expect((state.element.value as SVGSVGElement).getAttribute('data-value')).toBe('payload');
  });
});
