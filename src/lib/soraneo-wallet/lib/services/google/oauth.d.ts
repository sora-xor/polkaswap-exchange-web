type GoogleOauthOptions = {
  clientId: string;
  scope: string;
};
/**
 * Handles OAuth token acquisition for Google Drive access, wrapping the GSI
 * client with convenient async helpers.
 */
export declare class GoogleOauth {
  private options;
  private client;
  private token;
  private authCallback;
  private authErrorCallback;
  private isAuthProcess;
  get ready(): boolean;
  get hasKey(): boolean;
  /** Persists the OAuth client configuration. */
  setOptions(options: GoogleOauthOptions): void;
  /** Loads the Google Identity script and initializes the token client. */
  init(): Promise<void>;
  /** Loads the Google Identity Services script alongside DOM readiness. */
  private load;
  /** Instantiates the token client with callbacks we override during prompts. */
  private initClient;
  /**
   * Wraps the token prompt in a promise, resolving only after the GSI client
   * returns success or failure.
   */
  private waitForAuthFinalization;
  /** Refreshes the token if it is missing or about to expire. */
  checkToken(): Promise<void>;
  /** Starts an interactive token request unless a prompt is already running. */
  getToken(): Promise<void>;
}
export {};
