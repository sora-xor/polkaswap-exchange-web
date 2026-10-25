import { describe, expect, it } from 'vitest';

import firstTxCardSource from '@/features/rewards/components/point-system/FirstTxCard.vue?raw';
import pointCardSource from '@/features/rewards/components/point-system/PointCard.vue?raw';
import progressCardSource from '@/features/rewards/components/point-system/ProgressCard.vue?raw';
import taskCardSource from '@/features/rewards/components/point-system/TaskCard.vue?raw';
import taskDialogSource from '@/features/rewards/components/point-system/TaskDialog.vue?raw';
import legacyFirstTxCardSource from '@/components/pages/PointSystem/FirstTxCard.vue?raw';
import legacyPointCardSource from '@/components/pages/PointSystem/PointCard.vue?raw';
import legacyProgressCardSource from '@/components/pages/PointSystem/ProgressCard.vue?raw';
import legacyTaskCardSource from '@/components/pages/PointSystem/TaskCard.vue?raw';
import legacyTaskDialogSource from '@/components/pages/PointSystem/TaskDialog.vue?raw';

describe('rewards point-system component migration', () => {
  it('keeps the live point-system components inside the rewards feature boundary', () => {
    expect(pointCardSource).toContain("import TaskDialog from './TaskDialog.vue';");
    expect(pointCardSource).toContain("name: 'PointCard'");
    expect(pointCardSource).not.toContain('lazyComponent(');
    expect(pointCardSource).not.toContain('Components.');

    expect(taskCardSource).toContain("import TaskDialog from './TaskDialog.vue';");
    expect(taskCardSource).toContain("name: 'TaskCard'");
    expect(taskCardSource).not.toContain('lazyComponent(');
    expect(taskCardSource).not.toContain('Components.');

    expect(taskDialogSource).toContain("name: 'TaskDialog'");
    expect(progressCardSource).toContain("name: 'ProgressCard'");
    expect(firstTxCardSource).toContain("name: 'FirstTxCard'");
  });

  it('keeps the legacy point-system components as thin wrappers', () => {
    expect(legacyPointCardSource).toContain(
      "import PointCard from '@/features/rewards/components/point-system/PointCard.vue';"
    );
    expect(legacyTaskCardSource).toContain(
      "import TaskCard from '@/features/rewards/components/point-system/TaskCard.vue';"
    );
    expect(legacyTaskDialogSource).toContain(
      "import TaskDialog from '@/features/rewards/components/point-system/TaskDialog.vue';"
    );
    expect(legacyProgressCardSource).toContain(
      "import ProgressCard from '@/features/rewards/components/point-system/ProgressCard.vue';"
    );
    expect(legacyFirstTxCardSource).toContain(
      "import FirstTxCard from '@/features/rewards/components/point-system/FirstTxCard.vue';"
    );
  });
});
