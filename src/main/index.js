import { app, BrowserWindow, ipcMain, Menu } from 'electron' // eslint-disable-line
const electronOauth2 = require('electron-oauth2');
const oauthConfig = require('./config').oauth;
const Client = require('motion-core');
const client = new Client({
  username: 'motion',
  password: '47VMxa7GvxKaV3J',
  port: 3385,
});

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\') // eslint-disable-line
}

const windowParams = {
  alwaysOnTop: true,
  autoHideMenuBar: true,
  webPreferences: {
    nodeIntegration: false,
  },
};

const digitalOceanOAuth = electronOauth2(oauthConfig, windowParams);

let mainWindow;
const winURL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:9080'
  : `file://${__dirname}/index.html`;

function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 700,
    useContentSize: true,
    width: 500,
    webPreferences: {
      allowRunningInsecureContent: true,
      webSecurity: false,
    },
  });

  mainWindow.loadURL(winURL);

  mainWindow.toggleDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create the Application's main menu
  const template = [{
    label: 'Application',
    submenu: [
      { label: 'Quit', accelerator: 'Command+Q', click() { app.quit(); } },
    ],
  }, {
    label: 'Edit',
    submenu: [
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
      { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
      { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
      {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        selector: 'selectAll:',
      },
    ],
  }];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.on('do-oauth', (event) => {
  digitalOceanOAuth.getAccessToken({
    scope: 'read write',
  })
    .then((token) => {
      console.log(token);
      event.sender.send('do-oauth-reply', token);
    }, (err) => {
      console.log('Error while getting token', err);
    });
});

app.on('ready', createWindow);

app.on('quit', () => {
  client
    .stop()
    .then(() => {
      setTimeout(() => {
        app.quit();
      }, 1000);
    })
    .catch(() => {
      setTimeout(() => {
        app.quit();
      }, 1000);
    });
});

app.on('window-all-closed', () => {
  // if (process.platform !== 'darwin') {
  client
    .stop()
    .then(() => {
      setTimeout(() => {
        app.quit();
      }, 1000);
    })
    .catch(() => {
      app.quit();
    });
  // }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
