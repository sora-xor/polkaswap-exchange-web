import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import messages from '@/lang/en.json';
import BotAutopilot from '@/features/bot-trading/components/BotAutopilot.vue';
import {
  createAutopilotQualificationError,
  readAutopilotQualificationDiagnostics,
} from '@/features/bot-trading/autopilot-diagnostics';
import type { BotFundingPreview } from '@/features/bot-trading/live';
import type { AutopilotWatchRecovery } from '@/features/bot-trading/autopilot-watch-checkpoint';
import { KUSD, VAL, XOR } from '@/lib/substrate/sdk/assets/consts';
import { executionBot } from './execution-fixtures';
import { goalStorageBot, goalStorageOrder, GOAL_TEST_START } from './goal-storage-fixtures';

vi.mock('@polkadot/util-crypto', async (original) => ({
  ...(await original<typeof import('@polkadot/util-crypto')>()),
  decodeAddress: () => new Uint8Array(),
  cryptoWaitReady: async () => true,
}));

vi.mock('@/composables/useTranslation', async () => {
  const { default: messages } = await import('@/lang/en.json');
  return {
    useTranslation: () => ({
      t: (key: string, values?: Record<string, unknown>) => {
        if (key === 'bots.autopilot.budget')
          return messages.bots.autopilot.budget.replace('{symbol}', String(values?.symbol));
        if (key === 'bots.autopilot.budgetUnselected') return messages.bots.autopilot.budgetUnselected;
        if (key === 'bots.autopilot.diagnostics.netLoss') return messages.bots.autopilot.diagnostics.netLoss;
        if (key === 'bots.autopilot.diagnostics.lastCheckThrough')
          return messages.bots.autopilot.diagnostics.lastCheckThrough.replace('{time}', String(values?.time));
        if (key === 'bots.autopilot.diagnostics.screeningCount')
          return messages.bots.autopilot.diagnostics.screeningCount
            .replace('{drafted}', String(values?.drafted))
            .replace('{tested}', String(values?.tested));
        if (key === 'bots.autopilot.diagnostics.screenedDraft')
          return messages.bots.autopilot.diagnostics.screenedDraft.replace('{number}', String(values?.number));
        if (key === 'bots.autopilot.diagnostics.quoteUnavailable')
          return messages.bots.autopilot.diagnostics.quoteUnavailable;
        if (key === 'bots.autopilot.diagnostics.noSmallerExactSample')
          return messages.bots.autopilot.diagnostics.noSmallerExactSample;
        if (key === 'bots.autopilot.errors.xorReserve') return messages.bots.autopilot.errors.xorReserve;
        if (key === 'bots.autopilot.errors.tradeBudget') return messages.bots.autopilot.errors.tradeBudget;
        if (key === 'bots.autopilot.errors.insufficientFeeBudget')
          return messages.bots.autopilot.errors.insufficientFeeBudget;
        if (key === 'bots.autopilot.diagnostics.feePressure') {
          return messages.bots.autopilot.diagnostics.feePressure
            .replace('{time}', String(values?.time))
            .replace('{markTime}', String(values?.markTime))
            .replace('{share}', String(values?.share))
            .replace('{limit}', String(values?.limit));
        }
        if (key === 'bots.autopilot.go') return messages.bots.autopilot.go;
        if (key === 'bots.autopilot.setupFunding.missing') return `Add ${values?.amount} ${values?.symbol}`;
        if (key === 'bots.autopilot.watch.desktopNote') return messages.bots.autopilot.watch.desktopNote;
        if (key === 'bots.autopilot.feeReserveIncluded' || key === 'bots.autopilot.feeReserveSeparate') {
          const message = key.endsWith('Included')
            ? messages.bots.autopilot.feeReserveIncluded
            : messages.bots.autopilot.feeReserveSeparate;
          return message.replace('{amount}', String(values?.amount)).replace('{symbol}', String(values?.symbol));
        }
        return `${key}${values ? ` ${Object.values(values).join(' ')}` : ''}`;
      },
      language: ref('en'),
    }),
  };
});

const wrappers: VueWrapper[] = [];
const bot = {
  ...executionBot(),
  goal: { title: 'Grow my balance', targetReturnPercent: '5', maxLossPercent: '5', durationMs: 86_400_000 },
};
const funding: BotFundingPreview = {
  sufficient: true,
  assets: [{ asset: bot.assetIn, availableCodec: '12000000000000000000', requiredCodec: '10000000000000000000' }],
};
const defaults = {
  assets: [XOR, VAL],
  bots: [],
  walletConnected: true,
  walletAddress: 'cn-public-address',
  externalWallet: false,
  stage: 'welcome' as const,
  busy: false,
  error: '',
  aiLabel: 'OpenAI',
  progress: '',
  reviewBot: null,
  funding: null,
  activeIds: [],
  selectedBot: null,
};
type Props = InstanceType<typeof BotAutopilot>['$props'];

/** Exercise presentation events without constructing providers, wallets, or a trading controller. */
function render(overrides: Partial<Props> = {}) {
  const wrapper = mount(BotAutopilot, { props: { ...defaults, ...overrides } });
  wrappers.push(wrapper);
  return wrapper;
}

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('BotAutopilot', () => {
  /** Populate the public GO fields without submitting or connecting an assistant. */
  async function enterPublicDraft(wrapper: VueWrapper): Promise<string> {
    await wrapper.get('[data-testid="autopilot-asset-in"]').setValue(KUSD.address);
    await wrapper.get('[data-testid="autopilot-asset-out"]').setValue(XOR.address);
    await wrapper.get('[data-testid="autopilot-capital"]').setValue('10');
    const key = sessionStorage.key(0);
    expect(key).toBeTruthy();
    return key!;
  }

  describe('public draft connection recovery', () => {
    const walletAddress = 'cn-public-address';
    const genesis = `0x${'ab'.repeat(32)}`;
    /** Model the controller's exact tuple without constructing a wallet or node. */
    function identity(
      changes: {
        account?: string;
        source?: string;
        connected?: boolean;
        chain?: string;
        endpoint?: string;
        runtime?: number;
      } = {}
    ): string {
      return JSON.stringify([
        true,
        changes.account ?? walletAddress,
        changes.source ?? 'polkadot-js',
        changes.connected ?? true,
        changes.chain ?? genesis,
        changes.endpoint ?? 'wss://draft-test.invalid',
        changes.runtime ?? 130,
      ]);
    }
    /** Save the user's exact public plan, including its separate XOR fee reserve. */
    async function savePlan(wrapper: VueWrapper): Promise<{ key: string; raw: string }> {
      const key = await enterPublicDraft(wrapper);
      await wrapper.get('[data-testid="autopilot-loss"]').setValue('10');
      return { key, raw: sessionStorage.getItem(key)! };
    }
    /** Retained text must never cause automatic research, resumption or authorization. */
    function expectNoExecution(wrapper: VueWrapper): void {
      for (const event of ['go', 'start', 'resume', 'resumeWatch', 'cancel'])
        expect(wrapper.emitted(event)).toBeUndefined();
    }
    /** Verify exact public inputs once both selected asset options have hydrated. */
    function expectPlan(wrapper: VueWrapper): void {
      expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('10');
      expect(wrapper.get<HTMLSelectElement>('[data-testid="autopilot-asset-in"]').element.value).toBe(KUSD.address);
      expect(wrapper.get<HTMLSelectElement>('[data-testid="autopilot-asset-out"]').element.value).toBe(XOR.address);
      expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-fee-budget"]').element.value).toBe('1');
      expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-target"]').element.value).toBe('5');
      expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-loss"]').element.value).toBe('10');
      expect(wrapper.text()).toContain(
        messages.bots.autopilot.feeReserveSeparate.replace('{amount}', '1').replace('{symbol}', 'XOR')
      );
      expectNoExecution(wrapper);
    }

    it.each(['disconnect', 'endpoint', 'runtime'] as const)(
      'preserves public choices through a same-wallet %s transition without migrating saved identity',
      async (change) => {
        const wrapper = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity() });
        const saved = await savePlan(wrapper);
        const next =
          change === 'disconnect'
            ? identity({ connected: false })
            : change === 'endpoint'
              ? identity({ endpoint: 'wss://replacement.invalid' })
              : identity({ runtime: 131 });
        await wrapper.setProps({ fundingIdentity: next, setupFunding: null, setupFundingState: 'idle' });
        expectPlan(wrapper);
        expect(sessionStorage.getItem(saved.key)).toBe(saved.raw);
        await wrapper.setProps({ fundingIdentity: identity() });
        expectPlan(wrapper);
        expect(sessionStorage.getItem(saved.key)).toBe(saved.raw);
      }
    );

    it('preserves selected tokens through empty node metadata and partial asset catalogs', async () => {
      const wrapper = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity() });
      const saved = await savePlan(wrapper);
      await wrapper.setProps({
        assets: [],
        fundingIdentity: identity({ connected: false, chain: '', endpoint: '', runtime: 0 }),
      });
      expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('10');
      expect(wrapper.get('[data-testid="autopilot-go"]').attributes('disabled')).toBeDefined();
      expect(sessionStorage.getItem(saved.key)).toBe(saved.raw);
      for (const assets of [
        [XOR, VAL],
        [KUSD, VAL],
      ]) {
        await wrapper.setProps({ assets, fundingIdentity: identity({ runtime: 131 }) });
        expect(wrapper.get('[data-testid="autopilot-go"]').attributes('disabled')).toBeDefined();
        expect(sessionStorage.getItem(saved.key)).toBe(saved.raw);
        expectNoExecution(wrapper);
      }
      await wrapper.setProps({ assets: [KUSD, XOR, VAL] });
      expectPlan(wrapper);
      expect(sessionStorage.getItem(saved.key)).toBe(saved.raw);
    });

    it.each(['disconnect', 'endpoint', 'runtime'] as const)(
      'waits through partial hydration and restores the original draft after remount with a %s change',
      async (change) => {
        const first = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity() });
        const saved = await savePlan(first);
        wrappers.pop()!.unmount();
        const restored = render({ assets: [], fundingIdentity: identity({ connected: false, chain: '', runtime: 0 }) });
        expect(sessionStorage.getItem(saved.key)).toBe(saved.raw);
        const next =
          change === 'endpoint'
            ? identity({ endpoint: 'wss://replacement.invalid' })
            : change === 'runtime'
              ? identity({ runtime: 131 })
              : identity();
        for (const assets of [
          [XOR, VAL],
          [KUSD, VAL],
        ]) {
          await restored.setProps({ assets, fundingIdentity: next });
          expect(sessionStorage.getItem(saved.key)).toBe(saved.raw);
          expectNoExecution(restored);
        }
        await restored.setProps({ assets: [KUSD, XOR, VAL] });
        expectPlan(restored);
        expect(sessionStorage.getItem(saved.key)).toBe(saved.raw);
      }
    );

    it('keeps a newer explicit edit when the saved pair finishes hydrating later', async () => {
      const first = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity() });
      const saved = await savePlan(first);
      wrappers.pop()!.unmount();
      const restored = render({ assets: [XOR, VAL], fundingIdentity: identity() });
      expect(sessionStorage.getItem(saved.key)).toBe(saved.raw);
      await restored.get('[data-testid="autopilot-capital"]').setValue('20');
      await restored.setProps({ assets: [KUSD, XOR, VAL] });
      expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('20');
      expect(restored.get<HTMLSelectElement>('[data-testid="autopilot-asset-in"]').element.value).toBe(XOR.address);
      expect(restored.get<HTMLSelectElement>('[data-testid="autopilot-asset-out"]').element.value).toBe(VAL.address);
      expect(JSON.parse(sessionStorage.getItem(saved.key)!)).toMatchObject({
        capital: '20',
        assetInAddress: XOR.address,
        assetOutAddress: VAL.address,
      });
      expectNoExecution(restored);
    });

    it.each(['disconnected', 'empty metadata'] as const)(
      'saves explicit edits after %s recovers without requiring another edit or GO',
      async (state) => {
        const first = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity() });
        const saved = await savePlan(first);
        await first.setProps({
          fundingIdentity:
            state === 'disconnected'
              ? identity({ connected: false })
              : identity({ connected: false, chain: '', endpoint: '', runtime: 0 }),
        });
        await first.get('[data-testid="autopilot-capital"]').setValue('20');
        expect(sessionStorage.getItem(saved.key)).toBe(saved.raw);
        await first.setProps({ fundingIdentity: identity({ runtime: 131 }) });
        expect(JSON.parse(sessionStorage.getItem(saved.key)!)).toMatchObject({
          capital: '20',
          assetInAddress: KUSD.address,
          assetOutAddress: XOR.address,
          feeBudgetXor: '1',
          targetReturnPercent: '5',
          maxLossPercent: '10',
        });
        expectNoExecution(first);
        wrappers.pop()!.unmount();
        const restored = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity({ runtime: 131 }) });
        expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('20');
        expectNoExecution(restored);
      }
    );

    it('keeps a new explicit amount entered before the first node handshake over the older saved form', async () => {
      const first = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity() });
      const saved = await savePlan(first);
      wrappers.pop()!.unmount();
      const restored = render({
        assets: [XOR, VAL],
        fundingIdentity: identity({ connected: false, chain: '', runtime: 0 }),
      });
      await restored.get('[data-testid="autopilot-capital"]').setValue('20');
      expect(sessionStorage.getItem(saved.key)).toBe(saved.raw);
      await restored.setProps({ assets: [KUSD, XOR, VAL], fundingIdentity: identity() });
      expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('20');
      expect(JSON.parse(sessionStorage.getItem(saved.key)!)).toMatchObject({
        capital: '20',
        assetInAddress: XOR.address,
        assetOutAddress: VAL.address,
      });
      expectNoExecution(restored);
    });

    it.each(['account', 'source', 'chain'] as const)(
      'does not rebind explicit deferred edits after the %s changes',
      async (change) => {
        const first = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity() });
        const saved = await savePlan(first);
        wrappers.pop()!.unmount();
        const restored = render({ assets: [XOR, VAL], fundingIdentity: identity({ connected: false }) });
        await restored.get('[data-testid="autopilot-capital"]').setValue('20');
        const account = change === 'account' ? 'another-public-account' : walletAddress;
        await restored.setProps({
          walletAddress: account,
          assets: [KUSD, XOR, VAL],
          fundingIdentity: identity({
            account,
            source: change === 'source' ? 'sora' : 'polkadot-js',
            chain: change === 'chain' ? `0x${'cd'.repeat(32)}` : genesis,
          }),
        });
        expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
        expect(sessionStorage.getItem(saved.key)).toBeNull();
        expectNoExecution(restored);
      }
    );

    it.each(['account', 'source'] as const)(
      'does not adopt edits made before the first handshake under a different %s',
      async (change) => {
        const first = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity() });
        const saved = await savePlan(first);
        wrappers.pop()!.unmount();
        const restored = render({
          assets: [XOR, VAL],
          fundingIdentity: identity({ connected: false, chain: '', runtime: 0 }),
        });
        await restored.get('[data-testid="autopilot-capital"]').setValue('20');
        const account = change === 'account' ? 'another-public-account' : walletAddress;
        await restored.setProps({
          walletAddress: account,
          fundingIdentity: identity({
            account,
            source: change === 'source' ? 'sora' : 'polkadot-js',
          }),
          assets: [KUSD, XOR, VAL],
        });
        expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
        expect(sessionStorage.getItem(saved.key)).toBeNull();
        expectNoExecution(restored);
      }
    );

    it.each(['structured', 'opaque'] as const)(
      'clears malformed in-place connection state without reusing its inputs under a later %s identity',
      async (next) => {
        const wrapper = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity() });
        const saved = await savePlan(wrapper);
        await wrapper.setProps({ fundingIdentity: '[true,"malformed"' });
        expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
        expect(sessionStorage.getItem(saved.key)).toBeNull();
        await wrapper.setProps({ fundingIdentity: next === 'structured' ? identity() : 'legacy-account-and-network' });
        expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
        expect(sessionStorage.getItem(saved.key)).toBeNull();
        expectNoExecution(wrapper);
      }
    );

    it.each(['account', 'source', 'chain'] as const)(
      'clears the old public draft for a confirmed different %s after a pending connection',
      async (change) => {
        const wrapper = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity() });
        const saved = await savePlan(wrapper);
        await wrapper.setProps({ fundingIdentity: identity({ connected: false, chain: '', runtime: 0 }) });
        expect(sessionStorage.getItem(saved.key)).toBe(saved.raw);
        const account = change === 'account' ? 'another-public-account' : walletAddress;
        await wrapper.setProps({
          walletAddress: account,
          fundingIdentity: identity({
            account,
            source: change === 'source' ? 'sora' : 'polkadot-js',
            chain: change === 'chain' ? `0x${'cd'.repeat(32)}` : genesis,
          }),
        });
        expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
        expect(sessionStorage.getItem(saved.key)).toBeNull();
        expectNoExecution(wrapper);
      }
    );

    it('waits for the structured account snapshot before clearing a confirmed account switch', async () => {
      const wrapper = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity() });
      const saved = await savePlan(wrapper);
      await wrapper.setProps({ walletAddress: 'another-public-account' });
      expect(sessionStorage.getItem(saved.key)).toBe(saved.raw);
      expectNoExecution(wrapper);
      await wrapper.setProps({ fundingIdentity: identity({ account: 'another-public-account' }) });
      expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
      expect(sessionStorage.getItem(saved.key)).toBeNull();
      expectNoExecution(wrapper);
    });

    it('rejects a saved tuple for another account even when its outer wallet field matches', async () => {
      const first = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity() });
      const saved = await savePlan(first);
      sessionStorage.setItem(
        saved.key,
        JSON.stringify({ ...JSON.parse(saved.raw), identity: identity({ account: 'another-public-account' }) })
      );
      wrappers.pop()!.unmount();
      const restored = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity() });
      expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
      expect(sessionStorage.getItem(saved.key)).toBeNull();
      expectNoExecution(restored);
    });

    it.each([
      '[true,"broken"',
      '[true,"cn-public-address","polkadot-js",true,"genesis","endpoint","130"]',
      '[true,"cn-public-address","polkadot-js",true,"genesis","endpoint",130,0]',
      '["true","cn-public-address","polkadot-js",true,"genesis","endpoint",130]',
      '{}',
      'null',
    ])('rejects a malformed structured saved identity even when the current string matches: %s', async (malformed) => {
      const first = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity() });
      const saved = await savePlan(first);
      sessionStorage.setItem(saved.key, JSON.stringify({ ...JSON.parse(saved.raw), identity: malformed }));
      wrappers.pop()!.unmount();
      const restored = render({ assets: [KUSD, XOR, VAL], fundingIdentity: malformed });
      expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
      expect(sessionStorage.getItem(saved.key)).toBeNull();
      expectNoExecution(restored);
    });

    it('retains legacy exact identity matching without treating different opaque values as the same wallet', async () => {
      const first = render({ assets: [KUSD, XOR, VAL], fundingIdentity: 'legacy-account-and-network' });
      const saved = await savePlan(first);
      wrappers.pop()!.unmount();
      const restored = render({ assets: [KUSD, XOR, VAL], fundingIdentity: 'legacy-account-and-network' });
      expectPlan(restored);
      expect(sessionStorage.getItem(saved.key)).toBe(saved.raw);
      await restored.setProps({ fundingIdentity: 'different-legacy-network' });
      expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
      expect(sessionStorage.getItem(saved.key)).toBeNull();
      expectNoExecution(restored);
    });

    it('requires explicit GO after recovery and still repairs an output equal to a newly chosen input', async () => {
      const wrapper = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity() });
      await savePlan(wrapper);
      await wrapper.setProps({ fundingIdentity: identity({ endpoint: 'wss://replacement.invalid', runtime: 131 }) });
      expectPlan(wrapper);
      await wrapper.get('form').trigger('submit');
      expect(wrapper.emitted('go')).toEqual([
        [
          expect.objectContaining({
            capital: '10',
            assetInAddress: KUSD.address,
            assetOutAddress: XOR.address,
            feeBudgetXor: '1',
            targetReturnPercent: '5',
            maxLossPercent: '10',
          }),
        ],
      ]);
      expect(wrapper.emitted('start')).toBeUndefined();
      await wrapper.setProps({ awaitingWallet: true });
      await wrapper.get('[data-testid="autopilot-asset-in"]').setValue(XOR.address);
      expect(wrapper.get<HTMLSelectElement>('[data-testid="autopilot-asset-out"]').element.value).not.toBe(XOR.address);
      expect(wrapper.emitted('cancel')).toEqual([[]]);
    });
  });

  it('restores only the public 10 KUSD to XOR draft after assets and the same wallet identity return', async () => {
    const wallet = { assets: [KUSD, XOR, VAL], fundingIdentity: 'account-and-network-one' };
    const first = render(wallet);
    const key = await enterPublicDraft(first);
    await first.get('[data-testid="autopilot-fee-budget"]').setValue('1.25');
    const saved = JSON.parse(sessionStorage.getItem(key)!);
    expect(saved).toMatchObject({
      identity: wallet.fundingIdentity,
      walletAddress: 'cn-public-address',
      assetInAddress: KUSD.address,
      assetOutAddress: XOR.address,
      capital: '10',
      feeBudgetXor: '1.25',
      targetReturnPercent: '5',
      maxLossPercent: '5',
    });
    expect(Object.keys(saved).sort()).toEqual(
      [
        'assetInAddress',
        'assetOutAddress',
        'capital',
        'feeBudgetXor',
        'identity',
        'maxLossPercent',
        'savedAt',
        'targetReturnPercent',
        'version',
        'walletAddress',
      ].sort()
    );
    expect(JSON.stringify(saved)).not.toMatch(/pairingCode|token|password|apiKey|authorization/i);
    wrappers.pop()!.unmount();

    const restored = render({ ...wallet, assets: [] });
    expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
    await restored.setProps({ assets: wallet.assets });
    expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('10');
    expect(restored.get<HTMLSelectElement>('[data-testid="autopilot-asset-in"]').element.value).toBe(KUSD.address);
    expect(restored.get<HTMLSelectElement>('[data-testid="autopilot-asset-out"]').element.value).toBe(XOR.address);
    expect(restored.get<HTMLInputElement>('[data-testid="autopilot-fee-budget"]').element.value).toBe('1.25');
    expect(restored.get('[data-testid="autopilot-go"]').attributes('disabled')).toBeUndefined();
    expect(restored.emitted('go')).toBeUndefined();
    expect(restored.emitted('start')).toBeUndefined();
    expect(restored.find('[data-testid="autopilot-watching"]').exists()).toBe(false);
  });

  it('saves the validated public draft when GO is pressed and restores it after remount', async () => {
    const wallet = { assets: [KUSD, XOR, VAL], fundingIdentity: 'account-and-network-one' };
    const first = render(wallet);
    const key = await enterPublicDraft(first);
    sessionStorage.removeItem(key);
    await first.get('form').trigger('submit');
    expect(first.emitted('go')?.[0]?.[0]).toMatchObject({
      capital: '10',
      assetInAddress: KUSD.address,
      assetOutAddress: XOR.address,
    });
    expect(JSON.parse(sessionStorage.getItem(key)!)).toMatchObject({
      identity: wallet.fundingIdentity,
      walletAddress: 'cn-public-address',
      capital: '10',
      assetInAddress: KUSD.address,
      assetOutAddress: XOR.address,
    });
    wrappers.pop()!.unmount();
    const restored = render(wallet);
    expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('10');
    expect(restored.get<HTMLSelectElement>('[data-testid="autopilot-asset-in"]').element.value).toBe(KUSD.address);
    expect(restored.get<HTMLSelectElement>('[data-testid="autopilot-asset-out"]').element.value).toBe(XOR.address);
    expect(restored.emitted('go')).toBeUndefined();
    expect(restored.emitted('start')).toBeUndefined();
    expect(restored.find('[data-testid="autopilot-watching"]').exists()).toBe(false);
  });

  it.each([
    { walletAddress: 'another-account', fundingIdentity: 'account-and-network-one' },
    { walletAddress: 'cn-public-address', fundingIdentity: 'same-account-other-network' },
  ])('rejects a draft from another account or network: %j', async (identity) => {
    const first = render({ assets: [KUSD, XOR, VAL], fundingIdentity: 'account-and-network-one' });
    const key = await enterPublicDraft(first);
    wrappers.pop()!.unmount();
    const restored = render({ assets: [KUSD, XOR, VAL], ...identity });
    expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(restored.emitted('go')).toBeUndefined();
    expect(restored.emitted('start')).toBeUndefined();
  });

  it.each([
    { capital: '0.999999999999999999', valid: false },
    { capital: '1', valid: false },
    { capital: '1.000000000000000001', valid: false },
    { capital: '1.000000000000000002', valid: true },
  ])('restores an XOR draft only when $capital leaves two base units after its reserve', async ({ capital, valid }) => {
    const wallet = { assets: [KUSD, XOR, VAL], fundingIdentity: 'account-and-network-one' };
    const first = render(wallet);
    const key = await enterPublicDraft(first);
    const stored = JSON.parse(sessionStorage.getItem(key)!);
    sessionStorage.setItem(
      key,
      JSON.stringify({ ...stored, capital, assetInAddress: XOR.address, assetOutAddress: VAL.address })
    );
    wrappers.pop()!.unmount();

    const restored = render(wallet);
    expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe(
      valid ? capital : ''
    );
    expect(sessionStorage.getItem(key) !== null).toBe(valid);
    expect(restored.get('[data-testid="autopilot-go"]').attributes('disabled') === undefined).toBe(valid);
    expect(restored.emitted('go')).toBeUndefined();
    expect(restored.emitted('start')).toBeUndefined();
  });

  it.each([
    { capital: '0.000000000000000001', valid: false },
    { capital: '0.000000000000000002', valid: true },
  ])('restores a non-XOR draft only when $capital allows a partial order', async ({ capital, valid }) => {
    const wallet = { assets: [KUSD, XOR, VAL], fundingIdentity: 'account-and-network-one' };
    const first = render(wallet);
    const key = await enterPublicDraft(first);
    const stored = JSON.parse(sessionStorage.getItem(key)!);
    sessionStorage.setItem(key, JSON.stringify({ ...stored, capital }));
    wrappers.pop()!.unmount();

    const restored = render(wallet);
    expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe(
      valid ? capital : ''
    );
    expect(sessionStorage.getItem(key) !== null).toBe(valid);
    expect(restored.get('[data-testid="autopilot-go"]').attributes('disabled') === undefined).toBe(valid);
    expect(restored.emitted('go')).toBeUndefined();
  });

  it.each([
    {
      name: 'expired',
      change: (saved: Record<string, unknown>) => ({ ...saved, savedAt: Date.now() - 25 * 60 * 60 * 1000 }),
    },
    { name: 'negative amount', change: (saved: Record<string, unknown>) => ({ ...saved, capital: '-10' }) },
    {
      name: 'extra authority field',
      change: (saved: Record<string, unknown>) => ({ ...saved, sessionToken: 'secret' }),
    },
  ])('discards a $name draft without starting research or trading', async ({ change }) => {
    const wallet = { assets: [KUSD, XOR, VAL], fundingIdentity: 'account-and-network-one' };
    const first = render(wallet);
    const key = await enterPublicDraft(first);
    sessionStorage.setItem(key, JSON.stringify(change(JSON.parse(sessionStorage.getItem(key)!))));
    wrappers.pop()!.unmount();
    const restored = render(wallet);
    expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(restored.emitted('go')).toBeUndefined();
    expect(restored.emitted('start')).toBeUndefined();
  });

  it('clears the visible draft when the connected account changes in place', async () => {
    const wrapper = render({ assets: [KUSD, XOR, VAL], fundingIdentity: 'account-and-network-one' });
    const key = await enterPublicDraft(wrapper);
    await wrapper.setProps({ walletAddress: 'another-account', fundingIdentity: 'account-and-network-two' });
    expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(wrapper.emitted('go')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('shows exact wallet shortfalls beside GO and lets the user refresh without trading', async () => {
    const wrapper = render({ assets: [KUSD, XOR], fundingIdentity: 'wallet-1' });
    await wrapper.get('[data-testid="autopilot-asset-in"]').setValue(KUSD.address);
    await wrapper.get('[data-testid="autopilot-asset-out"]').setValue(XOR.address);
    await wrapper.get('[data-testid="autopilot-capital"]').setValue('10');
    await wrapper.setProps({
      setupFundingState: 'ready',
      setupFunding: {
        assetInAddress: KUSD.address,
        assetInCodec: '9102677405771664461',
        xorCodec: '119868161609067204',
      },
    });
    const setup = wrapper.get('[data-testid="autopilot-setup-funding"]');
    expect(setup.text()).toContain('Add 0.897322594228335539 KUSD');
    expect(setup.text()).toContain('Add 0.880131838390932796 XOR');
    expect(setup.find('code').text()).toBe('cn-public-address');
    await wrapper.get('[data-testid="autopilot-setup-funding-refresh"]').trigger('click');
    expect(wrapper.emitted('readSetupFunding')?.at(-1)).toEqual([KUSD.address]);
    expect(wrapper.emitted('go')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
    await wrapper.setProps({ setupFundingState: 'error', setupFunding: null });
    expect(setup.text()).toContain('bots.autopilot.setupFunding.unavailable');
    expect(setup.text()).not.toContain('Add 0.897322594228335539 KUSD');
  });

  it('explains that desktop watches need a fresh AI response without changing automatic API watches', async () => {
    const wrapper = render({ stage: 'watching', desktopMode: true });
    expect(wrapper.get('[data-testid="autopilot-watching"]').text()).toContain(
      'Open your AI for each new check. Keep this page open.'
    );
    expect(wrapper.emitted('go')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
    await wrapper.setProps({ desktopMode: false });
    expect(wrapper.get('[data-testid="autopilot-watching"]').text()).toContain('bots.autopilot.watch.note');
    expect(wrapper.text()).not.toContain('Open your AI for each new check.');
  });

  it('offers the current desktop link while a request awaits AI, with copying as a linkless fallback', async () => {
    const link = 'codex://threads/new?prompt=current-request';
    const wrapper = render({
      stage: 'research',
      busy: true,
      desktopPending: true,
      desktopLink: link,
      desktopPrompt: 'Current public task',
    });
    const action = wrapper.get('[data-testid="autopilot-open-desktop"]');
    expect(action.classes()).toContain('autopilot-primary');
    expect(action.attributes()).toMatchObject({ href: link, target: '_blank', rel: 'noopener noreferrer' });
    expect(action.element.closest('details')).toBeNull();
    expect(wrapper.get('[data-testid="autopilot-copy-desktop-prompt"]').attributes('disabled')).toBeUndefined();
    expect(wrapper.emitted('go')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
    await wrapper.setProps({ desktopLink: '' });
    expect(wrapper.find('[data-testid="autopilot-open-desktop"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="autopilot-copy-desktop-prompt"]').exists()).toBe(true);
    await wrapper.setProps({ desktopLink: link, desktopPending: false });
    expect(wrapper.find('[data-testid="autopilot-open-desktop"]').exists()).toBe(false);
  });
  it.each([
    { input: KUSD, text: 'Plus' },
    { input: XOR, text: 'Includes' },
  ])(
    'shows the current fee reserve beside GO for $input.symbol without granting funding or trading authority',
    async ({ input, text }) => {
      const wrapper = render({ assets: [KUSD, XOR], stage: 'fund' });
      await wrapper.get('[data-testid="autopilot-asset-in"]').setValue(input.address);
      await wrapper.get('[data-testid="autopilot-capital"]').setValue('10');
      const note = wrapper.get('[data-testid="autopilot-fee-reserve"]');
      expect(note.text()).toBe(`${text} 1 XOR for network fees.`);
      expect(note.element.closest('details')).toBeNull();
      expect(wrapper.get('[data-testid="autopilot-go"]').attributes('disabled')).toBeUndefined();
      await wrapper.get('[data-testid="autopilot-fee-budget"]').setValue('1.25');
      expect(note.text()).toBe(`${text} 1.25 XOR for network fees.`);
      expect(wrapper.find('[data-testid="autopilot-funding"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="autopilot-start"]').exists()).toBe(false);
      expect(wrapper.emitted('go')).toBeUndefined();
      expect(wrapper.emitted('start')).toBeUndefined();
    }
  );
  it('requires two spendable base units outside an XOR fee reserve before GO', async () => {
    const wrapper = render({ assets: [XOR, VAL], stage: 'fund' });
    const capital = wrapper.get('[data-testid="autopilot-capital"]');
    const reserve = wrapper.get('[data-testid="autopilot-fee-budget"]');
    const go = wrapper.get('[data-testid="autopilot-go"]');
    for (const amount of ['0.999999999999999999', '1', '1.000000000000000001']) {
      await capital.setValue(amount);
      expect(go.attributes('disabled')).toBeDefined();
      expect(wrapper.get('[data-testid="autopilot-error"]').text()).toBe(
        'Increase the XOR trading budget; too little remains after its fee reserve for a partial trade.'
      );
      expect(wrapper.find('[data-testid="autopilot-fee-reserve"]').exists()).toBe(false);
      await wrapper.get('form').trigger('submit');
      expect(wrapper.emitted('go')).toBeUndefined();
    }
    await capital.setValue('1.000000000000000002');
    expect(go.attributes('disabled')).toBeUndefined();
    expect(wrapper.find('[data-testid="autopilot-error"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="autopilot-fee-reserve"]').text()).toBe('Includes 1 XOR for network fees.');
    await reserve.setValue('1.000000000000000001');
    expect(go.attributes('disabled')).toBeDefined();
    await reserve.setValue('1');
    expect(go.attributes('disabled')).toBeUndefined();
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('go')?.[0]?.[0]).toMatchObject({
      capital: '1.000000000000000002',
      feeBudgetXor: '1',
      assetInAddress: XOR.address,
      assetOutAddress: VAL.address,
    });
    await wrapper.setProps({ assets: [XOR, VAL, KUSD] });
    await wrapper.get('[data-testid="autopilot-asset-in"]').setValue(KUSD.address);
    await capital.setValue('0.000000000000000001');
    expect(go.attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="autopilot-error"]').text()).toBe(
      'Increase the trading budget; it is too small for a partial trade.'
    );
    await capital.setValue('0.000000000000000002');
    expect(go.attributes('disabled')).toBeUndefined();
    expect(wrapper.get('[data-testid="autopilot-fee-reserve"]').text()).toBe('Plus 1 XOR for network fees.');
    expect(wrapper.emitted('start')).toBeUndefined();
  });
  it('offers direct expired desktop request recovery without submitting a new budget or approving trading', async () => {
    const wrapper = render({ assets: [KUSD, XOR], stage: 'fund' });
    await wrapper.get('[data-testid="autopilot-asset-in"]').setValue(KUSD.address);
    await wrapper.get('[data-testid="autopilot-asset-out"]').setValue(XOR.address);
    await wrapper.get('[data-testid="autopilot-capital"]').setValue('10');
    await wrapper.setProps({
      stage: 'watching',
      desktopMode: true,
      desktopConnected: true,
      error: 'This task expired.',
      canRefreshDesktopRequest: true,
    });
    const refresh = wrapper.get('[data-testid="autopilot-refresh-desktop"]');
    expect(refresh.text()).toBe('bots.codex.prepareAgain');
    expect(refresh.attributes('type')).toBe('button');
    await refresh.trigger('click');
    expect(wrapper.emitted('refreshDesktopRequest')).toEqual([[]]);
    expect(wrapper.emitted('go')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
    expect(wrapper.emitted('cancel')).toBeUndefined();
    expect((wrapper.get('[data-testid="autopilot-capital"]').element as HTMLInputElement).value).toBe('10');
    expect((wrapper.get('[data-testid="autopilot-asset-out"]').element as HTMLSelectElement).value).toBe(XOR.address);
    expect(wrapper.find('[data-testid="autopilot-watch-stop"]').exists()).toBe(true);
    await wrapper.setProps({ busy: true });
    await refresh.trigger('click');
    expect(wrapper.emitted('refreshDesktopRequest')).toHaveLength(1);
    await wrapper.setProps({ busy: false, canRefreshDesktopRequest: false });
    expect(wrapper.find('[data-testid="autopilot-refresh-desktop"]').exists()).toBe(false);
    await wrapper.setProps({ stage: 'fund', canRefreshDesktopRequest: true });
    expect(wrapper.find('[data-testid="autopilot-refresh-desktop"]').exists()).toBe(false);
  });

  it('shows a paused reload watch with its exact public budget and an explicit resume action', async () => {
    const wrapper = render({
      assets: [KUSD, XOR],
      fundingIdentity: 'same-wallet-and-network',
      canResumeWatch: true,
      recoveryInput: {
        assetInAddress: KUSD.address,
        assetOutAddress: XOR.address,
        capital: '10',
        feeBudgetXor: '1',
        targetReturnPercent: '5',
        maxLossPercent: '5',
      },
    });
    expect(wrapper.get('[data-testid="autopilot-watch-recovery"]').text()).toContain('bots.autopilot.watch.paused');
    expect((wrapper.get('[data-testid="autopilot-capital"]').element as HTMLInputElement).value).toBe('10');
    expect((wrapper.get('[data-testid="autopilot-asset-in"]').element as HTMLSelectElement).value).toBe(KUSD.address);
    expect((wrapper.get('[data-testid="autopilot-asset-out"]').element as HTMLSelectElement).value).toBe(XOR.address);
    expect(wrapper.find('[data-testid="autopilot-go"]').exists()).toBe(false);
    await wrapper.get('[data-testid="autopilot-watch-resume"]').trigger('click');
    expect(wrapper.emitted('resumeWatch')).toEqual([[]]);
    expect(wrapper.emitted('go')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
    expect(wrapper.get('[data-testid="autopilot-capital"]').attributes('disabled')).toBeDefined();
    expect(wrapper.emitted('cancel')).toBeUndefined();
  });

  it('keeps a paused watch and its exact budget through transient funding identities', async () => {
    const identity = 'account-and-network-one';
    const first = render({ assets: [KUSD, XOR, VAL], fundingIdentity: identity });
    const draftKey = await enterPublicDraft(first);
    await first.get('[data-testid="autopilot-fee-budget"]').setValue('1.25');
    const savedDraft = sessionStorage.getItem(draftKey);
    wrappers.pop()!.unmount();

    const restored = render({
      assets: [],
      walletConnected: false,
      walletAddress: '',
      fundingIdentity: 'node-initializing',
      canResumeWatch: true,
      recoveryInput: null,
    });
    expect(restored.get('[data-testid="autopilot-watch-resume"]').attributes('disabled')).toBeUndefined();
    await restored.setProps({
      walletConnected: true,
      walletAddress: 'cn-public-address',
      fundingIdentity: 'temporary-node-identity',
      assets: [KUSD, XOR, VAL],
    });
    expect(sessionStorage.getItem(draftKey)).toBe(savedDraft);
    expect(restored.find('[data-testid="autopilot-watch-recovery"]').exists()).toBe(true);
    expect(restored.get('[data-testid="autopilot-watch-resume"]').attributes('disabled')).toBeDefined();
    await restored.get('[data-testid="autopilot-watch-resume"]').trigger('click');
    expect(restored.emitted('resumeWatch')).toBeUndefined();

    const recoveryInput = {
      assetInAddress: KUSD.address,
      assetOutAddress: XOR.address,
      capital: '10',
      feeBudgetXor: '1',
      targetReturnPercent: '5',
      maxLossPercent: '5',
    };
    await restored.setProps({ fundingIdentity: identity, recoveryInput });
    expect(restored.get('[data-testid="autopilot-watch-resume"]').attributes('disabled')).toBeUndefined();
    expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('10');
    expect(restored.get<HTMLSelectElement>('[data-testid="autopilot-asset-in"]').element.value).toBe(KUSD.address);
    expect(restored.get<HTMLSelectElement>('[data-testid="autopilot-asset-out"]').element.value).toBe(XOR.address);
    expect(restored.get<HTMLInputElement>('[data-testid="autopilot-fee-budget"]').element.value).toBe('1');
    expect(sessionStorage.getItem(draftKey)).toBe(savedDraft);

    await restored.setProps({ fundingIdentity: 'temporary-node-identity', recoveryInput: null });
    expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('10');
    expect(sessionStorage.getItem(draftKey)).toBe(savedDraft);
    await restored.setProps({ fundingIdentity: identity, recoveryInput });
    await restored.setProps({ stage: 'connect', canResumeWatch: false });
    await restored.setProps({ stage: 'fund', canResumeWatch: true });
    expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('10');
    expect(restored.get<HTMLInputElement>('[data-testid="autopilot-fee-budget"]').element.value).toBe('1');
    expect(restored.emitted('cancel')).toBeUndefined();
    expect(restored.emitted('go')).toBeUndefined();
    expect(restored.emitted('start')).toBeUndefined();

    await restored.setProps({
      stage: 'welcome',
      walletAddress: 'another-account',
      fundingIdentity: 'another-account-and-network',
      canResumeWatch: true,
      recoveryInput: null,
    });
    expect(restored.get('[data-testid="autopilot-watch-resume"]').attributes('disabled')).toBeDefined();
    expect(restored.find('[data-testid="autopilot-go"]').exists()).toBe(false);
    await restored.get('form').trigger('submit');
    expect(restored.emitted('go')).toBeUndefined();
    await restored.get('[data-testid="autopilot-watch-stop"]').trigger('click');
    expect(restored.emitted('cancel')).toEqual([[]]);
    await restored.setProps({ canResumeWatch: false });
    expect(restored.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
    expect(sessionStorage.getItem(draftKey)).toBeNull();
  });

  it('shows the original saved watch read-only under another wallet and reconnects without replacing its limits', async () => {
    const completedThrough = Date.parse('2026-09-25T05:00:00Z');
    const recovery: AutopilotWatchRecovery = {
      input: {
        assetInAddress: KUSD.address,
        assetOutAddress: XOR.address,
        capital: '10',
        feeBudgetXor: '1',
        targetReturnPercent: '5',
        maxLossPercent: '10',
        title: 'Maximize XOR',
        valuationAsset: 'output',
      },
      walletAddress: 'tc1-public-address',
      trainingDiagnostics: {
        stage: 'training',
        intentKey: 'fixture-only',
        completedThrough,
        failures: [{ candidate: 1, reasons: ['netLoss'] }],
      },
    };
    const wrapper = render({
      assets: [],
      walletConnected: false,
      walletAddress: '',
      fundingIdentity: '',
      canResumeWatch: true,
      recoveryInput: null,
      watchRecovery: recovery,
    });
    expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('10');
    expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-loss"]').element.value).toBe('10');
    await wrapper.setProps({
      assets: [KUSD, XOR, VAL],
      walletConnected: true,
      walletAddress: 'sora-store-public-address',
      fundingIdentity: 'sora-store-identity',
    });
    expect(wrapper.get<HTMLSelectElement>('[data-testid="autopilot-asset-in"]').element.value).toBe(KUSD.address);
    expect(wrapper.get<HTMLSelectElement>('[data-testid="autopilot-asset-out"]').element.value).toBe(XOR.address);
    for (const field of ['capital', 'asset-in', 'asset-out', 'target', 'loss', 'fee-budget'])
      expect(wrapper.get(`[data-testid="autopilot-${field}"]`).attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="autopilot-watch-owner"]').text()).toBe('tc1-public-address');
    expect(wrapper.get('[data-testid="autopilot-watch-recovery"]').text()).toContain('ux.swap.accountUnavailable');
    const details = wrapper.get('[data-testid="autopilot-diagnostics"]');
    expect(details.text()).toContain('Last check');
    expect(details.text()).toContain('2026');
    expect(details.text()).toContain('UTC');
    expect(details.text()).toContain(messages.bots.autopilot.diagnostics.netLoss);
    expect(wrapper.get('[data-testid="autopilot-watch-resume"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-testid="autopilot-setup-funding"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="autopilot-wallet-address"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('sora-store-public-address');
    expect(wrapper.emitted('readSetupFunding')).toBeUndefined();
    await wrapper.get('[data-testid="autopilot-watch-wallet"]').trigger('click');
    expect(wrapper.emitted('wallet')).toEqual([[]]);
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('go')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
    expect(wrapper.emitted('cancel')).toBeUndefined();
    expect(sessionStorage.length).toBe(0);

    await wrapper.setProps({
      walletAddress: recovery.walletAddress,
      fundingIdentity: 'tc1-current-identity',
      recoveryInput: recovery.input,
    });
    expect(wrapper.get('[data-testid="autopilot-watch-resume"]').attributes('disabled')).toBeUndefined();
    expect(wrapper.find('[data-testid="autopilot-watch-wallet"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="autopilot-wallet-address"]').text()).toBe(recovery.walletAddress);
    expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('10');
    expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-loss"]').element.value).toBe('10');
    expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-fee-budget"]').element.value).toBe('1');
    expect(wrapper.emitted('resumeWatch')).toBeUndefined();
    await wrapper.get('[data-testid="autopilot-watch-resume"]').trigger('click');
    expect(wrapper.emitted('resumeWatch')).toEqual([[]]);
    expect(wrapper.emitted('readSetupFunding')).toEqual([[KUSD.address]]);
    expect(sessionStorage.length).toBe(0);
  });

  it('dates a saved pre-draft failure and does not present an earlier training result as the latest check', () => {
    const completedThrough = Date.parse('2026-09-25T05:00:00Z');
    const wrapper = render({
      canResumeWatch: true,
      watchRecovery: {
        walletAddress: 'tc1-public-address',
        input: {
          assetInAddress: XOR.address,
          assetOutAddress: VAL.address,
          capital: '10',
          feeBudgetXor: '1',
          targetReturnPercent: '5',
          maxLossPercent: '10',
          title: 'Maximize VAL',
        },
        trainingDiagnostics: {
          stage: 'training',
          intentKey: 'fixture-only',
          completedThrough: completedThrough - 3_600_000,
          failures: [{ candidate: 1, reasons: ['netLoss'] }],
        },
        lastFailure: { intentKey: 'fixture-only', completedThrough, errorKey: 'bots.errors.quote' },
      },
    });
    expect(wrapper.find('[data-testid="autopilot-diagnostics"]').exists()).toBe(false);
    const failure = wrapper.get('[data-testid="autopilot-watch-saved-error"]');
    expect(failure.text()).toContain('Last check');
    expect(failure.text()).toContain('05:00');
    expect(failure.text()).toContain('UTC');
    expect(failure.text()).toContain('bots.errors.quote');
    expect(wrapper.emitted('readSetupFunding')).toBeUndefined();
  });

  it('keeps the exact editable budget while watching and stops without submitting or authorizing', async () => {
    const wrapper = render({ assets: [KUSD, XOR], stage: 'fund' });
    await wrapper.get('[data-testid="autopilot-asset-in"]').setValue(KUSD.address);
    await wrapper.get('[data-testid="autopilot-asset-out"]').setValue(XOR.address);
    await wrapper.get('[data-testid="autopilot-capital"]').setValue('10');
    await wrapper.setProps({
      stage: 'watching',
      watchNextCheckAt: Date.UTC(2026, 8, 24, 9, 1),
      error: 'No strategy met your limits.',
      diagnostics: { stage: 'training', failures: [{ candidate: 1, reasons: ['netLoss'] }] },
    });
    expect((wrapper.get('[data-testid="autopilot-capital"]').element as HTMLInputElement).value).toBe('10');
    expect(wrapper.get('[data-testid="autopilot-watching"]').text()).toContain('bots.autopilot.watch.title');
    expect(wrapper.get('[data-testid="autopilot-watch-next"]').text()).toContain('bots.autopilot.watch.next');
    expect(wrapper.find('[data-testid="autopilot-go"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="autopilot-error"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="autopilot-diagnostics"]').text()).toContain(
      'No net gain, or no advantage over holding.'
    );
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('go')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
    await wrapper.get('[data-testid="autopilot-watch-stop"]').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    await wrapper.get('[data-testid="autopilot-capital"]').setValue('11');
    expect(wrapper.emitted('cancel')).toHaveLength(2);
    await wrapper.setProps({ diagnostics: null, error: 'This task expired.' });
    expect(wrapper.get('[data-testid="autopilot-watch-error"]').text()).toBe('This task expired.');
  });

  it('shows dated fee pressure while watching and keeps the full failed-check diagnosis collapsed', async () => {
    const diagnostics = readAutopilotQualificationDiagnostics(
      createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['netLoss', 'goalTradeCost'] }], {
        sharePercent: '40.0',
        maxLossPercent: '10',
        observedAt: 1_789_997_040_000,
        markAt: 1_789_996_800_000,
      })
    );
    expect(diagnostics?.failures[0].reasons).toEqual(['netLoss', 'goalTradeCost']);
    const wrapper = render({ stage: 'watching', desktopMode: true, companionConnected: true, diagnostics });
    const watching = wrapper.get('[data-testid="autopilot-watching"]');
    const fee = watching.get('[data-testid="autopilot-watch-fee-pressure"]');
    expect(fee.element.closest('details')).toBeNull();
    const format = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });
    expect(fee.text()).toContain(`Fee quote ${format.format(1_789_997_040_000)}`);
    expect(fee.text()).toContain(`pool mark ${format.format(1_789_996_800_000)}`);
    expect(fee.text()).toContain('one fee ~40.0% of your 10% loss allowance');
    expect(watching.text()).toContain('bots.autopilot.watch.companionNote');
    const details = wrapper.get('[data-testid="autopilot-diagnostics"]');
    expect(details.attributes('open')).toBeUndefined();
    expect(details.get('summary').text()).toBe('bots.autopilot.diagnostics.lastCheck');
    expect(details.find('[data-testid="autopilot-fee-pressure"]').exists()).toBe(false);
    expect(details.findAll('li')).toHaveLength(1);
    expect(details.get('li').text()).toContain('bots.errors.goalTradeCost');
    expect(wrapper.emitted('go')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
    await wrapper.setProps({ stage: 'fund' });
    expect(wrapper.find('[data-testid="autopilot-watch-fee-pressure"]').exists()).toBe(false);
    await wrapper.setProps({ stage: 'watching', diagnostics: null });
    expect(wrapper.find('[data-testid="autopilot-watch-fee-pressure"]').exists()).toBe(false);
  });

  it('labels a failed watch with its verified data boundary and omits an absent or invalid boundary', async () => {
    const completedThrough = Date.UTC(2026, 8, 22, 6);
    const diagnostics = { stage: 'training' as const, failures: [{ candidate: 1, reasons: ['netLoss' as const] }] };
    const wrapper = render({ stage: 'watching', diagnostics, diagnosticsCompletedThrough: completedThrough });
    const formatted = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    }).format(completedThrough);
    expect(wrapper.get('[data-testid="autopilot-diagnostics"] summary').text()).toBe(
      `Last check · data through ${formatted}`
    );
    await wrapper.setProps({ diagnosticsCompletedThrough: completedThrough + 1 });
    expect(wrapper.get('[data-testid="autopilot-diagnostics"] summary').text()).toBe(
      'bots.autopilot.diagnostics.lastCheck'
    );
    await wrapper.setProps({ diagnosticsCompletedThrough: null });
    expect(wrapper.get('[data-testid="autopilot-diagnostics"] summary').text()).toBe(
      'bots.autopilot.diagnostics.lastCheck'
    );
    await wrapper.setProps({ diagnostics: null, diagnosticsCompletedThrough: completedThrough });
    expect(wrapper.find('[data-testid="autopilot-diagnostics"]').exists()).toBe(false);
  });

  it('dates an error-only last check without attaching an invalid or missing hour', async () => {
    const completedThrough = Date.UTC(2026, 8, 22, 6);
    const wrapper = render({
      stage: 'watching',
      error: 'Fresh quote unavailable',
      diagnosticsCompletedThrough: completedThrough,
    });
    const formatted = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    }).format(completedThrough);
    expect(wrapper.get('[data-testid="autopilot-watch-error"]').text()).toBe(
      `Last check · data through ${formatted}: Fresh quote unavailable`
    );
    await wrapper.setProps({ diagnosticsCompletedThrough: completedThrough + 1 });
    expect(wrapper.get('[data-testid="autopilot-watch-error"]').text()).toBe('Fresh quote unavailable');
    await wrapper.setProps({ diagnosticsCompletedThrough: null });
    expect(wrapper.get('[data-testid="autopilot-watch-error"]').text()).toBe('Fresh quote unavailable');
  });

  it('dates an insufficient fee budget while the next hourly check remains scheduled', () => {
    const completedThrough = Date.UTC(2026, 8, 22, 6);
    const wrapper = render({
      stage: 'watching',
      error: messages.bots.autopilot.errors.insufficientFeeBudget,
      diagnosticsCompletedThrough: completedThrough,
      watchNextCheckAt: completedThrough + 3_600_000,
    });
    const formatted = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    }).format(completedThrough);
    expect(wrapper.get('[data-testid="autopilot-watch-error"]').text()).toBe(
      `Last check · data through ${formatted}: ${messages.bots.autopilot.errors.insufficientFeeBudget}`
    );
    expect(wrapper.get('[data-testid="autopilot-watch-next"]').text()).toContain('bots.autopilot.watch.next');
  });

  it('resumes an existing exact epoch only after reading its orders, without reset or duplicate holdings', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(GOAL_TEST_START);
    const exact = goalStorageBot();
    const wrapper = render({ stage: 'running', selectedBot: exact, bots: [exact] });
    expect(wrapper.find('.autopilot-holdings').exists()).toBe(false);
    expect(wrapper.find('[data-testid="autopilot-new-goal"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="autopilot-stop"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="autopilot-resume"]').attributes('disabled')).toBeDefined();
    await wrapper.setProps({ orders: [] });
    expect(wrapper.get('[data-testid="autopilot-resume"]').attributes('disabled')).toBeUndefined();
    expect(wrapper.get('[data-testid="goal-budget"]').text()).toBe('10KUSD');
    await wrapper.get('[data-testid="autopilot-resume"]').trigger('click');
    expect(wrapper.emitted('resume')).toEqual([[exact.id]]);
    expect(wrapper.emitted('go')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
    await wrapper.setProps({ orders: [goalStorageOrder(exact)] });
    expect(wrapper.get('[data-testid="autopilot-resume"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.exact.pending');
  });

  it('keeps the original exact deadline and disables resume while closure is pending', () => {
    vi.useFakeTimers();
    const exact = goalStorageBot();
    vi.setSystemTime(exact.exactGoalState.episode.endedAtMs + 1);
    const wrapper = render({ stage: 'running', selectedBot: exact, orders: [] });
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.exact.finalizing');
    expect(wrapper.get('[data-testid="autopilot-resume"]').attributes('disabled')).toBeDefined();
    expect(wrapper.emitted('resume')).toBeUndefined();
  });

  it('labels new limits and approved drawdown goals distinctly from legacy baseline loss goals', async () => {
    const wrapper = render();
    expect(wrapper.get('[data-testid="autopilot-loss"]').element.closest('label')?.textContent).toContain(
      'bots.goals.drawdownLabel'
    );
    await wrapper.setProps({ stage: 'review', reviewBot: bot, funding });
    expect(wrapper.text()).toContain('bots.autopilot.target 5 5');
    expect(wrapper.text()).not.toContain('bots.autopilot.targetDrawdown');
    await wrapper.setProps({ reviewBot: { ...bot, goal: { ...bot.goal, lossMetric: 'drawdown' } } });
    expect(wrapper.text()).toContain('bots.autopilot.targetDrawdown 5 5');
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('keeps qualification reasons collapsed above GO and preserves the exact budget and pair', async () => {
    const wrapper = render({ assets: [XOR, VAL, KUSD], stage: 'fund' });
    await wrapper.get('[data-testid="autopilot-capital"]').setValue('10');
    await wrapper.get('[data-testid="autopilot-asset-in"]').setValue(KUSD.address);
    await wrapper.get('[data-testid="autopilot-asset-out"]').setValue(XOR.address);
    await wrapper.setProps({
      error: 'No strategy met your limits. Funds untouched.',
      diagnostics: {
        stage: 'training',
        failures: [
          { candidate: 1, reasons: ['netLoss'] },
          { candidate: 2, reasons: ['insufficientTrades', 'drawdown'] },
          { candidate: 3, reasons: ['netLoss'] },
        ],
        feePressure: {
          sharePercent: '90.7',
          maxLossPercent: '5',
          observedAt: 1_789_997_040_000,
          markAt: 1_789_996_800_000,
        },
      },
    });
    const details = wrapper.get('[data-testid="autopilot-diagnostics"]');
    expect(details.attributes('open')).toBeUndefined();
    expect(details.get('summary').text()).toBe('bots.autopilot.diagnostics.details');
    expect(details.findAll('li')).toHaveLength(3);
    expect(details.findAll('li')[0].text()).toBe('#1: No net gain, or no advantage over holding.');
    expect(details.text()).toContain('bots.autopilot.diagnostics.insufficientTrades');
    expect(details.text()).toContain('bots.autopilot.diagnostics.drawdown');
    expect(details.get('[data-testid="autopilot-fee-pressure"]').text()).toContain(
      'one fee ~90.7% of your 5% loss allowance'
    );
    expect(wrapper.get('[data-testid="autopilot-capital"]').element).toHaveProperty('value', '10');
    expect(wrapper.get('[data-testid="autopilot-asset-in"]').element).toHaveProperty('value', KUSD.address);
    expect(wrapper.get('[data-testid="autopilot-asset-out"]').element).toHaveProperty('value', XOR.address);
    const html = wrapper.html();
    expect(html.indexOf('autopilot-diagnostics')).toBeLessThan(html.indexOf('data-testid="autopilot-go"'));
    expect(wrapper.emitted('go')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
    await wrapper.setProps({ error: '', diagnostics: null });
    expect(wrapper.find('[data-testid="autopilot-diagnostics"]').exists()).toBe(false);
  });

  it('explains actual training impact and cost blocks inside the existing collapsed details', async () => {
    const wrapper = render({ assets: [XOR, VAL, KUSD], stage: 'fund' });
    await wrapper.get('[data-testid="autopilot-capital"]').setValue('10');
    await wrapper.get('[data-testid="autopilot-asset-in"]').setValue(KUSD.address);
    await wrapper.get('[data-testid="autopilot-asset-out"]').setValue(XOR.address);
    await wrapper.setProps({
      error: 'No strategy met your limits. Funds untouched.',
      diagnostics: {
        stage: 'training',
        failures: [
          { candidate: 1, reasons: ['insufficientTrades', 'priceImpact'] },
          { candidate: 2, reasons: ['insufficientTrades', 'goalTradeCost'] },
          { candidate: 3, reasons: ['netLoss', 'feeBudget'] },
        ],
      },
    });
    const details = wrapper.get('[data-testid="autopilot-diagnostics"]');
    expect(details.attributes('open')).toBeUndefined();
    const rows = details.findAll('li');
    expect(rows[0].text()).toContain('historyErrorMessages.liquidityproxy.slippagenottolerated');
    expect(rows[1].text()).toContain('bots.errors.goalTradeCost');
    expect(rows[2].text()).toContain('bots.errors.feeBudget');
    expect(rows).toHaveLength(3);
    expect(details.text()).not.toContain('bots.autopilot.diagnostics.priceImpact');
    expect(details.text()).not.toContain('bots.autopilot.diagnostics.goalTradeCost');
    expect(wrapper.get('[data-testid="autopilot-capital"]').element).toHaveProperty('value', '10');
    expect(wrapper.get('[data-testid="autopilot-asset-in"]').element).toHaveProperty('value', KUSD.address);
    expect(wrapper.get('[data-testid="autopilot-asset-out"]').element).toHaveProperty('value', XOR.address);
    expect(wrapper.emitted('go')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('shows how many authored drafts reached training and why exact quotes screened the rest', async () => {
    const wrapper = render({ assets: [XOR, VAL, KUSD], stage: 'watching' });
    await wrapper.setProps({
      diagnostics: {
        stage: 'training',
        failures: [{ candidate: 1, reasons: ['netLoss'] }],
        screening: {
          submitted: 3,
          dropped: [
            { candidate: 2, reasons: ['priceImpact', 'noSmallerExactSample'] },
            { candidate: 3, reasons: ['quoteUnavailable'] },
          ],
        },
      },
    });
    const details = wrapper.get('[data-testid="autopilot-diagnostics"]');
    expect(details.get('[data-testid="autopilot-screening-count"]').text()).toBe('3 drafted · 1 tested');
    expect(details.findAll('li')).toHaveLength(3);
    expect(details.text()).toContain('Draft #2 skipped before testing');
    expect(details.text()).toContain('No smaller size with a fresh eligible quote');
    expect(details.text()).toContain('Draft #3 skipped before testing');
    expect(details.text()).toContain('Fresh quote unavailable');
  });

  it('does not show a tested strategy when every authored draft was screened before replay', async () => {
    const wrapper = render({ assets: [XOR, VAL, KUSD], stage: 'watching' });
    await wrapper.setProps({
      diagnostics: {
        stage: 'training',
        failures: [],
        screening: {
          submitted: 1,
          dropped: [{ candidate: 1, reasons: ['quoteUnavailable', 'noSmallerExactSample'] }],
        },
      },
    });
    const details = wrapper.get('[data-testid="autopilot-diagnostics"]');
    expect(details.get('[data-testid="autopilot-screening-count"]').text()).toBe('1 drafted · 0 tested');
    expect(details.findAll('li')).toHaveLength(1);
  });

  it.each([
    ['10.6972341206832258130349913977100777', '5', '10.69'],
    ['5.009999999999999999', '5', '5.009999999999999999'],
    ['5.001000000000000001', '5.001', '5.001000000000000001'],
  ])('shows a conservative opening loss %s without hiding the failed limit', async (lossPercent, limit, display) => {
    const wrapper = render({ assets: [XOR, VAL, KUSD], stage: 'fund' });
    await wrapper.get('[data-testid="autopilot-capital"]').setValue('10');
    await wrapper.get('[data-testid="autopilot-asset-in"]').setValue(KUSD.address);
    await wrapper.get('[data-testid="autopilot-asset-out"]').setValue(XOR.address);
    await wrapper.setProps({
      error: 'This history cannot meet your loss limit.',
      diagnostics: {
        stage: 'opening',
        failures: [],
        opening: {
          lossPercent,
          maxLossPercent: limit,
          valuationSymbol: 'XOR',
          openedAt: 1789228800000,
          firstTradeAt: 1789232400000,
        },
      },
    });
    expect(wrapper.get('[data-testid="autopilot-error"]').text()).toBe('This history cannot meet your loss limit.');
    const details = wrapper.get('[data-testid="autopilot-diagnostics"]');
    expect(details.attributes('open')).toBeUndefined();
    expect(details.get('[data-testid="autopilot-opening-bound"]').text()).toBe(
      `bots.autopilot.diagnostics.opening ${display} XOR ${limit}`
    );
    expect(details.get('[data-testid="autopilot-opening-dates"]').text()).toBe(
      'bots.autopilot.diagnostics.openingDates 2026-09-12 16:00 2026-09-12 17:00 UTC'
    );
    expect(details.findAll('li')).toHaveLength(0);
    expect(wrapper.get('[data-testid="autopilot-capital"]').element).toHaveProperty('value', '10');
    expect(wrapper.get('[data-testid="autopilot-asset-in"]').element).toHaveProperty('value', KUSD.address);
    expect(wrapper.get('[data-testid="autopilot-asset-out"]').element).toHaveProperty('value', XOR.address);
    expect(wrapper.emitted('go')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('opens directly with a plain explanation, a trading budget, both tokens, and one research-only action', async () => {
    const wrapper = render({ walletConnected: false });
    expect(wrapper.findAll('.autopilot-primary')).toHaveLength(1);
    expect(wrapper.get('[data-testid="autopilot-go"]').text()).toBe('Find a strategy');
    expect(wrapper.get('[data-testid="autopilot-go"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="autopilot-capital"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="autopilot-capital"]').element.closest('label')?.textContent).toContain(
      'Trading budget (XOR)'
    );
    expect(wrapper.get('[data-testid="autopilot-asset-in"]').element).toHaveProperty('value', XOR.address);
    expect(wrapper.get('[data-testid="autopilot-asset-out"]').element).toHaveProperty('value', VAL.address);
    expect(wrapper.get('[data-testid="autopilot-asset-in"]').element.closest('details')).toBeNull();
    expect(wrapper.get('[data-testid="autopilot-asset-out"]').element.closest('details')).toBeNull();
    expect(wrapper.find('[data-testid="autopilot-begin"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="autopilot-connect-desktop"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="autopilot-intro"]').text()).toBe('bots.autopilot.intro');
    expect(wrapper.text()).not.toContain('bots.backtest');
    await wrapper.get('[data-testid="autopilot-capital"]').setValue('10');
    expect(wrapper.get('[data-testid="autopilot-go"]').attributes('disabled')).toBeUndefined();
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('go')?.[0]?.[0]).toMatchObject({ capital: '10', assetOutAddress: VAL.address });
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('shows a plain budget label until an input token is selected', async () => {
    const wrapper = render({ assets: [], walletConnected: false });
    const budgetLabel = () =>
      wrapper.get('[data-testid="autopilot-capital"]').element.closest('label')?.querySelector('span')?.textContent;
    expect(budgetLabel()).toBe('Trading budget');

    await wrapper.setProps({ assets: [KUSD, XOR] });
    await wrapper.get('[data-testid="autopilot-asset-in"]').setValue(KUSD.address);
    expect(budgetLabel()).toBe('Trading budget (KUSD)');
  });

  it('emits credentials only on connection and immediately clears the input', async () => {
    const wrapper = render({ stage: 'connect' });
    await wrapper.get('[data-testid="autopilot-use-api"]').trigger('click');
    const input = wrapper.get<HTMLInputElement>('[data-testid="autopilot-key"]');
    await input.setValue('  private-key  ');
    expect(wrapper.emitted('connect')).toBeUndefined();
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('connect')).toEqual([[{ provider: 'openai', apiKey: 'private-key', endpoint: '' }]]);
    expect(input.element.value).toBe('');
    expect(wrapper.html()).not.toContain('private-key');
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('defaults to the desktop assistant without API inputs or a claim that the account is connected', async () => {
    const wrapper = render({ stage: 'connect', desktopSupported: true });
    expect(wrapper.find('[data-testid="autopilot-key"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="autopilot-provider"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('bots.autopilot.desktop.noKey');
    await wrapper.get('[data-testid="autopilot-connect-desktop"]').trigger('click');
    expect(wrapper.emitted('connectDesktop')).toEqual([[]]);
    expect(wrapper.emitted('connect')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
    await wrapper.setProps({ stage: 'fund', desktopMode: true });
    expect(wrapper.find('[data-testid="autopilot-desktop-selected"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('bots.connected');
    await wrapper.setProps({ desktopConnected: true });
    expect(wrapper.get('[data-testid="autopilot-desktop-selected"]').text()).toContain(
      'bots.autopilot.desktop.connected'
    );
    await wrapper.get('[data-testid="autopilot-disconnect-desktop"]').trigger('click');
    expect(wrapper.emitted('disconnectDesktop')).toEqual([[]]);
  });

  it('starts in the current browser and offers same-tab controls without WebMCP support', async () => {
    const link = 'https://chatgpt.com/codex/open-app?q=prepare';
    const wrapper = render({ stage: 'connect', desktopLink: link });
    await wrapper.get('[data-testid="autopilot-connect-desktop"]').trigger('click');
    expect(wrapper.emitted('connectDesktop')).toEqual([[]]);
    expect(wrapper.find('[data-testid="autopilot-open-desktop"]').exists()).toBe(false);
    await wrapper.setProps({ desktopConnecting: true, desktopPrompt: 'Keep this tab open.' });
    expect(wrapper.get('[data-testid="autopilot-open-desktop"]').attributes('href')).toBe(link);
    expect(wrapper.get('[data-testid="autopilot-open-desktop"]').attributes('target')).toBe('_blank');
    expect(wrapper.get('[data-testid="autopilot-desktop-waiting"]').text()).toBe('bots.autopilot.desktop.keepTabOpen');
    expect(wrapper.text()).toContain('bots.autopilot.desktop.waiting');
    expect(wrapper.get('[data-testid="autopilot-desktop-prompt"]').element).toHaveProperty(
      'value',
      'Keep this tab open.'
    );
    expect(wrapper.findAll('details').every((detail) => detail.attributes('open') === undefined)).toBe(true);
    expect(wrapper.text()).not.toContain('bots.autopilot.desktop.connected');
    expect(wrapper.find('[data-testid="autopilot-key"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="autopilot-retry-desktop"]').exists()).toBe(false);
  });

  it('offers an explicit local pair action and a relative static companion download', async () => {
    const wrapper = render({ stage: 'connect', desktopConnecting: true });
    expect(wrapper.get('[data-testid="autopilot-companion-setup"]').attributes('open')).toBeUndefined();
    expect(wrapper.get('[data-testid="autopilot-companion-download"]').attributes('href')).toBe(
      './.well-known/polkaswap-codex-companion.mjs'
    );
    expect(wrapper.text()).toContain('node polkaswap-codex-companion.mjs');
    expect(wrapper.emitted('companionPair')).toBeUndefined();
    const code = wrapper.get('[data-testid="autopilot-companion-code"]');
    await code.setValue('12345678');
    expect(wrapper.get('[data-testid="autopilot-companion-pair"]').attributes('disabled')).toBeDefined();
    await code.setValue('a'.repeat(32));
    await wrapper.get('[data-testid="autopilot-companion-pair"]').trigger('click');
    expect(wrapper.emitted('companionPair')).toEqual([['a'.repeat(32)]]);
    expect(code.element).toHaveProperty('value', '');
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('keeps optional local pairing available after the browser agent connects first', async () => {
    const wrapper = render({
      stage: 'fund',
      desktopMode: true,
      desktopConnected: true,
      companionConnected: false,
      companionError: '',
    });
    const pairing = wrapper.get('[data-testid="autopilot-companion-repair"]');
    expect(pairing.attributes('open')).toBeUndefined();
    expect(pairing.text()).toContain('bots.autopilot.companion.setup');
    expect(pairing.text()).toContain('node polkaswap-codex-companion.mjs');
    expect(wrapper.get('[data-testid="autopilot-companion-repair-download"]').attributes('href')).toBe(
      './.well-known/polkaswap-codex-companion.mjs'
    );
    await wrapper.get('[data-testid="autopilot-companion-repair-code"]').setValue('a'.repeat(32));
    await wrapper.get('[data-testid="autopilot-companion-repair-pair"]').trigger('click');
    expect(wrapper.emitted('companionPair')).toEqual([['a'.repeat(32)]]);
    await wrapper.setProps({ companionConnected: true });
    expect(wrapper.find('[data-testid="autopilot-companion-repair"]').exists()).toBe(false);
  });

  it.each([
    'bots.autopilot.companion.offline',
    'bots.autopilot.companion.pairError',
    'bots.autopilot.companion.pairAgain',
  ])(
    'keeps launch/download recovery instructions visible for %s without pairing automatically',
    async (companionError) => {
      const wrapper = render({
        stage: 'research',
        busy: true,
        desktopMode: true,
        desktopConnected: true,
        desktopPending: true,
        desktopContext: '{"requestId":"pending"}',
        companionConnected: false,
        companionError,
      });
      const repair = wrapper.get('[data-testid="autopilot-companion-repair"]');
      expect(repair.text()).toContain(companionError);
      expect(repair.text()).toContain('bots.autopilot.companion.setup');
      expect(repair.text()).toContain('node polkaswap-codex-companion.mjs');
      expect(wrapper.get('[data-testid="autopilot-companion-repair-download"]').attributes()).toMatchObject({
        href: './.well-known/polkaswap-codex-companion.mjs',
        download: '',
      });
      expect(wrapper.get('[data-testid="autopilot-assistant-controls"]').exists()).toBe(true);
      expect(wrapper.emitted('companionPair')).toBeUndefined();
      expect(wrapper.emitted('go')).toBeUndefined();
      expect(wrapper.emitted('start')).toBeUndefined();
      await wrapper.get('[data-testid="autopilot-companion-repair-code"]').setValue('a'.repeat(32));
      await wrapper.get('[data-testid="autopilot-companion-repair-pair"]').trigger('click');
      expect(wrapper.emitted('companionPair')).toEqual([['a'.repeat(32)]]);
      expect(wrapper.emitted('start')).toBeUndefined();
    }
  );

  it('explains automatic hourly requests only while the local companion remains connected', async () => {
    const wrapper = render({ stage: 'watching', desktopMode: true, companionConnected: true });
    expect(wrapper.get('[data-testid="autopilot-watching"]').text()).toContain('bots.autopilot.watch.companionNote');
    await wrapper.setProps({ companionConnected: false });
    expect(wrapper.get('[data-testid="autopilot-watching"]').text()).toContain(
      'Open your AI for each new check. Keep this page open.'
    );
  });

  it('keeps the account limit visible after task expiry and allows an explicit later refresh', async () => {
    const wrapper = render({
      stage: 'research',
      desktopMode: true,
      desktopConnected: true,
      desktopPending: true,
      companionConnected: true,
      companionError: 'bots.autopilot.companion.usageLimit',
    });
    expect(wrapper.get('[data-testid="autopilot-companion-error"]').text()).toContain(
      'bots.autopilot.companion.usageLimit'
    );
    await wrapper.setProps({
      stage: 'watching',
      desktopPending: false,
      error: 'bots.codex.expired',
      canRefreshDesktopRequest: true,
    });
    expect(wrapper.get('[data-testid="autopilot-watch-error"]').text()).toContain(
      'bots.autopilot.companion.usageLimit'
    );
    expect(wrapper.get('[data-testid="autopilot-watch-error"]').text()).not.toContain('bots.codex.expired');
    expect(wrapper.emitted('refreshDesktopRequest')).toBeUndefined();
    await wrapper.get('[data-testid="autopilot-refresh-desktop"]').trigger('click');
    expect(wrapper.emitted('refreshDesktopRequest')).toEqual([[]]);
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('lets an expired companion re-pair in the same research tab without hiding manual controls', async () => {
    const wrapper = render({
      stage: 'research',
      busy: true,
      desktopMode: true,
      desktopConnected: true,
      desktopPending: true,
      desktopContext: '{"requestId":"pending"}',
      companionError: 'bots.autopilot.companion.pairAgain',
    });
    expect(wrapper.get('[data-testid="autopilot-assistant-controls"]')).toBeTruthy();
    const repair = wrapper.get('[data-testid="autopilot-companion-repair"]');
    expect(repair.attributes('open')).toBeUndefined();
    await wrapper.get('[data-testid="autopilot-companion-repair-code"]').setValue('b'.repeat(32));
    await wrapper.get('[data-testid="autopilot-companion-repair-pair"]').trigger('click');
    expect(wrapper.emitted('companionPair')).toEqual([['b'.repeat(32)]]);
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('shows a retry action after a failed local draft instead of saying it is still drafting', async () => {
    const wrapper = render({
      stage: 'research',
      desktopMode: true,
      desktopConnected: true,
      desktopPending: true,
      companionConnected: true,
      companionError: 'bots.autopilot.companion.draftError',
    });
    expect(wrapper.get('[data-testid="autopilot-companion-retry"]').text()).toContain('retryText');
    expect(wrapper.text()).not.toContain('bots.autopilot.companion.drafting');
    await wrapper.get('[data-testid="autopilot-companion-retry"]').trigger('click');
    expect(wrapper.emitted('companionRetry')).toEqual([[]]);
  });

  it('allows switching to an API to revoke a waiting desktop connection', async () => {
    const wrapper = render({ stage: 'connect', desktopConnecting: true });
    await wrapper.get('[data-testid="autopilot-use-api"]').trigger('click');
    expect(wrapper.emitted('disconnectDesktop')).toEqual([[]]);
    expect(wrapper.find('[data-testid="autopilot-key"]').exists()).toBe(true);
  });

  it('forwards the assistant handshake only after an explicit ID and clears it for a new session', async () => {
    const wrapper = render({ stage: 'connect', desktopConnecting: true, desktopConnectionId: 'session-one' });
    const input = wrapper.get('[data-testid="autopilot-agent-connection-id"]');
    expect(input.element).toHaveProperty('value', '');
    expect(wrapper.get('[data-testid="autopilot-agent-acknowledge"]').attributes('disabled')).toBeDefined();
    await input.setValue('  session-one  ');
    await wrapper.get('[data-testid="autopilot-agent-acknowledge"]').trigger('click');
    expect(wrapper.emitted('desktopAcknowledge')).toEqual([['session-one']]);
    expect(wrapper.emitted('start')).toBeUndefined();
    await wrapper.setProps({ desktopConnectionId: 'session-two' });
    expect(input.element).toHaveProperty('value', '');
    await input.setValue('a'.repeat(129));
    await wrapper.get('[data-testid="autopilot-agent-acknowledge"]').trigger('click');
    expect(wrapper.emitted('desktopAcknowledge')).toHaveLength(1);
  });

  it('forwards a bounded assistant draft without granting trading approval and clears stale input', async () => {
    const context = JSON.stringify({ requestId: 'request-one', candles: [] });
    const response = JSON.stringify({ requestId: 'request-one', strategy: { preset: 'dca' } });
    const wrapper = render({ stage: 'research', busy: true, desktopPending: true, desktopContext: context });
    expect(wrapper.get('[data-testid="autopilot-agent-context"]').attributes('readonly')).toBeDefined();
    expect(wrapper.get('[data-testid="autopilot-agent-context"]').element).toHaveProperty('value', context);
    expect(wrapper.get('[data-testid="autopilot-agent-submit"]').attributes('disabled')).toBeDefined();
    const input = wrapper.get('[data-testid="autopilot-agent-draft"]');
    await input.setValue(` ${response} `);
    await wrapper.get('[data-testid="autopilot-agent-submit"]').trigger('click');
    expect(wrapper.emitted('desktopDraft')).toEqual([[response]]);
    expect(wrapper.emitted('start')).toBeUndefined();
    await wrapper.setProps({ desktopContext: JSON.stringify({ requestId: 'request-two' }) });
    expect(input.element).toHaveProperty('value', '');
    await input.setValue('a'.repeat(32769));
    await wrapper.get('[data-testid="autopilot-agent-submit"]').trigger('click');
    expect(wrapper.emitted('desktopDraft')).toHaveLength(1);
  });

  it('exposes all 117 training candles and the trailing schema through bounded readonly context pages', async () => {
    const payload = {
      requestId: 'synthetic-full-training-context',
      candles: Array.from({ length: 117 }, (_, index) => ({
        timestamp: 1_700_000_000_000 + index * 3_600_000,
        close: `1.${'2345678901'.repeat(6)}`,
        feeClose: `2.${'3456789012'.repeat(6)}`,
      })),
      responseSchema: { type: 'object', required: ['requestId', 'strategy'] },
    };
    const context = JSON.stringify(payload);
    expect(context.length).toBeGreaterThan(10_000);
    const prompt = `Original full instructions: ${context}`;
    const wrapper = render({ stage: 'research', desktopPending: true, desktopContext: context, desktopPrompt: prompt });
    const previous = wrapper.get('[data-testid="autopilot-agent-context-previous"]');
    const next = wrapper.get('[data-testid="autopilot-agent-context-next"]');
    const pageCount = Math.ceil(context.length / 6_000);
    expect(previous.attributes('disabled')).toBeDefined();
    await previous.trigger('click');
    const pages: string[] = [];
    for (let index = 0; index < pageCount; index++) {
      const field = wrapper.get<HTMLTextAreaElement>('[data-testid="autopilot-agent-context"]');
      expect(field.attributes('readonly')).toBeDefined();
      expect(field.element.value.length).toBeLessThanOrEqual(6_000);
      expect(wrapper.get('[data-testid="autopilot-agent-context-page"]').text()).toBe(`${index + 1} / ${pageCount}`);
      pages.push(field.element.value);
      if (index < pageCount - 1) await next.trigger('click');
    }
    expect(pages.join('')).toBe(context);
    expect(JSON.parse(pages.join(''))).toEqual(payload);
    expect(pages.at(-1)).toContain('responseSchema');
    expect(next.attributes('disabled')).toBeDefined();
    await next.trigger('click');
    expect(wrapper.get<HTMLTextAreaElement>('[data-testid="autopilot-agent-context"]').element.value).toBe(
      pages.at(-1)
    );
    await previous.trigger('click');
    expect(wrapper.get<HTMLTextAreaElement>('[data-testid="autopilot-agent-context"]').element.value).toBe(
      pages.at(-2)
    );
    expect(wrapper.get<HTMLTextAreaElement>('[data-testid="autopilot-desktop-prompt"]').element.value).toBe(prompt);
    expect(wrapper.emitted('desktopDraft')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
    expect(wrapper.emitted('go')).toBeUndefined();
  });

  it('keeps surrogate pairs together at a context page boundary', async () => {
    const context = `${'a'.repeat(5_999)}𒀀${'b'.repeat(6_000)}`;
    const wrapper = render({ stage: 'research', desktopPending: true, desktopContext: context });
    const pages: string[] = [];
    for (let index = 0; index < 3; index++) {
      const value = wrapper.get<HTMLTextAreaElement>('[data-testid="autopilot-agent-context"]').element.value;
      expect(value.length).toBeLessThanOrEqual(6_000);
      expect(value.isWellFormed()).toBe(true);
      pages.push(value);
      if (index < 2) await wrapper.get('[data-testid="autopilot-agent-context-next"]').trigger('click');
    }
    expect(pages[0]).toHaveLength(5_999);
    expect(pages[1].startsWith('𒀀')).toBe(true);
    expect(pages.join('')).toBe(context);
  });

  it.each(['desktopContext', 'desktopPending', 'desktopConnectionId', 'desktopConnected', 'stage'] as const)(
    'resets context paging when %s changes',
    async (property) => {
      const context = 'a'.repeat(6_001);
      const wrapper = render({
        stage: 'research',
        desktopPending: true,
        desktopConnected: true,
        desktopConnectionId: 'session-one',
        desktopContext: context,
      });
      await wrapper.get('[data-testid="autopilot-agent-context-next"]').trigger('click');
      const updates = {
        desktopContext: `${'b'.repeat(6_001)}`,
        desktopPending: false,
        desktopConnectionId: 'session-two',
        desktopConnected: false,
        stage: 'fund' as const,
      };
      await wrapper.setProps({ [property]: updates[property] });
      await wrapper.setProps({ stage: 'research', desktopPending: true });
      const expected = property === 'desktopContext' ? 'b'.repeat(6_000) : 'a'.repeat(6_000);
      expect(wrapper.get<HTMLTextAreaElement>('[data-testid="autopilot-agent-context"]').element.value).toBe(expected);
      expect(wrapper.get('[data-testid="autopilot-agent-context-page"]').text()).toBe('1 / 2');
    }
  );

  it('shows short and empty contexts unchanged without paging controls', async () => {
    const context = JSON.stringify({ requestId: 'small-context', candles: [] });
    const wrapper = render({ stage: 'research', desktopPending: true, desktopContext: context });
    expect(wrapper.get<HTMLTextAreaElement>('[data-testid="autopilot-agent-context"]').element.value).toBe(context);
    expect(wrapper.find('[data-testid="autopilot-agent-context-next"]').exists()).toBe(false);
    await wrapper.setProps({ desktopContext: '' });
    expect(wrapper.get<HTMLTextAreaElement>('[data-testid="autopilot-agent-context"]').element.value).toBe('');
    expect(wrapper.find('[data-testid="autopilot-agent-context-previous"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="autopilot-agent-submit"]').attributes('disabled')).toBeDefined();
  });

  it('clears an unsubmitted key before switching back to the desktop option', async () => {
    const wrapper = render({ stage: 'connect', desktopSupported: true });
    await wrapper.get('[data-testid="autopilot-use-api"]').trigger('click');
    const input = wrapper.get<HTMLInputElement>('[data-testid="autopilot-key"]');
    await input.setValue('discard-this-key');
    await wrapper.get('[data-testid="autopilot-back-desktop"]').trigger('click');
    expect(input.element.value).toBe('');
    expect(wrapper.find('[data-testid="autopilot-key"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="autopilot-connect-desktop"]').exists()).toBe(true);
    expect(wrapper.emitted('connect')).toBeUndefined();
    await wrapper.get('[data-testid="autopilot-use-api"]').trigger('click');
    expect(wrapper.get('[data-testid="autopilot-key"]').element).toHaveProperty('value', '');
  });

  it('shows a user-sendable desktop task without pretending research is already running', async () => {
    const prompt = 'Prepare the AI trading strategy on this Polkaswap tab.';
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const wrapper = render({
      stage: 'research',
      busy: true,
      desktopPending: true,
      desktopPrompt: prompt,
      progress: 'Should not imply ongoing research',
    });
    expect(wrapper.attributes('aria-busy')).toBe('false');
    expect(wrapper.find('.autopilot-spinner').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Should not imply ongoing research');
    expect(wrapper.text()).toContain('bots.autopilot.desktop.sendPrompt');
    expect(wrapper.findAll('details').every((detail) => detail.attributes('open') === undefined)).toBe(true);
    expect(wrapper.get('[data-testid="autopilot-desktop-prompt"]').attributes('readonly')).toBeDefined();
    expect(wrapper.get('[data-testid="autopilot-desktop-prompt"]').element).toHaveProperty('value', prompt);
    await wrapper.get('[data-testid="autopilot-copy-desktop-prompt"]').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(prompt);
    expect(wrapper.get('[data-testid="autopilot-copy-desktop-prompt"]').text()).toBe('bots.codex.copied');
    expect(wrapper.emitted('start')).toBeUndefined();
    await wrapper.setProps({ desktopPrompt: 'Updated public task' });
    expect(wrapper.get('[data-testid="autopilot-copy-desktop-prompt"]').text()).toBe(
      'bots.autopilot.desktop.copyInstructions'
    );
    writeText.mockRejectedValueOnce(new Error('Permission denied'));
    await wrapper.get('[data-testid="autopilot-copy-desktop-prompt"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="autopilot-desktop-prompt"]').element).toHaveProperty(
      'value',
      'Updated public task'
    );
    await wrapper.get('[data-testid="autopilot-cancel"]').trigger('click');
    expect(wrapper.emitted('cancel')).toEqual([[]]);
  });

  it('clears an unsubmitted credential on provider changes and unmount', async () => {
    const wrapper = render({ stage: 'connect' });
    await wrapper.get('[data-testid="autopilot-use-api"]').trigger('click');
    const input = wrapper.get<HTMLInputElement>('[data-testid="autopilot-key"]');
    await input.setValue('openai-secret');
    await wrapper.get('[data-testid="autopilot-provider"]').setValue('jev');
    expect(input.element.value).toBe('');
    await input.setValue('relay-secret');
    wrapper.unmount();
    expect(input.element.value).toBe('');
  });

  it.each(['http://relay.test', 'https://user:password@relay.test', 'not a url'])(
    'rejects the unsupported relay %s before emitting its secret',
    async (endpoint) => {
      const wrapper = render({ stage: 'connect' });
      await wrapper.get('[data-testid="autopilot-use-api"]').trigger('click');
      await wrapper.get('[data-testid="autopilot-provider"]').setValue('jev');
      await wrapper.get('[data-testid="autopilot-endpoint"]').setValue(endpoint);
      await wrapper.get('[data-testid="autopilot-key"]').setValue('relay-key');
      await wrapper.get('form').trigger('submit');
      expect(wrapper.emitted('connect')).toBeUndefined();
      expect(wrapper.get('[data-testid="autopilot-error"]').text()).toBe('bots.autopilot.endpointNote');
    }
  );

  it('passes a custom HTTPS relay and never sends a previous provider endpoint', async () => {
    const wrapper = render({ stage: 'connect' });
    await wrapper.get('[data-testid="autopilot-use-api"]').trigger('click');
    await wrapper.get('[data-testid="autopilot-provider"]').setValue('custom');
    await wrapper.get('[data-testid="autopilot-endpoint"]').setValue('https://relay.test/ai');
    await wrapper.get('[data-testid="autopilot-key"]').setValue('relay-key');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('connect')?.[0]).toEqual([
      { provider: 'custom', apiKey: 'relay-key', endpoint: 'https://relay.test/ai' },
    ]);
    await wrapper.get('[data-testid="autopilot-provider"]').setValue('claude');
    await wrapper.get('[data-testid="autopilot-key"]').setValue('claude-key');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('connect')?.[1]).toEqual([{ provider: 'claude', apiKey: 'claude-key', endpoint: '' }]);
  });

  it('preserves amount and token choices through wallet and assistant connection', async () => {
    const wrapper = render({ walletConnected: false });
    await wrapper.get('[data-testid="autopilot-capital"]').setValue('12.5');
    await wrapper.get('[data-testid="autopilot-asset-in"]').setValue(VAL.address);
    await wrapper.get('form').trigger('submit');
    await wrapper.setProps({ stage: 'fund', awaitingWallet: true });
    expect(wrapper.get('[data-testid="autopilot-capital"]').element).toHaveProperty('value', '12.5');
    expect(wrapper.get('[role="status"]').text()).toBe('bots.connectWallet');
    expect(wrapper.findAll('.autopilot-primary')).toHaveLength(1);
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('go')).toHaveLength(2);
    await wrapper.setProps({ stage: 'connect', awaitingWallet: false, walletConnected: true });
    await wrapper.setProps({ stage: 'fund' });
    expect(wrapper.get('[data-testid="autopilot-capital"]').element).toHaveProperty('value', '12.5');
    expect(wrapper.get('[data-testid="autopilot-asset-in"]').element).toHaveProperty('value', VAL.address);
    expect(wrapper.get('[data-testid="autopilot-asset-out"]').element).toHaveProperty('value', XOR.address);
    expect(wrapper.get('[data-testid="autopilot-settings"]').attributes('open')).toBeUndefined();
    expect(wrapper.get('[data-testid="autopilot-wallet-address"]').text()).toBe('cn-public-address');
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it.each(['Price history has gaps. Try again later.', 'Price history could not be loaded. Try again.'])(
    'keeps an editable goal and one adjacent GO recovery after %s',
    async (error) => {
      const wrapper = render({ assets: [XOR, VAL, KUSD] });
      await wrapper.get('[data-testid="autopilot-capital"]').setValue('10.000000000000000001');
      await wrapper.get('[data-testid="autopilot-asset-in"]').setValue(KUSD.address);
      await wrapper.get('[data-testid="autopilot-asset-out"]').setValue(XOR.address);
      await wrapper.get('form').trigger('submit');
      await wrapper.setProps({ stage: 'connect', desktopConnecting: true });
      await wrapper.setProps({
        stage: 'research',
        busy: true,
        desktopConnecting: false,
        desktopMode: true,
        desktopConnected: true,
        progress: 'Loading market history…',
      });
      await wrapper.setProps({ stage: 'fund', busy: false, error });

      const alert = wrapper.get('[data-testid="autopilot-error"]');
      const go = wrapper.get('[data-testid="autopilot-go"]');
      expect(wrapper.findAll('[role="alert"]')).toHaveLength(1);
      expect(alert.text()).toBe(error);
      expect(go.element.previousElementSibling).toBe(alert.element);
      expect(go.attributes('aria-describedby')).toBe(alert.attributes('id'));
      expect(go.attributes('disabled')).toBeUndefined();
      expect(go.text()).toBe('Find a strategy');
      expect(wrapper.findAll('.autopilot-primary')).toHaveLength(1);
      expect(wrapper.get('[data-testid="autopilot-capital"]').element).toHaveProperty('value', '10.000000000000000001');
      expect(wrapper.get('[data-testid="autopilot-asset-in"]').element).toHaveProperty('value', KUSD.address);
      expect(wrapper.get('[data-testid="autopilot-asset-out"]').element).toHaveProperty('value', XOR.address);
      expect(wrapper.get('[data-testid="autopilot-desktop-selected"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="autopilot-progress"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="autopilot-start"]').exists()).toBe(false);
      await wrapper.get('form').trigger('submit');
      expect(wrapper.emitted('go')?.[1]).toEqual(wrapper.emitted('go')?.[0]);

      await wrapper.get('[data-testid="autopilot-capital"]').setValue('0');
      expect(wrapper.findAll('[role="alert"]')).toHaveLength(1);
      expect(wrapper.get('[role="alert"]').text()).toBe('bots.goals.errors.capital');
      expect(go.attributes('disabled')).toBeDefined();
      await wrapper.get('[data-testid="autopilot-capital"]').setValue('12.5');
      await wrapper.get('[data-testid="autopilot-asset-out"]').setValue(VAL.address);
      await wrapper.get('form').trigger('submit');
      expect(wrapper.emitted('go')?.[2]?.[0]).toMatchObject({
        capital: '12.5',
        assetInAddress: KUSD.address,
        assetOutAddress: VAL.address,
      });
      expect(wrapper.emitted('connectDesktop')).toBeUndefined();
      expect(wrapper.emitted('start')).toBeUndefined();
    }
  );

  it.each([
    ['autopilot-capital', '20'],
    ['autopilot-asset-in', VAL.address],
    ['autopilot-asset-out', 'third-token'],
    ['autopilot-fee-budget', '2'],
    ['autopilot-target', '8'],
    ['autopilot-loss', '3'],
  ])('invalidates a queued GO when %s changes while awaiting the wallet', async (field, value) => {
    const wrapper = render({
      walletConnected: false,
      assets: [XOR, VAL, { ...VAL, address: 'third-token', symbol: 'OTHER' }],
    });
    await wrapper.get('[data-testid="autopilot-capital"]').setValue('10');
    await wrapper.get('form').trigger('submit');
    await wrapper.setProps({ stage: 'fund', awaitingWallet: true });
    await wrapper.get(`[data-testid="${field}"]`).setValue(value);
    expect(wrapper.emitted('cancel')).toBeDefined();
    expect(wrapper.emitted('go')).toHaveLength(1);
    expect(wrapper.get(`[data-testid="${field}"]`).element).toHaveProperty('value', value);
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('researches an exact budget and goal without asking users to choose a strategy', async () => {
    const wrapper = render({ stage: 'fund' });
    await wrapper.get('[data-testid="autopilot-capital"]').setValue('1.000000000000000002');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('go')).toEqual([
      [
        {
          assetInAddress: XOR.address,
          assetOutAddress: VAL.address,
          capital: '1.000000000000000002',
          feeBudgetXor: '1',
          targetReturnPercent: '5',
          maxLossPercent: '5',
          title: 'bots.autopilot.maximizeGoal VAL',
        },
      ],
    ]);
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it.each(['0', '-1', '1e6', '0.0000000000000000001', 'NaN'])(
    'blocks unsupported capital %s before research',
    async (amount) => {
      const wrapper = render({ stage: 'fund' });
      await wrapper.get('[data-testid="autopilot-capital"]').setValue(amount);
      await wrapper.get('form').trigger('submit');
      expect(wrapper.emitted('go')).toBeUndefined();
      expect(wrapper.text()).toContain('bots.goals.errors.capital');
    }
  );

  it('rejects invalid limits and keeps the trading pair distinct', async () => {
    const wrapper = render({ stage: 'fund' });
    await wrapper.get('[data-testid="autopilot-capital"]').setValue('10');
    await wrapper.get('[data-testid="autopilot-fee-budget"]').setValue('0');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('go')).toBeUndefined();
    expect(wrapper.text()).toContain('bots.goals.errors.fee');
    await wrapper.get('[data-testid="autopilot-fee-budget"]').setValue('1');
    await wrapper.get('[data-testid="autopilot-loss"]').setValue('100.01');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('go')).toBeUndefined();
    expect(wrapper.text()).toContain('bots.goals.errors.percent');
    await wrapper.get('[data-testid="autopilot-asset-in"]').setValue(VAL.address);
    expect(wrapper.get('[data-testid="autopilot-asset-out"]').element).toHaveProperty('value', XOR.address);
  });

  it('shows automatic research progress and lets the parent cancel without trading', async () => {
    const wrapper = render({ stage: 'research', busy: true, progress: 'Loading market history…' });
    const status = wrapper.get('[data-testid="autopilot-progress"]');
    expect(status.text()).toBe('Loading market history…');
    expect(status.attributes()).toMatchObject({ role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    expect(wrapper.attributes('aria-busy')).toBe('false');
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1);
    expect(wrapper.text()).not.toContain('bots.autopilot.researchTitle');
    await wrapper.setProps({ progress: 'Testing candidates…' });
    expect(status.text()).toBe('Testing candidates…');
    expect(wrapper.find('input').exists()).toBe(false);
    await wrapper.get('[data-testid="autopilot-cancel"]').trigger('click');
    expect(wrapper.emitted('cancel')).toEqual([[]]);
  });

  it('requires sufficient funds and explicit consent before emitting a single signing session', async () => {
    const wrapper = render({ stage: 'review', reviewBot: bot, funding });
    expect(wrapper.get('h2').text()).toBe('Grow my balance');
    expect(wrapper.find('[data-testid="autopilot-intro"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('bots.autopilot.session');
    expect(wrapper.text()).toContain('bots.autopilot.risk');
    expect(wrapper.text()).toContain('bots.autopilot.unlockNote');
    expect(wrapper.get('[data-testid="autopilot-start"]').attributes('disabled')).toBeDefined();
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('start')).toBeUndefined();
    await wrapper.get('[data-testid="autopilot-password"]').setValue('wallet-secret');
    await wrapper.get('[data-testid="autopilot-consent"]').setValue(true);
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('start')).toEqual([[{ password: 'wallet-secret' }]]);
    expect(wrapper.get('[data-testid="autopilot-password"]').element).toHaveProperty('value', '');
    expect(wrapper.get('[data-testid="autopilot-consent"]').element).toHaveProperty('checked', false);
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('start')).toHaveLength(1);
  });

  it('offers a real wallet deposit address and balance refresh when funds are insufficient', async () => {
    const wrapper = render({ stage: 'review', reviewBot: bot, funding: { ...funding, sufficient: false } });
    expect(wrapper.find('[data-testid="autopilot-start"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="autopilot-password"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="autopilot-deposit"]').text()).toContain('cn-public-address');
    expect(wrapper.get('[data-testid="autopilot-deposit"]').text()).toContain('SORA');
    await wrapper.get('[data-testid="autopilot-refresh"]').trigger('click');
    expect(wrapper.emitted('refreshFunding')).toEqual([[]]);
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('reviews the entered XOR budget including its reserved fee allowance', () => {
    const xorBot = {
      ...bot,
      assetIn: XOR,
      portfolio: { ...bot.portfolio, initial: { [XOR.address]: '100000000000000000000' } },
    };
    const wrapper = render({ stage: 'review', reviewBot: xorBot, funding });
    expect(wrapper.get('.autopilot-review-amount').text()).toBe('100 XOR');
    expect(wrapper.get('[data-testid="autopilot-fees-included"]').text()).toBe('bots.startFlow.feeIncluded');
  });

  it('shows the selected 2 KUSD order beside the 10 KUSD budget and keeps the ceiling in limits', async () => {
    const sizedBot = {
      ...bot,
      assetIn: KUSD,
      assetOut: XOR,
      strategy: { ...bot.strategy, amount: '2' },
      policy: {
        ...bot.policy,
        maxTradeCodec: { [KUSD.address]: '10000000000000000000', [XOR.address]: '1000000000000000000' },
      },
      portfolio: {
        ...bot.portfolio,
        initial: { [KUSD.address]: '10000000000000000000', [XOR.address]: '1000000000000000000' },
      },
    };
    const wrapper = render({ stage: 'review', reviewBot: sizedBot, funding });
    expect(wrapper.get('[data-testid="autopilot-review-budget"]').text()).toBe('Trading budget (KUSD)');
    expect(wrapper.get('.autopilot-review-amount').text()).toBe('10 KUSD');
    const orderSize = wrapper.get('[data-testid="autopilot-review-trade"]');
    expect(orderSize.text()).toBe('bots.research.perTrade: 2 KUSD');
    expect(orderSize.element.closest('details')).toBeNull();
    expect(wrapper.get('.autopilot-limits').text()).toContain('bots.maxTrade (KUSD)10');
    expect(wrapper.get('[data-testid="autopilot-start"]').attributes('disabled')).toBeDefined();
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('start')).toBeUndefined();
    expect(wrapper.emitted('go')).toBeUndefined();
  });

  it('requires explicit consent with an external wallet and leaves signatures to that wallet', async () => {
    const wrapper = render({ stage: 'review', reviewBot: bot, funding, externalWallet: true });
    expect(wrapper.find('[data-testid="autopilot-password"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="autopilot-external-signing"]').text()).toContain('bots.externalSigning');
    expect(wrapper.text()).not.toContain('bots.autopilot.internalWalletRequired');
    expect(wrapper.text()).not.toContain('bots.autopilot.unlockNote');
    expect(wrapper.get('[data-testid="autopilot-start"]').text()).toContain('bots.authorizeStart');
    expect(wrapper.get('[data-testid="autopilot-consent"]').element).toHaveProperty('checked', false);
    expect(wrapper.get('[data-testid="autopilot-start"]').attributes('disabled')).toBeDefined();
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('start')).toBeUndefined();
    await wrapper.get('[data-testid="autopilot-consent"]').setValue(true);
    expect(wrapper.get('[data-testid="autopilot-start"]').attributes('disabled')).toBeUndefined();
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('start')).toEqual([[{ password: '' }]]);
    expect(wrapper.get('[data-testid="autopilot-consent"]').element).toHaveProperty('checked', false);
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('start')).toHaveLength(1);
  });

  it('lets external-wallet users research without changing wallets or approving trades', async () => {
    const wrapper = render({ stage: 'fund', externalWallet: true });
    expect(wrapper.get('[data-testid="autopilot-external-signing"]').text()).toContain('bots.externalSigning');
    expect(wrapper.find('[data-testid="autopilot-switch-wallet"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="autopilot-password"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('bots.autopilot.internalWalletRequired');
    await wrapper.get('[data-testid="autopilot-capital"]').setValue('10');
    expect(wrapper.get('[data-testid="autopilot-go"]').attributes('disabled')).toBeUndefined();
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('go')?.[0]?.[0]).toMatchObject({ capital: '10' });
    expect(wrapper.emitted('wallet')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('revokes typed password and consent when the reviewed bot or wallet changes', async () => {
    const wrapper = render({ stage: 'review', reviewBot: bot, funding });
    await wrapper.get('[data-testid="autopilot-password"]').setValue('secret');
    await wrapper.get('[data-testid="autopilot-consent"]').setValue(true);
    await wrapper.setProps({ walletAddress: 'other-wallet' });
    expect(wrapper.get('[data-testid="autopilot-password"]').element).toHaveProperty('value', '');
    expect(wrapper.get('[data-testid="autopilot-consent"]').element).toHaveProperty('checked', false);
    await wrapper.get('[data-testid="autopilot-password"]').setValue('fresh-secret');
    await wrapper.get('[data-testid="autopilot-consent"]').setValue(true);
    await wrapper.setProps({ reviewBot: { ...bot, id: 'renewed-review' } });
    expect(wrapper.get('[data-testid="autopilot-password"]').element).toHaveProperty('value', '');
    expect(wrapper.get('[data-testid="autopilot-consent"]').element).toHaveProperty('checked', false);
  });

  it('shows observed holdings and pause/stop controls only for actual active sessions', async () => {
    const wrapper = render({ stage: 'running', selectedBot: bot, activeIds: [bot.id] });
    expect(wrapper.text()).toContain('bots.status.running');
    expect(wrapper.text()).toContain('bots.swaps');
    await wrapper.get('[data-testid="autopilot-pause"]').trigger('click');
    await wrapper.get('[data-testid="autopilot-stop"]').trigger('click');
    expect(wrapper.emitted('pause')).toEqual([[bot.id]]);
    expect(wrapper.emitted('stop')).toEqual([[bot.id]]);
    await wrapper.setProps({ activeIds: [] });
    expect(wrapper.text()).toContain('bots.status.paused');
    expect(wrapper.find('[data-testid="autopilot-pause"]').exists()).toBe(false);
    await wrapper.get('[data-testid="autopilot-resume"]').trigger('click');
    expect(wrapper.emitted('resume')).toEqual([[bot.id]]);
  });

  it.each(['target', 'loss', 'expired'] as const)(
    'offers a new goal after %s without silently resuming or resetting the old baseline',
    async (outcome) => {
      const completedBot = {
        ...bot,
        status: 'paused' as const,
        goalState: {
          startedAt: 1000,
          baselineValue: '100',
          lastValue: '105',
          returnPercent: '5',
          outcome,
        },
      };
      const wrapper = render({ stage: 'running', selectedBot: completedBot });
      expect(wrapper.find('[data-testid="autopilot-resume"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="autopilot-stop"]').exists()).toBe(true);
      await wrapper.get('[data-testid="autopilot-new-goal"]').trigger('click');
      expect(wrapper.emitted('begin')).toEqual([[]]);
      expect(wrapper.emitted('resume')).toBeUndefined();
      expect(completedBot.goalState.baselineValue).toBe('100');
      expect(completedBot.goalState.startedAt).toBe(1000);
    }
  );

  it('copies only the public address and retains a selectable fallback if clipboard fails', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const wrapper = render({ stage: 'fund' });
    await wrapper.get('.autopilot-address button').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith('cn-public-address');
    expect(wrapper.text()).toContain('bots.autopilot.addressCopied');
    writeText.mockRejectedValueOnce(new Error('permission'));
    await wrapper.get('.autopilot-address button').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="autopilot-wallet-address"]').text()).toBe('cn-public-address');
    expect(wrapper.text()).toContain('bots.autopilot.copyAddress');
  });
});
