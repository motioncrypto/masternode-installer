import { app, BrowserWindow, Menu } from 'electron' // eslint-disable-line
const express = require('express');
const bodyParser = require('body-parser');
const expressApp = express();
const Client = require('motion-core');
const client = new Client({
  username: 'motion',
  password: '47VMxa7GvxKaV3J',
  port: 3385,
});

expressApp.use(bodyParser.urlencoded({ extended: true }));
expressApp.use(bodyParser.json());

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\') // eslint-disable-line
}

let mainWindow;
const winURL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:9080'
  : `file://${__dirname}/index.html`;

expressApp.get('/do-auth/:accessToken', (req, res) => {
  mainWindow.webContents.send('do-oauth-reply', req.params.accessToken);
  res.send('Done, now you can close this tab and return to the installer.');
});

function createWindow() {
  expressApp.listen(3456, () => {
    console.log('oAuth Server listening on port 3456!');
  });
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

  // mainWindow.toggleDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create the Application's main menu
  const template = [{
    label: 'Application',
    submenu: [
      { label: 'Open Developer Tools', click() { mainWindow.webContents.openDevTools(); } },
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
