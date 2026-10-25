import { describe, expect, it } from 'vitest';
import {
  TERRAIN_ELEVATION,
  TERRAIN_HEIGHT,
  columnBounds,
  createTerrainRenderer,
  pickCell,
  projectPoint,
  terrainCamera,
  terrainLayout,
} from '@/features/bot-trading/quant-terrain-renderer';

describe('terrain geometry', () => {
  it('centres square cells with the longer side spanning -1…1 and row 0 at the front', () => {
    const layout = terrainLayout(12, 15);
    expect(layout.cell).toBeCloseTo(2 / 15);
    expect(layout.halfDepth).toBeCloseTo(1);
    expect(layout.halfWidth).toBeCloseTo(0.8);
    expect(layout.x(0)).toBeCloseTo(-0.8 + layout.cell / 2);
    expect(layout.z(0)).toBeGreaterThan(layout.z(14));
  });

  it('builds columns up for gains and down for losses, never thinner than a sliver', () => {
    const layout = terrainLayout(3, 3);
    expect(columnBounds(layout, 4, 1).max[1]).toBeCloseTo(TERRAIN_HEIGHT);
    expect(columnBounds(layout, 4, 1).min[1]).toBe(0);
    expect(columnBounds(layout, 4, -0.5).min[1]).toBeCloseTo(-0.5 * TERRAIN_HEIGHT);
    expect(columnBounds(layout, 4, -0.5).max[1]).toBeGreaterThan(0);
    expect(columnBounds(layout, 4, 0).max[1]).toBeGreaterThan(0);
  });

  it('projects the grid centre near the middle of the canvas and rejects points behind the camera', () => {
    const camera = terrainCamera(0, 0.6, 2);
    const centre = projectPoint(camera, [0, 0.02, 0], 800, 400)!;
    expect(centre.x).toBeCloseTo(400, 0);
    expect(centre.y).toBeCloseTo(200, 0);
    expect(projectPoint(camera, [camera.eye[0] * 2, camera.eye[1] * 2, camera.eye[2] * 2], 800, 400)).toBeNull();
    // Tilt is clamped to the allowed range.
    expect(terrainCamera(0, 5, 1).eye[1]).toBeCloseTo(terrainCamera(0, TERRAIN_ELEVATION.max, 1).eye[1]);
  });

  it('picks the column under a screen point by ray casting, preferring the nearest hit', () => {
    const layout = terrainLayout(5, 5);
    const heights = new Float32Array(25).fill(0.1);
    heights[12] = 1;
    const camera = terrainCamera(0.3, 0.7, 1.6);
    const top = projectPoint(camera, [layout.x(2), TERRAIN_HEIGHT * 0.9, layout.z(2)], 800, 500)!;
    expect(pickCell(camera, layout, heights, top.x, top.y, 800, 500)).toBe(12);
    const corner = projectPoint(camera, [layout.x(0), 0.05, layout.z(0)], 800, 500)!;
    expect(pickCell(camera, layout, heights, corner.x, corner.y, 800, 500)).toBe(0);
    expect(pickCell(camera, layout, heights, 2, 2, 800, 500)).toBe(-1);
    expect(pickCell(camera, layout, heights, 10, 10, 0, 0)).toBe(-1);
  });

  it('returns no renderer when WebGL is unavailable', () => {
    expect(createTerrainRenderer(document.createElement('canvas'))).toBeNull();
  });
});
