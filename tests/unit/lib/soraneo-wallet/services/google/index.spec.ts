import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiInstances = vi.hoisted(() => [] as any[]);
const oauthInstances = vi.hoisted(() => [] as any[]);

const GoogleDriveApiMock = vi.hoisted(() =>
  vi.fn(function GoogleDriveApiMock() {
    const instance = {
      ready: false,
      prepared: false,
      prepare: vi.fn().mockResolvedValue(undefined),
      hasKey: false,
      setOptions: vi.fn(),
      init: vi.fn().mockResolvedValue(undefined),
      getFolderId: vi.fn().mockResolvedValue(undefined),
      createFolder: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue(undefined),
      getFiles: vi.fn().mockResolvedValue(undefined),
      createFile: vi.fn().mockResolvedValue(undefined),
      createBackupFile: vi.fn().mockResolvedValue('file-id'),
      prepareBody: vi.fn().mockReturnValue('multipart-body'),
      updateFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn().mockResolvedValue(undefined),
    };
    apiInstances.push(instance);
    return instance;
  })
);

const GoogleOauthMock = vi.hoisted(() =>
  vi.fn(function GoogleOauthMock() {
    const instance = {
      ready: false,
      hasKey: false,
      setOptions: vi.fn(),
      init: vi.fn().mockResolvedValue(undefined),
      checkToken: vi.fn().mockResolvedValue(undefined),
    };
    oauthInstances.push(instance);
    return instance;
  })
);

vi.mock('@/lib/soraneo-wallet/src/services/google/api', () => ({
  GoogleDriveApi: GoogleDriveApiMock,
}));

vi.mock('@/lib/soraneo-wallet/src/services/google/oauth', () => ({
  GoogleOauth: GoogleOauthMock,
}));

const loadStorage = async () => {
  vi.resetModules();
  apiInstances.length = 0;
  oauthInstances.length = 0;

  const { GDriveStorage } = await import('@/lib/soraneo-wallet/src/services/google');

  return {
    storage: GDriveStorage as any,
    api: apiInstances[0],
    oauth: oauthInstances[0],
  };
};

describe('GDriveStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reflects combined key availability and forwards options to both clients', async () => {
    const { storage, api, oauth } = await loadStorage();

    expect(storage.hasKey).toBe(false);

    api.hasKey = true;
    oauth.hasKey = true;
    storage.setOptions('api-key', 'client-id');

    expect(storage.hasKey).toBe(true);
    expect(api.setOptions).toHaveBeenCalledWith({
      apiKey: 'api-key',
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });
    expect(oauth.setOptions).toHaveBeenCalledWith({
      clientId: 'client-id',
      scope: 'https://www.googleapis.com/auth/drive.appdata',
    });
  });

  it('initializes and authenticates through the underlying clients', async () => {
    const { storage, api, oauth } = await loadStorage();

    await storage.init();
    await storage.auth();

    expect(api.init).toHaveBeenCalledTimes(2);
    expect(oauth.init).toHaveBeenCalledTimes(2);
    expect(oauth.checkToken).toHaveBeenCalledTimes(1);
    expect(oauth.checkToken.mock.invocationCallOrder[0]).toBeLessThan(api.init.mock.invocationCallOrder[1]);
    expect(oauth.init.mock.invocationCallOrder[1]).toBeLessThan(oauth.checkToken.mock.invocationCallOrder[0]);
  });

  it('prepares OAuth without Drive discovery and defers API access until Google consent', async () => {
    const { storage, api, oauth } = await loadStorage();
    await storage.prepare();
    expect(api.prepare).toHaveBeenCalledOnce();
    expect(oauth.init).toHaveBeenCalledOnce();
    expect(api.init).not.toHaveBeenCalled();
    expect(oauth.checkToken).not.toHaveBeenCalled();
    api.prepared = true;
    oauth.ready = true;
    expect(storage.authReady).toBe(true);
    expect(storage.ready).toBe(false);
    oauth.checkToken.mockRejectedValueOnce(new Error('cancelled'));
    await expect(storage.auth()).rejects.toThrow('cancelled');
    expect(api.init).not.toHaveBeenCalled();
    await storage.auth();
    expect(api.init).toHaveBeenCalledOnce();
    expect(oauth.checkToken.mock.invocationCallOrder[1]).toBeLessThan(api.init.mock.invocationCallOrder[0]);
  });

  it('reports Google client readiness before click-safe prompts', async () => {
    const { storage, api, oauth } = await loadStorage();

    expect(storage.ready).toBe(false);

    api.ready = true;
    oauth.ready = true;

    expect(storage.ready).toBe(true);
  });

  it('creates the backup folder when it does not already exist', async () => {
    const { storage, api } = await loadStorage();
    api.getFolderId.mockResolvedValueOnce(undefined);
    api.createFolder.mockResolvedValueOnce('folder-id');

    await storage.createBackupFolder();
    await storage.createBackupFolder();

    expect(api.getFolderId).toHaveBeenCalledTimes(1);
    expect(api.getFolderId).toHaveBeenCalledWith('backupFolder', 'appDataFolder');
    expect(api.createFolder).toHaveBeenCalledTimes(1);
    expect(api.createFolder).toHaveBeenCalledWith('backupFolder', 'appDataFolder');
    expect(storage.backupFolderId).toBe('folder-id');
  });

  it('throws when the backup folder cannot be created', async () => {
    const { storage, api } = await loadStorage();
    api.getFolderId.mockResolvedValueOnce(undefined);
    api.createFolder.mockResolvedValueOnce(undefined);

    await expect(storage.createBackupFolder()).rejects.toThrow('[GoogleDriveStorage]: Unable to create folder');
  });

  it('gets a file and lists backups under the app data folder', async () => {
    const { storage, api, oauth } = await loadStorage();
    api.getFolderId.mockResolvedValueOnce('folder-id');
    api.readFile.mockResolvedValueOnce({ encrypted: true });
    api.getFiles.mockResolvedValueOnce([{ id: 'backup-id' }]);

    await expect(storage.get('file-id')).resolves.toEqual({ encrypted: true });
    await expect(storage.getAll()).resolves.toEqual([{ id: 'backup-id' }]);

    expect(oauth.checkToken).toHaveBeenCalledTimes(2);
    expect(api.readFile).toHaveBeenCalledWith('file-id');
    expect(api.getFiles).toHaveBeenCalledWith('appDataFolder', "'folder-id' in parents");
  });

  it('creates, updates, and deletes backup files through the Drive API', async () => {
    const { storage, api, oauth } = await loadStorage();
    api.getFolderId.mockResolvedValueOnce('folder-id');
    api.createFile.mockResolvedValueOnce('file-id');

    await storage.create({
      json: '{"a":1}',
      name: 'backup.json',
      description: 'Encrypted backup',
    });
    await storage.update('file-id', {
      json: '{"b":2}',
      name: 'backup.json',
      description: 'Updated backup',
    });
    await storage.delete('file-id');

    expect(api.createFile).not.toHaveBeenCalled();
    expect(api.createBackupFile).toHaveBeenCalledWith('{"a":1}', {
      name: 'backup.json',
      description: 'Encrypted backup',
      parents: ['folder-id'],
    });
    expect(api.prepareBody).toHaveBeenCalledWith('{"b":2}', {
      name: 'backup.json',
      description: 'Updated backup',
    });
    expect(api.updateFile).toHaveBeenNthCalledWith(1, 'file-id', 'multipart-body');
    expect(api.deleteFile).toHaveBeenCalledWith('file-id');
    expect(oauth.checkToken).toHaveBeenCalledTimes(3);
  });

  it('propagates a failed complete-backup upload and retries without deleting or overwriting an existing file', async () => {
    const { storage, api } = await loadStorage();
    api.getFolderId.mockResolvedValueOnce('existing-folder');
    api.createBackupFile.mockRejectedValueOnce(new Error('upload rejected')).mockResolvedValueOnce('new-file');
    const backup = { json: '{"encrypted":"synthetic"}', name: 'backup.json', description: 'Wallet' };
    await expect(storage.create(backup)).rejects.toThrow('upload rejected');
    expect(api.createFile).not.toHaveBeenCalled();
    expect(api.updateFile).not.toHaveBeenCalled();
    expect(api.deleteFile).not.toHaveBeenCalled();
    await expect(storage.create(backup)).resolves.toBeUndefined();
    expect(api.createBackupFile).toHaveBeenCalledTimes(2);
    expect(api.createBackupFile.mock.calls[0]).toEqual(api.createBackupFile.mock.calls[1]);
    expect(api.createFolder).not.toHaveBeenCalled();
  });
});
