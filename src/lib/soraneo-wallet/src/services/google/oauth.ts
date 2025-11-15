import { waitForDocumentReady } from '../../util';
import { ScriptLoader } from '../../util/scriptLoader';

type GoogleOauthOptions = {
  clientId: string;
  scope: string;
};

const FIVE_MINUTES = 5 * 60 * 1000;

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

  /**
   * Wraps the token prompt in a promise, resolving only after the GSI client
   * returns success or failure.
   */
  private async waitForAuthFinalization(func: FnWithoutArgs): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.authCallback = (token) => {
        const expires = String(Date.now() + Number(token.expires_in) * 1000);
        this.token = { ...token, expires_in: expires };
        this.isAuthProcess = false;
        resolve();
      };
      this.authErrorCallback = (error) => {
        this.token = null;
        this.isAuthProcess = false;
        reject(error);
      };

      this.isAuthProcess = true;
      func();
    });
  }

  /** Refreshes the token if it is missing or about to expire. */
  public async checkToken(): Promise<void> {
    if (!this.token || Date.now() + FIVE_MINUTES > Number(this.token.expires_in)) {
      await this.getToken();
    }
  }

  /** Starts an interactive token request unless a prompt is already running. */
  public async getToken(): Promise<void> {
    if (this.isAuthProcess) return;

    await this.waitForAuthFinalization(() => {
      // Prompt the user to select a Google Account
      // Ask for consent to share their data at first time
      this.client.requestAccessToken({ prompt: 'select_account' });
    });
  }
}
