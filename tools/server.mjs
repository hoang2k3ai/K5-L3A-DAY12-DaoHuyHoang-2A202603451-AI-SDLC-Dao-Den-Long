import http from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { makeEntry, rankEntries } from '../src/leaderboard.js';

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const leaderboardFile = process.env.LANTERN_LEADERBOARD || resolve(homedir(), '.dao-den-long', 'leaderboard.json');
const defaultRoot = fileURLToPath(new URL('../dist/', import.meta.url));

export function leaderboard() {
  if (!existsSync(leaderboardFile)) return { entries: [] };
  return { entries: rankEntries(JSON.parse(readFileSync(leaderboardFile, 'utf8')).entries) };
}

function reply(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function leaderboardRequest(req, res) {
  if (req.method === 'GET') return reply(res, 200, leaderboard());
  if (req.method !== 'POST') return reply(res, 405, {});
  if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return reply(res, 403, {});
  if (req.headers['content-type'] !== 'application/json') return reply(res, 415, {});
  let json = '';
  for await (const chunk of req) {
    json += chunk;
    if (json.length > 4096) return reply(res, 413, {});
  }
  const entry = makeEntry(JSON.parse(json));
  const result = { entries: rankEntries([...leaderboard().entries, entry]) };
  mkdirSync(dirname(leaderboardFile), { recursive: true });
  writeFileSync(leaderboardFile + '.tmp', JSON.stringify(result, null, 2));
  renameSync(leaderboardFile + '.tmp', leaderboardFile);
  return reply(res, 201, result);
}

export async function startServer({ port = 0, root = defaultRoot, scores = false } = {}) {
  root = resolve(root);
  if (!existsSync(resolve(root, 'index.html'))) throw new Error('Chưa có bản web. Chạy npm run build trước.');
  const server = http.createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (scores && path === '/api/leaderboard') return await leaderboardRequest(req, res);
      const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
      if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) return reply(res, 404, {});
      res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' });
      createReadStream(file).on('error', () => res.destroy()).pipe(res);
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError) return reply(res, 400, { error: error.message });
      return reply(res, 500, { error: 'Không thể đọc hoặc lưu dữ liệu.' });
    }
  });
  await new Promise((done, fail) => server.once('error', fail).listen(port, '127.0.0.1', done));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
