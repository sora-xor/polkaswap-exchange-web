import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick, useAttrs } from 'vue';

import AppInfoPopper from '@/components/App/Menu/AppInfoPopper.vue';
import { Links, SocialNetworkLinks, app } from '@/consts';
import SPopoverPanel from '@/lib/soramitsu-ui/components/Popover/SPopoverPanel';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'mobilePopup.info') return 'Swap tokens from different networks';
      if (key === 'mobilePopup.sideMenu') return 'Get SORA Wallet';
      if (key === 'social.wiki') return 'SORA Wiki';
      if (key === 'social.telegram') return 'Telegram';
      if (key === 'social.twitter') return 'Twitter';
      if (key === 'social.reddit') return 'Reddit';
      if (key === 'social.medium') return 'Medium';
      if (key === 'social.github') return 'GitHub';
      if (key === 'helpDialog.privacyPolicy') return 'Privacy Policy';
      if (key === 'releaseNotesText') return 'Release notes';
      if (key === 'helpDialog.termsOfService') return 'Terms of Service';
      return key;
    },
  }),
}));

const AttrForwardingTrigger = defineComponent({
  name: 'AttrForwardingTrigger',
  setup() {
    const attrs = useAttrs();
    return { attrs };
  },
  template: '<div class="attr-trigger" v-bind="attrs">Info</div>',
});

const mountComponent = (slotContent = '<button class="info-trigger">Info</button>') =>
  mount(AppInfoPopper, {
    attachTo: document.body,
    global: {
      components: {
        SPopoverPanel,
        's-popover-panel': SPopoverPanel,
        AttrForwardingTrigger,
      },
      stubs: {
        's-icon': { template: '<i class="s-icon-stub"></i>' },
        'el-divider': { template: '<hr class="el-divider-stub" />' },
      },
    },
    slots: {
      default: slotContent,
    },
  });

describe('AppInfoPopper', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens on trigger click, renders popup links and emits open-product action', async () => {
    const wrapper = mountComponent();

    await wrapper.get('.info-trigger').trigger('click');
    await nextTick();
    await nextTick();

    const appInfo = document.body.querySelector('.app-info');
    const socialLinks = Array.from(document.body.querySelectorAll('.app-info-link--social')) as HTMLAnchorElement[];
    const textLinks = Array.from(document.body.querySelectorAll('.app-info-link--text')) as HTMLAnchorElement[];

    expect(appInfo).not.toBeNull();
    expect(socialLinks).toHaveLength(SocialNetworkLinks.length);
    expect(textLinks).toHaveLength(3);
    expect(socialLinks.map((item) => item.getAttribute('href'))).toEqual(SocialNetworkLinks.map((item) => item.href));
    expect(textLinks.map((item) => item.getAttribute('href'))).toEqual([
      Links.privacy,
      Links.releaseNotes,
      Links.terms,
    ]);
    expect(appInfo?.textContent).toContain('Swap tokens from different networks');
    expect(appInfo?.textContent).toContain(`Get SORA Wallet`);
    expect(appInfo?.textContent).toContain(`${app.name} v${app.version}`);

    const actionButton = document.body.querySelector('.app-info-link--product.s-button') as HTMLButtonElement;
    actionButton.click();
    await nextTick();
    await nextTick();

    expect(wrapper.emitted('open-product-dialog')).toHaveLength(1);
    expect(wrapper.emitted('open-product-dialog')?.[0]).toEqual(['soraMobile']);
  });

  it('opens when reference slot is a component that forwards attrs', async () => {
    const wrapper = mountComponent('<attr-forwarding-trigger />');

    await wrapper.get('.attr-trigger').trigger('click');
    await nextTick();
    await nextTick();

    expect(document.body.querySelector('.app-info')).not.toBeNull();
  });
});
