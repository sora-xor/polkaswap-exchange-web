import { F as b, n as css, r as resetStyles, q as i, x } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement } from "./index-5878y4Sm.js";
import "./index-SiM7Ib3-.js";
import { Q as QRCodeUtil } from "./browser-3QHqHj2W.js";
const CONNECTING_ERROR_MARGIN = 0.1;
const CIRCLE_SIZE_MODIFIER = 2.5;
const QRCODE_MATRIX_MARGIN = 7;
function isAdjecentDots(cy, otherCy, cellSize) {
  if (cy === otherCy) {
    return false;
  }
  const diff = cy - otherCy < 0 ? otherCy - cy : cy - otherCy;
  return diff <= cellSize + CONNECTING_ERROR_MARGIN;
}
function getMatrix(value, errorCorrectionLevel) {
  const arr = Array.prototype.slice.call(QRCodeUtil.create(value, { errorCorrectionLevel }).modules.data, 0);
  const sqrt = Math.sqrt(arr.length);
  return arr.reduce((rows, key, index) => (index % sqrt === 0 ? rows.push([key]) : rows[rows.length - 1].push(key)) && rows, []);
}
const QrCodeUtil = {
  generate({ uri, size, logoSize, padding = 8, dotColor = "var(--apkt-colors-black)" }) {
    const strokeWidth = 10;
    const dots = [];
    const matrix = getMatrix(uri, "Q");
    const cellSize = (size - 2 * padding) / matrix.length;
    const qrList = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 }
    ];
    qrList.forEach(({ x: x2, y }) => {
      const x1 = (matrix.length - QRCODE_MATRIX_MARGIN) * cellSize * x2 + padding;
      const y1 = (matrix.length - QRCODE_MATRIX_MARGIN) * cellSize * y + padding;
      const borderRadius = 0.45;
      for (let i2 = 0; i2 < qrList.length; i2 += 1) {
        const dotSize = cellSize * (QRCODE_MATRIX_MARGIN - i2 * 2);
        dots.push(b`
            <rect
              fill=${i2 === 2 ? "var(--apkt-colors-black)" : "var(--apkt-colors-white)"}
              width=${i2 === 0 ? dotSize - strokeWidth : dotSize}
              rx= ${i2 === 0 ? (dotSize - strokeWidth) * borderRadius : dotSize * borderRadius}
              ry= ${i2 === 0 ? (dotSize - strokeWidth) * borderRadius : dotSize * borderRadius}
              stroke=${dotColor}
              stroke-width=${i2 === 0 ? strokeWidth : 0}
              height=${i2 === 0 ? dotSize - strokeWidth : dotSize}
              x= ${i2 === 0 ? y1 + cellSize * i2 + strokeWidth / 2 : y1 + cellSize * i2}
              y= ${i2 === 0 ? x1 + cellSize * i2 + strokeWidth / 2 : x1 + cellSize * i2}
            />
          `);
      }
    });
    const clearArenaSize = Math.floor((logoSize + 25) / cellSize);
    const matrixMiddleStart = matrix.length / 2 - clearArenaSize / 2;
    const matrixMiddleEnd = matrix.length / 2 + clearArenaSize / 2 - 1;
    const circles = [];
    matrix.forEach((row, i2) => {
      row.forEach((_, j) => {
        if (matrix[i2][j]) {
          if (!(i2 < QRCODE_MATRIX_MARGIN && j < QRCODE_MATRIX_MARGIN || i2 > matrix.length - (QRCODE_MATRIX_MARGIN + 1) && j < QRCODE_MATRIX_MARGIN || i2 < QRCODE_MATRIX_MARGIN && j > matrix.length - (QRCODE_MATRIX_MARGIN + 1))) {
            if (!(i2 > matrixMiddleStart && i2 < matrixMiddleEnd && j > matrixMiddleStart && j < matrixMiddleEnd)) {
              const cx = i2 * cellSize + cellSize / 2 + padding;
              const cy = j * cellSize + cellSize / 2 + padding;
              circles.push([cx, cy]);
            }
          }
        }
      });
    });
    const circlesToConnect = {};
    circles.forEach(([cx, cy]) => {
      if (circlesToConnect[cx]) {
        circlesToConnect[cx]?.push(cy);
      } else {
        circlesToConnect[cx] = [cy];
      }
    });
    Object.entries(circlesToConnect).map(([cx, cys]) => {
      const newCys = cys.filter((cy) => cys.every((otherCy) => !isAdjecentDots(cy, otherCy, cellSize)));
      return [Number(cx), newCys];
    }).forEach(([cx, cys]) => {
      cys.forEach((cy) => {
        dots.push(b`<circle cx=${cx} cy=${cy} fill=${dotColor} r=${cellSize / CIRCLE_SIZE_MODIFIER} />`);
      });
    });
    Object.entries(circlesToConnect).filter(([_, cys]) => cys.length > 1).map(([cx, cys]) => {
      const newCys = cys.filter((cy) => cys.some((otherCy) => isAdjecentDots(cy, otherCy, cellSize)));
      return [Number(cx), newCys];
    }).map(([cx, cys]) => {
      cys.sort((a, b2) => a < b2 ? -1 : 1);
      const groups = [];
      for (const cy of cys) {
        const group = groups.find((item) => item.some((otherCy) => isAdjecentDots(cy, otherCy, cellSize)));
        if (group) {
          group.push(cy);
        } else {
          groups.push([cy]);
        }
      }
      return [cx, groups.map((item) => [item[0], item[item.length - 1]])];
    }).forEach(([cx, groups]) => {
      groups.forEach(([y1, y2]) => {
        dots.push(b`
              <line
                x1=${cx}
                x2=${cx}
                y1=${y1}
                y2=${y2}
                stroke=${dotColor}
                stroke-width=${cellSize / (CIRCLE_SIZE_MODIFIER / 2)}
                stroke-linecap="round"
              />
            `);
      });
    });
    return dots;
  }
};
const styles = css`
  :host {
    position: relative;
    user-select: none;
    display: block;
    overflow: hidden;
    aspect-ratio: 1 / 1;
    width: 100%;
    height: 100%;
    background-color: ${({ colors }) => colors.white};
    border: 1px solid ${({ tokens }) => tokens.theme.borderPrimary};
  }

  :host {
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :host([data-clear='true']) > wui-icon {
    display: none;
  }

  svg:first-child,
  wui-image,
  wui-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translateY(-50%) translateX(-50%);
    background-color: ${({ tokens }) => tokens.theme.backgroundPrimary};
    box-shadow: inset 0 0 0 4px ${({ tokens }) => tokens.theme.backgroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius[6]};
  }

  wui-image {
    width: 25%;
    height: 25%;
    border-radius: ${({ borderRadius }) => borderRadius[2]};
  }

  wui-icon {
    width: 100%;
    height: 100%;
    color: #3396ff !important;
    transform: translateY(-50%) translateX(-50%) scale(0.25);
  }

  wui-icon > svg {
    width: inherit;
    height: inherit;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiQrCode = class WuiQrCode2 extends i {
  constructor() {
    super(...arguments);
    this.uri = "";
    this.size = 500;
    this.theme = "dark";
    this.imageSrc = void 0;
    this.alt = void 0;
    this.arenaClear = void 0;
    this.farcaster = void 0;
  }
  render() {
    this.dataset["theme"] = this.theme;
    this.dataset["clear"] = String(this.arenaClear);
    return x`<wui-flex
      alignItems="center"
      justifyContent="center"
      class="wui-qr-code"
      direction="column"
      gap="4"
      width="100%"
      style="height: 100%"
    >
      ${this.templateVisual()} ${this.templateSvg()}
    </wui-flex>`;
  }
  templateSvg() {
    return b`
      <svg viewBox="0 0 ${this.size} ${this.size}" width="100%" height="100%">
        ${QrCodeUtil.generate({
      uri: this.uri,
      size: this.size,
      logoSize: this.arenaClear ? 0 : this.size / 4
    })}
      </svg>
    `;
  }
  templateVisual() {
    if (this.imageSrc) {
      return x`<wui-image src=${this.imageSrc} alt=${this.alt ?? "logo"}></wui-image>`;
    }
    if (this.farcaster) {
      return x`<wui-icon
        class="farcaster"
        size="inherit"
        color="inherit"
        name="farcaster"
      ></wui-icon>`;
    }
    return x`<wui-icon size="inherit" color="inherit" name="walletConnect"></wui-icon>`;
  }
};
WuiQrCode.styles = [resetStyles, styles];
__decorate([
  n()
], WuiQrCode.prototype, "uri", void 0);
__decorate([
  n({ type: Number })
], WuiQrCode.prototype, "size", void 0);
__decorate([
  n()
], WuiQrCode.prototype, "theme", void 0);
__decorate([
  n()
], WuiQrCode.prototype, "imageSrc", void 0);
__decorate([
  n()
], WuiQrCode.prototype, "alt", void 0);
__decorate([
  n({ type: Boolean })
], WuiQrCode.prototype, "arenaClear", void 0);
__decorate([
  n({ type: Boolean })
], WuiQrCode.prototype, "farcaster", void 0);
WuiQrCode = __decorate([
  customElement("wui-qr-code")
], WuiQrCode);
