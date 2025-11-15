import { C as l, D as S, F as g, G as w, q as f, H as u, B as A, I as N } from './index-CgrbEUSl.mjs';
class m {
  constructor(e) {
    this.getNonce = e.getNonce;
  }
  async createMessage(e) {
    const t = {
      accountAddress: e.accountAddress,
      chainId: e.chainId,
      version: '1',
      domain: typeof document > 'u' ? 'Unknown Domain' : document.location.host,
      uri: typeof document > 'u' ? 'Unknown URI' : document.location.href,
      resources: this.resources,
      nonce: await this.getNonce(e),
      issuedAt: this.stringifyDate(/* @__PURE__ */ new Date()),
      statement: void 0,
      expirationTime: void 0,
      notBefore: void 0,
    };
    return Object.assign(t, {
      toString: () => this.stringify(t),
    });
  }
  stringify(e) {
    const t = this.getNetworkName(e.chainId);
    return [
      `${e.domain} wants you to sign in with your ${t} account:`,
      e.accountAddress,
      e.statement
        ? `
${e.statement}
`
        : '',
      `URI: ${e.uri}`,
      `Version: ${e.version}`,
      `Chain ID: ${e.chainId}`,
      `Nonce: ${e.nonce}`,
      e.issuedAt && `Issued At: ${e.issuedAt}`,
      e.expirationTime && `Expiration Time: ${e.expirationTime}`,
      e.notBefore && `Not Before: ${e.notBefore}`,
      e.requestId && `Request ID: ${e.requestId}`,
      e.resources?.length &&
        e.resources.reduce(
          (s, n) => `${s}
- ${n}`,
          'Resources:'
        ),
    ]
      .filter((s) => typeof s == 'string')
      .join(
        `
`
      )
      .trim();
  }
  getNetworkName(e) {
    const t = l.getAllRequestedCaipNetworks();
    return S.getNetworkNameByCaipNetworkId(t, e);
  }
  stringifyDate(e) {
    return e.toISOString();
  }
}
class T {
  constructor(e = {}) {
    ((this.otpUuid = null),
      (this.listeners = {
        sessionChanged: [],
      }),
      (this.localAuthStorageKey = e.localAuthStorageKey || g.SIWX_AUTH_TOKEN),
      (this.localNonceStorageKey = e.localNonceStorageKey || g.SIWX_NONCE_TOKEN),
      (this.required = e.required ?? !0),
      (this.messenger = new m({
        getNonce: this.getNonce.bind(this),
      })));
  }
  async createMessage(e) {
    return this.messenger.createMessage(e);
  }
  async addSession(e) {
    const t = await this.request({
      method: 'POST',
      key: 'authenticate',
      body: {
        data: e.data,
        message: e.message,
        signature: e.signature,
        clientId: this.getClientId(),
        walletInfo: this.getWalletInfo(),
      },
      headers: ['nonce', 'otp'],
    });
    (this.setStorageToken(t.token, this.localAuthStorageKey),
      this.emit('sessionChanged', e),
      this.setAppKitAccountUser(p(t.token)),
      (this.otpUuid = null));
  }
  async getSessions(e, t) {
    try {
      if (!this.getStorageToken(this.localAuthStorageKey)) return [];
      const s = await this.request({
        method: 'GET',
        key: 'me',
        query: {},
        headers: ['auth'],
      });
      if (!s) return [];
      const n = s.address.toLowerCase() === t.toLowerCase(),
        o = s.caip2Network === e;
      if (!n || !o) return [];
      const r = {
        data: {
          accountAddress: s.address,
          chainId: s.caip2Network,
        },
        message: '',
        signature: '',
      };
      return (this.emit('sessionChanged', r), this.setAppKitAccountUser(s), [r]);
    } catch {
      return [];
    }
  }
  async revokeSession(e, t) {
    return Promise.resolve(this.clearStorageTokens());
  }
  async setSessions(e) {
    if (e.length === 0) this.clearStorageTokens();
    else {
      const t = e.find((s) => s.data.chainId === w()?.caipNetworkId) || e[0];
      await this.addSession(t);
    }
  }
  getRequired() {
    return this.required;
  }
  async getSessionAccount() {
    if (!this.getStorageToken(this.localAuthStorageKey)) throw new Error('Not authenticated');
    return this.request({
      method: 'GET',
      key: 'me',
      body: void 0,
      query: {
        includeAppKitAccount: !0,
      },
      headers: ['auth'],
    });
  }
  async setSessionAccountMetadata(e = null) {
    if (!this.getStorageToken(this.localAuthStorageKey)) throw new Error('Not authenticated');
    return this.request({
      method: 'PUT',
      key: 'account-metadata',
      body: { metadata: e },
      headers: ['auth'],
    });
  }
  on(e, t) {
    return (
      this.listeners[e].push(t),
      () => {
        this.listeners[e] = this.listeners[e].filter((s) => s !== t);
      }
    );
  }
  removeAllListeners() {
    Object.keys(this.listeners).forEach((t) => {
      this.listeners[t] = [];
    });
  }
  async requestEmailOtp({ email: e, account: t }) {
    const s = await this.request({
      method: 'POST',
      key: 'otp',
      body: { email: e, account: t },
    });
    return ((this.otpUuid = s.uuid), (this.messenger.resources = [`email:${e}`]), s);
  }
  confirmEmailOtp({ code: e }) {
    return this.request({
      method: 'PUT',
      key: 'otp',
      body: { code: e },
      headers: ['otp'],
    });
  }
  async request({ method: e, key: t, query: s, body: n, headers: o }) {
    const { projectId: r, st: y, sv: k } = this.getSDKProperties(),
      a = new URL(`${f.W3M_API_URL}/auth/v1/${String(t)}`);
    (a.searchParams.set('projectId', r),
      a.searchParams.set('st', y),
      a.searchParams.set('sv', k),
      s && Object.entries(s).forEach(([i, h]) => a.searchParams.set(i, String(h))));
    const c = await fetch(a, {
      method: e,
      body: n ? JSON.stringify(n) : void 0,
      headers: Array.isArray(o)
        ? o.reduce((i, h) => {
            switch (h) {
              case 'nonce':
                i['x-nonce-jwt'] = `Bearer ${this.getStorageToken(this.localNonceStorageKey)}`;
                break;
              case 'auth':
                i.Authorization = `Bearer ${this.getStorageToken(this.localAuthStorageKey)}`;
                break;
              case 'otp':
                this.otpUuid && (i['x-otp'] = this.otpUuid);
                break;
            }
            return i;
          }, {})
        : void 0,
    });
    if (!c.ok) throw new Error(await c.text());
    return c.headers.get('content-type')?.includes('application/json') ? c.json() : null;
  }
  getStorageToken(e) {
    return u.getItem(e);
  }
  setStorageToken(e, t) {
    u.setItem(t, e);
  }
  clearStorageTokens() {
    ((this.otpUuid = null),
      u.removeItem(this.localAuthStorageKey),
      u.removeItem(this.localNonceStorageKey),
      this.emit('sessionChanged', void 0));
  }
  async getNonce() {
    const { nonce: e, token: t } = await this.request({
      method: 'GET',
      key: 'nonce',
    });
    return (this.setStorageToken(t, this.localNonceStorageKey), e);
  }
  getClientId() {
    return A.state.clientId;
  }
  getWalletInfo() {
    const e = l.getAccountData()?.connectedWalletInfo;
    if (!e) return;
    if ('social' in e && 'identifier' in e) {
      const o = e.social,
        r = e.identifier;
      return { type: 'social', social: o, identifier: r };
    }
    const { name: t, icon: s } = e;
    let n = 'unknown';
    switch (e.type) {
      case 'EXTERNAL':
      case 'INJECTED':
      case 'ANNOUNCED':
        n = 'extension';
        break;
      case 'WALLET_CONNECT':
        n = 'walletconnect';
        break;
      default:
        n = 'unknown';
    }
    return {
      type: n,
      name: t,
      icon: s,
    };
  }
  getSDKProperties() {
    return N._getSdkProperties();
  }
  emit(e, t) {
    this.listeners[e].forEach((s) => s(t));
  }
  setAppKitAccountUser(e) {
    const { email: t } = e;
    t &&
      Object.values(f.CHAIN).forEach((s) => {
        l.setAccountProp('user', { email: t }, s);
      });
  }
}
function p(d) {
  const e = d.split('.');
  if (e.length !== 3) throw new Error('Invalid token');
  const t = e[1];
  if (typeof t != 'string') throw new Error('Invalid token');
  const s = t.replace(/-/gu, '+').replace(/_/gu, '/'),
    n = s.padEnd(s.length + ((4 - (s.length % 4)) % 4), '=');
  return JSON.parse(atob(n));
}
export { T as R, m as a };
//# sourceMappingURL=ReownAuthentication-B5DQwg8Q.mjs.map
