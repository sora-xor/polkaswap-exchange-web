import { describe, expect, it } from 'vitest';

import botsPageSource from '@/features/bot-trading/pages/BotsPage.vue?raw';

const template = botsPageSource.slice(0, botsPageSource.indexOf('<script'));

describe('Bots page section navigation', () => {
  it('offers a visible way back to the AI trading home from every section', () => {
    const link = template.slice(template.indexOf('data-testid="bots-home-link"') - 200);
    expect(template).toContain('data-testid="bots-home-link"');
    expect(link).toContain('v-if="workspaceView !== \'simple\'"');
    expect(link).toContain(':to="botWorkspaceLocation(\'simple\')"');
  });

  it('renders Discover below the section tabs so the tabs stay at the top', () => {
    const tabs = template.indexOf('class="bots-view-tabs"');
    const discovery = template.indexOf('<BotDiscovery');
    expect(tabs).toBeGreaterThan(-1);
    expect(discovery).toBeGreaterThan(tabs);
  });
});
