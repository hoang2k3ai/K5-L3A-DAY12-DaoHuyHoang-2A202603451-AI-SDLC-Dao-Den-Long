import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

function executable() {
  const candidates = process.platform === 'win32'
    ? [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean)
      .flatMap((dir) => ['Google/Chrome/Application/chrome.exe', 'Microsoft/Edge/Application/msedge.exe'].map((app) => join(dir, app)))
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
      : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'];
  const path = process.env.CHROMIUM_PATH || candidates.find(existsSync);
  if (!path) throw new Error('Cài Chrome/Edge hoặc đặt CHROMIUM_PATH tới tệp thực thi.');
  return path;
}

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((done, fail) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', fail, { once: true });
  });
  const pending = new Map();
  const handlers = new Map();
  let id = 0;
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const callback = pending.get(message.id);
    if (callback) {
      pending.delete(message.id);
      if (message.error) callback.reject(new Error(message.error.message));
      else callback.resolve(message.result);
    }
    handlers.get(message.method)?.(message.params);
  };
  socket.onclose = () => {
    for (const { reject } of pending.values()) reject(new Error('Chrome đã đóng.'));
    pending.clear();
  };
  return {
    on(event, handler) { handlers.set(event, handler); },
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const request = ++id;
        pending.set(request, { resolve, reject });
        socket.send(JSON.stringify({ id: request, method, params }));
      });
    },
    disconnect: () => socket.close(),
  };
}

export async function launchChromium({ flags = [], visible = false } = {}) {
  const command = executable();
  const directory = mkdtempSync(join(tmpdir(), 'lantern-chrome-'));
  const child = spawn(command, [
    '--remote-debugging-port=0', '--window-size=1280,720',
    '--no-first-run', '--no-default-browser-check', '--enable-unsafe-swiftshader',
    `--user-data-dir=${directory}`, ...flags, ...flags.some((flag) => flag.startsWith('--app=')) ? [] : ['about:blank'],
  ], { windowsHide: !visible, stdio: 'ignore' });
  let spawnError;
  child.on('error', (error) => { spawnError = error; });
  let browser;
  let page;
  async function close() {
    if (browser) {
      await Promise.race([browser.send('Browser.close').catch(() => {}), delay(800)]);
      browser.disconnect();
    }
    page?.disconnect();
    if (child.exitCode === null && !child.killed) child.kill();
    await delay(100);
    try { rmSync(directory, { recursive: true, force: true }); } catch { /* Chromium may still be closing its profile. */ }
  }
  try {
    const portFile = join(directory, 'DevToolsActivePort');
    for (let i = 0; !existsSync(portFile); i++) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null || i >= 150) throw new Error('Không khởi động được Chrome DevTools.');
      await delay(50);
    }
    const [port, browserPath] = readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
    browser = await connect(`ws://127.0.0.1:${port}${browserPath}`);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = targets.find(({ type }) => type === 'page');
    page = await connect(target.webSocketDebuggerUrl);
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    return {
      ...page, close,
      async evaluate(expression) {
        const result = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
        return result.result.value;
      },
    };
  } catch (error) {
    await close();
    throw error;
  }
}
