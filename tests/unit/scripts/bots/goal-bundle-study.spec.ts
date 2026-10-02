// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createGoalBundleStudy,
  assertGoalBundleStudySelection,
  type GoalBundleStudySelection,
  type GoalBundleStudyEpisodeContext,
  type GoalBundleStudyAcquisition,
  type GoalBundleStudyObserver,
} from '@/features/bot-trading/goal-bundle-study';
import { createGoalValidationBundleReader } from '@/features/bot-trading/goal-bundle-reader';
import { goalQualificationDigest } from '@/features/bot-trading/goal-qualification';
import { createGoalBundleStudyFixture } from '../../../fixtures/bots/goal-bundle-study';
import { goalBundleStudyContinuationFixture } from '../../../fixtures/bots/goal-bundle-study-continuation';
import { createGoalBundleMetadataFixture } from '../../../fixtures/bots/goal-bundle-metadata';
import {
  verifyGoalBundleMetadata,
  verifyGoalBundleValidationMetadata,
  assertGoalBundleValidationMetadata,
} from '@/features/bot-trading/goal-bundle-metadata';
vi.unmock('@polkadot/util-crypto');
let base: Awaited<ReturnType<typeof createGoalBundleStudyFixture>>;
beforeAll(async () => {
  base = await createGoalBundleStudyFixture();
}, 60000);
const selectionBinding = (selection: GoalBundleStudySelection, requestSha256?: string) => ({
  indexSha256: selection.indexSha256,
  planSha256: selection.planSha256,
  sourceSha256: selection.sourceSha256,
  candidateSha256: selection.selection.candidateSha256,
  ...(requestSha256 ? { requestSha256 } : {}),
});
describe('browser completed-study journal adapter', () => {
  it('recomputes ordered episodes and exact original certificate through actual reader gates, then revokes owned admission', async () => {
    const f = base.fork(),
      seen: Readonly<GoalBundleStudyEpisodeContext>[] = [],
      state = await f.create(async (context) => {
        seen.push(context);
        if (context.request.phase === 'training') expect(context.selection).toBeUndefined();
        else
          expect(() =>
            assertGoalBundleStudySelection(
              context.selection!,
              selectionBinding(context.selection!, goalQualificationDigest(context.request))
            )
          ).not.toThrow();
        return f.evidence(context);
      });
    const result = await state.study.reverify();
    expect(result.certificate).toEqual(base.certificate);
    expect(seen.map((c) => c.request.phase)).toEqual([
      'training',
      'training',
      'training',
      'training',
      'validation',
      'validation',
    ]);
    const capability = seen[4].selection!;
    expect(Object.isFrozen(capability.selection)).toBe(true);
    expect(() => assertGoalBundleStudySelection({ ...capability }, selectionBinding(capability))).toThrow('unowned');
    expect(() =>
      assertGoalBundleStudySelection(capability, { ...selectionBinding(capability), requestSha256: 'f'.repeat(64) })
    ).toThrow('selection-binding');
    await expect(state.study.reverify()).rejects.toThrow('already-attempted');
    state.study.dispose();
    expect(() => assertGoalBundleStudySelection(capability, selectionBinding(capability))).toThrow('unowned');
  });
  it('admits cached validation metadata only with the live selected capability and either exact selected request', async () => {
    const metadata = await createGoalBundleMetadataFixture({ partition: 'validation' }),
      f = base.fork();
    await expect(verifyGoalBundleMetadata(metadata.binding, { readArtifact: metadata.readArtifact })).rejects.toThrow(
      'validation-unsupported'
    );
    let verified: Awaited<ReturnType<typeof verifyGoalBundleValidationMetadata>> | undefined,
      last: GoalBundleStudySelection | undefined;
    const state = await f.create(async (context) => {
      if (context.selection) {
        const binding = {
            ...selectionBinding(context.selection, goalQualificationDigest(context.request)),
            candidateSha256: context.request.candidateSha256,
            requestSha256: goalQualificationDigest(context.request),
          },
          admission = { selection: context.selection, binding };
        if (!verified)
          verified = await verifyGoalBundleValidationMetadata(
            metadata.binding,
            { readArtifact: metadata.readArtifact },
            admission
          );
        expect(() => assertGoalBundleValidationMetadata(verified, metadata.binding, admission)).not.toThrow();
        last = context.selection;
      }
      return f.evidence(context);
    });
    await state.study.reverify();
    expect(verified!.provenance.kind).toBe('raw-verified-validation-callback-metadata-v1');
    state.study.dispose();
    const binding = {
      ...selectionBinding(last!, last!.validationRequests[0]),
      candidateSha256: last!.selection.candidateSha256,
      requestSha256: last!.validationRequests[0],
    };
    expect(() => assertGoalBundleValidationMetadata(verified, metadata.binding, { selection: last!, binding })).toThrow(
      'unowned'
    );
    const readArtifact = vi.fn(metadata.readArtifact);
    await expect(
      verifyGoalBundleValidationMetadata(metadata.binding, { readArtifact }, { selection: last!, binding })
    ).rejects.toThrow('unowned');
    expect(readArtifact).not.toHaveBeenCalled();
  });
  it('does not open validation completion or episode bytes if training replay differs', async () => {
    const f = base.fork(),
      state = await f.create(async (context) => {
        const evidence = await f.evidence(context);
        evidence.dataSha256 = 'f'.repeat(64);
        return evidence;
      });
    await expect(state.study.reverify()).rejects.toThrow('recomputed-evidence');
    const validation = f.index.episodes.filter((e) => e.phase === 'validation');
    for (const entry of validation) {
      const completion = f.index.artifacts.find((item) => item.name === `complete-${entry.requestSha256}`)!;
      expect(f.requests).not.toContain(`${f.root}objects/${completion.sha256}.bin`);
      expect(f.requests.some((url) => url.includes(`/episodes/${entry.requestSha256}/`))).toBe(false);
    }
  });
  it.each(['registration', 'claim', 'source', 'access', 'completion', 'receipt', 'selection', 'certificate'])(
    'rejects re-pinned original %s inconsistencies without accepting saved outcomes',
    async (kind) => {
      const f = base.fork(),
        first = f.index.episodes[0].requestSha256;
      if (kind === 'registration')
        f.editRoot('registration', (r) => {
          r.registeredAt = 'changed';
        });
      if (kind === 'claim')
        f.editRoot('study-claim', (r) => {
          r.studyId = 'other';
        });
      if (kind === 'source')
        f.editRoot('protocol', (r) => {
          r.sources['fixture.ts'] = 'f'.repeat(64);
        });
      if (kind === 'access')
        f.editRoot(`access-${first}`, (r) => {
          r.selectionSha256 = 'f'.repeat(64);
        });
      if (kind === 'completion')
        f.editRoot(`complete-${first}`, (r) => {
          r.evidenceSha256 = 'f'.repeat(64);
        });
      if (kind === 'receipt')
        f.editRoot(`complete-${first}`, (r) => {
          r.rawEvidence[0].bytes++;
          r.rawManifestSha256 = goalQualificationDigest(r.rawEvidence);
        });
      if (kind === 'selection')
        f.editRoot('selection', (r) => {
          r.trainingSha256 = 'f'.repeat(64);
        });
      if (kind === 'certificate')
        f.editRoot('certificate', (r) => {
          r.certificateSha256 = 'f'.repeat(64);
        });
      let state: Awaited<ReturnType<typeof f.create>> | undefined;
      await expect(
        (async () => {
          state = await f.create();
          await state.study.reverify();
        })()
      ).rejects.toThrow();
      state?.study.dispose();
      expect(
        f.requests.some((url) =>
          f.index.episodes
            .filter((e) => e.phase === 'validation')
            .some((e) => url.includes(`/episodes/${e.requestSha256}/`))
        )
      ).toBe(false);
    }
  );
  it('rejects reordered training index entries before any episode raw data is opened', async () => {
    const f = base.fork();
    Object.assign(f.index, { episodes: [f.index.episodes[1], f.index.episodes[0], ...f.index.episodes.slice(2)] });
    await expect(f.create()).rejects.toThrow('episode-order');
  });
  it('requires the concrete continuation verifier and never accepts parent flags as eligibility', async () => {
    const f = base.fork(),
      reader = await f.open();
    const fakeIndex = {
      ...reader.index,
      parent: { planSha256: 'a'.repeat(64), requestSha256: 'b'.repeat(64), artifacts: [] },
    };
    await expect(
      createGoalBundleStudy({ reader: { ...reader, index: fakeIndex }, evaluateEpisode: f.evidence })
    ).rejects.toThrow('continuation-verifier-required');
  });
  it('requires ordinary acquisition verification before opening any continuation child episode', async () => {
    const f = goalBundleStudyContinuationFixture(base),
      evaluateEpisode = vi.fn(f.evidence),
      prepare = vi.fn();
    await expect(
      createGoalBundleStudy({ reader: await f.open(), evaluateEpisode, continuation: { prepare } })
    ).rejects.toThrow('acquisition-verifier-required');
    expect(prepare).not.toHaveBeenCalled();
    expect(evaluateEpisode).not.toHaveBeenCalled();
    expect(f.requests.some((url) => url.includes('/episodes/'))).toBe(false);
  });
  it('verifies the first prefix and every later child episode, including both guarded validation episodes', async () => {
    const f = goalBundleStudyContinuationFixture(base),
      order: string[] = [],
      ordinary: string[] = [];
    const observer = (id: string): GoalBundleStudyObserver => ({
      observeChild: (receipt, value) => {
        expect(receipt.name).toBe('invented-raw');
        expect(value.requestSha256).toBe(id);
        order.push(`raw:${id}`);
      },
      complete: () => {
        order.push(`complete:${id}`);
      },
    });
    const prefix = vi.fn(async () => {
      order.push(`prepare:${f.index.episodes[0].requestSha256}`);
      return observer(f.index.episodes[0].requestSha256);
    });
    const acquisition: GoalBundleStudyAcquisition = {
      prepare: async ({ request, signal }) => {
        expect(signal.aborted).toBe(false);
        const id = goalQualificationDigest(request);
        ordinary.push(request.phase);
        order.push(`prepare:${id}`);
        return observer(id);
      },
    };
    const study = await createGoalBundleStudy({
      reader: await f.open(),
      evaluateEpisode: f.evidence,
      continuation: { prepare: prefix },
      acquisition,
    });
    const result = await study.reverify();
    expect(result.certificate).toEqual(f.rootValue('certificate'));
    expect(prefix).toHaveBeenCalledOnce();
    expect(ordinary).toEqual(['training', 'training', 'training', 'validation', 'validation']);
    expect(order).toEqual(
      f.index.episodes.flatMap(({ requestSha256: id }) => [`prepare:${id}`, `raw:${id}`, `complete:${id}`])
    );
    study.dispose();
  });
  it('fails a later acquisition completion before selection or any subsequent raw episode is opened', async () => {
    const f = goalBundleStudyContinuationFixture(base),
      evaluated: string[] = [];
    const observer = (): GoalBundleStudyObserver => ({ observeChild: () => {}, complete: () => {} });
    const study = await createGoalBundleStudy({
      reader: await f.open(),
      evaluateEpisode: async (context) => {
        evaluated.push(goalQualificationDigest(context.request));
        return f.evidence(context);
      },
      continuation: { prepare: async () => observer() },
      acquisition: {
        prepare: async () => ({
          observeChild: () => {},
          complete: () => {
            throw Error('synthetic retry budget rejected');
          },
        }),
      },
    });
    await expect(study.reverify()).rejects.toThrow('synthetic retry budget rejected');
    expect(evaluated).toEqual(f.index.episodes.slice(0, 2).map((e) => e.requestSha256));
    for (const entry of f.index.episodes.slice(2))
      expect(f.requests.some((url) => url.includes(`/episodes/${entry.requestSha256}/`))).toBe(false);
  });
  it.each([undefined, { observeChild: () => {}, complete: true }])(
    'rejects an absent or malformed later acquisition observer before its producer runs',
    async (invalid) => {
      const f = goalBundleStudyContinuationFixture(base),
        evaluateEpisode = vi.fn(f.evidence);
      const study = await createGoalBundleStudy({
        reader: await f.open(),
        evaluateEpisode,
        continuation: { prepare: async () => ({ observeChild: () => {}, complete: () => {} }) },
        acquisition: { prepare: async () => invalid as unknown as GoalBundleStudyObserver },
      });
      await expect(study.reverify()).rejects.toThrow('acquisition-observer');
      expect(evaluateEpisode).toHaveBeenCalledOnce();
    }
  );
  it('preserves ordinary studies without invoking a supplied continuation acquisition dependency', async () => {
    const f = base.fork(),
      prepare = vi.fn(async () => {
        throw Error('must not inspect legacy acquisition');
      });
    const study = await createGoalBundleStudy({
      reader: await f.open(),
      evaluateEpisode: f.evidence,
      acquisition: { prepare },
    });
    await study.reverify();
    expect(prepare).not.toHaveBeenCalled();
    study.dispose();
  });
  it('abort during a pending validation artifact revokes the same admission before any body can finish', async () => {
    const f = base.fork();
    let capability: GoalBundleStudySelection | undefined, readStarted!: () => void, continueRead!: () => void;
    const started = new Promise<void>((resolve) => {
        readStarted = resolve;
      }),
      pending = new Promise<void>((resolve) => {
        continueRead = resolve;
      });
    let state!: Awaited<ReturnType<typeof f.create>>;
    state = await f.create(async (context) => {
      if (context.request.phase === 'validation') {
        capability = context.selection;
        f.setBeforeFetch(async (url) => {
          if (url.includes(`/episodes/${goalQualificationDigest(context.request)}/objects/`)) {
            readStarted();
            await pending;
          }
        });
      }
      return f.evidence(context);
    });
    const work = state.study.reverify();
    await started;
    state.study.dispose();
    continueRead();
    await expect(work).rejects.toThrow();
    expect(() => assertGoalBundleStudySelection(capability, selectionBinding(capability!))).toThrow('unowned');
    f.setBeforeFetch(undefined);
  });
  it('guards direct lower validation reader access with the same live selected request capability', async () => {
    const f = base.fork();
    let capability!: GoalBundleStudySelection;
    const state = await f.create(async (context) => {
      if (context.selection) capability = context.selection;
      return f.evidence(context);
    });
    await state.study.reverify();
    const entry = f.index.episodes.at(-1)!,
      fetcher = vi.fn(async (url: RequestInfo | URL) => {
        const raw = f.content.get(String(url));
        if (!raw) throw Error('missing fixture');
        const response = new Response(new Uint8Array(raw));
        Object.defineProperty(response, 'url', { value: String(url) });
        return response;
      });
    const binding = {
      ...selectionBinding(capability, entry.requestSha256),
      candidateSha256: entry.candidateSha256,
      requestSha256: entry.requestSha256,
    };
    const child = await createGoalValidationBundleReader(
      { rootUrl: `${f.root}episodes/${entry.requestSha256}/`, manifestSha256: entry.manifestSha256 },
      { fetch: fetcher },
      { selection: capability, binding }
    );
    expect(child.summary.phase).toBe('validation');
    state.study.dispose();
    const calls = fetcher.mock.calls.length;
    await expect(child.read('invented-raw')).rejects.toThrow();
    expect(fetcher.mock.calls).toHaveLength(calls);
    child.dispose();
  });
});
