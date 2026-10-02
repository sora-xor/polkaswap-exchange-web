import { createApp, h } from 'vue';
import BotDiscovery from '../../../src/features/bot-trading/components/BotDiscovery.vue';
import {
  assets,
  campaigns,
  campaignBots,
  clearHoldoutOverlaps,
  createIndexedDbDiscoveryStore,
  events,
  loadDiscoverySession,
  richSessionFixture,
  saveDiscoverySession,
  seedHoldoutOverlap,
  sessionFixture,
  VAL,
} from './stubs';

type Approval = { finalists: Array<{ template: Record<string, unknown> }>; sharedCapXor: string };
type Review = ReturnType<typeof makeReview>;
let pendingReview: Review | null = null;
let reviewLifetimeMs = 60_000;

/** Fixed finalized evidence for a browser-only two-step campaign review. */
function makeReview(bot: Record<string, unknown>, campaignId = 'campaign-1') {
  const progress = {
    'bot-1': {
      botId: 'bot-1',
      maxDrawdownPercent: '5',
      openedOutputCodec: '10000000000000000000',
      latestOutputCodec: '10000000000000000000',
      benchmarkOutputCodec: '10000000000000000000',
      peakOutputCodec: '10000000000000000000',
      activeMs: 0,
      successfulSwaps: 0,
      outcome: 'active',
    },
  };
  return {
    id: campaignId,
    expiresAt: Date.now() + reviewLifetimeMs,
    campaign: {
      id: campaignId,
      status: 'paused',
      botIds: ['bot-1'],
      committedXorCodec: '1000000000000000000',
      progress,
    },
    mark: { blockNumber: 123 },
    funding: {
      sufficient: true,
      assets: [{ asset: VAL, availableCodec: '20000000000000000000', requiredCodec: '10000000000000000000' }],
    },
    bots: [bot],
  };
}

/** The harness exposes only inert controls and public checkpoint inspection to Playwright. */
const browserHarness = {
  events,
  seedComplete: () => saveDiscoverySession(sessionFixture()),
  seedRich: () => saveDiscoverySession(richSessionFixture()),
  seedHoldoutOverlap,
  clearHoldoutOverlaps,
  setReviewLifetime: (milliseconds: number) => {
    reviewLifetimeMs = milliseconds;
  },
  stored: () => loadDiscoverySession(),
  clear: () => createIndexedDbDiscoveryStore().clear(),
};

declare global {
  interface Window {
    __discoveryHarness: typeof browserHarness;
  }
}
window.__discoveryHarness = browserHarness;

createApp({
  name: 'DiscoveryBrowserHarness',
  setup() {
    return () =>
      h(BotDiscovery, {
        assets,
        loadHistory: async () => {
          throw new Error('unexpected-history-call');
        },
        loadFees: async () => {
          throw new Error('unexpected-fee-call');
        },
        walletConnected: true,
        externalWallet: false,
        walletIdentity: 'inert-wallet',
        campaigns,
        campaignBots,
        prepare: async (approval: Approval) => {
          events.push({
            type: 'campaign-prepare',
            data: { finalists: approval.finalists.length, sharedCapXor: approval.sharedCapXor },
          });
          pendingReview = makeReview(approval.finalists[0].template);
          return pendingReview;
        },
        authorize: async (reviewId: string, password: string) => {
          events.push({ type: 'campaign-authorize', data: { reviewId, passwordLength: password.length } });
          if (!pendingReview || pendingReview.id !== reviewId) throw new Error('bots.errors.stale');
          const existing = campaigns.find((campaign) => campaign.id === reviewId);
          if (existing) existing.status = 'running';
          else {
            campaignBots.push(pendingReview.bots[0]);
            campaigns.push({ ...pendingReview.campaign, status: 'running' });
          }
          pendingReview = null;
        },
        prepareResume: async (campaignId: string) => {
          events.push({ type: 'campaign-resume-review', data: campaignId });
          const bot = campaignBots.find((entry) => entry.id === 'bot-1');
          if (!bot) throw new Error('bots.errors.stale');
          pendingReview = makeReview(bot, campaignId);
          return pendingReview;
        },
        pauseCampaign: async (campaignId: string) => {
          events.push({ type: 'campaign-pause', data: campaignId });
          const campaign = campaigns.find((entry) => entry.id === campaignId);
          if (campaign) campaign.status = 'paused';
        },
        closeCampaign: async (campaignId: string) => {
          events.push({ type: 'campaign-close', data: campaignId });
          const campaign = campaigns.find((entry) => entry.id === campaignId);
          if (campaign) campaign.status = 'closed';
        },
        readCampaignOrders: async () => [],
      });
  },
}).mount('#app');
