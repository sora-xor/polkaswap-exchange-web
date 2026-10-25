import { build } from 'esbuild';
import { expect, test } from '@playwright/test';
import type { createTradeParticleRenderer } from '@/features/bot-trading/tradeParticleRenderer';

interface RendererTestWindow extends Window {
  TradeRendererTest: { createTradeParticleRenderer: typeof createTradeParticleRenderer };
}

let rendererBundle = '';

/** Bundle the production renderer into a blank page so GPU checks need no chain data or application state. */
test.beforeAll(async () => {
  const result = await build({
    entryPoints: ['src/features/bot-trading/tradeParticleRenderer.ts'],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'TradeRendererTest',
    platform: 'browser',
    logLevel: 'silent',
  });
  rendererBundle = result.outputFiles[0].text;
});

for (const browserName of ['chromium', 'webkit'] as const) {
  for (const requestedBackend of ['webgl2', 'webgl'] as const) {
    test(`${browserName} ${requestedBackend}: production shaders paint ordered surfaces and semantic colors`, async ({
      playwright,
    }) => {
      const browser = await playwright[browserName].launch(
        // Use Chromium's native macOS GPU backend so the production performance guard remains enabled.
        browserName === 'chromium' && process.platform === 'darwin' ? { args: ['--use-angle=metal'] } : {}
      );
      try {
        const page = await browser.newPage();
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        await page.setContent('<!doctype html><title>Trade renderer GPU regression</title>');
        await page.addScriptTag({ content: rendererBundle });
        const result = await page.evaluate(async (backend) => {
          const probe = document.createElement('canvas').getContext(backend, { failIfMajorPerformanceCaveat: true }) as
            | WebGLRenderingContext
            | WebGL2RenderingContext
            | null;
          const capable =
            probe &&
            (backend === 'webgl2' ||
              ['ANGLE_instanced_arrays', 'OES_vertex_array_object', 'OES_standard_derivatives'].every((name) =>
                probe.getExtension(name)
              ));
          probe?.getExtension('WEBGL_lose_context')?.loseContext();
          if (!capable) return { capable: false, backend: null, unavailable: 0 };
          const canvas = document.createElement('canvas');
          document.body.append(canvas);
          const getContext = canvas.getContext.bind(canvas);
          if (backend === 'webgl') {
            canvas.getContext = ((type: string, options?: WebGLContextAttributes) =>
              type === 'webgl2' ? null : getContext(type, options)) as typeof canvas.getContext;
          }
          let unavailable = 0;
          let contextLost: (() => void) | undefined;
          const renderer = (window as unknown as RendererTestWindow).TradeRendererTest.createTradeParticleRenderer(
            canvas,
            () => {
              unavailable++;
              contextLost?.();
            }
          );
          if (!renderer) return { capable: true, backend: null, unavailable };
          renderer.resize(320, 220, 1);
          renderer.setBackground!('#f8f8f8');
          renderer.begin();
          renderer.sphere!(80, 80, 30, 'focus', 1);
          renderer.surface!(
            [
              { x: 20, y: 30 },
              { x: 180, y: 30 },
            ],
            [
              { x: 20, y: 140 },
              { x: 180, y: 140 },
            ],
            'neutral',
            0.2
          );
          renderer.line(20, 30, 180, 30, 2, 'neutral', 1);
          renderer.circle(220, 60, 14, 0, 'positive', 1, true);
          renderer.circle(270, 60, 14, 0, 'negative', 1, true);
          renderer.sphere!(220, 120, 16, 'positive', 1);
          const rendered = renderer.end();
          const gl = getContext(backend) as WebGLRenderingContext | WebGL2RenderingContext;
          /** Read synchronous framebuffer pixels before the browser presents and clears the drawing buffer. */
          const pixel = (x: number, y: number): number[] => {
            const color = new Uint8Array(4);
            gl.readPixels(x, 219 - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, color);
            return Array.from(color);
          };
          const evidence = {
            capable: true,
            backend: renderer.backend,
            rendered,
            unavailable,
            profit: pixel(220, 60),
            loss: pixel(270, 60),
            occludedSphere: pixel(80, 80),
            highlight: pixel(216, 114),
            shadow: pixel(229, 129),
            error: gl.getError(),
          };
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('GPU context loss was not handled')), 2000);
            contextLost = () => {
              clearTimeout(timeout);
              resolve();
            };
            gl.getExtension('WEBGL_lose_context')!.loseContext();
          });
          const lostFallback = !renderer.end();
          renderer.dispose();
          return { ...evidence, lostFallback, unavailableAfterLoss: unavailable };
        }, requestedBackend);
        test.skip(!result.capable, `${browserName} has no supported ${requestedBackend} device in this environment`);
        expect(result.backend).toBe(requestedBackend);
        if (!('rendered' in result)) throw new Error('A supported GPU failed to initialize the production renderer');
        expect(result.rendered).toBe(true);
        expect(result.unavailable).toBe(0);
        expect(result.profit).toEqual([22, 138, 82, 255]);
        expect(result.loss).toEqual([214, 55, 67, 255]);
        expect(result.occludedSphere![3]).toBe(255);
        expect(
          Math.max(...result.occludedSphere!.slice(0, 3)) - Math.min(...result.occludedSphere!.slice(0, 3))
        ).toBeLessThan(3);
        expect(result.occludedSphere![0]).toBeGreaterThan(200);
        expect(result.highlight!.slice(0, 3).reduce((sum, value) => sum + value, 0)).toBeGreaterThan(
          result.shadow!.slice(0, 3).reduce((sum, value) => sum + value, 0)
        );
        expect(result.error).toBe(0);
        expect(result.lostFallback).toBe(true);
        expect(result.unavailableAfterLoss).toBe(1);
        expect(errors).toEqual([]);
      } finally {
        await browser.close();
      }
    });
  }

  test(`${browserName} WebGL1: missing required extensions return to Canvas`, async ({ playwright }) => {
    const browser = await playwright[browserName].launch(
      browserName === 'chromium' && process.platform === 'darwin' ? { args: ['--use-angle=metal'] } : {}
    );
    try {
      const page = await browser.newPage();
      await page.setContent('<!doctype html><title>Trade renderer capability regression</title>');
      await page.addScriptTag({ content: rendererBundle });
      const results = await page.evaluate(() => {
        return ['ANGLE_instanced_arrays', 'OES_vertex_array_object', 'OES_standard_derivatives'].map((missing) => {
          const canvas = document.createElement('canvas');
          const original = canvas.getContext.bind(canvas);
          const gl = original('webgl', { failIfMajorPerformanceCaveat: true });
          if (!gl) return null;
          const extension = gl.getExtension.bind(gl);
          gl.getExtension = ((name: string) => (name === missing ? null : extension(name))) as typeof gl.getExtension;
          canvas.getContext = ((type: string, options?: WebGLContextAttributes) =>
            type === 'webgl2' ? null : original(type, options)) as typeof canvas.getContext;
          const renderer = (window as unknown as RendererTestWindow).TradeRendererTest.createTradeParticleRenderer(
            canvas,
            () => undefined
          );
          renderer?.dispose();
          return { missing, fallback: renderer === null };
        });
      });
      test.skip(
        results.every((result) => result === null),
        `${browserName} has no supported WebGL1 device`
      );
      expect(results).toEqual([
        { missing: 'ANGLE_instanced_arrays', fallback: true },
        { missing: 'OES_vertex_array_object', fallback: true },
        { missing: 'OES_standard_derivatives', fallback: true },
      ]);
    } finally {
      await browser.close();
    }
  });
}
