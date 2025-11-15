type GoogleApiOptions = {
  apiKey: string;
  discoveryDocs?: string[];
};
/**
 * Thin wrapper around the Google JS client that lazily loads the required
 * scripts and exposes a ready flag once initialized.
 */
export declare class GoogleApi {
  private options;
  private _ready;
  get ready(): boolean;
  get hasKey(): boolean;
  /** Stores the API key/discovery doc configuration prior to initialization. */
  setOptions(options: GoogleApiOptions): void;
  /**
   * Loads the Google scripts and initializes the client with the configured
   * options. Subsequent calls are no-ops.
   */
  init(): Promise<void>;
  /** Loads the Google API script in parallel with DOM readiness checks. */
  private load;
  /** Bootstraps the Drive client and marks the wrapper as ready. */
  private initClient;
}
/**
 * Drive-specific API extensions that provide helpers for file management in
 * the app data folder.
 */
export declare class GoogleDriveApi extends GoogleApi {
  protected readonly mimeType: {
    json: string;
    folder: string;
  };
  protected readonly boundary = 'foo_bar_baz';
  private prepareContent;
  /** Wraps file content in the multipart format expected by Drive uploads. */
  prepareBody(content: string, { name, description, mimeType }: gapi.client.drive.File): string;
  /** Looks up (or creates) the requested folder and returns its id. */
  getFolderId(name: string, parent: string): Promise<string | undefined>;
  /** Creates file metadata and returns the generated file id. */
  createFile(metadata: gapi.client.drive.File): Promise<string>;
  /**
   * Create a folder
   * @param name name of the folder
   * @param parent the name of the parent folder, if the new one should be a subfolder
   * @returns the created folder ID
   */
  createFolder(name: string, parent?: string): Promise<string | undefined>;
  /** Lists files within the provided Drive space, optionally filtering by query. */
  getFiles(spaces: string, q?: string): Promise<gapi.client.drive.File[] | undefined>;
  /** Downloads the file contents for the given file id. */
  readFile(fileId: string): Promise<gapi.client.drive.File>;
  /** Removes the file from Drive. */
  deleteFile(fileId: string): Promise<void>;
  /** Replaces the file contents using a multipart upload. */
  updateFile(fileId: string, body: string): Promise<void>;
}
export {};
