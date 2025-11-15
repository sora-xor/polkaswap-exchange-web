import { Singleton } from '../../decorators';

import { GoogleDriveApi } from './api';
import { GoogleOauth } from './oauth';

const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const DRIVE_DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

/**
 * Coordinates Google Drive API access for encrypted account backups, handling
 * authentication, folder provisioning and CRUD helpers.
 */
@Singleton
class GoogleDriveStorage {
  protected readonly api!: GoogleDriveApi;
  protected readonly oauth!: GoogleOauth;

  protected readonly appDataFolder = 'appDataFolder';
  protected readonly backupFolderName = 'backupFolder';
  protected backupFolderId!: string;

  constructor({ api, oauth }: { api: GoogleDriveApi; oauth: GoogleOauth }) {
    this.api = api;
    this.oauth = oauth;
  }

  get hasKey(): boolean {
    return this.api.hasKey && this.oauth.hasKey;
  }

  /** Stores configuration for both the API client and the OAuth helper. */
  setOptions(apiKey: string, clientId: string) {
    this.api.setOptions({ apiKey, discoveryDocs: [DRIVE_DISCOVERY_DOC] });
    this.oauth.setOptions({ clientId, scope: DRIVE_APPDATA_SCOPE });
  }

  /** Lazily initializes the API and OAuth clients. */
  async init(): Promise<void> {
    await Promise.all([this.api, this.oauth].map((client) => client.init()));
  }

  /** Ensures we have a valid OAuth token or prompts the user to grant access. */
  async auth(): Promise<void> {
    await this.init();
    await this.oauth.checkToken();
  }

  /**
   * Creates (or retrieves) the wallet backup folder inside the `appData`
   * Drive space.
   */
  async createBackupFolder() {
    if (this.backupFolderId) return;

    let id = await this.api.getFolderId(this.backupFolderName, this.appDataFolder);

    if (!id) {
      id = await this.api.createFolder(this.backupFolderName, this.appDataFolder);

      if (!id) throw new Error(`[${this.constructor.name}]: Unable to create folder`);
    }

    this.backupFolderId = id;
  }

  /** Fetches the decrypted contents for the given file id. */
  async get(id: string) {
    await this.auth();
    const file = await this.api.readFile(id);

    return file;
  }

  /** Lists all backup files stored in the app data folder. */
  async getAll() {
    await this.auth();
    await this.createBackupFolder();
    const query = `'${this.backupFolderId}' in parents`;
    const files = await this.api.getFiles(this.appDataFolder, query);

    return files;
  }

  /** Creates a new backup file and uploads its encrypted payload. */
  async create({ json, name, description }: { json: string; description: string; name: string }) {
    await this.auth();
    await this.createBackupFolder();
    const metadata = { name, description, parents: [this.backupFolderId] };
    const id = await this.api.createFile(metadata);

    await this.update(id, { json, name, description });
  }

  /** Overwrites an existing backup with the latest encrypted snapshot. */
  async update(id: string, { json, name, description }: { json: string; description: string; name: string }) {
    await this.auth();

    const metadata = { name, description };
    const body = this.api.prepareBody(json, metadata);

    await this.api.updateFile(id, body);
  }

  /** Deletes a backup file from Drive. */
  async delete(id: string) {
    await this.auth();
    await this.api.deleteFile(id);
  }
}

export const GDriveStorage = new GoogleDriveStorage({
  api: new GoogleDriveApi(),
  oauth: new GoogleOauth(),
});
