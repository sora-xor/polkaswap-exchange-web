import { waitForDocumentReady } from '../../util';
import { ScriptLoader } from '../../util/scriptLoader';

type GoogleOauthOptions = {
  clientId: string;
  scope: string;
};

type GoogleOauthTokenResponse = google.accounts.oauth2.TokenResponse & {
  error?: string;
  error_description?: string;
};

const FIVE_MINUTES = 5 * 60 * 1000;
const GOOGLE_OAUTH_PROMPT_TIMEOUT_MS = 90_000;

/**
 * Handles OAuth token acquisition for Google Drive access, wrapping the GSI
 * client with convenient async helpers.
 */
export class GoogleOauth {
  private options!: GoogleOauthOptions;
  private client!: google.accounts.oauth2.TokenClient;
  private token!: Nullable<google.accounts.oauth2.TokenResponse>;

  private authCallback = (token: google.accounts.oauth2.TokenResponse) => {};
  private authErrorCallback = (error: google.accounts.oauth2.ClientConfigError) => {
    console.error(error);
  };

  private isAuthProcess = false;
  private authPromise: Nullable<Promise<void>> = null;

  get ready(): boolean {
    return !!this.client;
  }

  get hasKey(): boolean {
    return !!this.options?.clientId;
  }

  /** Persists the OAuth client configuration. */
  public setOptions(options: GoogleOauthOptions): void {
    this.options = { ...options };
  }

  /** Loads the Google Identity script and initializes the token client. */
  public async init(): Promise<void> {
    if (this.ready) return;
    if (!this.options) throw new Error(`[${this.constructor.name}]: Options should be set before inintialization`);
    if (!this.options.clientId) throw new Error(`[${this.constructor.name}]: Client ID is required`);

    await this.load();
    this.initClient(this.options);
  }

  /** Loads the Google Identity Services script alongside DOM readiness. */
  private async load(): Promise<void> {
    await Promise.all([ScriptLoader.load('https://accounts.google.com/gsi/client'), waitForDocumentReady()]);
  }

  /** Instantiates the token client with callbacks we override during prompts. */
  private initClient({ clientId, scope }: GoogleOauthOptions): void {
    this.client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (token) => this.authCallback(token),
      error_callback: (error) => this.authErrorCallback(error),
    });
  }

  /** Converts a GIS token callback payload into the cached absolute-expiry token state. */
  private prepareToken(token: GoogleOauthTokenResponse): google.accounts.oauth2.TokenResponse {
    if (token.error) {
      const details = [token.error, token.error_description].filter(Boolean).join(': ');

      throw new Error(details || 'Google OAuth token request failed');
    }

    const expiresIn = Number(token.expires_in);

    if (!token.access_token || !Number.isFinite(expiresIn)) {
      throw new Error('Google OAuth token response is invalid');
    }

    const expires = String(Date.now() + expiresIn * 1000);

    return { ...token, expires_in: expires };
  }

  /**
   * Wraps the token prompt in a promise, resolving only after the GSI client
   * returns success or failure. GIS can leave the prompt unresolved when the
   * popup is blocked or closed before callback delivery, so the prompt is
   * bounded to avoid leaving wallet selection permanently loading.
   */
  private async waitForAuthFinalization(func: FnWithoutArgs): Promise<void> {
    let startPrompt: FnWithoutArgs = () => undefined;
    const authPromise = new Promise<void>((resolve, reject) => {
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout>;

      const clearAuthProcess = (): void => {
        clearTimeout(timeoutId);
        this.isAuthProcess = false;
        this.authPromise = null;
      };

      const rejectAuth = (error: unknown): void => {
        if (settled) return;
        settled = true;
        this.token = null;
        clearAuthProcess();
        reject(error);
      };

      const resolveAuth = (token: GoogleOauthTokenResponse): void => {
        if (settled) return;
        settled = true;

        try {
          this.token = this.prepareToken(token);
          clearAuthProcess();
          resolve();
        } catch (error) {
          this.token = null;
          clearAuthProcess();
          reject(error);
        }
      };

      this.authCallback = (token) => {
        resolveAuth(token);
      };
      this.authErrorCallback = (error) => {
        rejectAuth(error);
      };

      this.isAuthProcess = true;
      timeoutId = setTimeout(() => {
        rejectAuth(new Error('Google OAuth token request timed out'));
      }, GOOGLE_OAUTH_PROMPT_TIMEOUT_MS);

      startPrompt = () => {
        try {
          func();
        } catch (error) {
          rejectAuth(error);
        }
      };
    });

    this.authPromise = authPromise;
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(startPrompt);
    } else {
      void Promise.resolve().then(startPrompt);
    }

    await authPromise;
  }

  /** Refreshes the token if it is missing or about to expire. */
  public async checkToken(): Promise<void> {
    if (!this.token || Date.now() + FIVE_MINUTES > Number(this.token.expires_in)) {
      await this.getToken();
    }
  }

  /** Starts an interactive token request unless a prompt is already running. */
  public async getToken(): Promise<void> {
    if (this.authPromise) {
      await this.authPromise;
      return;
    }

    await this.waitForAuthFinalization(() => {
      // Prompt the user to select a Google Account
      // Ask for consent to share their data at first time
      this.client.requestAccessToken({ prompt: 'select_account' });
    });
  }
}
