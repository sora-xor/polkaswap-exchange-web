import { join } from 'path';
import { pathToFileURL } from 'node:url';

import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { app, shell, BrowserWindow } from 'electron';

import { isAppNavigation, safeExternalUrl } from './security';

/** Creates a sandboxed app window; remote links open only in the system browser. */
function createWindow(): void {
  const appFile = join(__dirname, '../renderer/index.html');
  const devUrl = is.dev ? process.env['ELECTRON_RENDERER_URL'] : undefined;
  const appUrl = devUrl || pathToFileURL(appFile).href;
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    const url = safeExternalUrl(details.url);
    if (url) void shell.openExternal(url).catch(() => undefined);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event) => {
    if (!isAppNavigation(event.url, appUrl)) event.preventDefault();
  });
  mainWindow.webContents.on('will-redirect', (event) => {
    if (event.isMainFrame && !isAppNavigation(event.url, appUrl)) event.preventDefault();
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(appFile);
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
