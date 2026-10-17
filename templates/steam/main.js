// Minimal Electron wrapper: loads the bundled HTML5 game full-screen. Add steamworks.js here for achievements/overlay (see docs/tracks/web-store.md).
const { app, BrowserWindow } = require('electron');
app.whenReady().then(() => { const w = new BrowserWindow({ width: 1280, height: 720, fullscreenable: true, backgroundColor: '#000', autoHideMenuBar: true, webPreferences: { backgroundThrottling: false } }); w.loadFile('game/index.html'); });
app.on('window-all-closed', () => app.quit());
