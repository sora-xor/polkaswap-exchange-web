import { describe, expect, it } from 'vitest';
import { summarizeResultDistribution } from '@/features/bot-trading/result-insights';
import {
  FLOW_BYPASS_X,
  FLOW_INLET_Y,
  FLOW_PLOT_BOTTOM,
  FLOW_PLOT_LEFT,
  FLOW_PLOT_RIGHT,
  FLOW_PLOT_TOP,
  FLOW_WIDTH,
  flowBatchProgress,
  flowLandingPosition,
  flowPosition,
  layoutTradeFlow,
  summarizeTradeFlowDecisions,
  summarizeTradeFlowProgress,
} from '@/features/bot-trading/trade-flow';
import type { DistributionTrade } from '@/features/bot-trading/tradeDistribution';

/** Recorded candidate evidence, independent of a wallet or external market data. */
function trade(id: string, pnl: string, selected = true): DistributionTrade {
  return {
    id,
    timestamp: 1,
    pnl,
    selected,
    checks: [
      { key: 'signal', passed: true },
      { key: 'balance', passed: selected },
    ],
  };
}

describe('historical candidate flow', () => {
  it('binds exact positive, negative and zero boundaries to the authoritative bins', () => {
    const trades = Array.from({ length: 17 }, (_, index) => trade(`candidate-${index}`, (index - 8).toString()));
    const insights = summarizeResultDistribution(trades);
    const layout = layoutTradeFlow(trades, insights);
    expect(layout.particles).toHaveLength(17);
    expect(layout.particles.map((particle) => particle.binIndex)).toEqual(
      Array.from({ length: 17 }, (_, index) => index)
    );
    expect(layout.particles.map((particle) => particle.sourceIndex)).toEqual(
      Array.from({ length: 17 }, (_, index) => index)
    );
    expect(layout.particles.map((particle) => particle.sign)).toEqual(insights.bins.map((bin) => bin.sign));
    for (const particle of layout.particles) {
      expect(flowPosition(particle, 1, layout)).toMatchObject({ x: particle.x, y: particle.y, settled: true });
      expect(particle.x - particle.radius).toBeGreaterThanOrEqual(FLOW_PLOT_LEFT + particle.binIndex * layout.binWidth);
      expect(particle.x + particle.radius).toBeLessThanOrEqual(
        FLOW_PLOT_LEFT + (particle.binIndex + 1) * layout.binWidth
      );
    }
    expect(layout.countMaximum).toBe(4);
  });

  it('retains tiny and huge exact outcomes without rounding them to zero', () => {
    const tiny = '0.0000000000000000000000000000000000000000000000000000001';
    const huge = '900719925474099300000000000000000002.000000000000000003';
    const trades = [trade('negative', `-${tiny}`), trade('zero', '0'), trade('positive', tiny), trade('huge', huge)];
    const layout = layoutTradeFlow(trades, summarizeResultDistribution(trades));
    expect(layout.particles.map((particle) => particle.sign)).toEqual(['loss', 'zero', 'profit', 'profit']);
    expect(layout.particles.map((particle) => particle.binIndex)).toEqual([7, 8, 9, 16]);
  });

  it('omits invalid outcomes explicitly while retaining original indices and actual check counts', () => {
    const trades = ['NaN', 'Infinity', '1e3', '01', ' 2', '0'.repeat(257), '2'].map((pnl, index) =>
      trade(`c-${index}`, pnl)
    );
    const layout = layoutTradeFlow(trades, summarizeResultDistribution(trades));
    expect(layout.omittedCount).toBe(6);
    expect(layout.particles).toMatchObject([{ id: 'c-6', sourceIndex: 6, sign: 'profit' }]);
    expect(layout.gates[0]).toMatchObject({ key: 'signal', passed: 7, rejected: 0, total: 7 });
    expect(layoutTradeFlow([], summarizeResultDistribution([]))).toMatchObject({
      particles: [],
      gates: [],
      omittedCount: 0,
      countMaximum: 4,
    });
  });

  it('places selected candidates below excluded candidates on the same count scale without sampling', () => {
    const trades = Array.from({ length: 10000 }, (_, index) => trade(`c-${index}`, '2', index % 3 === 0));
    const insights = summarizeResultDistribution(trades);
    const layout = layoutTradeFlow(trades, insights);
    expect(layout.particles).toHaveLength(trades.length);
    expect(layout.countMaximum).toBe(10000);
    const boundary =
      FLOW_PLOT_BOTTOM - ((FLOW_PLOT_BOTTOM - FLOW_PLOT_TOP) * insights.selected.count) / layout.countMaximum;
    const footprints = new Set<string>();
    for (const particle of layout.particles) {
      footprints.add(`${particle.x}:${particle.y}`);
      expect(particle.y - particle.radius).toBeGreaterThanOrEqual(FLOW_PLOT_TOP);
      expect(particle.y + particle.radius).toBeLessThanOrEqual(FLOW_PLOT_BOTTOM);
      expect(particle.x - particle.radius).toBeGreaterThanOrEqual(FLOW_PLOT_LEFT);
      expect(particle.x + particle.radius).toBeLessThanOrEqual(FLOW_PLOT_RIGHT);
      if (particle.selected) expect(particle.y - particle.radius).toBeGreaterThanOrEqual(boundary);
      else expect(particle.y + particle.radius).toBeLessThanOrEqual(boundary);
    }
    expect(footprints.size).toBe(trades.length);
  });

  it('diverts at the first recorded failure while preserving independent later checks', () => {
    const input = trade('failed', '-2', false);
    input.checks = [
      { key: 'signal', passed: false },
      { key: 'cooldown', passed: true },
      { key: 'balance', passed: false },
    ];
    const layout = layoutTradeFlow([input], summarizeResultDistribution([input]));
    const particle = layout.particles[0];
    expect(particle.firstFailedGate).toBe(0);
    expect(layout.gates).toMatchObject([
      { key: 'signal', passed: 0, rejected: 1, total: 1 },
      { key: 'cooldown', passed: 1, rejected: 0, total: 1 },
      { key: 'balance', passed: 0, rejected: 1, total: 1 },
    ]);
    const firstGate = 1 / (layout.gates.length + 3);
    expect(flowPosition(particle, firstGate - 0.0001, layout).rejected).toBe(false);
    expect(flowPosition(particle, firstGate, layout)).toMatchObject({ gate: 0, rejected: true, settled: false });
    const bypass = flowPosition(particle, 2 / (layout.gates.length + 3), layout);
    expect(bypass.x).toBeGreaterThan(FLOW_BYPASS_X - 5);
    expect(bypass.x).toBeLessThan(FLOW_BYPASS_X + 5);
    expect(bypass.gate).toBe(-1);
    expect(flowPosition(particle, 1, layout)).toMatchObject({ rejected: true, settled: true });
  });

  it('does not invent failed checks or gate counters for missing evidence', () => {
    const missing = { ...trade('missing', '0', false), checks: [{ key: 'signal', passed: true }] };
    const input = [missing, trade('present', '1')];
    const layout = layoutTradeFlow(input, summarizeResultDistribution(input));
    expect(layout.particles[0]).toMatchObject({ selected: false, gates: [true, null], firstFailedGate: null });
    expect(layout.gates[1]).toMatchObject({ key: 'balance', passed: 1, rejected: 0, total: 1 });
    expect(flowPosition(layout.particles[0], 2 / (layout.gates.length + 3), layout).gate).toBe(-1);
    expect(flowPosition(layout.particles[0], 1, layout).rejected).toBe(false);
    const noChecks = { ...trade('none', '1'), checks: [] };
    const emptyRail = layoutTradeFlow([noChecks], summarizeResultDistribution([noChecks]));
    expect(flowPosition(emptyRail.particles[0], 0.5, emptyRail)).toMatchObject({ gate: -1, rejected: false });
  });

  it('keeps deterministic smooth routes bounded from the inlet through touchdown', () => {
    const input = [trade('left', '-8', false), trade('right', '8'), trade('zero', '0')];
    const layout = layoutTradeFlow(input, summarizeResultDistribution(input));
    for (const particle of layout.particles) {
      let previousY = FLOW_INLET_Y;
      for (let index = 0; index <= 1000; index += 1) {
        const progress = index / 1000;
        const point = flowPosition(particle, progress, layout);
        expect(point).toEqual(flowPosition(particle, progress, layout));
        expect(point.x).toBeGreaterThan(0);
        expect(point.x).toBeLessThan(FLOW_WIDTH);
        expect(point.y).toBeGreaterThanOrEqual(previousY - 1e-9);
        expect(point.y).toBeLessThanOrEqual(particle.y);
        previousY = point.y;
      }
      expect(flowPosition(particle, -2, layout)).toMatchObject({ waiting: true, settled: false, y: FLOW_INLET_Y });
      expect(flowPosition(particle, Number.NaN, layout)).toEqual(flowPosition(particle, 1, layout));
      expect(flowPosition(particle, 2, layout)).toEqual(flowPosition(particle, 1, layout));
    }
  });

  it('staggers the incoming batch into progressive landings within one bounded checkpoint', () => {
    expect(flowBatchProgress(0, 32, 0)).toBe(0);
    expect(flowBatchProgress(31, 32, 0.1)).toBe(0);
    expect(flowBatchProgress(0, 32, 0.5)).toBeGreaterThan(flowBatchProgress(31, 32, 0.5));
    const landed = Array.from({ length: 32 }, (_, index) => flowBatchProgress(index, 32, 0.8) === 1);
    expect(landed.filter(Boolean).length).toBeGreaterThan(0);
    expect(landed.filter(Boolean).length).toBeLessThan(32);
    expect(landed).toEqual(landed.map((_, index) => index < landed.filter(Boolean).length));
    for (let index = 0; index < 32; index += 1) {
      expect(flowBatchProgress(index, 32, 1)).toBe(1);
      expect(flowBatchProgress(index, 32, Number.NaN)).toBe(1);
    }
    expect(flowBatchProgress(0, 1, 0.5)).toBe(0.5);
    expect(flowBatchProgress(0, 0, 0.5)).toBe(0.5);
  });

  it('retains existing candidate slots when a partial row receives another observation on the same scale', () => {
    const first = [trade('first', '2'), trade('second', '2')];
    const more = [...first, trade('third', '2')];
    const before = layoutTradeFlow(first, summarizeResultDistribution(first));
    const after = layoutTradeFlow(more, summarizeResultDistribution(more));
    expect(before.countMaximum).toBe(after.countMaximum);
    expect(after.particles.slice(0, first.length).map(({ x, y, radius }) => ({ x, y, radius }))).toEqual(
      before.particles.map(({ x, y, radius }) => ({ x, y, radius }))
    );
  });

  it('lands excluded candidates inside the progressively growing bar without reserving future selected space', () => {
    const input = [
      trade('excluded-first', '2', false),
      trade('selected-first', '2'),
      trade('excluded-last', '2', false),
      trade('selected-last', '2'),
    ];
    const layout = layoutTradeFlow(input, summarizeResultDistribution(input));
    const countHeight = (FLOW_PLOT_BOTTOM - FLOW_PLOT_TOP) / layout.countMaximum;
    for (let count = 1; count <= input.length; count += 1) {
      const arrived = layout.particles.slice(0, count);
      const selected = arrived.filter((particle) => particle.selected).length;
      for (const particle of arrived) {
        const point = flowLandingPosition(particle, 1, layout, selected, 'all');
        expect(point.y - particle.radius).toBeGreaterThanOrEqual(FLOW_PLOT_BOTTOM - count * countHeight);
        expect(point.y + particle.radius).toBeLessThanOrEqual(FLOW_PLOT_BOTTOM);
        if (particle.selected) expect(point).toEqual(flowPosition(particle, 1, layout));
        else expect(point.y + particle.radius).toBeLessThanOrEqual(FLOW_PLOT_BOTTOM - selected * countHeight);
      }
    }
    expect(flowLandingPosition(layout.particles[0], 1, layout, 0, 'all').y).toBe(FLOW_PLOT_BOTTOM - countHeight / 2);
    expect(flowLandingPosition(layout.particles[0], 1, layout, 2, 'all')).toEqual(
      flowPosition(layout.particles[0], 1, layout)
    );
  });

  it('starts the excluded-only stack at the baseline while preserving shared axes and exact bin identities', () => {
    const input = [trade('selected', '-1'), trade('excluded', '-1', false), trade('selected-last', '-1')];
    const layout = layoutTradeFlow(input, summarizeResultDistribution(input));
    const particle = layout.particles[1];
    const before = JSON.stringify({ input, layout });
    expect(particle.selectedBelow).toBe(2);
    const excluded = flowLandingPosition(particle, 1, layout, 2, 'excluded');
    expect(excluded.y).toBe(FLOW_PLOT_BOTTOM - (FLOW_PLOT_BOTTOM - FLOW_PLOT_TOP) / layout.countMaximum / 2);
    expect(excluded.x).toBe(particle.x);
    expect(flowLandingPosition(particle, 1, layout, 2, 'selected')).toEqual(flowPosition(particle, 1, layout));
    expect(JSON.stringify({ input, layout })).toBe(before);
  });

  it('blends the landing offset only in the final segment and clamps presentation-only inputs', () => {
    const input = [trade('excluded', '1', false), trade('selected', '1')];
    const layout = layoutTradeFlow(input, summarizeResultDistribution(input));
    const particle = layout.particles[0];
    const start = (layout.gates.length + 2) / (layout.gates.length + 3);
    for (const progress of [0, start / 2, start])
      expect(flowLandingPosition(particle, progress, layout, 0, 'all')).toEqual(
        flowPosition(particle, progress, layout)
      );
    const middle = (start + 1) / 2;
    const offset = (FLOW_PLOT_BOTTOM - FLOW_PLOT_TOP) / layout.countMaximum;
    expect(
      flowLandingPosition(particle, middle, layout, 0, 'all').y - flowPosition(particle, middle, layout).y
    ).toBeCloseTo(offset / 2);
    expect(flowLandingPosition(particle, 1, layout, -3, 'all')).toEqual(
      flowLandingPosition(particle, 1, layout, 0, 'all')
    );
    expect(flowLandingPosition(particle, 1, layout, 500, 'all')).toEqual(flowPosition(particle, 1, layout));
    expect(flowLandingPosition(particle, Number.NaN, layout, Number.NaN, 'all')).toEqual(
      flowLandingPosition(particle, 1, layout, 0, 'all')
    );
    expect(flowLandingPosition(particle, -1, layout, 0, 'all')).toEqual(flowPosition(particle, 0, layout));
    expect(flowLandingPosition(particle, 2, layout, 0, 'all')).toEqual(
      flowLandingPosition(particle, 1, layout, 0, 'all')
    );
  });

  it('does not mutate frozen source evidence, insights, or settled layout when seeking', () => {
    const input = [trade('a', '2'), trade('b', '-2', false)];
    input.forEach((candidate) => {
      candidate.checks.forEach(Object.freeze);
      Object.freeze(candidate.checks);
      Object.freeze(candidate);
    });
    Object.freeze(input);
    const insights = summarizeResultDistribution(input);
    insights.bins.forEach(Object.freeze);
    Object.freeze(insights.bins);
    Object.freeze(insights);
    const before = JSON.stringify({ input, insights });
    const layout = layoutTradeFlow(input, insights);
    const original = JSON.stringify(layout);
    layout.particles.forEach((particle) => {
      Object.freeze(particle.gates);
      Object.freeze(particle);
      flowPosition(particle, 0.45, layout);
    });
    expect(JSON.stringify({ input, insights })).toBe(before);
    expect(JSON.stringify(layout)).toBe(original);
    expect(layoutTradeFlow(input, insights)).toEqual(layout);
  });

  it('explains each skipped opportunity at one first failure without summing independent failures', () => {
    const checked = (id: string, selected: boolean, results: readonly boolean[]): DistributionTrade => ({
      ...trade(id, '1', selected),
      checks: ['signal', 'cooldown', 'balance'].map((key, index) => ({ key, passed: results[index] })),
    });
    const input = [
      checked('taken', true, [true, true, true]),
      checked('signal-skip', false, [false, false, false]),
      checked('cooldown-skip', false, [true, false, false]),
      checked('balance-skip', false, [true, true, false]),
      { ...trade('unknown-skip', '1', false), checks: [{ key: 'signal', passed: true }] },
    ];
    const summary = summarizeTradeFlowDecisions(input);
    expect(summary).toEqual({
      total: 5,
      selectedCount: 1,
      skippedCount: 4,
      unexplainedSkippedCount: 1,
      inconsistentSelectedCount: 0,
      gates: [
        { key: 'signal', reached: 5, continued: 4, skippedHere: 1, missingHere: 0 },
        { key: 'cooldown', reached: 4, continued: 3, skippedHere: 1, missingHere: 1 },
        { key: 'balance', reached: 3, continued: 2, skippedHere: 1, missingHere: 1 },
      ],
    });
    expect(summary.gates.reduce((count, gate) => count + gate.skippedHere, 0) + summary.unexplainedSkippedCount).toBe(
      summary.skippedCount
    );
    expect(layoutTradeFlow(input, summarizeResultDistribution(input)).gates.map((gate) => gate.rejected)).toEqual([
      1, 2, 3,
    ]);
  });

  it('retains omitted decisions and reports contradictory imported evidence without inventing a decision', () => {
    const omitted = trade('omitted-skip', 'NaN', false);
    const contradictory = { ...trade('contradictory', '1'), checks: [{ key: 'signal', passed: false }] };
    const summary = summarizeTradeFlowDecisions([omitted, contradictory]);
    expect(summary).toMatchObject({
      total: 2,
      selectedCount: 1,
      skippedCount: 1,
      unexplainedSkippedCount: 0,
      inconsistentSelectedCount: 1,
      gates: [
        { key: 'signal', reached: 2, continued: 2, skippedHere: 0 },
        { key: 'balance', reached: 2, continued: 1, skippedHere: 1, missingHere: 1 },
      ],
    });
    expect(summarizeTradeFlowDecisions([{ ...trade('no-checks', '0', false), checks: [] }])).toMatchObject({
      total: 1,
      selectedCount: 0,
      skippedCount: 1,
      unexplainedSkippedCount: 1,
      gates: [],
    });
    expect(summarizeTradeFlowDecisions([])).toMatchObject({ total: 0, selectedCount: 0, skippedCount: 0, gates: [] });
  });

  it('uses the shared displayed gate order when imported check arrays use a different order', () => {
    const first = trade('first', '1');
    const reordered = {
      ...trade('reordered', '1', false),
      checks: [
        { key: 'balance', passed: false },
        { key: 'signal', passed: false },
      ],
    };
    const input = [first, reordered];
    const layout = layoutTradeFlow(input, summarizeResultDistribution(input));
    expect(layout.particles[1].firstFailedGate).toBe(0);
    expect(summarizeTradeFlowDecisions(input).gates).toEqual([
      { key: 'signal', reached: 2, continued: 1, skippedHere: 1, missingHere: 0 },
      { key: 'balance', reached: 1, continued: 1, skippedHere: 0, missingHere: 0 },
    ]);
  });

  it('updates gate counts only when the incoming opportunity crosses its recorded decision', () => {
    const input = [trade('settled-taken', '1'), trade('settled-skipped', '1', false), trade('incoming', '1', false)];
    input[1].checks = [
      { key: 'signal', passed: false },
      { key: 'balance', passed: false },
    ];
    const layout = layoutTradeFlow(input, summarizeResultDistribution(input));
    const incoming = new Map([['incoming', 0]]);
    expect(summarizeTradeFlowProgress(layout, incoming, 0)).toMatchObject({
      total: 3,
      waiting: 1,
      inFlight: 0,
      landed: 2,
      landedSelected: 1,
      landedSkipped: 1,
      gates: [
        { key: 'signal', reached: 2, continued: 1, skippedHere: 1 },
        { key: 'balance', reached: 1, continued: 1, skippedHere: 0 },
      ],
    });
    expect(summarizeTradeFlowProgress(layout, incoming, 0.1999).gates[0].reached).toBe(2);
    const atSignal = summarizeTradeFlowProgress(layout, incoming, 0.2);
    expect(atSignal).toMatchObject({ waiting: 0, inFlight: 1, checking: 1, travellingToBin: 0, landed: 2 });
    expect(atSignal.gates[0]).toMatchObject({ reached: 3, continued: 2, skippedHere: 1 });
    expect(atSignal.gates[1]).toMatchObject({ reached: 1, continued: 1, skippedHere: 0 });
    const atBalance = summarizeTradeFlowProgress(layout, incoming, 0.4);
    expect(atBalance).toMatchObject({ inFlight: 1, checking: 0, travellingToBin: 1, landed: 2 });
    expect(atBalance.gates[1]).toMatchObject({ reached: 2, continued: 1, skippedHere: 1 });
    const landed = summarizeTradeFlowProgress(layout, incoming, 1);
    expect(landed).toMatchObject({ waiting: 0, inFlight: 0, landed: 3, landedSelected: 1, landedSkipped: 2 });
    expect(landed.gates).toEqual(summarizeTradeFlowDecisions(input).gates);
  });

  it('reconciles all phases during staggered batches without filtering or relabeling recorded outcomes', () => {
    const input = Array.from({ length: 32 }, (_, index) => trade(`c-${index}`, String(index - 16), index % 3 === 0));
    const layout = layoutTradeFlow(input, summarizeResultDistribution(input));
    const incoming = new Map(input.map((entry, index) => [entry.id, index]));
    const before = JSON.stringify({ input, layout });
    for (const progress of [0, 0.1, 0.3, 0.5, 0.8, 1]) {
      const summary = summarizeTradeFlowProgress(layout, incoming, progress);
      expect(summary.waiting + summary.inFlight + summary.landed).toBe(input.length);
      expect(summary.checking + summary.travellingToBin).toBe(summary.inFlight);
      expect(summary.landedSelected + summary.landedSkipped).toBe(summary.landed);
      for (const gate of summary.gates) expect(gate.continued + gate.skippedHere).toBe(gate.reached);
    }
    const partial = summarizeTradeFlowProgress(layout, incoming, 0.8);
    expect(partial.landed).toBeGreaterThan(0);
    expect(partial.landed).toBeLessThan(input.length);
    expect(partial.inFlight).toBeGreaterThan(0);
    expect(summarizeTradeFlowProgress(layout, incoming, Number.NaN)).toEqual(
      summarizeTradeFlowProgress(layout, incoming, 1)
    );
    expect(JSON.stringify({ input, layout })).toBe(before);
  });

  it('does not turn omitted outcomes or unrecorded checks into moving decisions or gate passes', () => {
    const input = [
      { ...trade('missing', '1', false), checks: [{ key: 'signal', passed: true }] },
      trade('present', '1'),
      trade('invalid', 'NaN', false),
    ];
    const layout = layoutTradeFlow(input, summarizeResultDistribution(input));
    const progress = summarizeTradeFlowProgress(layout, new Map(), 0);
    expect(progress).toMatchObject({
      total: 2,
      waiting: 0,
      inFlight: 0,
      landed: 2,
      landedSelected: 1,
      landedSkipped: 1,
    });
    expect(progress.gates).toEqual(summarizeTradeFlowDecisions(input.slice(0, 2)).gates);
    expect(progress.gates[1]).toMatchObject({ reached: 2, continued: 2, skippedHere: 0, missingHere: 1 });
    expect(summarizeTradeFlowDecisions(input).skippedCount).toBe(2);
  });
});
