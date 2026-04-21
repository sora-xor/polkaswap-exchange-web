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
    const createMock = vi.fn().mockResolvedValueOnce({ result: { id: 'file-id' } }).mockResolvedValueOnce({
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
    const executeMock = vi.fn((resolve: () => void) => resolve());
    const requestMock = vi.fn().mockReturnValue({ execute: executeMock });

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
      params: { uploadType: 'multipart' },
      headers: {
        'Content-Type': 'multipart/related; boundary=foo_bar_baz',
        'Content-Length': String(body.length),
      },
      body,
    });
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it('logs and rejects when request execution throws', async () => {
    const error = new Error('request failed');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const requestMock = vi.fn().mockReturnValue({
      execute: vi.fn(() => {
        throw error;
      }),
    });

    vi.stubGlobal('gapi', {
      client: {
        request: requestMock,
      },
    });

    const api = new GoogleDriveApi();

    await expect(api.updateFile('file-id', 'body')).rejects.toBe(error);
    expect(errorSpy).toHaveBeenCalledWith(error);
  });
});
