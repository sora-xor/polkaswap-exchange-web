import { describe, expect, it, vi } from 'vitest';

const asyncMocks = vi.hoisted(() => ({
  createAsyncComponent: vi.fn((loader: () => Promise<unknown>) => ({ __lazyWrapper: true, loader })),
  preloadAsyncComponents: vi.fn(async (_components: Iterable<unknown>) => undefined),
}));

vi.mock('@/shared/ui/async', () => asyncMocks);

import { install, preloadLazySoramitsuComponents } from '@/plugins/soramitsuUI';

const createApp = () => {
  const components: Record<string, unknown> = {};
  const directives: Record<string, unknown> = {};
  const app = {
    _context: { components, directives },
    component: vi.fn(function (name: string, component?: unknown) {
      if (arguments.length === 1) return components[name];
      components[name] = component;
      return app;
    }),
    directive: vi.fn(function (name: string, directive?: unknown) {
      if (arguments.length === 1) return directives[name];
      directives[name] = directive;
      return app;
    }),
  } as any;
  return { app, components };
};

const preloadedFor = async (app: unknown): Promise<unknown[]> => {
  asyncMocks.preloadAsyncComponents.mockClear();
  await preloadLazySoramitsuComponents(app as any);
  expect(asyncMocks.preloadAsyncComponents).toHaveBeenCalledTimes(1);
  return [...(asyncMocks.preloadAsyncComponents.mock.calls[0][0] as Iterable<unknown>)];
};

describe('soramitsuUI preload', () => {
  it('preloads every lazy wrapper the app registered', async () => {
    const { app, components } = createApp();
    install(app);

    const preloaded = await preloadedFor(app);

    expect(preloaded).toContain(components['s-icon']);
    expect(preloaded).toContain(components.SButton);
    expect(preloaded).toContain(components['s-menu-item-group']);
    expect(preloaded).toContain(components.STabs);
    expect(preloaded).toContain(components['s-tabs']);
    expect(preloaded.every((component) => (component as { __lazyWrapper?: boolean }).__lazyWrapper)).toBe(true);
  });

  it('does not preload synchronous compat components or names that were already taken', async () => {
    const { app, components } = createApp();
    const legacyMenu = { name: 'LegacySMenu' };
    components.SMenu = legacyMenu;
    components['s-menu'] = legacyMenu;
    install(app);

    const preloaded = await preloadedFor(app);
    const registered = new Set(Object.values(components));

    expect(preloaded).not.toContain(components.SCard);
    expect(preloaded).not.toContain(components.SScrollbar);
    expect(preloaded).not.toContain(legacyMenu);
    expect(components.SMenu).toBe(legacyMenu);
    // The SMenu wrapper was never registered, so only registered wrappers are preloaded.
    expect(preloaded.every((component) => registered.has(component))).toBe(true);
  });

  it('keeps wrappers separate per app', async () => {
    const first = createApp();
    const second = createApp();
    install(first.app);

    expect(await preloadedFor(second.app)).toEqual([]);
    expect((await preloadedFor(first.app)).length).toBeGreaterThan(0);
  });
});
