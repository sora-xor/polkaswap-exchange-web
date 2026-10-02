import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const waitForDocumentReadyMock = vi.hoisted(() => vi.fn());
const scriptLoadMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/soraneo-wallet/src/util', () => ({
  waitForDocumentReady: waitForDocumentReadyMock,
}));

vi.mock('@/lib/soraneo-wallet/src/util/scriptLoader', () => ({
  ScriptLoader: {
    load: scriptLoadMock,
  },
}));

import { GoogleApi, GoogleDriveApi } from '@/lib/soraneo-wallet/src/services/google/api';

describe('GoogleApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    waitForDocumentReadyMock.mockResolvedValue(undefined);
    scriptLoadMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requires options and an API key before initialization', async () => {
    const api = new GoogleApi();

    expect(api.hasKey).toBe(false);
    await expect(api.init()).rejects.toThrow('[GoogleApi]: Options should be set before inintialization');

    api.setOptions({ apiKey: '' });

    await expect(api.init()).rejects.toThrow('[GoogleApi]: Api key is required');
  });

  it('prepares a shared generic client without API discovery or credentials', async () => {
    const init = vi.fn();
    const load = vi.fn((_name, ready: () => void) => ready());
    vi.stubGlobal('gapi', { load, client: { init } });
    const api = new GoogleApi();
    await Promise.all([api.prepare(), api.prepare()]);
    expect(scriptLoadMock).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledOnce();
    expect(init).not.toHaveBeenCalled();
    expect(api.prepared).toBe(true);
    expect(api.ready).toBe(false);
    await api.prepare();
    expect(load).toHaveBeenCalledOnce();
  });

  it('loads the Google API script and initializes the client once', async () => {
    const loadMock = vi.fn((_, callback: () => void) => callback());
    const initMock = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('gapi', {
      load: loadMock,
      client: {
        init: initMock,
      },
    });

    const api = new GoogleApi();
    api.setOptions({ apiKey: 'api-key', discoveryDocs: ['drive-doc'] });

    expect(api.hasKey).toBe(true);

    await api.init();
    await api.init();

    expect(scriptLoadMock).toHaveBeenCalledTimes(1);
    expect(scriptLoadMock).toHaveBeenCalledWith('https://apis.google.com/js/api.js');
    expect(waitForDocumentReadyMock).toHaveBeenCalledTimes(1);
    expect(loadMock).toHaveBeenCalledWith('client', expect.any(Function));
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledWith({ apiKey: 'api-key', discoveryDocs: ['drive-doc'] });
    expect(api.ready).toBe(true);
  });
});

describe('GoogleDriveApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('wraps upload metadata into a multipart request body', () => {
    const api = new GoogleDriveApi();

    const body = api.prepareBody('{"hello":"world"}', {
      name: 'backup.json',
      description: 'Encrypted backup',
    });

    expect(body).toContain('Content-Type: application/json; charset=UTF-8');
    expect(body).toContain('"name":"backup.json"');
    expect(body).toContain('"description":"Encrypted backup"');
    expect(body).toContain('{"hello":"world"}');
    expect(body).toContain('--foo_bar_baz--');
  });

  it('delegates folder and file lookups to the Drive client', async () => {
    const listMock = vi.fn().mockResolvedValue({
      result: {
        files: [{ id: 'folder-id', name: 'backupFolder' }],
      },
    });
    const getMock = vi.fn().mockResolvedValue({ result: { encrypted: true } });
    const deleteMock = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('gapi', {
      client: {
        drive: {
          files: {
            list: listMock,
            get: getMock,
            delete: deleteMock,
          },
        },
      },
    });

    const api = new GoogleDriveApi();

    await expect(api.getFolderId('backupFolder', 'appDataFolder')).resolves.toBe('folder-id');
    await expect(api.getFiles('appDataFolder', "name = 'backupFolder'")).resolves.toEqual([
      { id: 'folder-id', name: 'backupFolder' },
    ]);
    await expect(api.readFile('file-id')).resolves.toEqual({ encrypted: true });
    await expect(api.deleteFile('file-id')).resolves.toBeUndefined();

    expect(listMock).toHaveBeenNthCalledWith(1, {
      fields: 'files(id,name,description)',
      spaces: 'appDataFolder',
      q: "name = 'backupFolder'",
    });
    expect(getMock).toHaveBeenCalledWith({ fileId: 'file-id', alt: 'media' });
    expect(deleteMock).toHaveBeenCalledWith({ fileId: 'file-id' });
  });

  it('creates Drive file metadata and folders', async () => {
    const createMock = vi
      .fn()
      .mockResolvedValueOnce({ result: { id: 'file-id' } })
      .mockResolvedValueOnce({
        result: { id: 'folder-id' },
      });

    vi.stubGlobal('gapi', {
      client: {
        drive: {
          files: {
            create: createMock,
          },
        },
      },
    });

    const api = new GoogleDriveApi();

    await expect(api.createFile({ name: 'backup.json', description: 'Encrypted backup' })).resolves.toBe('file-id');
    await expect(api.createFolder('backupFolder', 'appDataFolder')).resolves.toBe('folder-id');

    expect(createMock).toHaveBeenNthCalledWith(1, {
      resource: {
        name: 'backup.json',
        description: 'Encrypted backup',
      },
      fields: 'id',
    });
    expect(createMock).toHaveBeenNthCalledWith(2, {
      resource: {
        name: 'backupFolder',
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['appDataFolder'],
      },
      fields: 'id',
    });
  });

  it('throws when file creation does not return an id', async () => {
    const createMock = vi.fn().mockResolvedValue({ result: {} });

    vi.stubGlobal('gapi', {
      client: {
        drive: {
          files: {
            create: createMock,
          },
        },
      },
    });

    const api = new GoogleDriveApi();

    await expect(api.createFile({ name: 'backup.json' })).rejects.toThrow(
      '[GoogleDriveApi]: Unable to create file metadata'
    );
  });

  it('sends multipart updates through gapi.client.request', async () => {
    const requestMock = vi.fn().mockResolvedValue({ status: 200, result: { id: 'file-id' } });

    vi.stubGlobal('gapi', {
      client: {
        request: requestMock,
      },
    });

    const api = new GoogleDriveApi();
    const body = api.prepareBody('{"hello":"world"}', { name: 'backup.json' });

    await expect(api.updateFile('file-id', body)).resolves.toBeUndefined();

    expect(requestMock).toHaveBeenCalledWith({
      path: '/upload/drive/v3/files/file-id',
      method: 'PATCH',
      params: { uploadType: 'multipart', fields: 'id' },
      headers: {
        'Content-Type': 'multipart/related; boundary=foo_bar_baz',
      },
      body,
    });
  });

  it('uploads metadata and encrypted backup content together when creating a file', async () => {
    const request = vi.fn().mockResolvedValue({ status: 200, result: { id: 'new-file' } });
    const create = vi.fn();
    vi.stubGlobal('gapi', { client: { request, drive: { files: { create } } } });
    const api = new GoogleDriveApi();
    await expect(
      api.createBackupFile('{"encrypted":"synthetic"}', {
        name: 'backup.json',
        description: 'Wallet',
        parents: ['folder-id'],
      })
    ).resolves.toBe('new-file');
    expect(create).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart', fields: 'id' },
      headers: { 'Content-Type': 'multipart/related; boundary=foo_bar_baz' },
      body: expect.stringContaining('"parents":["folder-id"]'),
    });
    expect(request.mock.calls[0][0].body).toContain('{"encrypted":"synthetic"}');
  });

  it('rejects an asynchronous API error and permits an explicit successful retry without executing callbacks', async () => {
    const execute = vi.fn((callback) => callback({ error: { code: 403 } }));
    const failed = {
      execute,
      then: (_resolve: unknown, reject: (error: unknown) => void) =>
        queueMicrotask(() => reject({ status: 403, result: { error: { message: 'Private provider response' } } })),
    };
    const request = vi
      .fn()
      .mockReturnValueOnce(failed)
      .mockResolvedValueOnce({ status: 200, result: { id: 'file-id' } });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('gapi', { client: { request } });
    const api = new GoogleDriveApi();
    await expect(api.updateFile('file-id', 'body')).rejects.toThrow('Google Drive backup upload failed');
    expect(execute).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    await expect(api.updateFile('file-id', 'body')).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([
    { status: 403, result: { id: 'file-id', error: { code: 403 } } },
    { status: 200, result: { error: { code: 500 } } },
    { status: 200, result: {} },
    { status: 204, result: null },
    { result: { id: 'file-id' } },
    { status: 200, result: { id: 'different-file' } },
  ])('rejects unconfirmed update responses: %j', async (response) => {
    vi.stubGlobal('gapi', { client: { request: vi.fn().mockResolvedValue(response) } });
    const api = new GoogleDriveApi();
    await expect(api.updateFile('file-id', 'body')).rejects.toThrow('Google Drive backup upload failed');
  });

  it('does not accept a successful creation without an acknowledged file id', async () => {
    vi.stubGlobal('gapi', { client: { request: vi.fn().mockResolvedValue({ status: 200, result: { id: '' } }) } });
    await expect(new GoogleDriveApi().createBackupFile('body', { name: 'backup.json' })).rejects.toThrow(
      'Google Drive backup upload failed'
    );
  });

  it('sanitizes synchronous request failures without logging the encrypted payload', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('gapi', {
      client: {
        request: () => {
          throw new Error('synthetic private payload');
        },
      },
    });
    await expect(new GoogleDriveApi().updateFile('file-id', 'encrypted-body')).rejects.toThrow(
      'Google Drive backup upload failed'
    );
    expect(error).not.toHaveBeenCalled();
  });
});
