import { describe, expect, it } from 'vitest';

import constsSource from '@/consts/index.ts?raw';
import amountHeaderSource from '@/features/rewards/components/rewards/AmountHeader.vue?raw';
import amountTableSource from '@/features/rewards/components/rewards/AmountTable.vue?raw';
import gradientBoxSource from '@/features/rewards/components/rewards/GradientBox.vue?raw';
import itemTooltipSource from '@/features/rewards/components/rewards/ItemTooltip.vue?raw';
import legacyAmountHeaderSource from '@/components/pages/Rewards/AmountHeader.vue?raw';
import legacyAmountTableSource from '@/components/pages/Rewards/AmountTable.vue?raw';
import legacyGradientBoxSource from '@/components/pages/Rewards/GradientBox.vue?raw';
import legacyItemTooltipSource from '@/components/pages/Rewards/ItemTooltip.vue?raw';

describe('rewards feature component migration', () => {
  it('keeps the live rewards components inside the feature boundary', () => {
    expect(gradientBoxSource).toContain('Gradient container');
    expect(amountHeaderSource).toContain("name: 'RewardsAmountHeader'");
    expect(amountTableSource).toContain("import RewardsItemTooltip from './ItemTooltip.vue';");
    expect(amountTableSource).toContain("name: 'RewardsAmountTable'");
    expect(itemTooltipSource).toContain("name: 'RewardsItemTooltip'");
  });

  it('keeps the legacy rewards page components as thin wrappers', () => {
    expect(legacyGradientBoxSource).toContain(
      "import RewardsGradientBox from '@/features/rewards/components/rewards/GradientBox.vue';"
    );
    expect(legacyAmountHeaderSource).toContain(
      "import RewardsAmountHeader from '@/features/rewards/components/rewards/AmountHeader.vue';"
    );
    expect(legacyAmountTableSource).toContain(
      "import RewardsAmountTable from '@/features/rewards/components/rewards/AmountTable.vue';"
    );
    expect(legacyItemTooltipSource).toContain(
      "import RewardsItemTooltip from '@/features/rewards/components/rewards/ItemTooltip.vue';"
    );
  });

  it('removes dead rewards and point-system component registry entries', () => {
    expect(constsSource).not.toContain("RewardsAmountHeader = 'pages/Rewards/AmountHeader'");
    expect(constsSource).not.toContain("RewardsAmountTable = 'pages/Rewards/AmountTable'");
    expect(constsSource).not.toContain("RewardsGradientBox = 'pages/Rewards/GradientBox'");
    expect(constsSource).not.toContain("PointCard = 'pages/PointSystem/PointCard'");
    expect(constsSource).not.toContain("TaskCard = 'pages/PointSystem/TaskCard'");
    expect(constsSource).not.toContain("FirstTxCard = 'pages/PointSystem/FirstTxCard'");
    expect(constsSource).not.toContain("TaskDialog = 'pages/PointSystem/TaskDialog'");
  });
});
