<template>
  <section
    v-if="market"
    :class="['market-share', { 'market-share--compact': compact }]"
    :data-testid="compact ? 'market-share-actions' : 'market-share-widget'"
  >
    <template v-if="!compact">
      <header class="market-share__header">
        <div class="market-share__brand">
          <img class="market-share__logo" :src="polkamarktLogoUrl" alt="" aria-hidden="true" />
          <div>
            <span>{{ t('polkamarkt.share.kicker') }}</span>
            <h3>{{ t('polkamarkt.share.title') }}</h3>
          </div>
        </div>
        <a class="market-share__trade-link" :href="tradeLink" data-testid="market-share-trade-link">
          {{ t('polkamarkt.share.tradeLink') }}
        </a>
      </header>

      <div class="market-share__snapshot">
        <span class="market-share__meta">{{ market.category }} · {{ market.status || t('polkamarkt.status.active') }}</span>
        <strong>{{ market.title }}</strong>

        <div class="market-share__outcomes">
          <div class="market-share__outcome market-share__outcome--yes">
            <span>{{ t('polkamarkt.outcomes.yes') }}</span>
            <strong>{{ yesPercent }}</strong>
            <small>{{ yesPrice }}</small>
          </div>
          <div class="market-share__outcome">
            <span>{{ t('polkamarkt.outcomes.no') }}</span>
            <strong>{{ noPercent }}</strong>
            <small>{{ noPrice }}</small>
          </div>
        </div>

        <div class="market-share__split" :aria-label="splitLabel">
          <span class="market-share__split-yes" :style="{ width: yesSplitWidth }" />
          <span class="market-share__split-no" :style="{ width: noSplitWidth }" />
        </div>

        <div class="market-share__chart-header">
          <span class="market-share__chart-pill market-share__chart-pill--yes">
            {{ t('polkamarkt.outcomes.yes') }} {{ yesPercent }}
          </span>
          <span class="market-share__chart-pill">
            {{ t('polkamarkt.outcomes.no') }} {{ noPercent }}
          </span>
        </div>

        <div class="market-share__chart" data-testid="market-share-chart">
          <svg
            role="img"
            :aria-label="splitLabel"
            :viewBox="`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`"
            preserveAspectRatio="none"
          >
            <g v-for="value in chartGridValues" :key="value">
              <line
                class="market-share__chart-grid"
                :x1="CHART_PADDING"
                :x2="CHART_WIDTH - CHART_PADDING"
                :y1="chartY(value)"
                :y2="chartY(value)"
              />
            </g>
            <path
              v-if="chartPath"
              class="market-share__chart-line"
              data-testid="market-share-chart-line"
              :d="chartPath"
              fill="none"
            />
            <path
              v-if="chartNoPath"
              class="market-share__chart-line market-share__chart-line--no"
              data-testid="market-share-chart-no-line"
              :d="chartNoPath"
              fill="none"
            />
            <circle
              v-if="currentChartPoint"
              class="market-share__chart-dot"
              :cx="currentChartPoint.x"
              :cy="currentChartPoint.y"
              r="5"
            />
            <circle
              v-if="currentNoChartPoint"
              class="market-share__chart-dot market-share__chart-dot--no"
              :cx="currentNoChartPoint.x"
              :cy="currentNoChartPoint.y"
              r="5"
            />
          </svg>
          <span
            v-for="value in chartGridValues"
            :key="`share-grid-label-${value}`"
            class="market-share__chart-label"
            :data-testid="`market-share-grid-label-${value}`"
            :style="chartGridLabelStyle(value)"
            aria-hidden="true"
          >
            {{ value }}%
          </span>
        </div>

        <dl>
          <div>
            <dt>{{ t('polkamarkt.metrics.liquidity') }}</dt>
            <dd>{{ liquidity }}</dd>
          </div>
          <div>
            <dt>{{ t('polkamarkt.metrics.volume') }}</dt>
            <dd>{{ volume }}</dd>
          </div>
          <div>
            <dt>{{ t('polkamarkt.metrics.closeBlock') }}</dt>
            <dd>{{ closeBlock }}</dd>
          </div>
        </dl>
      </div>
    </template>

    <div class="market-share__actions">
      <button v-if="!compact" type="button" data-testid="market-share-copy" @click="copySnapshot">
        {{ copied ? t('polkamarkt.share.copied') : t('polkamarkt.share.copySummary') }}
      </button>
      <button type="button" data-testid="market-share-native" @click="shareNative">
        {{ t('polkamarkt.share.native') }}
      </button>
      <button type="button" data-testid="market-share-png" @click="downloadPng">
        {{ t('polkamarkt.share.downloadPng') }}
      </button>
      <a :href="telegramUrl" target="_blank" rel="nofollow noopener noreferrer">
        {{ t('social.telegram') }}
      </a>
      <a :href="xUrl" target="_blank" rel="nofollow noopener noreferrer">
        {{ t('polkamarkt.share.x') }}
      </a>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import polkamarktLogoUrl from '@/assets/img/polkamarkt/pm_logo.svg?url';
import { useTranslation } from '@/composables/useTranslation';
import { POLKAMARKT_COLLATERAL_ASSET } from '../consts';
import { yesNoPricesFromProbability } from '../lib/markets';
import { buildMarketShareSnapshot, buildMarketShareText, buildMarketShareUrl, buildPolkamarktTradeLink } from '../lib/share';

import type { MarketHistoryPoint, PolkamarktMarket } from '../types';

const props = defineProps<{
  market?: PolkamarktMarket;
  history?: MarketHistoryPoint[];
  baseUrl?: string;
  compact?: boolean;
}>();

const { t } = useTranslation();
const copied = ref(false);

const currentHref = computed(() => props.baseUrl ?? (typeof window === 'undefined' ? '' : window.location.href));
const tradeLink = computed(() => (props.market ? buildPolkamarktTradeLink(props.market, currentHref.value) : ''));
const prices = computed(() => yesNoPricesFromProbability(props.market?.probability));
const yesSplit = computed(() =>
  Number.isFinite(props.market?.probability) ? Math.max(0, Math.min(100, Math.round(props.market?.probability ?? 0))) : undefined
);
const noSplit = computed(() => (yesSplit.value === undefined ? undefined : 100 - yesSplit.value));
const yesSplitWidth = computed(() => `${yesSplit.value ?? 50}%`);
const noSplitWidth = computed(() => `${noSplit.value ?? 50}%`);
const snapshot = computed(() => (props.market ? buildMarketShareSnapshot(props.market) : ''));
const shareText = computed(() => (props.market ? buildMarketShareText(props.market, tradeLink.value) : ''));
const telegramUrl = computed(() => buildMarketShareUrl('telegram', snapshot.value, tradeLink.value));
const xUrl = computed(() => buildMarketShareUrl('x', snapshot.value, tradeLink.value));

const SHARE_IMAGE_WIDTH = 1337;
const SHARE_IMAGE_HEIGHT = 753;
const CHART_WIDTH = 640;
const CHART_HEIGHT = 180;
const CHART_PADDING = 24;
const chartGridValues = [25, 50, 75] as const;

const formatPercent = (value?: number): string => (Number.isFinite(value) ? `${value}%` : t('polkamarkt.notIndexed'));
const formatPrice = (value?: number): string =>
  Number.isFinite(value) ? `${(value ?? 0).toFixed(2)} ${POLKAMARKT_COLLATERAL_ASSET.symbol}` : t('polkamarkt.notIndexed');
const formatUsd = (value?: number): string =>
  Number.isFinite(value)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value ?? 0)
    : t('polkamarkt.notIndexed');

const yesPercent = computed(() => formatPercent(yesSplit.value));
const noPercent = computed(() => formatPercent(noSplit.value));
const yesPrice = computed(() => formatPrice(prices.value.yes));
const noPrice = computed(() => formatPrice(prices.value.no));
const liquidity = computed(() => formatUsd(props.market?.liquidity));
const volume = computed(() => formatUsd(props.market?.volume));
const closeBlock = computed(() =>
  Number.isFinite(props.market?.closeBlock) ? Number(props.market?.closeBlock).toLocaleString() : t('polkamarkt.notIndexed')
);
const splitLabel = computed(
  () => `${t('polkamarkt.outcomes.yes')} ${yesPercent.value}, ${t('polkamarkt.outcomes.no')} ${noPercent.value}`
);
const imageFileName = computed(() => `polkamarkt-market-${props.market?.chainId ?? props.market?.id ?? 'snapshot'}.png`);

const chartPoints = computed(() => {
  const source =
    props.history?.length && props.history.some((point) => Number.isFinite(point.probability))
      ? props.history
      : props.market?.probability === undefined
        ? []
        : [{ id: 'current', probability: props.market.probability }];

  return [...source]
    .filter((point) => Number.isFinite(point.probability))
    .sort((left, right) => {
      const timestampDiff = (left.timestamp ?? 0) - (right.timestamp ?? 0);
      if (timestampDiff !== 0) return timestampDiff;
      return String(left.id).localeCompare(String(right.id));
    });
});

const chartX = (index: number, count: number): number =>
  count <= 1 ? CHART_WIDTH - CHART_PADDING : CHART_PADDING + (index / (count - 1)) * (CHART_WIDTH - CHART_PADDING * 2);

const chartY = (probability: number): number =>
  CHART_PADDING + ((100 - Math.max(0, Math.min(100, probability))) / 100) * (CHART_HEIGHT - CHART_PADDING * 2);

/** Maps SVG user coordinates to percentage offsets for non-scaling HTML chart labels. */
const chartPercent = (coordinate: number, total: number): string => `${(coordinate / total) * 100}%`;

const chartGridLabelStyle = (value: (typeof chartGridValues)[number]): Record<string, string> => ({
  right: chartPercent(CHART_PADDING, CHART_WIDTH),
  top: chartPercent(chartY(value) - 6, CHART_HEIGHT),
});

const chartCoordinates = computed(() =>
  chartPoints.value.map((point, index) => ({
    x: chartX(index, chartPoints.value.length),
    y: chartY(point.probability),
    probability: point.probability,
  }))
);

const chartNoCoordinates = computed(() =>
  chartPoints.value.map((point, index) => ({
    x: chartX(index, chartPoints.value.length),
    y: chartY(100 - point.probability),
    probability: 100 - point.probability,
  }))
);

/** Builds a compact SVG path for the indexed probability history line. */
function buildChartPath(coordinates: Array<{ x: number; y: number }>): string {
  if (!coordinates.length) return '';
  if (coordinates.length === 1) {
    const point = coordinates[0];
    return `M ${CHART_PADDING} ${point.y} L ${CHART_WIDTH - CHART_PADDING} ${point.y}`;
  }

  return coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}

const chartPath = computed(() => buildChartPath(chartCoordinates.value));
const chartNoPath = computed(() => buildChartPath(chartNoCoordinates.value));
const currentChartPoint = computed(() => chartCoordinates.value.at(-1));
const currentNoChartPoint = computed(() => chartNoCoordinates.value.at(-1));

async function writeClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === 'undefined') return;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

async function copySnapshot(): Promise<void> {
  await writeClipboard(shareText.value);
  copied.value = true;
  window.setTimeout(() => {
    copied.value = false;
  }, 1_500);
}

async function shareNative(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.share && props.market) {
    const pngBlob = await createPngBlob();
    const pngFile = new File([pngBlob], imageFileName.value, { type: 'image/png' });
    if (navigator.canShare?.({ files: [pngFile] })) {
      await navigator.share({
        title: props.market.title,
        text: snapshot.value,
        url: tradeLink.value,
        files: [pngFile],
      });
      return;
    }

    await navigator.share({
      title: props.market.title,
      text: snapshot.value,
      url: tradeLink.value,
    });
    return;
  }

  await copySnapshot();
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

const SHARE_CARD_FONT = 'Sora, Arial, sans-serif';
let logoImagePromise: Promise<HTMLImageElement | undefined> | undefined;

function setCanvasFont(context: CanvasRenderingContext2D, weight: number, size: number): void {
  context.font = `${weight} ${size}px ${SHARE_CARD_FONT}`;
}

/** Keeps single-line canvas text inside its allocated box by shrinking and truncating as needed. */
function drawFittedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  weight: number,
  size: number,
  minSize = 16
): void {
  const value = text.trim();
  let fontSize = size;
  while (fontSize > minSize) {
    setCanvasFont(context, weight, fontSize);
    if (context.measureText(value).width <= maxWidth) {
      context.fillText(value, x, y);
      return;
    }
    fontSize -= 2;
  }

  setCanvasFont(context, weight, minSize);
  context.fillText(truncateCanvasText(context, value, maxWidth), x, y);
}

function truncateCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text;
  if (context.measureText('...').width > maxWidth) return '';

  let low = 0;
  let high = text.length;
  let best = '';
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = `${text.slice(0, middle).trimEnd()}...`;
    if (context.measureText(candidate).width <= maxWidth) {
      best = candidate;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return best;
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) lines.push(line);
    line = context.measureText(word).width > maxWidth ? truncateCanvasText(context, word, maxWidth) : word;
  }

  if (line) lines.push(line);
  return lines;
}

/** Draws wrapped canvas text without letting long market questions escape the share-card bounds. */
function drawFittedWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  weight: number,
  size: number,
  minSize: number,
  lineHeight: number,
  maxLines: number
): number {
  let selectedSize = size;
  let selectedLines: string[] = [];

  for (let fontSize = size; fontSize >= minSize; fontSize -= 2) {
    setCanvasFont(context, weight, fontSize);
    const lines = wrapCanvasText(context, text, maxWidth);
    selectedSize = fontSize;
    selectedLines = lines;
    if (lines.length <= maxLines) break;
  }

  setCanvasFont(context, weight, selectedSize);
  const visibleLines = selectedLines.slice(0, maxLines);
  if (selectedLines.length > maxLines) {
    visibleLines[maxLines - 1] = truncateCanvasText(
      context,
      [visibleLines[maxLines - 1], ...selectedLines.slice(maxLines)].join(' '),
      maxWidth
    );
  }

  visibleLines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });

  return y + visibleLines.length * lineHeight;
}

function existingLogoElement(): HTMLImageElement | undefined {
  if (typeof document === 'undefined') return undefined;
  const image = document.querySelector<HTMLImageElement>('.market-share__logo');
  return image?.complete && image.naturalWidth > 0 ? image : undefined;
}

/** Loads the Polkamarkt SVG mark for the generated PNG while falling back to a drawn mark if unavailable. */
function loadPolkamarktLogoImage(): Promise<HTMLImageElement | undefined> {
  const existing = existingLogoElement();
  if (existing) return Promise.resolve(existing);
  if (typeof Image === 'undefined') return Promise.resolve(undefined);
  if (logoImagePromise) return logoImagePromise;

  logoImagePromise = new Promise((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => resolve(undefined), 1_000);
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      resolve(undefined);
    };
    image.src = polkamarktLogoUrl;
  });

  return logoImagePromise;
}

function drawLogoMark(context: CanvasRenderingContext2D, image: HTMLImageElement | undefined, x: number, y: number, size: number): void {
  context.fillStyle = '#f7edf4';
  roundedRect(context, x, y, size, size, 26);
  context.fill();

  if (image) {
    const logoWidth = size - 14;
    const logoHeight = logoWidth * (793 / 1133);
    context.drawImage(image, x + 7, y + (size - logoHeight) / 2, logoWidth, logoHeight);
    return;
  }

  context.fillStyle = '#e3242d';
  roundedRect(context, x + 16, y + 20, size - 32, size - 40, 16);
  context.fill();
  context.fillStyle = '#ffffff';
  drawFittedText(context, 'PM', x + 28, y + 54, size - 56, 800, 22, 16);
}

function drawCanvasLine(
  context: CanvasRenderingContext2D,
  coordinates: Array<{ x: number; y: number }>,
  left: number,
  top: number,
  width: number,
  height: number,
  strokeStyle: string
): void {
  if (!coordinates.length) return;
  context.strokeStyle = strokeStyle;
  context.lineWidth = 7;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  coordinates.forEach((point, index) => {
    const x = left + (point.x / CHART_WIDTH) * width;
    const y = top + (point.y / CHART_HEIGHT) * height;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
}

function drawCanvasTrendChart(context: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
  context.fillStyle = '#2f104a';
  roundedRect(context, left, top, width, height, 24);
  context.fill();

  context.strokeStyle = 'rgba(247, 237, 244, 0.18)';
  context.lineWidth = 2;
  context.fillStyle = '#d8c7d9';
  setCanvasFont(context, 700, 22);

  for (const value of chartGridValues) {
    const y = top + ((100 - value) / 100) * height;
    context.setLineDash([6, 10]);
    context.beginPath();
    context.moveTo(left + 28, y);
    context.lineTo(left + width - 86, y);
    context.stroke();
    context.setLineDash([]);
    context.fillText(`${value}%`, left + width - 70, y + 7);
  }

  drawCanvasLine(context, chartNoCoordinates.value, left + 20, top + 12, width - 100, height - 24, '#f7edf4');
  drawCanvasLine(context, chartCoordinates.value, left + 20, top + 12, width - 100, height - 24, '#f8087b');

  const currentYes = chartCoordinates.value.at(-1);
  const currentNo = chartNoCoordinates.value.at(-1);
  if (currentNo) {
    context.fillStyle = '#f7edf4';
    context.beginPath();
    context.arc(left + 20 + (currentNo.x / CHART_WIDTH) * (width - 100), top + 12 + (currentNo.y / CHART_HEIGHT) * (height - 24), 10, 0, Math.PI * 2);
    context.fill();
  }
  if (currentYes) {
    context.fillStyle = '#f8087b';
    context.beginPath();
    context.arc(left + 20 + (currentYes.x / CHART_WIDTH) * (width - 100), top + 12 + (currentYes.y / CHART_HEIGHT) * (height - 24), 12, 0, Math.PI * 2);
    context.fill();
  }
}

function drawOutcomeCard(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  percent: string,
  price: string,
  color: string
): void {
  context.fillStyle = color;
  roundedRect(context, x, y, width, 112, 24);
  context.fill();

  context.fillStyle = '#f7edf4';
  drawFittedText(context, `${label} ${percent}`, x + 24, y + 48, width - 48, 800, 32, 20);
  drawFittedText(context, price, x + 24, y + 84, width - 48, 700, 24, 16);
}

async function drawShareImage(context: CanvasRenderingContext2D): Promise<void> {
  if (!props.market) return;
  const logoImage = await loadPolkamarktLogoImage();

  context.clearRect(0, 0, SHARE_IMAGE_WIDTH, SHARE_IMAGE_HEIGHT);
  context.fillStyle = '#2f104a';
  context.fillRect(0, 0, SHARE_IMAGE_WIDTH, SHARE_IMAGE_HEIGHT);

  context.fillStyle = '#5a2d72';
  roundedRect(context, 34, 34, SHARE_IMAGE_WIDTH - 68, SHARE_IMAGE_HEIGHT - 68, 36);
  context.fill();

  const brandX = 196;
  drawLogoMark(context, logoImage, 72, 68, 86);

  context.fillStyle = '#f7edf4';
  drawFittedText(context, 'Polkamarkt', brandX, 98, 340, 800, 36, 24);
  context.fillStyle = '#f8087b';
  drawFittedText(context, t('polkamarkt.share.kicker').toUpperCase(), brandX, 132, 340, 800, 22, 16);

  context.fillStyle = '#f7edf4';
  roundedRect(context, 1008, 70, 244, 58, 29);
  context.fill();
  context.fillStyle = '#2f104a';
  drawFittedText(context, t('polkamarkt.share.tradeLink'), 1036, 107, 188, 800, 22, 16);

  context.fillStyle = '#f7edf4';
  const titleBottom = drawFittedWrappedText(context, props.market.title, 72, 218, 828, 800, 40, 30, 44, 3);

  context.fillStyle = '#d8c7d9';
  drawFittedText(context, `${props.market.category} · ${props.market.status || 'Active'}`, 72, titleBottom + 18, 828, 600, 24, 16);

  const graphLabelY = Math.max(titleBottom + 58, 342);
  const graphTop = graphLabelY + 18;
  const graphLeft = 72;
  const graphWidth = 828;
  const graphHeight = 214;
  context.fillStyle = '#d8c7d9';
  drawFittedText(context, `${t('polkamarkt.outcomes.yes')} / ${t('polkamarkt.outcomes.no')}`, graphLeft, graphLabelY, graphWidth, 700, 24, 16);
  drawCanvasTrendChart(context, graphLeft, graphTop, graphWidth, graphHeight);

  const sideLeft = 940;
  drawOutcomeCard(context, sideLeft, 176, 312, t('polkamarkt.outcomes.yes'), yesPercent.value, yesPrice.value, '#f8087b');
  drawOutcomeCard(context, sideLeft, 312, 312, t('polkamarkt.outcomes.no'), noPercent.value, noPrice.value, '#704480');

  context.fillStyle = '#3a1557';
  roundedRect(context, sideLeft, 456, 312, 156, 22);
  context.fill();
  context.fillStyle = '#d8c7d9';
  drawFittedText(context, t('polkamarkt.metrics.liquidity'), sideLeft + 24, 492, 132, 600, 21, 15);
  drawFittedText(context, t('polkamarkt.metrics.volume'), sideLeft + 24, 536, 132, 600, 21, 15);
  drawFittedText(context, t('polkamarkt.metrics.closeBlock'), sideLeft + 24, 580, 132, 600, 21, 15);
  context.fillStyle = '#f7edf4';
  drawFittedText(context, liquidity.value, sideLeft + 164, 492, 124, 800, 23, 15);
  drawFittedText(context, volume.value, sideLeft + 164, 536, 124, 800, 23, 15);
  drawFittedText(context, closeBlock.value, sideLeft + 164, 580, 124, 800, 23, 15);

  context.fillStyle = '#f7edf4';
  drawFittedText(context, tradeLink.value, 72, 696, 860, 700, 23, 15);
}

async function createPngBlob(): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_IMAGE_WIDTH;
  canvas.height = SHARE_IMAGE_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create Polkamarkt share image.');

  await drawShareImage(context);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Unable to create Polkamarkt share image.'));
    }, 'image/png');
  });
}

async function downloadPng(): Promise<void> {
  const blob = await createPngBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = imageFileName.value;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<style lang="scss" scoped>
.market-share {
  display: grid;
  gap: $inner-spacing-small;
  margin-bottom: $inner-spacing-big;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-small);
  background: var(--s-color-utility-surface);
  padding: $inner-spacing-medium;

  &--compact {
    display: block;
    margin-bottom: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    padding: 0;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $inner-spacing-mini;
    min-width: 0;

    span {
      color: var(--s-color-theme-accent);
      font-size: var(--s-font-size-mini);
      font-weight: 700;
      text-transform: uppercase;
    }

    h3 {
      margin: $inner-spacing-tiny 0 0;
      font-size: var(--s-heading6-font-size);
      line-height: var(--s-line-height-small);
      overflow-wrap: anywhere;
    }
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: $inner-spacing-mini;
    min-width: 0;

    > div {
      min-width: 0;
    }
  }

  &__logo {
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    object-fit: contain;
  }

  &__trade-link {
    flex: 0 0 auto;
    color: var(--s-color-theme-accent);
    font-size: var(--s-font-size-mini);
    font-weight: 700;
    text-decoration: none;

    &:hover,
    &:focus {
      text-decoration: underline;
    }
  }

  &__snapshot {
    display: grid;
    gap: $inner-spacing-small;
    min-width: 0;

    > strong {
      font-size: var(--s-font-size-medium);
      line-height: var(--s-line-height-medium);
      overflow-wrap: anywhere;
    }

    dl {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: $inner-spacing-mini;
      margin: 0;

      @include tablet(true) {
        grid-template-columns: 1fr;
      }
    }

    dt {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
    }

    dd {
      margin: $inner-spacing-tiny 0 0;
      font-weight: 700;
    }
  }

  &__meta {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-mini);
  }

  &__outcomes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $inner-spacing-mini;
  }

  &__outcome {
    min-width: 0;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-mini);
    background: var(--s-color-utility-body);
    padding: $inner-spacing-mini;

    span,
    small {
      display: block;
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
      font-weight: 600;
    }

    strong {
      display: block;
      margin-top: $inner-spacing-tiny;
      color: var(--s-color-base-content-primary);
      font-size: var(--s-heading5-font-size);
      line-height: var(--s-line-height-small);
      overflow-wrap: anywhere;
    }

    &--yes strong {
      color: var(--s-color-theme-accent);
    }
  }

  &__split {
    display: flex;
    min-height: 8px;
    overflow: hidden;
    border-radius: var(--s-border-radius-mini);
    background: var(--s-color-base-border-secondary);
  }

  &__split-yes,
  &__split-no {
    min-width: 0;
  }

  &__split-yes {
    background: var(--s-color-theme-accent);
  }

  &__split-no {
    background: var(--s-color-base-content-secondary);
  }

  &__chart-header {
    display: flex;
    flex-wrap: wrap;
    gap: $inner-spacing-mini;
  }

  &__chart-pill {
    min-width: 0;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-mini);
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-mini);
    font-weight: 800;
    line-height: 28px;
    padding: 0 $inner-spacing-small;
    overflow-wrap: anywhere;

    &--yes {
      border-color: var(--s-color-theme-accent);
      color: var(--s-color-theme-accent);
    }
  }

  &__chart {
    position: relative;
    min-height: 156px;
    overflow: hidden;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-mini);
    background: var(--s-color-utility-body);

    svg {
      display: block;
      width: 100%;
      height: 156px;
    }
  }

  &__chart-grid {
    stroke: var(--s-color-base-border-secondary);
    stroke-dasharray: 4 8;
    stroke-width: 1.5;
  }

  &__chart-label {
    position: absolute;
    color: var(--s-color-base-content-secondary);
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0;
    pointer-events: none;
    text-align: right;
    transform: translateY(-50%);
    white-space: nowrap;
  }

  &__chart-line {
    stroke: var(--s-color-theme-accent);
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 5;

    &--no {
      stroke: var(--s-color-base-content-secondary);
      stroke-width: 4;
    }
  }

  &__chart-dot {
    fill: var(--s-color-theme-accent);
    filter: drop-shadow(0 0 8px rgba(248, 8, 123, 0.36));

    &--no {
      fill: var(--s-color-base-content-secondary);
      filter: none;
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: $inner-spacing-mini;

    button,
    a {
      min-height: 34px;
      border: 1px solid var(--s-color-base-border-secondary);
      border-radius: var(--s-border-radius-mini);
      background: var(--s-color-utility-body);
      color: var(--s-color-base-content-primary);
      cursor: pointer;
      font: inherit;
      font-size: var(--s-font-size-small);
      font-weight: 700;
      line-height: 34px;
      padding: 0 $inner-spacing-medium;
      text-decoration: none;

      &:hover,
      &:focus {
        border-color: var(--s-color-theme-accent);
        color: var(--s-color-theme-accent);
      }
    }
  }

  &--compact &__actions {
    margin-top: 0;

    button,
    a {
      min-height: 32px;
      line-height: 32px;
      padding: 0 $inner-spacing-small;
    }
  }
}
</style>
