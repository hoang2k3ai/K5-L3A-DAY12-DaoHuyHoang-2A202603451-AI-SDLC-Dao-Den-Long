import { spawn } from 'node:child_process';
import { leaderboard, startServer } from './server.mjs';
import { writeJson } from './cli-options.mjs';

const args = process.argv.slice(2);
try {
  if (args[0] === '--export-leaderboard' && args.length === 2) {
    writeJson(args[1], leaderboard());
  } else if (args.length === 0 || args.length === 1 && args[0] === '--no-open') {
    const { url } = await startServer({ port: Number(process.env.LANTERN_PORT ?? 4173), scores: true });
    console.log(`Đảo Đèn Lồng: ${url}`);
    if (!args.length) {
      const platform = process.platform;
      const command = platform === 'win32' ? ['rundll32.exe', 'url.dll,FileProtocolHandler'] :
        platform === 'darwin' ? ['open'] : ['xdg-open'];
      const child = spawn(command[0], [...command.slice(1), url], { detached: true, stdio: 'ignore', windowsHide: true });
      child.on('error', () => console.log(`Mở ${url} trong trình duyệt.`));
      child.unref();
    }
  } else {
    throw new TypeError('Dùng --export-leaderboard <file> hoặc --no-open.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = error instanceof TypeError ? 2 : 1;
}
