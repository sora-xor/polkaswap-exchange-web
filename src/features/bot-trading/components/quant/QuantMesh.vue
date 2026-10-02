<template>
  <figure ref="root" class="mesh" data-testid="quant-mesh" :data-running="running ? 'true' : 'false'">
    <canvas ref="canvas" aria-hidden="true" />
    <span ref="probePink" class="mesh-probe mesh-probe--pink" aria-hidden="true" />
    <span ref="probeViolet" class="mesh-probe mesh-probe--violet" aria-hidden="true" />
    <span ref="probeMuted" class="mesh-probe mesh-probe--muted" aria-hidden="true" />
    <span ref="probeSurface" class="mesh-probe mesh-probe--surface" aria-hidden="true" />
    <ul class="mesh-labels">
      <li
        v-for="(family, index) in families"
        :key="family.key"
        class="mesh-label"
        :style="labelStyle(index)"
        :data-family="family.key"
      >
        <strong>{{ family.label }}</strong>
        <span>{{ family.robust }} / {{ family.tested }}</span>
      </li>
    </ul>
    <figcaption class="mesh-caption">{{ caption }}</figcaption>
  </figure>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { QuantMeshNode } from '@/features/bot-trading/quant-loop';

defineOptions({ name: 'QuantMesh' });

/**
 * Canvas map of the tested strategies, clustered by family. Positions are derived from
 * stable node identifiers, so the layout never encodes or invents performance. Glow marks
 * candidates that passed every training gate; the pulsing node is the deployed selection.
 */
const props = defineProps<{
  nodes: QuantMeshNode[];
  families: { key: string; label: string; robust: number; tested: number }[];
  running: boolean;
  /** Real search progress, 0..1. */
  progress: number;
  caption: string;
  /** Idle pages draw one static frame instead of animating continuously. */
  paused?: boolean;
}>();

const root = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const probePink = ref<HTMLElement | null>(null);
const probeViolet = ref<HTMLElement | null>(null);
const probeMuted = ref<HTMLElement | null>(null);
const probeSurface = ref<HTMLElement | null>(null);

interface Placed extends QuantMeshNode {
  x: number;
  y: number;
  phase: number;
  cluster: number;
}
let placed: Placed[] = [];
/** When the current node set arrived; nodes fly out from their family hub from this time. */
let assembledAt = 0;
let width = 0;
let height = 0;
let frame = 0;
let visible = true;
let reduced = false;
let colors = { pink: '#f8087b', violet: '#9f5bd0', muted: '#b9a9c4', surface: '#fdf7fb' };
let resize: ResizeObserver | null = null;
let intersection: IntersectionObserver | null = null;
let theme: MutationObserver | null = null;
let motion: MediaQueryList | null = null;
const onMotion = (event: MediaQueryListEvent) => {
  reduced = event.matches;
  schedule();
};

/** Deterministic 0..1 hash so layouts are stable between renders. */
function hash(text: string, salt = 0): number {
  let value = 2166136261 ^ salt;
  for (let index = 0; index < text.length; index++) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  return ((value >>> 0) % 10000) / 10000;
}

function hub(index: number) {
  const count = Math.max(1, props.families.length);
  const theta = -Math.PI / 2 + (index * Math.PI * 2) / count;
  return { x: width / 2 + Math.cos(theta) * width * 0.33, y: height / 2 + Math.sin(theta) * height * 0.3 };
}

function labelStyle(index: number) {
  const count = Math.max(1, props.families.length);
  const theta = -Math.PI / 2 + (index * Math.PI * 2) / count;
  const left = 50 + Math.cos(theta) * 33;
  const top = 50 + Math.sin(theta) * 30;
  return { left: `${left}%`, top: `calc(${top}% + ${Math.sin(theta) >= 0 ? 34 : -34}px)` };
}

function layout(): void {
  const index = new Map(props.families.map((family, position) => [family.key, position]));
  const spread = Math.min(width, height) * 0.13;
  placed = props.nodes.map((node) => {
    const cluster = index.get(node.family) ?? 0;
    const center = hub(cluster);
    const radius = Math.sqrt(hash(node.id, 1)) * spread;
    const theta = hash(node.id, 2) * Math.PI * 2;
    return {
      ...node,
      cluster,
      phase: hash(node.id, 3) * Math.PI * 2,
      x: center.x + Math.cos(theta) * radius,
      y: center.y + Math.sin(theta) * radius,
    };
  });
  // A few relaxation passes keep nodes in a cluster from overlapping.
  for (let pass = 0; pass < 24; pass++) {
    for (let a = 0; a < placed.length; a++) {
      for (let b = a + 1; b < placed.length; b++) {
        const first = placed[a];
        const second = placed[b];
        if (first.cluster !== second.cluster) continue;
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.hypot(dx, dy) || 0.01;
        const minimum = 11;
        if (distance < minimum) {
          const push = (minimum - distance) / 2;
          first.x -= (dx / distance) * push;
          first.y -= (dy / distance) * push;
          second.x += (dx / distance) * push;
          second.y += (dy / distance) * push;
        }
      }
    }
  }
}

function readColors(): void {
  const read = (element: HTMLElement | null, fallback: string) =>
    (element && getComputedStyle(element).color) || fallback;
  colors = {
    pink: read(probePink.value, colors.pink),
    violet: read(probeViolet.value, colors.violet),
    muted: read(probeMuted.value, colors.muted),
    surface: read(probeSurface.value, colors.surface),
  };
}

function size(): void {
  const element = canvas.value;
  const container = root.value;
  if (!element || !container) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  width = container.clientWidth;
  height = Math.max(240, Math.min(420, Math.round(width * 0.62)));
  element.width = Math.round(width * ratio);
  element.height = Math.round(height * ratio);
  element.style.height = `${height}px`;
  element.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0);
  layout();
}

function draw(time: number): void {
  const context = canvas.value?.getContext('2d');
  if (!context || !width) return;
  const t = reduced ? 0 : time / 1000;
  context.clearRect(0, 0, width, height);
  const glow = context.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.6
  );
  glow.addColorStop(0, withAlpha(colors.pink, 0.1));
  glow.addColorStop(1, withAlpha(colors.violet, 0));
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  props.families.forEach((_family, index) => {
    const center = hub(index);
    context.beginPath();
    context.arc(center.x, center.y, Math.min(width, height) * 0.15, 0, Math.PI * 2);
    context.strokeStyle = withAlpha(colors.violet, 0.18);
    context.setLineDash([3, 6]);
    context.lineDashOffset = reduced ? 0 : -t * 8;
    context.stroke();
    context.setLineDash([]);
  });

  if (props.running || !placed.length) {
    // Real progress sweeps around the mesh while the search runs.
    const radius = Math.min(width, height) * 0.42;
    context.beginPath();
    context.arc(width / 2, height / 2, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, props.progress));
    context.strokeStyle = withAlpha(colors.pink, 0.55);
    context.lineWidth = 3;
    context.stroke();
    context.lineWidth = 1;
    if (!reduced) {
      // Decorative radar beam and orbiting sparks: motion only, never data.
      const angle = (t * 1.6) % (Math.PI * 2);
      const beam = context.createLinearGradient(
        width / 2,
        height / 2,
        width / 2 + Math.cos(angle) * radius,
        height / 2 + Math.sin(angle) * radius
      );
      beam.addColorStop(0, withAlpha(colors.pink, 0));
      beam.addColorStop(1, withAlpha(colors.pink, 0.6));
      context.beginPath();
      context.moveTo(width / 2, height / 2);
      context.lineTo(width / 2 + Math.cos(angle) * radius, height / 2 + Math.sin(angle) * radius);
      context.strokeStyle = beam;
      context.lineWidth = 2;
      context.stroke();
      context.lineWidth = 1;
      props.families.forEach((_family, index) => {
        const center = hub(index);
        for (let spark = 0; spark < 5; spark++) {
          const theta = t * (0.9 + spark * 0.22) + index * 1.3 + spark * 1.26;
          const orbit = Math.min(width, height) * (0.06 + spark * 0.018);
          context.beginPath();
          context.arc(center.x + Math.cos(theta) * orbit, center.y + Math.sin(theta) * orbit, 2.2, 0, Math.PI * 2);
          context.fillStyle = withAlpha(spark % 2 ? colors.violet : colors.pink, 0.7);
          context.fill();
        }
      });
    }
  }

  const assembly = (index: number) => {
    if (reduced) return 1;
    const progress = Math.min(1, Math.max(0, (time - assembledAt - index * 12) / 900));
    // easeOutBack: a slight overshoot as nodes settle into their cluster.
    const c = 1.70158;
    return 1 + (c + 1) * (progress - 1) ** 3 + c * (progress - 1) ** 2;
  };
  const position = (node: Placed) => {
    const index = placed.indexOf(node);
    const center = hub(node.cluster);
    const settle = assembly(index);
    return {
      x: center.x + (node.x - center.x) * settle + Math.sin(t * 0.7 + node.phase) * 2.2,
      y: center.y + (node.y - center.y) * settle + Math.cos(t * 0.6 + node.phase) * 2.2,
    };
  };
  const assembled = (node: Placed) => Math.min(1, Math.max(0, (time - assembledAt - placed.indexOf(node) * 12) / 600));
  // Edges: robust strategies in one market share its regime, so link them across families.
  const byMarket = new Map<string, Placed[]>();
  placed
    .filter((node) => node.robust)
    .forEach((node) => byMarket.set(node.market, [...(byMarket.get(node.market) ?? []), node]));
  context.lineWidth = 1;
  byMarket.forEach((group) => {
    for (let index = 1; index < group.length; index++) {
      const a = position(group[index - 1]);
      const b = position(group[index]);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.strokeStyle = withAlpha(colors.pink, 0.22 * (reduced ? 1 : assembled(group[index])));
      context.stroke();
    }
  });
  placed.forEach((node) => {
    const center = hub(node.cluster);
    const at = position(node);
    context.beginPath();
    context.moveTo(center.x, center.y);
    context.lineTo(at.x, at.y);
    context.strokeStyle = withAlpha(colors.muted, 0.12);
    context.stroke();
  });
  placed.forEach((node) => {
    const at = position(node);
    const radius = node.selected ? 9 : 2.6 + node.weight * 4.2;
    if (node.selected) {
      const pulse = reduced ? 0.5 : (Math.sin(t * 2.4) + 1) / 2;
      context.beginPath();
      context.arc(at.x, at.y, radius + 6 + pulse * 7, 0, Math.PI * 2);
      context.strokeStyle = withAlpha(colors.pink, 0.45 - pulse * 0.3);
      context.lineWidth = 2;
      context.stroke();
      context.lineWidth = 1;
    }
    const fill = context.createRadialGradient(at.x - radius / 3, at.y - radius / 3, 0, at.x, at.y, radius);
    if (node.robust) {
      fill.addColorStop(0, withAlpha(colors.surface, 0.95));
      fill.addColorStop(0.35, withAlpha(colors.pink, 0.95));
      fill.addColorStop(1, withAlpha(colors.pink, 0.75));
      context.shadowColor = withAlpha(colors.pink, 0.55);
      context.shadowBlur = node.selected ? 18 : 10;
    } else {
      fill.addColorStop(0, withAlpha(colors.surface, 0.6));
      fill.addColorStop(1, withAlpha(colors.muted, 0.42));
      context.shadowBlur = 0;
    }
    context.globalAlpha = reduced ? 1 : assembled(node);
    context.beginPath();
    context.arc(at.x, at.y, radius, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.fill();
    context.shadowBlur = 0;
    context.globalAlpha = 1;
  });
}

/** Convert a computed `rgb()`/`rgba()` color into one with the requested alpha. */
function withAlpha(color: string, alpha: number): string {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return color;
  const [r, g, b] = match[1].split(/[\s,/]+/).filter(Boolean);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function loop(time: number): void {
  frame = 0;
  draw(time);
  if (!reduced && !props.paused && visible && document.visibilityState === 'visible')
    frame = requestAnimationFrame(loop);
}
function schedule(): void {
  if (!frame) frame = requestAnimationFrame(loop);
}

onMounted(() => {
  motion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  reduced = motion?.matches ?? false;
  motion?.addEventListener?.('change', onMotion);
  readColors();
  size();
  // Replay the assembly on every visit, including cached results.
  assembledAt = performance.now();
  schedule();
  if (typeof ResizeObserver !== 'undefined' && root.value) {
    resize = new ResizeObserver(() => {
      size();
      schedule();
    });
    resize.observe(root.value);
  }
  if (typeof IntersectionObserver !== 'undefined' && root.value) {
    intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) schedule();
    });
    intersection.observe(root.value);
  }
  theme = new MutationObserver(() => {
    readColors();
    schedule();
  });
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'design-system-theme'] });
  document.addEventListener('visibilitychange', schedule);
});

watch(
  () => [props.nodes, props.families.length],
  () => {
    layout();
    assembledAt = performance.now();
    schedule();
  }
);
watch(
  () => [props.running, props.progress, props.paused],
  () => schedule()
);

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
  resize?.disconnect();
  intersection?.disconnect();
  theme?.disconnect();
  motion?.removeEventListener?.('change', onMotion);
  document.removeEventListener('visibilitychange', schedule);
});
</script>

<style scoped lang="scss">
.mesh {
  position: relative;
  margin: 0;
  min-width: 0;
  border-radius: 20px;
  background: var(--s-color-base-background, #faf4f8);
  box-shadow:
    inset 3px 3px 9px var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1)),
    inset -3px -3px 9px var(--s-shadow-color-light-dark, rgba(255, 255, 255, 0.8));
  overflow: hidden;
  canvas {
    display: block;
    width: 100%;
  }
}
.mesh-probe {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}
.mesh-probe--pink {
  color: var(--s-color-theme-accent, #f8087b);
}
.mesh-probe--violet {
  color: color-mix(in srgb, var(--s-color-status-info, #479aef) 45%, var(--s-color-theme-accent, #f8087b));
}
.mesh-probe--muted {
  color: var(--s-color-base-content-tertiary, #796971);
}
.mesh-probe--surface {
  color: var(--s-color-utility-surface, #fdf7fb);
}
.mesh-labels {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  pointer-events: none;
}
.mesh-label {
  position: absolute;
  transform: translate(-50%, -50%);
  display: grid;
  justify-items: center;
  gap: 1px;
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
  font-size: 11px;
  line-height: 1.3;
  background: color-mix(in srgb, var(--s-color-utility-surface, #fdf7fb) 72%, transparent);
  box-shadow: 0 4px 14px var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1));
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  strong {
    font-weight: 700;
    color: var(--s-color-base-content-primary, #2a171f);
  }
  span {
    font-variant-numeric: tabular-nums;
    color: var(--s-color-action-text, #ab0555);
  }
}
.mesh-caption {
  position: absolute;
  inset: auto 12px 10px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--s-color-base-content-secondary, #6e6168);
  text-align: center;
}
</style>
