import { platform, release, arch } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { launchChromium } from './chromium.mjs';
import { startServer } from './server.mjs';
import { options, writeJson } from './cli-options.mjs';

const started = Date.now() - process.uptime() * 1000;
let server;
let browser;
try {
  const { seed, duration, out } = options(process.argv.slice(2),
    { seed: 42, duration: 30, out: 'bench.json' }, ['seed', 'duration'], ['duration']);
  const listener = await startServer();
  server = listener.server;
  browser = await launchChromium({
    visible: true,
    flags: ['--disable-gpu-vsync', '--disable-frame-rate-limit', '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion',
      '--app=about:blank'],
  });
  let pageError;
  browser.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    pageError = exceptionDetails.exception?.description ?? exceptionDetails.text;
  });
  await browser.send('Runtime.enable');
  await browser.send('Page.bringToFront');
  await browser.send('Page.navigate', { url: `${listener.url}/bench.html?seed=${seed}&duration=${duration}` });
  const stop = Date.now() + (duration + 25) * 1000;
  while (true) {
    if (pageError) throw new Error(pageError);
    const [first, result] = await browser.evaluate('[window.benchFirstFrame, window.benchResult]');
    if (result) {
      const context = await browser.evaluate(`(() => {
        const gl = document.querySelector('canvas').getContext('webgl2');
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      })()`);
      writeJson(out, {
        contract_version: '1.3', ...result, load_ms: Math.max(0, Math.round(first - started)),
        peak_mem_mb: null, vsync_off: true, renderer: `${result.renderer} (${context})`,
        os: `${platform()} ${release()} ${arch()}`,
      });
      break;
    }
    if (Date.now() >= stop) {
      const state = await browser.evaluate('[location.href, document.readyState, document.visibilityState, Boolean(window.benchFirstFrame)]');
      throw new Error(`Benchmark không trả kết quả trong thời hạn: ${state.join(', ')}`);
    }
    await delay(100);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = error instanceof TypeError ? 2 : 1;
} finally {
  await browser?.close();
  server?.close();
}
