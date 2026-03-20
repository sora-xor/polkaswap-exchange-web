import { a as ChainController, bP as NetworkUtil, L as SafeLocalStorageKeys, bQ as getActiveCaipNetwork, C as ConstantsUtil, K as SafeLocalStorage, B as BlockchainApiController, U as ApiController } from "./walletconnect-BVoLvI4P.js";
import "./index-73GArslZ.js";
class ReownAuthenticationMessenger {
  constructor(params) {
    this.getNonce = params.getNonce;
  }
  async createMessage(input) {
    const params = {
      accountAddress: input.accountAddress,
      chainId: input.chainId,
      version: "1",
      domain: typeof document === "undefined" ? "Unknown Domain" : document.location.host,
      uri: typeof document === "undefined" ? "Unknown URI" : document.location.href,
      resources: this.resources,
      nonce: await this.getNonce(input),
      issuedAt: this.stringifyDate(/* @__PURE__ */ new Date()),
      statement: void 0,
      expirationTime: void 0,
      notBefore: void 0
    };
    const methods = {
      toString: () => this.stringify(params)
    };
    return Object.assign(params, methods);
  }
  stringify(params) {
    const networkName = this.getNetworkName(params.chainId);
    return [
      `${params.domain} wants you to sign in with your ${networkName} account:`,
      params.accountAddress,
      params.statement ? `
${params.statement}
` : "",
      `URI: ${params.uri}`,
      `Version: ${params.version}`,
      `Chain ID: ${params.chainId}`,
      `Nonce: ${params.nonce}`,
      params.issuedAt && `Issued At: ${params.issuedAt}`,
      params.expirationTime && `Expiration Time: ${params.expirationTime}`,
      params.notBefore && `Not Before: ${params.notBefore}`,
      params.requestId && `Request ID: ${params.requestId}`,
      params.resources?.length && params.resources.reduce((acc, resource) => `${acc}
- ${resource}`, "Resources:")
    ].filter((line) => typeof line === "string").join("\n").trim();
  }
  getNetworkName(chainId) {
    const requestedNetworks = ChainController.getAllRequestedCaipNetworks();
    return NetworkUtil.getNetworkNameByCaipNetworkId(requestedNetworks, chainId);
  }
  stringifyDate(date) {
    return date.toISOString();
  }
}
class ReownAuthentication {
  constructor(params = {}) {
    this.otpUuid = null;
    this.listeners = {
      sessionChanged: []
    };
    this.localAuthStorageKey = params.localAuthStorageKey || SafeLocalStorageKeys.SIWX_AUTH_TOKEN;
    this.localNonceStorageKey = params.localNonceStorageKey || SafeLocalStorageKeys.SIWX_NONCE_TOKEN;
    this.required = params.required ?? true;
    this.messenger = new ReownAuthenticationMessenger({
      getNonce: this.getNonce.bind(this)
    });
  }
  async createMessage(input) {
    return this.messenger.createMessage(input);
  }
  async addSession(session) {
    const response = await this.request({
      method: "POST",
      key: "authenticate",
      body: {
        data: session.data,
        message: session.message,
        signature: session.signature,
        clientId: this.getClientId(),
        walletInfo: this.getWalletInfo()
      },
      headers: ["nonce", "otp"]
    });
    this.setStorageToken(response.token, this.localAuthStorageKey);
    this.emit("sessionChanged", session);
    this.setAppKitAccountUser(jwtDecode(response.token));
    this.otpUuid = null;
  }
  async getSessions(chainId, address) {
    try {
      if (!this.getStorageToken(this.localAuthStorageKey)) {
        return [];
      }
      const account = await this.request({
        method: "GET",
        key: "me",
        query: {},
        headers: ["auth"]
      });
      if (!account) {
        return [];
      }
      const isSameAddress = account.address.toLowerCase() === address.toLowerCase();
      const isSameNetwork = account.caip2Network === chainId;
      if (!isSameAddress || !isSameNetwork) {
        return [];
      }
      const session = {
        data: {
          accountAddress: account.address,
          chainId: account.caip2Network
        },
        message: "",
        signature: ""
      };
      this.emit("sessionChanged", session);
      this.setAppKitAccountUser(account);
      return [session];
    } catch {
      return [];
    }
  }
  async revokeSession(_chainId, _address) {
    return Promise.resolve(this.clearStorageTokens());
  }
  async setSessions(sessions) {
    if (sessions.length === 0) {
      this.clearStorageTokens();
    } else {
      const session = sessions.find((s) => s.data.chainId === getActiveCaipNetwork()?.caipNetworkId) || sessions[0];
      await this.addSession(session);
    }
  }
  getRequired() {
    return this.required;
  }
  async getSessionAccount() {
    if (!this.getStorageToken(this.localAuthStorageKey)) {
      throw new Error("Not authenticated");
    }
    return this.request({
      method: "GET",
      key: "me",
      body: void 0,
      query: {
        includeAppKitAccount: true
      },
      headers: ["auth"]
    });
  }
  async setSessionAccountMetadata(metadata = null) {
    if (!this.getStorageToken(this.localAuthStorageKey)) {
      throw new Error("Not authenticated");
    }
    return this.request({
      method: "PUT",
      key: "account-metadata",
      body: { metadata },
      headers: ["auth"]
    });
  }
  on(event, callback) {
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    };
  }
  removeAllListeners() {
    const keys = Object.keys(this.listeners);
    keys.forEach((key) => {
      this.listeners[key] = [];
    });
  }
  async requestEmailOtp({ email, account }) {
    const otp = await this.request({
      method: "POST",
      key: "otp",
      body: { email, account }
    });
    this.otpUuid = otp.uuid;
    this.messenger.resources = [`email:${email}`];
    return otp;
  }
  confirmEmailOtp({ code }) {
    return this.request({
      method: "PUT",
      key: "otp",
      body: { code },
      headers: ["otp"]
    });
  }
  async request({ method, key, query, body, headers }) {
    const { projectId, st, sv } = this.getSDKProperties();
    const url = new URL(`${ConstantsUtil.W3M_API_URL}/auth/v1/${String(key)}`);
    url.searchParams.set("projectId", projectId);
    url.searchParams.set("st", st);
    url.searchParams.set("sv", sv);
    if (query) {
      Object.entries(query).forEach(([queryKey, queryValue]) => url.searchParams.set(queryKey, String(queryValue)));
    }
    const response = await fetch(url, {
      method,
      body: body ? JSON.stringify(body) : void 0,
      headers: Array.isArray(headers) ? headers.reduce((acc, header) => {
        switch (header) {
          case "nonce":
            acc["x-nonce-jwt"] = `Bearer ${this.getStorageToken(this.localNonceStorageKey)}`;
            break;
          case "auth":
            acc["Authorization"] = `Bearer ${this.getStorageToken(this.localAuthStorageKey)}`;
            break;
          case "otp":
            if (this.otpUuid) {
              acc["x-otp"] = this.otpUuid;
            }
            break;
        }
        return acc;
      }, {}) : void 0
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    if (response.headers.get("content-type")?.includes("application/json")) {
      return response.json();
    }
    return null;
  }
  getStorageToken(key) {
    return SafeLocalStorage.getItem(key);
  }
  setStorageToken(token, key) {
    SafeLocalStorage.setItem(key, token);
  }
  clearStorageTokens() {
    this.otpUuid = null;
    SafeLocalStorage.removeItem(this.localAuthStorageKey);
    SafeLocalStorage.removeItem(this.localNonceStorageKey);
    this.emit("sessionChanged", void 0);
  }
  async getNonce() {
    const { nonce, token } = await this.request({
      method: "GET",
      key: "nonce"
    });
    this.setStorageToken(token, this.localNonceStorageKey);
    return nonce;
  }
  getClientId() {
    return BlockchainApiController.state.clientId;
  }
  getWalletInfo() {
    const walletInfo = ChainController.getAccountData()?.connectedWalletInfo;
    if (!walletInfo) {
      return void 0;
    }
    if ("social" in walletInfo && "identifier" in walletInfo) {
      const social = walletInfo["social"];
      const identifier = walletInfo["identifier"];
      return { type: "social", social, identifier };
    }
    const { name, icon } = walletInfo;
    let type = "unknown";
    switch (walletInfo.type) {
      case "EXTERNAL":
      case "INJECTED":
      case "ANNOUNCED":
        type = "extension";
        break;
      case "WALLET_CONNECT":
        type = "walletconnect";
        break;
      default:
        type = "unknown";
    }
    return {
      type,
      name,
      icon
    };
  }
  getSDKProperties() {
    return ApiController._getSdkProperties();
  }
  emit(event, data) {
    this.listeners[event].forEach((listener) => listener(data));
  }
  setAppKitAccountUser(session) {
    const { email } = session;
    if (email) {
      Object.values(ConstantsUtil.CHAIN).forEach((chainNamespace) => {
        ChainController.setAccountProp("user", { email }, chainNamespace);
      });
    }
  }
}
function jwtDecode(token) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token");
  }
  const payload = parts[1];
  if (typeof payload !== "string") {
    throw new Error("Invalid token");
  }
  const base64 = payload.replace(/-/gu, "+").replace(/_/gu, "/");
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
  const decoded = JSON.parse(atob(padded));
  return decoded;
}
export {
  ReownAuthentication,
  ReownAuthenticationMessenger
};
