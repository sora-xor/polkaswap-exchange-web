import { GoogleDriveApi } from './api';
import { GoogleOauth } from './oauth';
/**
 * Coordinates Google Drive API access for encrypted account backups, handling
 * authentication, folder provisioning and CRUD helpers.
 */
declare class GoogleDriveStorage {
  protected readonly api: GoogleDriveApi;
  protected readonly oauth: GoogleOauth;
  protected readonly appDataFolder = 'appDataFolder';
  protected readonly backupFolderName = 'backupFolder';
  protected backupFolderId: string;
  constructor({ api, oauth }: { api: GoogleDriveApi; oauth: GoogleOauth });
  get hasKey(): boolean;
  /** Stores configuration for both the API client and the OAuth helper. */
  setOptions(apiKey: string, clientId: string): void;
  /** Lazily initializes the API and OAuth clients. */
  init(): Promise<void>;
  /** Ensures we have a valid OAuth token or prompts the user to grant access. */
  auth(): Promise<void>;
  /**
   * Creates (or retrieves) the wallet backup folder inside the `appData`
   * Drive space.
   */
  createBackupFolder(): Promise<void>;
  /** Fetches the decrypted contents for the given file id. */
  get(id: string): Promise<gapi.client.drive.File>;
  /** Lists all backup files stored in the app data folder. */
  getAll(): Promise<gapi.client.drive.File[] | undefined>;
  /** Creates a new backup file and uploads its encrypted payload. */
  create({ json, name, description }: { json: string; description: string; name: string }): Promise<void>;
  /** Overwrites an existing backup with the latest encrypted snapshot. */
  update(
    id: string,
    {
      json,
      name,
      description,
    }: {
      json: string;
      description: string;
      name: string;
    }
  ): Promise<void>;
  /** Deletes a backup file from Drive. */
  delete(id: string): Promise<void>;
}
export declare const GDriveStorage: GoogleDriveStorage;
export {};
