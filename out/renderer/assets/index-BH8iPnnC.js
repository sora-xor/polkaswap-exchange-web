import { n as css, r as resetStyles, o as elementStyles, q as i, x } from "./walletconnect-BVoLvI4P.js";
import { c as customElement } from "./index-5878y4Sm.js";
const REOWN_URL = "https://reown.com";
const styles = css`
  .reown-logo {
    height: 24px;
  }

  a {
    text-decoration: none;
    cursor: pointer;
    color: ${({ tokens }) => tokens.theme.textSecondary};
  }

  a:hover {
    opacity: 0.9;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiUxByReown = class WuiUxByReown2 extends i {
  render() {
    return x`
      <a
        data-testid="ux-branding-reown"
        href=${REOWN_URL}
        rel="noreferrer"
        target="_blank"
        style="text-decoration: none;"
      >
        <wui-flex
          justifyContent="center"
          alignItems="center"
          gap="1"
          .padding=${["01", "0", "3", "0"]}
        >
          <wui-text variant="sm-regular" color="inherit"> UX by </wui-text>
          <wui-icon name="reown" size="inherit" class="reown-logo"></wui-icon>
        </wui-flex>
      </a>
    `;
  }
};
WuiUxByReown.styles = [resetStyles, elementStyles, styles];
WuiUxByReown = __decorate([
  customElement("wui-ux-by-reown")
], WuiUxByReown);
