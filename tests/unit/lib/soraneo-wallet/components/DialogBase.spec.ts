import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';

import DialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import dialogBaseSource from '@/lib/soraneo-wallet/src/components/DialogBase.vue?raw';

const serializeClass = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => serializeClass(item).split(' '))
      .filter(Boolean)
      .join(' ');
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([className]) => className)
      .join(' ');
  }

  return typeof value === 'string' ? value : '';
};

const SModalStub = defineComponent({
  name: 'SModal',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    modalClass: {
      type: [String, Array, Object],
      default: '',
    },
    rootClass: {
      type: [String, Array, Object],
      default: '',
    },
    overlayClass: {
      type: [String, Array, Object],
      default: '',
    },
    lockScroll: {
      type: Boolean,
      default: false,
    },
    closeOnOverlayClick: {
      type: Boolean,
      default: true,
    },
    closeOnEsc: {
      type: Boolean,
      default: true,
    },
  },
  template: `
    <div
      class="s-modal-stub"
      :data-show="String(show)"
      :data-root-class="serializeClass(rootClass)"
      :data-modal-class="serializeClass(modalClass)"
      :data-overlay-class="serializeClass(overlayClass)"
      :data-lock-scroll="String(lockScroll)"
      :data-close-on-overlay-click="String(closeOnOverlayClick)"
      :data-close-on-esc="String(closeOnEsc)"
    >
      <slot />
    </div>
  `,
  setup() {
    return { serializeClass };
  },
});

describe('DialogBase', () => {
  it('clips header and content painting to the rounded dialog surface', () => {
    expect(dialogBaseSource).toMatch(/\.dialog-card\s*\{[\s\S]*overflow:\s*hidden;/);
  });

  it('maps legacy dialog attrs onto the compatibility modal shell', () => {
    const wrapper = mount(DialogBase, {
      props: {
        visible: true,
        title: 'Dialog title',
        closeOnClickModal: false,
        closeOnEsc: false,
      },
      attrs: {
        class: 'popup browser-notification',
      },
      global: {
        stubs: {
          SModal: SModalStub,
          SButton: {
            template: '<button type="button"><slot /></button>',
          },
          SIcon: true,
          STooltip: {
            template: '<span><slot /></span>',
          },
        },
      },
      slots: {
        footer: '<span>Footer</span>',
      },
    });

    const modal = wrapper.get('.s-modal-stub');
    const rootClasses = modal.attributes('data-root-class');
    const modalClasses = modal.attributes('data-modal-class');

    expect(rootClasses).toContain('dialog-wrapper__root');
    expect(modalClasses).toContain('dialog-wrapper');
    expect(modalClasses).toContain('dialog-wrapper__modal');
    expect(modalClasses).toContain('el-dialog__wrapper');
    expect(modalClasses).toContain('popup');
    expect(modalClasses).toContain('browser-notification');
    expect(modal.attributes('data-close-on-overlay-click')).toBe('false');
    expect(modal.attributes('data-close-on-esc')).toBe('false');

    expect(wrapper.get('.dialog-card').classes()).toContain('el-dialog');
    expect(wrapper.get('.dialog-card__header').classes()).toContain('el-dialog__header');
    expect(wrapper.get('.dialog-card__title-text').classes()).toContain('el-dialog__title');
    expect(wrapper.get('.dialog-card__content').classes()).toContain('el-dialog__body');
    expect(wrapper.get('.dialog-card__footer').classes()).toContain('el-dialog__footer');
    expect(wrapper.get('.el-dialog__headerbtn .el-dialog__close').exists()).toBe(true);
  });
});
