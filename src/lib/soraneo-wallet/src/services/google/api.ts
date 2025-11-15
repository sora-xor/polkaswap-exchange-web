import { waitForDocumentReady } from '../../util';
import { ScriptLoader } from '../../util/scriptLoader';

type GoogleApiOptions = {
  apiKey: string;
  discoveryDocs?: string[];
};

/**
 * Thin wrapper around the Google JS client that lazily loads the required
 * scripts and exposes a ready flag once initialized.
 */
export class GoogleApi {
  private options!: GoogleApiOptions;
  private _ready = false;

  get ready(): boolean {
    return this._ready;
  }

  get hasKey(): boolean {
    return !!this.options?.apiKey;
  }

  /** Stores the API key/discovery doc configuration prior to initialization. */
  public setOptions(options: GoogleApiOptions): void {
    this.options = { ...options };
  }

  /**
   * Loads the Google scripts and initializes the client with the configured
   * options. Subsequent calls are no-ops.
   */
  public async init(): Promise<void> {
    if (this.ready) return;
    if (!this.options) throw new Error(`[${this.constructor.name}]: Options should be set before inintialization`);
    if (!this.options.apiKey) throw new Error(`[${this.constructor.name}]: Api key is required`);

    await this.load();
    await this.initClient(this.options);
  }

  /** Loads the Google API script in parallel with DOM readiness checks. */
  private async load(): Promise<void> {
    await Promise.all([ScriptLoader.load('https://apis.google.com/js/api.js'), waitForDocumentReady()]);
  }

  /** Bootstraps the Drive client and marks the wrapper as ready. */
  private async initClient({ apiKey, discoveryDocs }: GoogleApiOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      gapi.load('client', () => {
        gapi.client
          .init({ apiKey, discoveryDocs })
          .then(() => {
            this._ready = true;
            resolve();
          })
          .catch(reject);
      });
    });
  }
}

/**
 * Drive-specific API extensions that provide helpers for file management in
 * the app data folder.
 */
export class GoogleDriveApi extends GoogleApi {
  protected readonly mimeType = {
    json: 'application/json',
    folder: 'application/vnd.google-apps.folder',
  };

  protected readonly boundary = 'foo_bar_baz';

  private prepareContent(content: string, metadata: gapi.client.drive.File): string {
    return `
--${this.boundary}
Content-Type: ${this.mimeType.json}; charset=UTF-8

${JSON.stringify(metadata)}
--${this.boundary}
Content-Type: ${this.mimeType.json}

${content}
--${this.boundary}--`;
  }

  /** Wraps file content in the multipart format expected by Drive uploads. */
  prepareBody(content: string, { name, description, mimeType = this.mimeType.json }: gapi.client.drive.File) {
    const metadata: gapi.client.drive.File = {
      name,
      description,
      mimeType,
    };

    return this.prepareContent(content, metadata);
  }

  /** Looks up (or creates) the requested folder and returns its id. */
  public async getFolderId(name: string, parent: string): Promise<string | undefined> {
    const query = `name = '${name}'`;
    const files = await this.getFiles(parent, query);

    return files?.[0]?.id;
  }

  /** Creates file metadata and returns the generated file id. */
  public async createFile(metadata: gapi.client.drive.File): Promise<string> {
    const response = await gapi.client.drive.files.create({
      resource: metadata,
      fields: 'id',
    });
    const id = response.result.id;

    if (!id) throw new Error(`[${this.constructor.name}]: Unable to create file metadata`);

    return id;
  }

  /**
   * Create a folder
   * @param name name of the folder
   * @param parent the name of the parent folder, if the new one should be a subfolder
   * @returns the created folder ID
   */
  public async createFolder(name: string, parent?: string): Promise<string | undefined> {
    const parents = parent ? [parent] : undefined;
    const metadata = {
      name,
      mimeType: this.mimeType.folder,
      parents,
    };
    const id = await this.createFile(metadata);

    return id;
  }

  /** Lists files within the provided Drive space, optionally filtering by query. */
  public async getFiles(spaces: string, q?: string) {
    const response = await gapi.client.drive.files.list({
      fields: 'files(id,name,description)',
      spaces,
      q,
    });

    return response.result.files;
  }

  /** Downloads the file contents for the given file id. */
  public async readFile(fileId: string) {
    const response = await gapi.client.drive.files.get({
      fileId,
      alt: 'media',
    });

    return response.result;
  }

  /** Removes the file from Drive. */
  public async deleteFile(fileId: string) {
    await gapi.client.drive.files.delete({
      fileId,
    });
  }

  /** Replaces the file contents using a multipart upload. */
  public async updateFile(fileId: string, body: string): Promise<void> {
    const request = gapi.client.request({
      path: `/upload/drive/v3/files/${fileId}`,
      method: 'PATCH',
      params: { uploadType: 'multipart' },
      headers: {
        'Content-Type': `multipart/related; boundary=${this.boundary}`,
        'Content-Length': body.length.toString(),
      },
      body,
    });

    await new Promise((resolve, reject) => {
      try {
        request.execute(resolve);
      } catch (error) {
        console.error(error);
        reject(error);
      }
    });
  }
}
